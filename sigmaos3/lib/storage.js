// This file is part AI

const contextModule = await import('./context.js');

export const storageLib = (() => {
    let dbInstance = null;
    let activeContext = null;

    const STORE_CONFIG = {
        apps: { keyPath: "id" },
        settings: { keyPath: "id" },
        keyval: {}
    };

    const promisifyRequest = (request, { onSuccess } = {}) =>
        new Promise((resolve, reject) => {
            request.onsuccess = (event) => {
                const result = onSuccess
                    ? onSuccess(event)
                    : event.target.result;

                resolve(result);
            };

            request.onerror = (event) => reject(event.target.error);
        });

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

                for (const [name, options] of Object.entries(STORE_CONFIG)) {
                    if (!db.objectStoreNames.contains(name)) {
                        db.createObjectStore(name, options);
                    }
                }

                console.log("IndexedDB setup complete");
            };
        });
    };

    const getStore = async (storeName, mode = "readonly") => {
        const db = await initDB();
        return db.transaction(storeName, mode).objectStore(storeName);
    };

    const request = async (storeName, mode, operation) => {
        const store = await getStore(storeName, mode);
        return promisifyRequest(operation(store));
    };

    const put = (storeName, value, key) =>
        request(storeName, "readwrite", (store) =>
            key === undefined
                ? store.put(value)
                : store.put(value, key)
        ).then(() => undefined);

    const get = (storeName, key) =>
        request(storeName, "readonly", (store) => store.get(key));

    const remove = (storeName, key) =>
        request(storeName, "readwrite", (store) => store.delete(key))
            .then(() => undefined);

    const clear = (storeName) =>
        request(storeName, "readwrite", (store) => store.clear())
            .then(() => undefined);

    const getAll = (storeName) =>
        request(storeName, "readonly", (store) => store.getAll());

    const publishKeyvalUpdate = (key, value) => {
        window.messagingLib?.publish?.("keyvalUpdate", { key, value });
    };

    const getAllKeyval = async () => {
        const store = await getStore("keyval");

        return new Promise((resolve, reject) => {
            const result = {};
            const req = store.openCursor();

            req.onsuccess = (event) => {
                const cursor = event.target.result;

                if (!cursor) {
                    resolve(result);
                    return;
                }

                result[cursor.primaryKey] = cursor.value;
                cursor.continue();
            };

            req.onerror = (event) => reject(event.target.error);
        });
    };

    return {
        saveApp: (app) => put("apps", app),
        getApp: (id) => get("apps", id),
        deleteApp: (id) => remove("apps", id),
        clearApps: () => clear("apps"),
        getAllApps: () => getAll("apps"),

        saveSetting: (setting) => put("settings", setting),
        getSetting: (id) => get("settings", id),
        deleteSetting: (id) => remove("settings", id),
        getAllSettings: () => getAll("settings"),

        saveTheme: (theme) => put("themes", theme, "theme"),
        getTheme: () => get("themes", "theme"),
        deleteTheme: () => remove("themes", "theme"),
        getAllThemes: () => getAll("themes"),

        getAllKeyval,

        storeData: async (key, value) => {
            await put("keyval", value, key);
            publishKeyvalUpdate(key, value);
        },

        getData: (key) => get("keyval", key),

        deleteData: async (key) => {
            await remove("keyval", key);
            publishKeyvalUpdate(key, null);
        },

        clearAllData: async () => {
            await clear("keyval");
            publishKeyvalUpdate(null, null);
        }
    };
})();