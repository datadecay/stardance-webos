window.storageLib = await import("./lib/storage.js");
window.theme = await import("./lib/theme.js");

const timeElement = document.getElementById("time");

function updateTime() {
    timeElement.innerHTML = new Date().toLocaleString();
}
updateTime();
setInterval(updateTime, 1000);

function dragElement(element) {
    let offsetX = 0;
    let offsetY = 0;

    const header = document.getElementById(element.id + "header");
    if (header) {
        header.onmousedown = startDragging;
    } else {
        element.onmousedown = startDragging;
    }

    function startDragging(e) {
        e = e || window.event;
        e.preventDefault();

        element.style.zIndex = getTopIndex();

        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;

        document.onmouseup = stopDragging;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        let nextTop = e.clientY - offsetY;
        let nextLeft = e.clientX - offsetX;

        const topbarHeight = 0; //document.getElementById("topbar").offsetHeight;

        let windowTopEdge = nextTop - (element.offsetHeight / 2);

        if (windowTopEdge < topbarHeight) {
            nextTop = topbarHeight + (element.offsetHeight / 2);
        }

        element.style.top = nextTop + "px";
        element.style.left = nextLeft + "px";
    }

    function stopDragging() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

let maxIndex = 1;
function getTopIndex() {
    return maxIndex++;
}

function closeWindow(w, app = null) {
    w.style.display = "none";
    if (app) app.classList.remove("selected");
}

function openWindow(w, app = null) {
    w.style.display = "flex";
    w.style.zIndex = getTopIndex();
    if (app) app.classList.add("selected");
}

function handleTap(element, windowEl) {
    if (element.classList.contains("selected")) {
        element.classList.remove("selected");
        closeWindow(windowEl);
    } else {
        element.classList.add("selected");
        openWindow(windowEl);
    }
}

const hardcodedApps = ["welcome", "dev"];
let installedApps = {};

hardcodedApps.forEach(appId => {
    const windowEl = document.getElementById(appId);
    const shortcutEl = document.getElementById(`${appId}-app`);
    const runbarEl = document.getElementById("runbar");

    if (windowEl) dragElement(windowEl);
    if (shortcutEl) {
        dragElement(shortcutEl);
        shortcutEl.addEventListener('click', () => handleTap(shortcutEl, windowEl));
    }
    if (runbarEl) {
        const runButton = document.createElement("a");
        runButton.href = "javascript:void(0)";
        runButton.textContent = appId;
        runButton.addEventListener('click', () => handleTap(shortcutEl, windowEl));
        runbarEl.appendChild(runButton);
    }
    installedApps[appId] = { windowEl, shortcutEl };

});

document.getElementById('appInstaller').addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const appPackage = await extractAppPackage(file);
        installApp(appPackage);
    } catch (error) {
        console.error("Installation failed:", error);
        alert(error.message || "An error occurred during installation.");
    } finally {
        e.target.value = '';
    }
});

async function extractAppPackage(file, system = false) {
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(file);

    const configFile = zip.file("config.json");
    if (!configFile) {
        throw new Error("Invalid App Package: Missing config.json");
    }
    const configText = await configFile.async("string");
    const config = JSON.parse(configText);

    const iconFile = zip.file(config.icon || "icon.png");
    let iconUrl = "./apps/hi.png";

    if (iconFile) {
        const base64Data = await iconFile.async("base64");

        const extension = (config.icon || "icon.png").split('.').pop().toLowerCase();
        const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension}`;

        iconUrl = `data:${mimeType};base64,${base64Data}`;
    }

    const htmlFile = zip.file(config.html || "app.html");
    let htmlContent = "<p>No content loaded.</p>";
    if (htmlFile) {
        htmlContent = await htmlFile.async("string");
    }

    const jsFile = zip.file(config.script || "app.js");
    let jsContent = "";
    if (jsFile) {
        jsContent = await jsFile.async("string");
    }

    return { id: config.id, config, iconUrl, htmlContent, jsContent, system: system || false };
}

function installApp(appPackage, base = false) {
    const { id, config, iconUrl, htmlContent, jsContent, system } = appPackage;
    const appId = id;
    const appName = config.name;

    const desktopApps = document.getElementById("desktopApps");
    const appShortcut = document.createElement("div");
    appShortcut.id = `${appId}-app`;
    appShortcut.className = "app";
    appShortcut.innerHTML = `<img src="${iconUrl}" class="app-icon">`;
    desktopApps.appendChild(appShortcut);

    const runbarEl = document.getElementById("runbar");
    if (runbarEl) {
        const runButton = document.createElement("a");
        runButton.href = "javascript:void(0)";
        runButton.textContent = appName;
        runButton.addEventListener('click', () => handleTap(appShortcut, document.getElementById(appId)));
        runbarEl.appendChild(runButton);
    }

    const desktop = document.getElementById("desktop");
    const appWindow = document.createElement("div");
    appWindow.id = appId;
    appWindow.className = "window";
    appWindow.style.cssText = `display: none; top: 50%; left: 50%; width: ${config.width || '50%'}; height: ${config.height || 'auto'};`;
    appWindow.innerHTML = `
        <div class="handle" id="${appId}header">
            <div></div>
            <div>${appName}</div>
            <div style="display: flex;">
                <p style="cursor: pointer" class="content-button" id="${appId}-close-btn"></p>
            </div>
        </div>
        <div class="window-content" >
            ${htmlContent}
        </div>
    `;
    desktop.appendChild(appWindow);
    if (jsContent && jsContent.trim() !== "") {
        const runtimeScript = document.createElement("script");
        runtimeScript.textContent = jsContent;
        document.body.appendChild(runtimeScript);
    }
    dragElement(appWindow);
    dragElement(appShortcut);

    appShortcut.addEventListener('click', () => {
        handleTap(appShortcut, appWindow);
    });

    document.getElementById(`${appId}-close-btn`).addEventListener('click', (event) => {
        event.stopPropagation();
        closeWindow(appWindow, appShortcut);
    });
    installedApps[appId] = { windowEl: appWindow, shortcutEl: appShortcut };
    if (!base) {
        window.storageLib.storageLib.saveApp(appPackage);
    }
}

async function instalFromWeb(appUrl, base = false) {
    try {
        const parsedUrl = new URL(appUrl, window.location.origin);
        const filename = parsedUrl.pathname.substring(parsedUrl.pathname.lastIndexOf('/') + 1) || "app.zip";

        const response = await fetch(appUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const blob = await response.blob();
        const file = new File([blob], filename, { type: "application/zip" });

        const appPackage = await extractAppPackage(file, base);
        installApp(appPackage, base);



    } catch (error) {
        console.error("Web install error:", error);
        alert(`Failed to install app: ${error}`);
    }
}

function installBase() {
    const baseApps = ["./apps/guide.zip", "./apps/game.zip", "./apps/conf.zip", "./apps/appstore.zip"];
    baseApps.forEach(url => instalFromWeb(url, true));
}

function installSavedApps() {
    window.storageLib.storageLib.getAllApps().then(apps => {
        apps.forEach(appPackage => installApp(appPackage));
    }).catch(error => {
        console.error("Failed to load saved apps:", error);
    });
}

window.closeWindow = closeWindow;
window.openWindow = openWindow;
window.handleTap = handleTap;
window.dragElement = dragElement;
window.installedApps = installedApps;
window.instalFromWeb = instalFromWeb;
window.installApp = installApp;

async function load() {
    try {
        await window.theme.apply();

        await installBase();
        await installSavedApps();

    } catch (error) {
        console.error("Error:", error);
    } finally {
        const loadingScreen = document.querySelector(".loading-screen");
        if (loadingScreen) {
            setTimeout(() => loadingScreen.classList.add("fade-out"), 500);
            setTimeout(() => loadingScreen.remove(), 1000);
        }
    }
}

load();