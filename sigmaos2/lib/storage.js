// This file is part AI

const contextModule = await import('./context.js');

export const storageLib = (() => {
    let dbInstance = null;
    let activeContext = null;

    const initDB = async () => {
        const currentContext = await contextModule.getStorageContext();

        if (dbInstance && activeContext !== currentContext) {
            dbInstance.close();
            dbInstance = null;
        }

        if (dbInstance) return dbInstance;
        activeContext = currentContext;

        return new Promise((resolve, reject) => {
            const dbName = `${currentContext}_sigmaOS`;
            const request = window.indexedDB.open(dbName, 2);

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
                if (!db.objectStoreNames.contains("keyval")) {
                    db.createObjectStore("keyval");
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
        async clearApps() {
            const store = await getStore("apps", "readwrite");
            return new Promise((resolve, reject) => {
                const req = store.clear();
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
        },
        async getAllKeyval() {
            const store = await getStore("keyval", "readonly");
            return new Promise((resolve, reject) => {
                const resultDict = {};
                const req = store.openCursor();
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        resultDict[cursor.primaryKey] = cursor.value;
                        cursor.continue();
                    } else {
                        resolve(resultDict);
                    }
                };
                req.onerror = (e) => reject(e.target.error); 
            });
        },
        async storeData(key, value) {
            const db = await initDB();
            const transaction = db.transaction(["keyval"], "readwrite");
            const store = transaction.objectStore("keyval");
            return new Promise((resolve, reject) => {
                const request = store.put(value, key);
                request.onsuccess = () => {
                    if (window.messagingLib?.publish) {
                        window.messagingLib.publish("keyvalUpdate", { key, value });
                    }
                    resolve();
                };
                request.onerror = (e) => reject(e.target.error);
            });
        },
        async getData(key) {
            const db = await initDB();
            const transaction = db.transaction(["keyval"], "readonly");
            const store = transaction.objectStore("keyval");
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e.target.error);
            });
        },
        async deleteData(key) {
            const db = await initDB();
            const transaction = db.transaction(["keyval"], "readwrite");
            const store = transaction.objectStore("keyval");
            return new Promise((resolve, reject) => {
                const request = store.delete(key);
                request.onsuccess = () => {
                    if (window.messagingLib?.publish) {
                        window.messagingLib.publish("keyvalUpdate", { key, value: null });
                    }
                    resolve();
                };
                request.onerror = (e) => reject(e.target.error);
            });
        },
        async clearAllData() {
            const db = await initDB();
            const transaction = db.transaction(["keyval"], "readwrite");
            const store = transaction.objectStore("keyval");
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => {
                    if (window.messagingLib?.publish) {
                        window.messagingLib.publish("keyvalUpdate", { key: null, value: null });
                    }
                    resolve();
                };
                request.onerror = (e) => reject(e.target.error);
            });
        }
    };
})();