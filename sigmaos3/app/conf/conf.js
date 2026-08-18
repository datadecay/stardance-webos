// part ai

const storage = window.storageLib; 
const storageInstance = storage?.storageLib || storage; 
const applyTheme = window.theme.apply;
const messaging = window.messaging;
const popup = window.popup;

function getFormControls(containerSelector) {
    return document.querySelectorAll(`${containerSelector} input, ${containerSelector} textarea, ${containerSelector} select`);
}

async function saveInputsFromContainer(containerSelector) {
    const inputs = getFormControls(containerSelector);
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

        savePromises.push(storageInstance.saveSetting({ id: input.id, value: value }));
    }

    try {
        await Promise.all(savePromises);
        console.log(`SigmaOS: Settings from ${containerSelector} saved.`);
        
        if (containerSelector === "#config2-content") {
            applyTheme();
        }
    } catch (error) {
        console.error(`Failed to save settings for ${containerSelector}:`, error);
    }
}

async function loadSettingsIntoContainer(containerSelector) {
    const inputs = getFormControls(containerSelector);
    
    for (const input of inputs) {
        if (input.type === 'submit' || !input.id) continue;

        try {
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
        } catch (error) {
            console.error(`Failed to load setting for ${input.id}:`, error);
        }
    }
}

async function loadRegisteredThemes() {
    const themeList = document.getElementById("registered-theme");
    if (!themeList) return;

    const themes = await window.theme.getRegisteredThemes();
    const selectedTheme = await storageInstance.getSetting("active-theme");
    const selectedThemeId = selectedTheme?.value ? String(selectedTheme.value) : "";

    themeList.innerHTML = "";
    themeList.dataset.selectedThemeId = selectedThemeId;

    const addThemeCard = (theme, id, name, background, color) => {
        const card = document.createElement("li");
        card.textContent = name;
        card.style.cssText = `height: 100px; width: 100px; background: ${background}; color: ${color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; text-align: center; padding: 8px;`;
        if (id === selectedThemeId) card.style.outline = "3px solid var(--primary)";
        card.addEventListener("click", async () => {
            await window.theme.setActiveTheme(id);
            await loadRegisteredThemes();
        });
        themeList.appendChild(card);
    };

    addThemeCard(null, "", "Default", "#111111", "white");

    themes.forEach((theme) => {
        const variables = theme.variables || {};
        addThemeCard(
            theme,
            theme.id,
            theme.name || theme.id,
            variables["--bg-image"] || variables["--secondary"] || "#111111",
            variables["--primary"] || "white"
        );
    });
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
                if (appInfo) {
                    window.closeWindow(appInfo.windowEl, appInfo.shortcutEl);
                    delete window.installedApps[appId];
                }

                try {
                    await storageInstance.deleteApp(appId);
                    console.log(`App ${appId} uninstalled successfully.`);
                    
                    document.getElementById(`${appId}-app`)?.remove();
                    
                    loadAppList(); 
                    messaging.publish("applistUpdate", {});
                } catch (error) {
                    console.error(`Failed to uninstall app ${appId}:`, error);
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
    await loadRegisteredThemes();
    loadAppList();
    loadInfoList();
    
    messaging.subscribe("applistUpdate", () => loadAppList());
    messaging.subscribe("keyvalUpdate", () => loadRegisteredThemes());

    applyTheme(); 

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

    const deleteDataBtn = document.getElementById("delete-data");
    if (deleteDataBtn) {
        deleteDataBtn.addEventListener("click", () => {
            window.clearData();
        });
    }

    const unregisterThemeBtn = document.getElementById("unregister-theme");
    if (unregisterThemeBtn) {
        unregisterThemeBtn.addEventListener("click", async () => {
            const themeList = document.getElementById("registered-theme");
            const selectedThemeId = themeList?.dataset.selectedThemeId || "";
            if (!selectedThemeId) return;

            const shouldRemove = await window.popup.confirm(`Remove ${selectedThemeId}?`, "Remove Theme");

            if (!shouldRemove) return;

            try {
                const activeTheme = await storageInstance.getSetting("active-theme");
                const activeThemeId = activeTheme?.value ? String(activeTheme.value) : "";

                await window.theme.unregisterTheme(selectedThemeId);

                if (activeThemeId === selectedThemeId) {
                    await window.theme.setActiveTheme("");
                }

                await loadRegisteredThemes();
                await applyTheme();
            } catch (error) {
                console.error("Failed to unregister theme:", error);
            }
        });
    }

    const registerThemeJsonBtn = document.getElementById("register-theme-json-btn");
    if (registerThemeJsonBtn) {
        registerThemeJsonBtn.addEventListener("click", async () => {
            const fileInput = document.getElementById("register-theme-json");
            const file = fileInput?.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const themeDefinition = JSON.parse(text);
                const themeName = String(themeDefinition?.name || themeDefinition?.id || file.name || "theme");
                const shouldRegister = await window.popup.confirm(`Do you want to register theme "${themeName}"?`, "Yes");

                if (!shouldRegister) return;

                await window.theme.registerTheme(themeDefinition, "manual");
                await loadRegisteredThemes();
            } catch (error) {
                console.error("Failed to load theme JSON:", error);
                window.popup.alert("Invalid theme JSON file.", "Theme Error");
            }
        });
    }
})();