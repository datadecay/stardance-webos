const storage = await import("./storage.js");

export async function apply() {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.getSetting !== 'function') return;

    const root = document.documentElement;

    const themeColor = await storageLib.getSetting("theme-color");
    if (themeColor && themeColor.value) {
        root.style.setProperty('--primary', themeColor.value);
    }

    const themeColor2 = await storageLib.getSetting("theme-color2");
    if (themeColor2 && themeColor2.value) {
        root.style.setProperty('--secondary', themeColor2.value);
    }

    const wallpaper = await storageLib.getSetting("theme-image");
    if (wallpaper && wallpaper.value) {
        root.style.setProperty('--bg-image', `url("${wallpaper.value}")`);
    }
}

window.theme = {
    apply: apply
};