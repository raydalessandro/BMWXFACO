// BMW Motorrad Explorer - Database Layer

class ExplorerDatabase {
    constructor() {
        this.dbName = 'bmw-explorer-db';
        this.version = 1;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Restaurants store
                if (!db.objectStoreNames.contains('restaurants')) {
                    const restaurantStore = db.createObjectStore('restaurants', { keyPath: 'id' });
                    restaurantStore.createIndex('type', 'type', { unique: false });
                    restaurantStore.createIndex('rating', 'rating', { unique: false });
                    restaurantStore.createIndex('location', 'location', { unique: false });
                }
                
                // Links store
                if (!db.objectStoreNames.contains('links')) {
                    const linksStore = db.createObjectStore('links', { keyPath: 'id' });
                    linksStore.createIndex('category', 'category', { unique: false });
                }
                
                // Waypoints store (for map markers)
                if (!db.objectStoreNames.contains('waypoints')) {
                    const waypointStore = db.createObjectStore('waypoints', { keyPath: 'id' });
                    waypointStore.createIndex('tripId', 'tripId', { unique: false });
                    waypointStore.createIndex('type', 'type', { unique: false });
                }
                
                // Tools preferences store
                if (!db.objectStoreNames.contains('toolsPrefs')) {
                    db.createObjectStore('toolsPrefs', { keyPath: 'id' });
                }
                
                // Emergency contacts store
                if (!db.objectStoreNames.contains('emergencyContacts')) {
                    const emergencyStore = db.createObjectStore('emergencyContacts', { keyPath: 'id' });
                    emergencyStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Generic add method
    async add(storeName, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic get method
    async get(storeName, id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic getAll method
    async getAll(storeName) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic update method
    async update(storeName, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic delete method
    async delete(storeName, id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Restaurant methods
    async addRestaurant(restaurant) {
        restaurant.id = 'rest-' + Date.now();
        restaurant.createdAt = new Date().toISOString();
        return this.add('restaurants', restaurant);
    }

    async getRestaurant(id) {
        return this.get('restaurants', id);
    }

    async getAllRestaurants() {
        const restaurants = await this.getAll('restaurants');
        return restaurants.sort((a, b) => b.rating - a.rating);
    }

    async getRestaurantsByType(type) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['restaurants'], 'readonly');
            const store = transaction.objectStore('restaurants');
            const index = store.index('type');
            const request = index.getAll(type);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRestaurant(id) {
        return this.delete('restaurants', id);
    }

    // Links methods
    async addLink(link) {
        link.id = 'link-' + Date.now();
        link.createdAt = new Date().toISOString();
        return this.add('links', link);
    }

    async getAllLinks() {
        const links = await this.getAll('links');
        return links.sort((a, b) => {
            // Sort by category then by name
            if (a.category === b.category) {
                return a.name.localeCompare(b.name);
            }
            return a.category.localeCompare(b.category);
        });
    }

    async deleteLink(id) {
        return this.delete('links', id);
    }

    // Waypoints methods
    async addWaypoint(waypoint) {
        waypoint.id = 'wp-' + Date.now();
        waypoint.createdAt = new Date().toISOString();
        return this.add('waypoints', waypoint);
    }

    async getWaypointsByTrip(tripId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['waypoints'], 'readonly');
            const store = transaction.objectStore('waypoints');
            const index = store.index('tripId');
            const request = index.getAll(tripId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllWaypoints() {
        return this.getAll('waypoints');
    }

    async deleteWaypoint(id) {
        return this.delete('waypoints', id);
    }

    // Emergency Contacts methods
    async addEmergencyContact(contact) {
        contact.id = 'emergency-' + Date.now();
        return this.add('emergencyContacts', contact);
    }

    async getAllEmergencyContacts() {
        const contacts = await this.getAll('emergencyContacts');
        return contacts.sort((a, b) => a.name.localeCompare(b.name));
    }

    async deleteEmergencyContact(id) {
        return this.delete('emergencyContacts', id);
    }

    // Tools Preferences methods
    async saveToolPref(pref) {
        pref.id = pref.toolName; // Use tool name as ID for easy retrieval
        return this.update('toolsPrefs', pref);
    }

    async getToolPref(toolName) {
        return this.get('toolsPrefs', toolName);
    }

    async getAllToolPrefs() {
        return this.getAll('toolsPrefs');
    }

    // Initialize default emergency contacts
    async initializeDefaults() {
        await this.init();
        
        // Check if defaults already exist
        const contacts = await this.getAllEmergencyContacts();
        if (contacts.length === 0) {
            // Add default emergency contacts
            const defaults = [
                {
                    id: 'default-1',
                    name: 'Soccorso Stradale BMW',
                    number: '800 123 456',
                    type: 'assistance'
                },
                {
                    id: 'default-2',
                    name: 'Emergenza',
                    number: '112',
                    type: 'emergency'
                },
                {
                    id: 'default-3',
                    name: 'ACI Soccorso',
                    number: '803 116',
                    type: 'assistance'
                }
            ];
            
            for (const contact of defaults) {
                await this.add('emergencyContacts', contact);
            }
        }
    }

    // Export Explorer data
    async exportExplorerData() {
        await this.init();
        const data = {
            exportDate: new Date().toISOString(),
            restaurants: await this.getAllRestaurants(),
            links: await this.getAllLinks(),
            waypoints: await this.getAllWaypoints(),
            emergencyContacts: await this.getAllEmergencyContacts(),
            toolsPrefs: await this.getAllToolPrefs()
        };
        return data;
    }

    // Import Explorer data
    async importExplorerData(data) {
        try {
            await this.init();
            
            // Import restaurants
            if (data.restaurants && data.restaurants.length > 0) {
                for (const restaurant of data.restaurants) {
                    await this.add('restaurants', restaurant);
                }
            }
            
            // Import links
            if (data.links && data.links.length > 0) {
                for (const link of data.links) {
                    await this.add('links', link);
                }
            }
            
            // Import waypoints
            if (data.waypoints && data.waypoints.length > 0) {
                for (const waypoint of data.waypoints) {
                    await this.add('waypoints', waypoint);
                }
            }
            
            // Import emergency contacts
            if (data.emergencyContacts && data.emergencyContacts.length > 0) {
                for (const contact of data.emergencyContacts) {
                    await this.add('emergencyContacts', contact);
                }
            }
            
            // Import tools preferences
            if (data.toolsPrefs && data.toolsPrefs.length > 0) {
                for (const pref of data.toolsPrefs) {
                    await this.update('toolsPrefs', pref);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }
}

// Create global instance for Explorer
const explorerDb = new ExplorerDatabase();

// Initialize defaults on load
explorerDb.initializeDefaults();
