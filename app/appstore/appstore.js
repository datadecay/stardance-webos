window.appstoreApp = {
    async loadStorefront() {
        const appListElement = document.getElementById("app-list");
        if (!appListElement) return;

        appListElement.innerHTML = "<li>Loading apps...</li>";
        
        let apps = [];

        try {
            const response = await fetch("./appstore/manifest.json");
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            apps = data.apps || [];
        } catch (error) {
            console.error("Failed to load app store manifest:", error);
            appListElement.innerHTML = "<li style='color: red;'>Failed to load apps.</li>";
            return;
        }

        if (apps.length === 0) {
            appListElement.innerHTML = "<li>No apps are currently available.</li>";
            return;
        }

        appListElement.innerHTML = "";

        apps.forEach(app => {
            const listItem = document.createElement("li");
            
            listItem.textContent = `${app.name || 'Unknown App'} (v${app.version || '1.0.0'}) `;

            const installButton = document.createElement("button");
            installButton.textContent = "Install";
            installButton.style.marginLeft = "10px";
            
            installButton.addEventListener("click", async () => {
                if (typeof window.instalFromWeb === "function") {
                    installButton.disabled = true;
                    installButton.textContent = "Installing...";
                    
                    try {
                        await window.instalFromWeb(app.url);
                        installButton.textContent = "Installed";
                    } catch (err) {
                        console.error(`Installation failed for ${app.name}:`, err);
                        installButton.disabled = false;
                        installButton.textContent = "Retry";
                    }
                } else {
                }
            });

            listItem.appendChild(installButton);
            appListElement.appendChild(listItem);
        });
    }
};

window.appstoreApp.loadStorefront();