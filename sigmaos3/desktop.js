// This file is part AI

const BACKEND_URL = 'https://slunga.westus2.cloudapp.azure.com:8095';

const themeModule = await import("./lib/theme.js");
const storageModule = await import("./lib/storage.js");
const messagingModule = await import("./lib/messaging.js");
const contextModule = await import("./lib/context.js");


export async function initializeDesktop() {
    const session = JSON.parse(localStorage.getItem('user_session'));
    const storageLib = storageModule.storageLib;

    const usernameDisplay = document.getElementsByClassName('username');
    const logoutButton = document.getElementById('logout-button');
    const noLogin = window.localStorage.getItem('nolog') == "nolog";
    const popupModule = await import("./lib/popup.js");
    if (!noLogin && (!session || !session.user || !session.token)) {
        window.location.href = './authenticate.html';
        return;
    }

    const accessToken = session?.token;

    await contextModule.setStorageContext(session?.user?.identity?.id || 'local');
    console.log(`using context: ${await contextModule.getStorageContext()}`);

    if (usernameDisplay) {
        const firstName = session?.user?.identity?.first_name || null;
        for (let i = 0; i < usernameDisplay.length; i++) {
            usernameDisplay[i].textContent = firstName || session?.user?.name || 'Local User';
        }
    }

    window.loadOSLayout = async () => {
        if (noLogin) return;
        try {
            console.log("Fetching roaming profile...");

            const response = await fetch(`${BACKEND_URL}/api/load-state`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            const result = await response.json();

            if (result.success && result.data) {
                const stateData = result.data;

                localStorage.setItem('os_state', JSON.stringify(stateData));

                if (storageLib && typeof storageLib.saveSetting === 'function') {
                    await storageLib.saveSetting({ id: "theme-color", value: stateData.themeColor || "" });
                    await storageLib.saveSetting({ id: "theme-color2", value: stateData.themeColor2 || "" });
                    await storageLib.saveSetting({ id: "theme-image", value: stateData.themeImage || "" });
                    await storageLib.clearAllData();
                    await storageLib.clearApps();
                    await Promise.all((stateData.apps || []).map(app => storageLib.saveApp(app)));
                    await Promise.all((stateData.kv || []).map(([key, value]) => storageLib.storeData(key, value)));

                    if (typeof storageLib.saveApp === 'function' && stateData.windows) {
                        await storageLib.saveApp({ id: "open-apps", windows: stateData.windows });
                    }
                }
                console.log("Roaming profile loaded");
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
        }
    };

    window.saveCurrentOSLayout = async () => {
        if (noLogin) return;
        if (!storageLib || typeof storageLib.getSetting !== 'function') return;

        try {
            const currentPrimary = await storageLib.getSetting("theme-color");
            const currentSecondary = await storageLib.getSetting("theme-color2");
            const currentImage = await storageLib.getSetting("theme-image");
            const loadedApps = await storageLib.getAllApps();
            const rawKvData = await storageLib.getAllKeyval();
            const kv = rawKvData ? Object.entries(rawKvData) : [];

            const layoutPayload = {
                themeColor: (currentPrimary && typeof currentPrimary === 'object' ? currentPrimary.value : currentPrimary) || "",
                themeColor2: (currentSecondary && typeof currentSecondary === 'object' ? currentSecondary.value : currentSecondary) || "",
                themeImage: (currentImage && typeof currentImage === 'object' ? currentImage.value : currentImage) || "",
                apps: loadedApps || [],
                kv: kv || []
            };

            console.log("Uploading roaming profile", layoutPayload);

            const response = await fetch(`${BACKEND_URL}/api/save-state`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    data: layoutPayload
                })
            });

            const result = await response.json();
            if (result.success) {
                localStorage.setItem('os_state', JSON.stringify(layoutPayload));
                console.log("Roaming profile saved successfully.");
            }
        } catch (err) {
            console.error("Failed to save roaming profile:", err);
        }
    };
    let bootComplete = false;

    await window.loadOSLayout();

    try {
        await themeModule.apply();
        console.log("Theme applied");
    } catch (err) {
        console.error("Error applying theme:", err);
    }

    bootComplete = true;

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('user_session');
            localStorage.removeItem('os_state');
            localStorage.removeItem('nolog');
            window.location.href = './authenticate.html';
        });
    }

    if (messagingModule && typeof messagingModule.subscribe === 'function') {
        messagingModule.subscribe("themeUpdate", async () => {
            if (!bootComplete) {
                console.log("Theme update ignored");
                return;
            }

            console.log("Theme update");
            await window.saveCurrentOSLayout();
        });
        messagingModule.subscribe("applistUpdate", async () => {
            if (!bootComplete) {
                console.log("Applist update ignored");
                return;
            }

            console.log("Applist update");
            await window.saveCurrentOSLayout();
        });
        messagingModule.subscribe("keyvalUpdate", async () => {
            if (!bootComplete) {
                console.log("Keyval update ignored");
                return;
            }

            console.log("Keyval update");
            await window.saveCurrentOSLayout();
        });
    }
    window.clearData = async () => {
        if (await popupModule.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
            try {
                await storageLib.clearApps();
                await storageLib.clearAllData();
                await storageLib.saveSetting({ id: "theme-color", value: "" });
                await storageLib.saveSetting({ id: "theme-color2", value: "" });
                await storageLib.saveSetting({ id: "theme-image", value: "" });
                const response = await fetch(`${BACKEND_URL}/api/save-state`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        data: {}
                    })
                });
                if (response.ok) {
                    await popupModule.alert("Data cleared.");
                    localStorage.clear();
                    document.location.reload();
                } else {
                    await popupModule.alert("Failed to clear data from server.");
                }
            } catch (err) {
                console.error("Failed to clear data:", err);
                await popupModule.alert("Failed to clear data.");
            }
        }
    }
}