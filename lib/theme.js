const storage = await import("./storage.js");
const messaging = await import("./messaging.js");

const styleID = "sigma-css";
let appliedVariableKeys = new Set();

function toThemeName(theme) {
    return String(theme?.name || theme?.id || "theme");
}

function normalizeTheme(themeDefinition = {}, sourceAppId = null) {
    const fallbackId = toThemeName(themeDefinition)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'theme';

    return {
        id: String(themeDefinition.id || fallbackId),
        name: toThemeName(themeDefinition),
        description: String(themeDefinition.description || ""),
        variables: themeDefinition.variables || themeDefinition.vars || {},
        css: String(themeDefinition.css || ""),
        sourceAppId: sourceAppId ? String(sourceAppId) : null,
    };
}

function parseVariableString(rawValue = "") {
    const declarations = {};

    const parseLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const separatorIndex = trimmed.indexOf(':');
        if (separatorIndex === -1) return;

        let key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).replace(/;$/, '').trim();

        if (!key || !value) return;
        if (!key.startsWith('--')) key = `--${key}`;
        declarations[key] = value;
    };

    rawValue
        .split('\n')
        .forEach(line => line.split(';').forEach(parseLine));

    return declarations;
}

function normalizeVariables(variableConfig) {
    if (!variableConfig) return {};

    if (typeof variableConfig === 'string') {
        const raw = variableConfig.trim();
        if (!raw) return {};

        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return normalizeVariables(parsed);
            }
        } catch {
        }

        return parseVariableString(raw);
    }

    if (typeof variableConfig !== 'object' || Array.isArray(variableConfig)) {
        return {};
    }

    const normalized = {};
    for (const [key, value] of Object.entries(variableConfig)) {
        if (value === undefined || value === null) continue;
        const variableName = key.startsWith('--') ? key : `--${key}`;
        normalized[variableName] = String(value);
    }

    return normalized;
}

function applyVariables(root, variables) {
    const nextKeys = new Set(Object.keys(variables));

    for (const oldKey of appliedVariableKeys) {
        if (!nextKeys.has(oldKey)) {
            root.style.removeProperty(oldKey);
        }
    }

    for (const [variableName, value] of Object.entries(variables)) {
        root.style.setProperty(variableName, value);
    }

    appliedVariableKeys = nextKeys;
}

function applyCustomCss(cssRules = "") {
    const styleID = "sigma-css";
    let styleEl = document.getElementById(styleID);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleID;
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = cssRules || "";
}

export async function getRegisteredThemes() {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.getData !== 'function') return [];

    const themes = await storageLib.getData("registered-themes");
    return Array.isArray(themes) ? themes : [];
}

export async function getThemeRegistrationDecisions() {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.getData !== 'function') return {};

    const decisions = await storageLib.getData("theme-registration-decisions");
    return decisions && typeof decisions === "object" ? decisions : {};
}

export async function setThemeRegistrationDecision(themeId, shouldRegister) {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.storeData !== 'function') return;

    const decisions = await getThemeRegistrationDecisions();
    decisions[String(themeId)] = Boolean(shouldRegister);
    await storageLib.storeData("theme-registration-decisions", decisions);
}

async function saveRegisteredThemes(themes) {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.storeData !== 'function') return;

    await storageLib.storeData("registered-themes", themes);
}

export async function registerTheme(themeDefinition, sourceAppId = null) {
    const normalizedTheme = normalizeTheme(themeDefinition, sourceAppId);
    const themes = await getRegisteredThemes();
    const withoutOld = themes.filter((theme) => theme.id !== normalizedTheme.id);

    withoutOld.push(normalizedTheme);
    await saveRegisteredThemes(withoutOld);

    return normalizedTheme;
}

export async function unregisterTheme(themeId) {
    const themes = await getRegisteredThemes();
    const filtered = themes.filter((theme) => theme.id !== String(themeId));
    await saveRegisteredThemes(filtered);
}

export async function setActiveTheme(themeId) {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.saveSetting !== 'function') return;

    await storageLib.saveSetting({ id: "active-theme", value: themeId ? String(themeId) : "" });
    await apply();
}

export async function apply() {
    const storageLib = storage.storageLib;
    if (!storageLib || typeof storageLib.getSetting !== 'function') return;

    const root = document.documentElement;

    const activeThemeSetting = await storageLib.getSetting("active-theme");
    const activeThemeId = activeThemeSetting?.value ? String(activeThemeSetting.value) : "";
    const registeredThemes = await getRegisteredThemes();
    const activeTheme = activeThemeId
        ? registeredThemes.find((theme) => theme.id === activeThemeId)
        : null;

    const themeVariablesSetting = await storageLib.getSetting("theme-vars");
    const themeCssSetting = await storageLib.getSetting("theme-css");

    const activeThemeVars = normalizeVariables(activeTheme?.variables);
    const customVars = normalizeVariables(themeVariablesSetting?.value);
    const mergedVars = {
        ...activeThemeVars,
        ...customVars,
    };

    const activeThemeCss = activeTheme?.css ? String(activeTheme.css) : "";
    const customCss = themeCssSetting?.value ? String(themeCssSetting.value) : "";
    const mergedCss = [activeThemeCss, customCss].filter(Boolean).join("\n\n");

    applyVariables(root, mergedVars);
    applyCustomCss(mergedCss);

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

    messaging.publish("themeUpdate", {});
}

window.theme = {
    apply,
    registerTheme,
    unregisterTheme,
    setActiveTheme,
    getRegisteredThemes,
    getThemeRegistrationDecisions,
    setThemeRegistrationDecision,
};