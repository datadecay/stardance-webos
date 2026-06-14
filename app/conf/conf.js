const storage = window.storageLib; 
const applyTheme = window.apply || (window.theme && window.theme.apply);

async function saveInputsFromContainer(containerSelector) {
    const inputs = document.querySelectorAll(`${containerSelector} input`);
    const savePromises = [];
    
    for (const input of inputs) {
        if (input.type === 'submit' || !input.id) continue;

        let value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'file') {
            const file = input.files[0];
            if (file) {
                value = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            } else {
                continue; 
            }
        } else {
            value = input.value; 
        }

        if (storage && storage.storageLib && typeof storage.storageLib.saveSetting === 'function') {
            savePromises.push(storage.storageLib.saveSetting({ id: input.id, value: value }));
        }
    }

    try {
        await Promise.all(savePromises);
        console.log(`SigmaOS: Settings from ${containerSelector} saved.`);
        
        if (containerSelector === "#config2-content" && typeof applyTheme === 'function') {
            applyTheme();
        }
    } catch (error) {
        console.error(`Failed to save settings for ${containerSelector}:`, error);
    }
}

async function loadSettingsIntoContainer(containerSelector) {
    const inputs = document.querySelectorAll(`${containerSelector} input`);
    
    for (const input of inputs) {
        if (input.type === 'submit' || !input.id) continue;

        try {
            if (storage && storage.storageLib && typeof storage.storageLib.getSetting === 'function') {
                const setting = await storage.storageLib.getSetting(input.id);
                if (setting && setting.value !== undefined) {
                    if (input.type === 'checkbox') {
                        input.checked = setting.value;
                    } else if (input.type === 'file') {
                        //nono
                    } else {
                        input.value = setting.value;
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load setting for ${input.id}:`, error);
        }
    }
}

const confApp = {
    selectedConfigId: "config1-content",

    openConfig(configId) {
        const oldPage = document.getElementById(this.selectedConfigId);
        if (oldPage) oldPage.style.display = "none";

        const newPage = document.getElementById(configId);
        if (newPage) newPage.style.display = "block";

        this.selectedConfigId = configId;
    },

    async uninstallApp(appId) {
        if (!confirm("Are you sure you want to uninstall this app?")) return;

        const appInfo = window.installedApps[appId];
        if (appInfo) {
            closeWindow(appInfo.windowEl, appInfo.shortcutEl);
            delete window.installedApps[appId];
        }

        if (storage && storage.storageLib && typeof storage.storageLib.deleteApp === 'function') {
            try {
                await storage.storageLib.deleteApp(appId);
                console.log(`App ${appId} uninstalled successfully.`);
                document.getElementById(`${appId}-app`)?.remove();
                loadAppList(); 
            } catch (error) {
                console.error(`Failed to uninstall app ${appId}:`, error);
            }
        }
    }

};

window.confApp = confApp; 

function loadAppList() {
    if (!storage || !storage.storageLib || typeof storage.storageLib.getAllApps !== 'function') return;

    storage.storageLib.getAllApps().then(apps => {
        const systemAppsList = document.getElementById("installed-system-apps-list");
        const userAppsList = document.getElementById("installed-user-apps-list");

        apps.forEach(app => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `${app.config.name} (v${app.config.version}) - ${!app.system && "<button onclick='window.confApp.uninstallApp(\"" + app.id + "\")'>Uninstall</button>"}`;

            if (app.system) {
                systemAppsList.appendChild(listItem);
            } else {
                userAppsList.appendChild(listItem);
            }
        });
    }).catch(error => {
        console.error("Failed to load installed apps:", error);
    });
}

(async () => {
    await loadSettingsIntoContainer("#config1-content");
    await loadSettingsIntoContainer("#config2-content");
    loadAppList();
    if (typeof applyTheme === 'function') {
        applyTheme(); 
    }

    const configs = ["#config1-content", "#config2-content"];
    configs.forEach(selector => {
        const element = document.querySelector(selector);
        const form = element?.tagName === "FORM" ? element : element?.querySelector("form");
        
        if (form) {
            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                await saveInputsFromContainer(selector);
            });
        }
    });
})();