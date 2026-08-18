export class AppRegistry {
    constructor() {
        this.apps = new Map();
    }

    normalizeApp(appDefinition = {}) {
        const fallbackId = appDefinition.name
            ? appDefinition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            : 'app';

        const id = String(appDefinition.id || fallbackId);
        const normalized = {
            id,
            name: appDefinition.name || this.titleizeId(id),
            version: appDefinition.version || '1.0.0',
            description: appDefinition.description || '',
            icon: appDefinition.icon || 'icon.png',
            html: appDefinition.html || 'app.html',
            script: appDefinition.script || 'app.js',
            width: appDefinition.width || '50%',
            height: appDefinition.height || 'auto',
            system: Boolean(appDefinition.system),
            ...appDefinition,
        };

        normalized.id = String(normalized.id);
        normalized.name = String(normalized.name);
        normalized.icon = String(normalized.icon);
        normalized.html = String(normalized.html);
        normalized.script = String(normalized.script);
        normalized.width = String(normalized.width);
        normalized.height = String(normalized.height);

        return normalized;
    }

    titleizeId(id) {
        return id
            .split(/[-_\s]+/)
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    register(appDefinition) {
        const normalized = this.normalizeApp(appDefinition);
        this.apps.set(normalized.id, normalized);
        return normalized;
    }

    registerMany(appDefinitions = []) {
        return appDefinitions.map((definition) => this.register(definition));
    }

    get(id) {
        return this.apps.get(id);
    }

    list() {
        return [...this.apps.values()];
    }

    remove(id) {
        this.apps.delete(id);
    }

    clear() {
        this.apps.clear();
    }
}

export const appRegistry = new AppRegistry();
export default AppRegistry;
