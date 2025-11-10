// BMW Motorrad Explorer - App Logic

// State
let currentScreen = 'homeScreen';
let map = null;
let userMarker = null;
let restaurantMarkers = [];
let currentMapStyle = 'street';
let selectedRating = 3;
let selectedIcon = '🔗';
let currentRestaurantPosition = null;

// Initialize Explorer
document.addEventListener('DOMContentLoaded', () => {
    console.log('BMW Motorrad Explorer - Initializing...');
    
    // Load data
    loadRestaurants();
    loadLinks();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if returning from main app
    if (localStorage.getItem('returnFromExplorer')) {
        localStorage.removeItem('returnFromExplorer');
    }
});

// Map Functions
function openMap() {
    showScreen('mapScreen');
    
    // Initialize map only when needed
    if (!map) {
        initMap();
    } else {
        // Refresh map size
        setTimeout(() => {
            map.invalidateSize();
            loadRestaurantsOnMap();
        }, 100);
    }
}

function closeMap() {
    showScreen('homeScreen');
}

function initMap() {
    // Initialize Leaflet map
    map = L.map('mainMap').setView([44.6488, 10.9186], 6); // Italia centrale
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Try to get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 13);
                
                // Add user marker
                userMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'user-marker',
                        html: '📍',
                        iconSize: [30, 30]
                    })
                }).addTo(map);
                
                userMarker.bindPopup('La tua posizione');
            },
            (error) => {
                console.log('Geolocation error:', error);
            }
        );
    }
    
    // Load restaurants on map
    loadRestaurantsOnMap();
}

function centerMapOnUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 15);
                
                if (userMarker) {
                    userMarker.setLatLng([lat, lng]);
                } else {
                    userMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'user-marker',
                            html: '📍',
                            iconSize: [30, 30]
                        })
                    }).addTo(map);
                    userMarker.bindPopup('La tua posizione');
                }
                
                // Find nearby restaurants
                findNearbyRestaurants(lat, lng);
            },
            (error) => {
                showToast('GPS non disponibile');
            }
        );
    }
}

function toggleMapStyle() {
    if (currentMapStyle === 'street') {
        // Switch to satellite
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        }).addTo(map);
        currentMapStyle = 'satellite';
    } else {
        // Switch back to street
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        currentMapStyle = 'street';
    }
}

async function loadRestaurantsOnMap() {
    if (!map) return;
    
    // Clear existing markers
    restaurantMarkers.forEach(marker => map.removeLayer(marker));
    restaurantMarkers = [];
    
    const restaurants = await explorerDb.getAllRestaurants();
    
    restaurants.forEach(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            const marker = L.marker([restaurant.lat, restaurant.lng], {
                icon: L.divIcon({
                    className: 'restaurant-marker',
                    html: getRestaurantTypeIcon(restaurant.type),
                    iconSize: [25, 25]
                })
            }).addTo(map);
            
            marker.bindPopup(`
                <div style="color: black; min-width: 200px;">
                    <strong>${restaurant.name}</strong><br>
                    ${'⭐'.repeat(restaurant.rating)}<br>
                    📍 ${restaurant.location}<br>
                    ${restaurant.notes ? `<br><small>${restaurant.notes}</small>` : ''}
                </div>
            `);
            
            restaurantMarkers.push(marker);
        }
    });
}

function findNearbyRestaurants(userLat, userLng) {
    explorerDb.getAllRestaurants().then(restaurants => {
        const nearby = restaurants.filter(r => {
            if (r.lat && r.lng) {
                const distance = calculateDistance(userLat, userLng, r.lat, r.lng);
                return distance < 50; // 50 km radius
            }
            return false;
        });
        
        if (nearby.length > 0) {
            showToast(`${nearby.length} ristoranti nelle vicinanze`);
        }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Restaurant Functions
function showAddRestaurant() {
    document.getElementById('addRestaurantModal').classList.add('active');
    setupRatingSelector();
}

function setupRatingSelector() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            selectedRating = rating;
            document.getElementById('restaurantRating').value = rating;
            
            // Update visual state
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
        });
    });
    
    // Set initial rating
    stars.forEach((s, index) => {
        if (index < selectedRating) {
            s.classList.add('selected');
        }
    });
}

function getRestaurantLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentRestaurantPosition = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                document.getElementById('restaurantLat').value = position.coords.latitude;
                document.getElementById('restaurantLng').value = position.coords.longitude;
                showToast('Posizione acquisita');
            },
            (error) => {
                showToast('GPS non disponibile');
            }
        );
    }
}

async function loadRestaurants() {
    const restaurants = await explorerDb.getAllRestaurants();
    const restaurantsList = document.getElementById('restaurantsList');
    const emptyState = document.getElementById('emptyRestaurants');
    
    if (restaurants.length === 0) {
        restaurantsList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        restaurantsList.innerHTML = restaurants.map(restaurant => `
            <div class="restaurant-card">
                <div class="restaurant-content" onclick="viewRestaurantDetails('${restaurant.id}')">
                    <div class="restaurant-header">
                        <div class="restaurant-name">${restaurant.name}</div>
                        <div class="restaurant-rating">${'⭐'.repeat(restaurant.rating)}</div>
                    </div>
                    <div class="restaurant-meta">
                        <span>${getRestaurantTypeIcon(restaurant.type)} ${getRestaurantTypeLabel(restaurant.type)}</span>
                        <span>📍 ${restaurant.location}</span>
                    </div>
                    ${restaurant.notes ? `<div class="restaurant-notes">${restaurant.notes}</div>` : ''}
                </div>
                <div class="restaurant-actions">
                    ${restaurant.lat && restaurant.lng ? `
                        <button class="btn-action" onclick="showOnMap(${restaurant.lat}, ${restaurant.lng}); event.stopPropagation();">
                            🗺️
                        </button>
                    ` : ''}
                    <button class="btn-action btn-danger" onclick="deleteRestaurant('${restaurant.id}'); event.stopPropagation();">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
}

async function deleteRestaurant(id) {
    if (confirm('Eliminare questo ristorante?')) {
        await explorerDb.deleteRestaurant(id);
        showToast('RISTORANTE ELIMINATO');
        loadRestaurants();
        
        // Reload map markers if map is open
        if (map) {
            loadRestaurantsOnMap();
        }
    }
}

function showOnMap(lat, lng) {
    openMap();
    setTimeout(() => {
        map.setView([lat, lng], 16);
    }, 300);
}

function viewRestaurantDetails(id) {
    explorerDb.getRestaurant(id).then(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            showOnMap(restaurant.lat, restaurant.lng);
        } else {
            showToast('Posizione non disponibile');
        }
    });
}

function filterRestaurants(filter) {
    // Update active filter
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter restaurants
    explorerDb.getAllRestaurants().then(restaurants => {
        let filtered = restaurants;
        
        if (filter === '5stars') {
            filtered = restaurants.filter(r => r.rating === 5);
        } else if (filter !== 'all') {
            filtered = restaurants.filter(r => r.type === filter);
        }
        
        const restaurantsList = document.getElementById('restaurantsList');
        if (filtered.length === 0) {
            restaurantsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Nessun ristorante trovato</p>';
        } else {
            restaurantsList.innerHTML = filtered.map(restaurant => `
                <div class="restaurant-card">
                    <div class="restaurant-content" onclick="viewRestaurantDetails('${restaurant.id}')">
                        <div class="restaurant-header">
                            <div class="restaurant-name">${restaurant.name}</div>
                            <div class="restaurant-rating">${'⭐'.repeat(restaurant.rating)}</div>
                        </div>
                        <div class="restaurant-meta">
                            <span>${getRestaurantTypeIcon(restaurant.type)} ${getRestaurantTypeLabel(restaurant.type)}</span>
                            <span>📍 ${restaurant.location}</span>
                        </div>
                        ${restaurant.notes ? `<div class="restaurant-notes">${restaurant.notes}</div>` : ''}
                    </div>
                    <div class="restaurant-actions">
                        ${restaurant.lat && restaurant.lng ? `
                            <button class="btn-action" onclick="showOnMap(${restaurant.lat}, ${restaurant.lng}); event.stopPropagation();">
                                🗺️
                            </button>
                        ` : ''}
                        <button class="btn-action btn-danger" onclick="deleteRestaurant('${restaurant.id}'); event.stopPropagation();">
                            🗑️
                        </button>
                    </div>
                </div>
            `).join('');
        }
    });
}

function showAllRestaurants() {
    // Reset filter and show all
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('active');
    });
    document.querySelector('.chip').classList.add('active');
    loadRestaurants();
}

// Links Functions
function showAddLink() {
    document.getElementById('addLinkModal').classList.add('active');
    setupIconSelector();
}

function setupIconSelector() {
    const icons = document.querySelectorAll('.icon-btn');
    icons.forEach(icon => {
        icon.addEventListener('click', function() {
            selectedIcon = this.dataset.icon;
            document.getElementById('linkIcon').value = selectedIcon;
            
            // Update visual state
            icons.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

async function loadLinks() {
    const links = await explorerDb.getAllLinks();
    
    // Show first 2 user links in preview
    const userLinksPreview = document.getElementById('userLinksPreview');
    const userLinks = links.slice(0, 2);
    
    if (userLinks.length > 0) {
        userLinksPreview.innerHTML = userLinks.map(link => `
            <a href="${link.url}" target="_blank" class="link-card-small">
                <span class="link-icon">${link.icon}</span>
                <span class="link-name">${link.name}</span>
            </a>
        `).join('');
    }
}

// Tools Functions
function showTireCalculator() {
    showToast('Calcolatore pressione - Coming soon');
}

function showFuelCalculator() {
    showToast('Calcolatore autonomia - Coming soon');
}

function showPackingList() {
    showToast('Checklist viaggio - Coming soon');
}

function showWeather() {
    showToast('Meteo percorso - Coming soon');
}

function showEmergency() {
    showToast('Numeri utili - Coming soon');
}

function showConverter() {
    showToast('Convertitore - Coming soon');
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        currentScreen = screenId;
        
        // Refresh map if going to map screen
        if (screenId === 'mapScreen' && map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }
}

// Form Submissions
document.getElementById('addRestaurantForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const restaurant = {
        name: document.getElementById('restaurantName').value,
        location: document.getElementById('restaurantLocation').value,
        type: document.getElementById('restaurantType').value,
        rating: parseInt(document.getElementById('restaurantRating').value),
        notes: document.getElementById('restaurantNotes').value,
        lat: parseFloat(document.getElementById('restaurantLat').value) || null,
        lng: parseFloat(document.getElementById('restaurantLng').value) || null
    };
    
    await explorerDb.addRestaurant(restaurant);
    
    // Reset form
    e.target.reset();
    closeModal('addRestaurantModal');
    
    showToast('RISTORANTE SALVATO');
    loadRestaurants();
    
    // Reload map markers if map exists
    if (map) {
        loadRestaurantsOnMap();
    }
});

document.getElementById('addLinkForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const link = {
        name: document.getElementById('linkName').value,
        url: document.getElementById('linkUrl').value,
        category: document.getElementById('linkCategory').value,
        icon: document.getElementById('linkIcon').value
    };
    
    await explorerDb.addLink(link);
    
    // Reset form
    e.target.reset();
    closeModal('addLinkModal');
    
    showToast('LINK SALVATO');
    loadLinks();
});

// Event Listeners
function setupEventListeners() {
    // Click outside modal to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Utility Functions
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

function getRestaurantTypeIcon(type) {
    const icons = {
        pizza: '🍕',
        traditional: '🍝',
        quick: '⚡',
        gourmet: '🍷',
        bar: '☕'
    };
    return icons[type] || '🍽️';
}

function getRestaurantTypeLabel(type) {
    const labels = {
        pizza: 'Pizzeria',
        traditional: 'Tradizionale',
        quick: 'Fast Food',
        gourmet: 'Gourmet',
        bar: 'Bar/Caffè'
    };
    return labels[type] || type;
}

// Navigation function to go back to main app
function goBackToMain() {
    window.location.href = 'index.html';
}
