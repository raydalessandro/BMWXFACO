// BMW Motorrad - Official App Logic

// Constants
const FUEL_PRICE_PER_LITER = 1.7; // Fixed fuel price

// State
let currentScreen = 'welcomeScreen';
let profile = null;
let currentTripId = null;
let currentPhotoIndex = 0;
let currentTripPhotos = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('BMW Motorrad - Initializing...');
    
    // Check if profile exists
    profile = await db.getProfile();
    
    if (profile) {
        // User already set up
        showScreen('tripsScreen');
        loadDashboardData();
        updateBottomNav('tripsScreen');
    } else {
        // First time user
        showScreen('welcomeScreen');
    }
    
    // Setup fuel calculation with fixed price
    setupFuelCalculation();
    
    // Set today's date as default
    setDefaultDates();
});

// Screen management
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        currentScreen = screenId;
        
        // Update bottom nav
        updateBottomNav(screenId);
        
        // Load screen data
        if (screenId === 'tripsScreen') {
            loadTrips();
        } else if (screenId === 'garageScreen') {
            loadGarage();
        } else if (screenId === 'statsScreen') {
            loadStats();
        }
    }
}

function updateBottomNav(screenId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-screen') === screenId) {
            item.classList.add('active');
        }
    });
}

// Welcome & Setup
function startSetup() {
    showScreen('setupScreen');
}

document.getElementById('setupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        riderName: document.getElementById('riderName').value,
        bikeModel: document.getElementById('bikeModel').value || 'R 850 GS',
        bikeYear: parseInt(document.getElementById('bikeYear').value),
        currentKm: parseInt(document.getElementById('currentKm').value),
        plateNumber: document.getElementById('plateNumber')?.value || ''
    };
    
    // Save profile
    await db.saveProfile(formData);
    profile = formData;
    
    // Show success toast
    showToast('CONFIGURAZIONE SALVATA');
    
    // Go to trips screen
    setTimeout(() => {
        showScreen('tripsScreen');
        loadDashboardData();
        updateBottomNav('tripsScreen');
    }, 1000);
});

// Dashboard data
async function loadDashboardData() {
    const trips = await db.getAllTrips();
    const totalKm = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    
    document.getElementById('totalKm').textContent = totalKm.toLocaleString('it-IT');
    document.getElementById('totalTrips').textContent = trips.length;
}

// Trips
async function loadTrips() {
    const trips = await db.getAllTrips();
    const tripsList = document.getElementById('tripsList');
    const emptyTrips = document.getElementById('emptyTrips');
    
    if (trips.length === 0) {
        tripsList.style.display = 'none';
        emptyTrips.style.display = 'flex';
    } else {
        tripsList.style.display = 'block';
        emptyTrips.style.display = 'none';
        
        tripsList.innerHTML = trips.map(trip => `
            <div class="trip-card-official" onclick="showTripDetails('${trip.id}')">
                <div class="trip-info">
                    <div class="trip-title-official">${trip.title}</div>
                    <div class="trip-meta">
                        <span>${formatDate(trip.startDate)}</span>
                        <span>${trip.distance} km</span>
                        ${trip.duration ? `<span>${trip.duration}h</span>` : ''}
                    </div>
                </div>
                <div class="trip-arrow">→</div>
            </div>
        `).join('');
    }
    
    loadDashboardData();
}

// Trip Details with Photo Gallery
async function showTripDetails(tripId) {
    currentTripId = tripId;
    const trip = await db.getTrip(tripId);
    
    if (!trip) return;
    
    // Update trip details
    document.getElementById('tripDetailTitle').textContent = trip.title;
    
    const detailsContent = document.getElementById('tripDetailsContent');
    detailsContent.innerHTML = `
        <div class="trip-detail-stats">
            <div class="detail-row">
                <span class="detail-label">DATA</span>
                <span class="detail-value">${formatDate(trip.startDate)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">DISTANZA</span>
                <span class="detail-value">${trip.distance} km</span>
            </div>
            ${trip.duration ? `
            <div class="detail-row">
                <span class="detail-label">DURATA</span>
                <span class="detail-value">${trip.duration} ore</span>
            </div>
            ` : ''}
            ${trip.notes ? `
            <div class="detail-row">
                <span class="detail-label">NOTE</span>
                <span class="detail-value">${trip.notes}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    // Load photos
    await loadTripPhotos(tripId);
    
    showScreen('tripDetailsScreen');
}

async function loadTripPhotos(tripId) {
    const photos = await db.getTripPhotos(tripId);
    const gallery = document.getElementById('photoGallery');
    
    if (photos.length === 0) {
        gallery.innerHTML = '<div class="empty-state-small"><p>Nessuna foto</p></div>';
    } else {
        currentTripPhotos = photos;
        gallery.innerHTML = photos.map((photo, index) => `
            <div class="photo-thumbnail" onclick="viewPhoto(${index})">
                <img src="${photo.url}" alt="Photo ${index + 1}">
            </div>
        `).join('');
    }
}

async function uploadPhotos(event) {
    const files = event.target.files;
    if (!files || !currentTripId) return;
    
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            await db.addTripPhoto(currentTripId, {
                url: e.target.result,
                uploadedAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    }
    
    // Reload photos after upload
    setTimeout(() => {
        loadTripPhotos(currentTripId);
        showToast('FOTO AGGIUNTE');
    }, 500);
    
    // Reset input
    event.target.value = '';
}

function viewPhoto(index) {
    currentPhotoIndex = index;
    const photo = currentTripPhotos[index];
    
    if (!photo) return;
    
    document.getElementById('viewerImage').src = photo.url;
    showScreen('photoViewerScreen');
}

function closePhotoViewer() {
    showScreen('tripDetailsScreen');
}

function previousPhoto() {
    if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        document.getElementById('viewerImage').src = currentTripPhotos[currentPhotoIndex].url;
    }
}

function nextPhoto() {
    if (currentPhotoIndex < currentTripPhotos.length - 1) {
        currentPhotoIndex++;
        document.getElementById('viewerImage').src = currentTripPhotos[currentPhotoIndex].url;
    }
}

function backToTrips() {
    currentTripId = null;
    currentTripPhotos = [];
    showScreen('tripsScreen');
}

function showAddTrip() {
    document.getElementById('addTripModal').classList.add('active');
    setDefaultDates();
}

async function saveTrip(e) {
    e.preventDefault();
    
    const trip = {
        title: document.getElementById('tripTitle').value,
        startDate: document.getElementById('tripDate').value,
        distance: parseFloat(document.getElementById('tripDistance').value),
        duration: parseFloat(document.getElementById('tripDuration').value) || null,
        notes: document.getElementById('tripNotes').value
    };
    
    await db.addTrip(trip);
    
    // Reset form
    e.target.reset();
    closeModal('addTripModal');
    
    showToast('TOUR SALVATO');
    loadTrips();
}

// Garage
async function loadGarage() {
    if (!profile) {
        profile = await db.getProfile();
        if (!profile) return;
    }
    
    // Update bike info
    document.getElementById('bikeName').textContent = profile.bikeModel || 'R 850 GS';
    document.getElementById('bikeYearDisplay').textContent = profile.bikeYear || '2024';
    
    // Calculate current km from profile + trips
    const trips = await db.getAllTrips();
    const totalTripKm = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    const currentKm = (profile.currentKm || 0) + totalTripKm;
    document.getElementById('bikeKm').textContent = currentKm.toLocaleString('it-IT');
    
    // Load maintenance
    const maintenance = await db.getAllMaintenance();
    const maintenanceList = document.getElementById('maintenanceList');
    
    if (maintenance.length === 0) {
        maintenanceList.innerHTML = '<div class="empty-state-small"><p>Nessuna manutenzione</p></div>';
        document.getElementById('lastService').textContent = '-';
        document.getElementById('nextService').textContent = '-';
    } else {
        // Get last service
        const lastService = maintenance.find(m => m.type === 'service');
        if (lastService) {
            document.getElementById('lastService').textContent = formatDate(lastService.date);
            
            // Calculate next service (every 10,000 km)
            const nextServiceKm = Math.ceil(lastService.km / 10000) * 10000;
            const remainingKm = nextServiceKm - currentKm;
            document.getElementById('nextService').textContent = `${remainingKm} km`;
        }
        
        maintenanceList.innerHTML = maintenance.slice(0, 5).map(m => `
            <div class="maintenance-item">
                <div class="maintenance-header">
                    <span class="maintenance-type">${getMaintenanceTypeLabel(m.type)}</span>
                    <span class="maintenance-cost">${m.cost ? m.cost.toFixed(2) + ' €' : '-'}</span>
                </div>
                <div class="maintenance-meta">
                    <span>${formatDate(m.date)}</span>
                    <span>${m.km.toLocaleString('it-IT')} km</span>
                </div>
                ${m.notes ? `<div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">${m.notes}</div>` : ''}
            </div>
        `).join('');
    }
    
    // Load fuel
    const fuel = await db.getAllFuel();
    const fuelList = document.getElementById('fuelList');
    
    if (fuel.length === 0) {
        fuelList.innerHTML = '<div class="empty-state-small"><p>Nessun rifornimento</p></div>';
    } else {
        fuelList.innerHTML = fuel.slice(0, 5).map(f => `
            <div class="fuel-item">
                <div class="fuel-header">
                    <span class="fuel-date">${formatDate(f.date)}</span>
                    <span class="fuel-total">${f.totalCost.toFixed(2)} €</span>
                </div>
                <div class="fuel-meta">
                    <span>${f.liters.toFixed(1)} L</span>
                    <span>${FUEL_PRICE_PER_LITER.toFixed(2)} €/L</span>
                    <span>${f.km.toLocaleString('it-IT')} km</span>
                </div>
            </div>
        `).join('');
    }
}

function showAddMaintenance() {
    document.getElementById('addMaintenanceModal').classList.add('active');
    setDefaultDates();
    
    // Set current km as default
    if (profile) {
        document.getElementById('maintenanceKm').value = profile.currentKm;
    }
}

async function saveMaintenance(e) {
    e.preventDefault();
    
    const maintenance = {
        type: document.getElementById('maintenanceType').value,
        date: document.getElementById('maintenanceDate').value,
        km: parseInt(document.getElementById('maintenanceKm').value),
        cost: parseFloat(document.getElementById('maintenanceCost').value) || 0,
        notes: document.getElementById('maintenanceNotes').value
    };
    
    await db.addMaintenance(maintenance);
    
    e.target.reset();
    closeModal('addMaintenanceModal');
    
    showToast('MANUTENZIONE SALVATA');
    loadGarage();
}

function showAddFuel() {
    document.getElementById('addFuelModal').classList.add('active');
    setDefaultDates();
    
    // Set current km as default
    if (profile) {
        document.getElementById('fuelKm').value = profile.currentKm;
    }
}

function setupFuelCalculation() {
    const litersInput = document.getElementById('fuelLiters');
    
    function calculateTotal() {
        const liters = parseFloat(litersInput?.value) || 0;
        const total = liters * FUEL_PRICE_PER_LITER;
        const totalInput = document.getElementById('fuelTotal');
        if (totalInput) {
            totalInput.value = total.toFixed(2) + ' €';
        }
    }
    
    litersInput?.addEventListener('input', calculateTotal);
}

async function saveFuel(e) {
    e.preventDefault();
    
    const liters = parseFloat(document.getElementById('fuelLiters').value);
    
    const fuel = {
        date: document.getElementById('fuelDate').value,
        km: parseInt(document.getElementById('fuelKm').value),
        liters: liters,
        pricePerLiter: FUEL_PRICE_PER_LITER,
        totalCost: liters * FUEL_PRICE_PER_LITER,
        notes: ''
    };
    
    await db.addFuel(fuel);
    
    e.target.reset();
    closeModal('addFuelModal');
    
    showToast('RIFORNIMENTO SALVATO');
    loadGarage();
}

// Stats
async function loadStats() {
    const trips = await db.getAllTrips();
    const fuel = await db.getAllFuel();
    
    // Total trips
    document.getElementById('statTotalTrips').textContent = trips.length;
    
    // Total km
    const totalKm = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    document.getElementById('statTotalKm').textContent = totalKm.toLocaleString('it-IT');
    
    // Total hours
    const totalHours = trips.reduce((sum, trip) => sum + (trip.duration || 0), 0);
    document.getElementById('statTotalHours').textContent = totalHours.toFixed(1) + 'h';
    
    // Avg consumption
    if (fuel.length >= 2) {
        const totalLiters = fuel.reduce((sum, f) => sum + f.liters, 0);
        const avgConsumption = (totalLiters / totalKm) * 100;
        document.getElementById('statAvgConsumption').textContent = avgConsumption.toFixed(1) + ' L/100km';
    } else {
        document.getElementById('statAvgConsumption').textContent = '-';
    }
}

// Export/Import
async function exportData() {
    try {
        const data = await db.exportAllData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bmw-motorrad-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showToast('BACKUP ESPORTATO');
    } catch (error) {
        console.error('Export error:', error);
        showToast('ERRORE ESPORTAZIONE');
    }
}

function importData() {
    document.getElementById('importFile').click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const success = await db.importAllData(data);
        
        if (success) {
            showToast('BACKUP IMPORTATO');
            
            // Reload current screen
            if (currentScreen === 'tripsScreen') {
                loadTrips();
            } else if (currentScreen === 'garageScreen') {
                loadGarage();
            } else if (currentScreen === 'statsScreen') {
                loadStats();
            }
            
            // Reload profile
            profile = await db.getProfile();
            loadDashboardData();
        } else {
            showToast('ERRORE IMPORTAZIONE');
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('FILE NON VALIDO');
    }
    
    // Reset input
    event.target.value = '';
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('it-IT', options);
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    
    const dateInputs = [
        'tripDate',
        'maintenanceDate',
        'fuelDate'
    ];
    
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input && !input.value) {
            input.value = today;
        }
    });
}

function getMaintenanceTypeLabel(type) {
    const labels = {
        service: 'Tagliando',
        tire: 'Pneumatici',
        brake: 'Freni',
        chain: 'Catena',
        oil: 'Olio',
        other: 'Altro'
    };
    return labels[type] || type;
}

// Click outside modal to close
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Service Worker registration (for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
        }
