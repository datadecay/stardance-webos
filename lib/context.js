const store = window.localStorage;

export async function getStorageContext() {
    if (!store) return 'local';
    const context = store.getItem('idb_context');
    return context || 'local';
}

export async function setStorageContext(context) {
    if (!context) throw new Error("Invalid storage context.");
    store.setItem('idb_context', context);
}