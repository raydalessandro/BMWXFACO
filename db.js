// BMW Soul - Database Layer (IndexedDB)

class BMWDatabase {
    constructor() {
        this.dbName = 'bmw-soul-db';
        this.version = 1;
        this.db = null;
    }

    // Inizializza il database
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
                
                // Profile store
                if (!db.objectStoreNames.contains('profile')) {
                    db.createObjectStore('profile', { keyPath: 'id' });
                }
                
                // Trips store
                if (!db.objectStoreNames.contains('trips')) {
                    const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
                    tripStore.createIndex('date', 'startDate', { unique: false });
                    tripStore.createIndex('distance', 'distance', { unique: false });
                }
                
                // Maintenance store
                if (!db.objectStoreNames.contains('maintenance')) {
                    const maintStore = db.createObjectStore('maintenance', { keyPath: 'id' });
                    maintStore.createIndex('date', 'date', { unique: false });
                    maintStore.createIndex('km', 'km', { unique: false });
                    maintStore.createIndex('type', 'type', { unique: false });
                }
                
                // Fuel store
                if (!db.objectStoreNames.contains('fuel')) {
                    const fuelStore = db.createObjectStore('fuel', { keyPath: 'id' });
                    fuelStore.createIndex('date', 'date', { unique: false });
                    fuelStore.createIndex('km', 'km', { unique: false });
                }
                
                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
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

    // Clear all data from store
    async clear(storeName) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Profile methods
    async saveProfile(profile) {
        profile.id = 'main-profile';
        return this.update('profile', profile);
    }

    async getProfile() {
        return this.get('profile', 'main-profile');
    }

    // Trip methods
    async addTrip(trip) {
        trip.id = 'trip-' + Date.now();
        trip.createdAt = new Date().toISOString();
        return this.add('trips', trip);
    }

    async getAllTrips() {
        const trips = await this.getAll('trips');
        return trips.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    async deleteTrip(id) {
        return this.delete('trips', id);
    }

    // Maintenance methods
    async addMaintenance(maintenance) {
        maintenance.id = 'maint-' + Date.now();
        maintenance.createdAt = new Date().toISOString();
        return this.add('maintenance', maintenance);
    }

    async getAllMaintenance() {
        const maintenance = await this.getAll('maintenance');
        return maintenance.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async deleteMaintenance(id) {
        return this.delete('maintenance', id);
    }

    // Fuel methods
    async addFuel(fuel) {
        fuel.id = 'fuel-' + Date.now();
        fuel.createdAt = new Date().toISOString();
        return this.add('fuel', fuel);
    }

    async getAllFuel() {
        const fuel = await this.getAll('fuel');
        return fuel.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async deleteFuel(id) {
        return this.delete('fuel', id);
    }

    // Export all data
    async exportAllData() {
        await this.init();
        const data = {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            profile: await this.getProfile(),
            trips: await this.getAllTrips(),
            maintenance: await this.getAllMaintenance(),
            fuel: await this.getAllFuel()
        };
        return data;
    }

    // Import all data
    async importAllData(data) {
        try {
            await this.init();
            
            // Clear existing data
            await this.clear('trips');
            await this.clear('maintenance');
            await this.clear('fuel');
            
            // Import profile
            if (data.profile) {
                await this.saveProfile(data.profile);
            }
            
            // Import trips
            if (data.trips && data.trips.length > 0) {
                for (const trip of data.trips) {
                    await this.add('trips', trip);
                }
            }
            
            // Import maintenance
            if (data.maintenance && data.maintenance.length > 0) {
                for (const maint of data.maintenance) {
                    await this.add('maintenance', maint);
                }
            }
            
            // Import fuel
            if (data.fuel && data.fuel.length > 0) {
                for (const fuel of data.fuel) {
                    await this.add('fuel', fuel);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }
}

// Create global instance
const db = new BMWDatabase();
