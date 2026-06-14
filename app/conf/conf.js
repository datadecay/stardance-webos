const storage = window.storageLib; 
const storageInstance = storage?.storageLib || storage; 
const applyTheme = window.apply || (window.theme && window.theme.apply);
const messaging = window.messaging;
const popup = window.popup;

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

        if (storageInstance && typeof storageInstance.saveSetting === 'function') {
            savePromises.push(storageInstance.saveSetting({ id: input.id, value: value }));
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
            if (storageInstance && typeof storageInstance.getSetting === 'function') {
                const setting = await storageInstance.getSetting(input.id);
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
    popup.popup(
        `Are you sure you want to uninstall ${appId}?`, 
        "Confirm Uninstall", 
        {
            "Yes": async () => {
                const appInfo = window.installedApps ? window.installedApps[appId] : null;
                if (appInfo && typeof window.closeWindow === 'function') {
                    window.closeWindow(appInfo.windowEl, appInfo.shortcutEl);
                    delete window.installedApps[appId];
                }

                if (storageInstance && typeof storageInstance.deleteApp === 'function') {
                    try {
                        await storageInstance.deleteApp(appId);
                        console.log(`App ${appId} uninstalled successfully.`);
                        
                        document.getElementById(`${appId}-app`)?.remove();
                        
                        if (typeof loadAppList === 'function') {
                            loadAppList(); 
                        }
                        
                        if (messaging && typeof messaging.publish === 'function') {
                            messaging.publish("applistUpdate", {});
                        }
                    } catch (error) {
                        console.error(`Failed to uninstall app ${appId}:`, error);
                    }
                }
            },
            "No": () => {
                console.log("Uninstall aborted safely.");
            }
        }
    ); 
}
};

window.confApp = confApp; 

function loadAppList() {
    if (!storageInstance || typeof storageInstance.getAllApps !== 'function') return;

    storageInstance.getAllApps().then(apps => {
        const userAppsList = document.getElementById("installed-user-apps-list");
        if (!userAppsList) return;

        userAppsList.innerHTML = "";

        apps.forEach(app => {
            if (app.system) return; 

            const listItem = document.createElement("li");
            const appName = app.config?.name || app.name || 'Unknown App';
            const appVersion = app.config?.version || '1.0.0';

            listItem.textContent = `${appName} (v${appVersion}) `;

            const uninstallBtn = document.createElement("button");
            uninstallBtn.textContent = "Uninstall";
            uninstallBtn.style.marginLeft = "10px";
            uninstallBtn.addEventListener("click", () => {
                window.confApp.uninstallApp(app.id);
            });

            listItem.appendChild(uninstallBtn);
            userAppsList.appendChild(listItem);
        });
    }).catch(error => {
        console.error("Failed to load installed apps:", error);
    });
}

async function loadInfoList() {
    const info = await fetch('./lib/info.json').then(res => res.json());
    const infoList = document.getElementById("info-list");
    if (!infoList) return;
    
    infoList.innerHTML = `
    <li>${info.brand}@${info.version} build ${info.build}</li>
    <li>for ${info.track}</li>
    `;
}


(async () => {
    await loadSettingsIntoContainer("#config1-content");
    await loadSettingsIntoContainer("#config2-content");
    loadAppList();
    loadInfoList();
    
    if (messaging && typeof messaging.subscribe === 'function') {
        messaging.subscribe("applistUpdate", () => loadAppList());
    }

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