// BMW Motorrad Explorer - App Logic

// State
let currentScreen = 'mapScreen';
let map = null;
let userMarker = null;
let tripMarkers = [];
let restaurantMarkers = [];
let currentMapStyle = 'street';
let selectedRating = 3;
let selectedIcon = '🔗';
let currentRestaurantPosition = null;

// Initialize Explorer
document.addEventListener('DOMContentLoaded', () => {
    console.log('BMW Motorrad Explorer - Initializing...');
    
    // Initialize map
    initMap();
    
    // Load data from main app
    loadTripsData();
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
            },
            (error) => {
                console.log('Geolocation error:', error);
            }
        );
    }
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
                }
            },
            (error) => {
                showToast('GPS non disponibile');
            }
        );
    }
}

function toggleMapStyle() {
    // Toggle between different map styles
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

function showTripsList() {
    document.getElementById('tripsPanel').classList.add('active');
    loadMapTrips();
}

function closeTripsList() {
    document.getElementById('tripsPanel').classList.remove('active');
}

// Load Trips from main app
async function loadTripsData() {
    try {
        // Access the main app's database
        const trips = await db.getAllTrips();
        
        // Clear existing markers
        tripMarkers.forEach(marker => map.removeLayer(marker));
        tripMarkers = [];
        
        // Add markers for each trip
        trips.forEach(trip => {
            // For now, place markers randomly around Italy
            // In a real app, you'd save actual GPS coordinates with each trip
            const lat = 41 + Math.random() * 6;
            const lng = 8 + Math.random() * 10;
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'trip-marker',
                    html: '🏍️',
                    iconSize: [25, 25]
                })
            }).addTo(map);
            
            marker.bindPopup(`
                <div style="color: black;">
                    <strong>${trip.title}</strong><br>
                    ${formatDate(trip.startDate)}<br>
                    ${trip.distance} km
                </div>
            `);
            
            tripMarkers.push(marker);
        });
    } catch (error) {
        console.log('No trips data available');
    }
}

function loadMapTrips() {
    const tripsList = document.getElementById('mapTripsList');
    
    // Get trips from main app database
    db.getAllTrips().then(trips => {
        if (trips.length === 0) {
            tripsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessun viaggio</p>';
        } else {
            tripsList.innerHTML = trips.map(trip => `
                <div class="trip-map-item" onclick="focusOnTrip('${trip.id}')">
                    <div class="trip-map-title">${trip.title}</div>
                    <div class="trip-map-meta">
                        <span>${formatDate(trip.startDate)}</span>
                        <span>${trip.distance} km</span>
                    </div>
                </div>
            `).join('');
        }
    }).catch(error => {
        tripsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Errore caricamento</p>';
    });
}

function filterTrips(filter) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter trips based on selection
    // This would filter the trips list and markers
    showToast(`Filtro: ${filter}`);
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
        emptyState.style.display = 'flex';
    } else {
        emptyState.style.display = 'none';
        restaurantsList.innerHTML = restaurants.map(restaurant => `
            <div class="restaurant-card" onclick="showRestaurantOnMap('${restaurant.id}')">
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
        `).join('');
        
        // Add markers to map
        restaurantMarkers.forEach(marker => map.removeLayer(marker));
        restaurantMarkers = [];
        
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
                    <div style="color: black;">
                        <strong>${restaurant.name}</strong><br>
                        ${'⭐'.repeat(restaurant.rating)}<br>
                        ${restaurant.location}
                    </div>
                `);
                
                restaurantMarkers.push(marker);
            }
        });
    }
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
                <div class="restaurant-card" onclick="showRestaurantOnMap('${restaurant.id}')">
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
            `).join('');
        }
    });
}

function showRestaurantOnMap(id) {
    explorerDb.getRestaurant(id).then(restaurant => {
        if (restaurant.lat && restaurant.lng) {
            showScreen('mapScreen');
            map.setView([restaurant.lat, restaurant.lng], 16);
        }
    });
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
    
    // Separate links by category
    const forumLinks = links.filter(l => l.category === 'forum');
    const resourceLinks = links.filter(l => l.category === 'resource');
    const customLinks = links.filter(l => l.category === 'custom');
    
    // Add to forum section (after preset links)
    const forumContainer = document.getElementById('forumLinks');
    forumLinks.forEach(link => {
        const linkElement = createLinkElement(link);
        forumContainer.appendChild(linkElement);
    });
    
    // Add to resource section
    const resourceContainer = document.getElementById('resourceLinks');
    if (resourceLinks.length === 0) {
        resourceContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nessun link</p>';
    } else {
        resourceContainer.innerHTML = '';
        resourceLinks.forEach(link => {
            const linkElement = createLinkElement(link);
            resourceContainer.appendChild(linkElement);
        });
    }
    
    // Add to custom section
    const customContainer = document.getElementById('customLinks');
    if (customLinks.length === 0) {
        customContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Nessun link personale</p>';
    } else {
        customContainer.innerHTML = '';
        customLinks.forEach(link => {
            const linkElement = createLinkElement(link);
            customContainer.appendChild(linkElement);
        });
    }
}

function createLinkElement(link) {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.className = 'link-card';
    a.innerHTML = `
        <span class="link-icon">${link.icon}</span>
        <span class="link-name">${link.name}</span>
    `;
    return a;
}

// Tools Functions
function showTireCalculator() {
    showToast('Calcolatore pressione gomme - Coming soon');
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
        
        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-screen') === screenId) {
                item.classList.add('active');
            }
        });
        
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
