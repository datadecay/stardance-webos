export const storageLib = (() => {
    let dbInstance = null;

    const initDB = () => {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = window.indexedDB.open("sigmaOS", 1);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                console.log("IndexedDB initialized");
                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("apps")) {
                    db.createObjectStore("apps", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings", { keyPath: "id" });
                }
                console.log("IndexedDB setup complete");
            };
        });
    };

    const getStore = async (storeName, mode) => {
        const db = await initDB(); 
        const transaction = db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    };

    return {
        async saveApp(app) {
            const store = await getStore("apps", "readwrite");
            return new Promise((resolve, reject) => {
                const req = store.put(app);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async getApp(id) {
            const store = await getStore("apps", "readonly");
            return new Promise((resolve, reject) => {
                const req = store.get(id);
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async deleteApp(id) {
            const store = await getStore("apps", "readwrite");
            return new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async getAllApps() {
            const store = await getStore("apps", "readonly");
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        },

        async saveSetting(setting) {
            const store = await getStore("settings", "readwrite");
            return new Promise((resolve, reject) => {
                const req = store.put(setting);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async getSetting(id) {
            const store = await getStore("settings", "readonly");
            return new Promise((resolve, reject) => {
                const req = store.get(id);
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async deleteSetting(id) {
            const store = await getStore("settings", "readwrite");
            return new Promise((resolve, reject) => {
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            });
        },
        async getAllSettings() {
            const store = await getStore("settings", "readonly");
            return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = (e) => reject(e.target.error);
            });
        }
    };
})();