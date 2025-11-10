// BMW Soul - Main Application Logic

// State
let currentScreen = 'welcomeScreen';
let profile = null;
let selectedMood = '😊';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('BMW Soul - Initializing...');
    
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
    
    // Setup fuel calculation
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
        bikeModel: document.getElementById('bikeModel').value,
        bikeYear: parseInt(document.getElementById('bikeYear').value),
        currentKm: parseInt(document.getElementById('currentKm').value),
        plateNumber: document.getElementById('plateNumber').value
    };
    
    // Save profile
    await db.saveProfile(formData);
    profile = formData;
    
    // Show success toast
    showToast('Profilo salvato! 🎉');
    
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
            <div class="trip-card" onclick="showTripDetails('${trip.id}')">
                <div class="trip-header">
                    <div class="trip-title">${trip.title}</div>
                    <div class="trip-mood">${trip.mood || '😊'}</div>
                </div>
                <div class="trip-date">${formatDate(trip.startDate)}</div>
                <div class="trip-stats">
                    <div class="trip-stat">
                        <span class="trip-stat-icon">📏</span>
                        <span class="trip-stat-value">${trip.distance} km</span>
                    </div>
                    ${trip.duration ? `
                    <div class="trip-stat">
                        <span class="trip-stat-icon">⏱️</span>
                        <span class="trip-stat-value">${trip.duration}h</span>
                    </div>
                    ` : ''}
                </div>
                ${trip.notes ? `
                <div class="trip-notes">${trip.notes}</div>
                ` : ''}
            </div>
        `).join('');
    }
    
    loadDashboardData();
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
        notes: document.getElementById('tripNotes').value,
        mood: document.getElementById('tripMood').value
    };
    
    await db.addTrip(trip);
    
    // Reset form
    e.target.reset();
    closeModal('addTripModal');
    
    showToast('Viaggio salvato! 🏍️');
    loadTrips();
}

function showTripDetails(tripId) {
    // TODO: Implement trip details view
    showToast('Dettagli viaggio - Coming soon!');
}

// Mood selector
function selectMood(mood) {
    selectedMood = mood;
    document.getElementById('tripMood').value = mood;
    
    // Update UI
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.getAttribute('data-mood') === mood) {
            btn.classList.add('selected');
        }
    });
}

// Garage
async function loadGarage() {
    if (!profile) return;
    
    // Update bike info
    document.getElementById('bikeName').textContent = profile.bikeModel;
    document.getElementById('bikeYearDisplay').textContent = profile.bikeYear;
    
    // Calculate current km from profile + trips
    const trips = await db.getAllTrips();
    const totalTripKm = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
    const currentKm = (profile.currentKm || 0) + totalTripKm;
    document.getElementById('bikeKm').textContent = currentKm.toLocaleString('it-IT') + ' km';
    
    // Load maintenance
    const maintenance = await db.getAllMaintenance();
    const maintenanceList = document.getElementById('maintenanceList');
    
    if (maintenance.length === 0) {
        maintenanceList.innerHTML = '<div class="empty-state-small"><p>Nessuna manutenzione registrata</p></div>';
    } else {
        // Get last service
        const lastService = maintenance.find(m => m.type === 'service');
        if (lastService) {
            document.getElementById('lastService').textContent = formatDate(lastService.date);
            
            // Calculate next service (every 10,000 km)
            const nextServiceKm = Math.ceil(lastService.km / 10000) * 10000;
            const remainingKm = nextServiceKm - currentKm;
            document.getElementById('nextService').textContent = `tra ${remainingKm} km`;
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
                ${m.notes ? `<div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">${m.notes}</div>` : ''}
            </div>
        `).join('');
    }
    
    // Load fuel
    const fuel = await db.getAllFuel();
    const fuelList = document.getElementById('fuelList');
    
    if (fuel.length === 0) {
        fuelList.innerHTML = '<div class="empty-state-small"><p>Nessun rifornimento registrato</p></div>';
    } else {
        fuelList.innerHTML = fuel.slice(0, 5).map(f => `
            <div class="fuel-item">
                <div class="fuel-header">
                    <span class="fuel-date">${formatDate(f.date)}</span>
                    <span class="fuel-total">${f.totalCost.toFixed(2)} €</span>
                </div>
                <div class="fuel-meta">
                    <span>${f.liters.toFixed(1)} L</span>
                    <span>${f.pricePerLiter.toFixed(2)} €/L</span>
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
    
    showToast('Manutenzione salvata! 🔧');
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
    const priceInput = document.getElementById('fuelPrice');
    const totalInput = document.getElementById('fuelTotal');
    
    function calculateTotal() {
        const liters = parseFloat(litersInput?.value) || 0;
        const price = parseFloat(priceInput?.value) || 0;
        const total = liters * price;
        if (totalInput) {
            totalInput.value = total.toFixed(2) + ' €';
        }
    }
    
    litersInput?.addEventListener('input', calculateTotal);
    priceInput?.addEventListener('input', calculateTotal);
}

async function saveFuel(e) {
    e.preventDefault();
    
    const liters = parseFloat(document.getElementById('fuelLiters').value);
    const pricePerLiter = parseFloat(document.getElementById('fuelPrice').value);
    
    const fuel = {
        date: document.getElementById('fuelDate').value,
        km: parseInt(document.getElementById('fuelKm').value),
        liters: liters,
        pricePerLiter: pricePerLiter,
        totalCost: liters * pricePerLiter,
        notes: document.getElementById('fuelNotes').value
    };
    
    await db.addFuel(fuel);
    
    e.target.reset();
    closeModal('addFuelModal');
    
    showToast('Rifornimento salvato! ⛽');
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
        link.download = `bmw-soul-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        showToast('Backup esportato! 📥');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Errore durante l\'esportazione ❌');
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
            showToast('Backup importato! 📤');
            
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
            showToast('Errore durante l\'importazione ❌');
        }
    } catch (error) {
        console.error('Import error:', error);
        showToast('File non valido ❌');
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
