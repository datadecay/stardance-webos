window.termApp = window.termApp || {};
window.termApp.buffer = "";
window.termApp.history = window.termApp.history || [];
window.termApp.historyIndex = -1;

const storage = window.storageLib;
const storageInstance = storage?.storageLib || storage;

(async () => {
    async function handleCommand(command, termInstance) {
        const cleanCommand = command.trim();
        const args = cleanCommand.split(' ').filter(arg => arg !== '');
        if (args.length === 0) return;

        const baseCommand = args[0].toLowerCase();

        if (window.termApp.history.length === 0 || window.termApp.history[window.termApp.history.length - 1] !== cleanCommand) {
            window.termApp.history.push(cleanCommand);
        }
        window.termApp.historyIndex = window.termApp.history.length;

        switch (baseCommand) {
            case 'help':
                termInstance.writeln('Available commands:');
                termInstance.writeln('  help, echo, clear, neofetch, exit, theme');
                termInstance.writeln('  list-app-storage, rm-app, list-settings');
                break;

            case 'clear':
                termInstance.clear();
                break;

            case 'echo':
                termInstance.writeln(args.slice(1).join(' '));
                break;

            case 'neofetch':
                const info = await fetch('./lib/info.json').then(res => res.json());

                termInstance.writeln('\x1b[36m############\x1b[0m    OS: sigmaOS');
                termInstance.writeln('\x1b[36m ###########\x1b[0m    Host: your browser?');
                termInstance.writeln(`\x1b[36m   ##       \x1b[0m    Version: ${info.brand}@${info.version} build ${info.build}`);
                termInstance.writeln('\x1b[36m    ##      \x1b[0m    Uptime: uhhhhh');
                termInstance.writeln('\x1b[36m      ##    \x1b[0m    Packages: some');
                termInstance.writeln('\x1b[36m     ##     \x1b[0m    Shell: some weird xterm thing');
                termInstance.writeln(`\x1b[36m    ##      \x1b[0m    Resolution: ${window.innerWidth}x${window.innerHeight}`);
                termInstance.writeln('\x1b[36m   ##       \x1b[0m    CPU: no clue man');
                termInstance.writeln('\x1b[36m ###########\x1b[0m    GPU: a graphics card (smart)');
                termInstance.writeln(`\x1b[36m############\x1b[0m    Memory: ${Math.round(performance.memory?.usedJSHeapSize / 1048576) || "unknown"} MB`);
                break;

            case 'theme':
                switch (args[1]?.toLowerCase()) {
                    case 'apply':
                        if (typeof window.theme?.apply === 'function') {
                            await window.theme.apply();
                            termInstance.writeln('Theme applied successfully.');
                        } else {
                            termInstance.writeln('Error');
                        }
                        break;
                    case 'primary':
                        if (args[2]) {
                            storageInstance.saveSetting({ id: 'theme-color', value: args[2] }).then(() => {
                                termInstance.writeln(`Primary color set to ${args[2]}.`);
                            }).catch(err => {
                                termInstance.writeln(`Error saving primary color: ${err.message || err}`);
                            });
                        } else {
                            termInstance.writeln('Usage: theme primary <color>');
                        }
                        break;
                    case 'secondary':
                        if (args[2]) {
                            storageInstance.saveSetting({ id: 'theme-color2', value: args[2] }).then(() => {
                                termInstance.writeln(`Secondary color set to ${args[2]}.`);
                            }).catch(err => {
                                termInstance.writeln(`Error saving secondary color: ${err.message || err}`);
                            });
                        } else {
                            termInstance.writeln('Usage: theme secondary <color>');
                        }
                        break;
                    default:
                        termInstance.writeln('Usage: theme [apply | primary <color> | secondary <color>]');
                }
                break;

            case 'exit':
                termInstance.writeln('Closing session layer...');
                const parentWindow = document.getElementById('dev') || document.getElementById('terminal')?.closest('.window');
                const parentShortcut = document.getElementById('dev-app');
                if (parentWindow && typeof window.closeWindow === 'function') {
                    window.closeWindow(parentWindow, parentShortcut);
                } else {
                    termInstance.writeln('Error:');
                }
                break;

            case 'list-app-storage':
                if (!storageInstance || typeof storageInstance.getAllApps !== 'function') {
                    termInstance.writeln('Error');
                    break;
                }
                try {
                    const apps = await storageInstance.getAllApps();
                    if (apps.length === 0) {
                        termInstance.writeln('No apps in storage.');
                    } else {
                        termInstance.writeln('Apps:');
                        apps.forEach(app => {
                            const appConf = app.config || app.conf || {};
                            termInstance.writeln(`- ${appConf.name || app.name || 'Unnamed App'} [id: ${app.id}] (v${appConf.version || '1.0.0'})`);
                        });
                    }
                } catch (error) {
                    termInstance.writeln(`Error retrieving apps: ${error.message || error}`);
                }
                break;

            case 'rm-app':
                if (args.length < 2) {
                    termInstance.writeln('Usage: rm-app <app_id>');
                    break;
                }
                if (!storageInstance || typeof storageInstance.deleteApp !== 'function') {
                    termInstance.writeln('Error: Storage modification interface missing.');
                    break;
                }
                const targetId = args[1];
                try {
                    await storageInstance.deleteApp(targetId);
                    termInstance.writeln(`Successfully removed '${targetId}'.`);
                } catch (error) {
                    termInstance.writeln(`Failed to delete app: ${error.message || error}`);
                }
                break;

            case 'list-settings':
                if (!storageInstance || typeof storageInstance.getAllSettings !== 'function') {
                    termInstance.writeln('Error');
                    break;
                }
                try {
                    const settings = await storageInstance.getAllSettings();
                    if (settings.length === 0) {
                        termInstance.writeln('No settings in storage.');
                    } else {
                        termInstance.writeln('Settings in storage:');
                        settings.forEach(setting => {
                            termInstance.writeln(`- ${setting.id}: ${JSON.stringify(setting.value)}`);
                        });
                    }
                } catch (error) {
                    termInstance.writeln(`Error retrieving settings: ${error.message || error}`);
                }
                break;

            default:
                termInstance.writeln(`Unknown command: ${cleanCommand}`);
        }
    }

    try {
        const { Terminal } = await import('https://cdn.jsdelivr.net/npm/xterm@5.3.0/+esm');
        const { FitAddon } = await import('https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/+esm');

        if (!document.getElementById('xterm-css')) {
            const link = document.createElement('link');
            link.id = 'xterm-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css';
            document.head.appendChild(link);
        }

        const term = new Terminal({
            cursorBlink: true,
            theme: { background: '#000000' }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        const container = document.getElementById('terminal');
        if (container) {
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.maxWidth = '100%';
            container.style.boxSizing = 'border-box';
            container.style.overflow = 'hidden';
            container.style.display = 'block';

            const style = document.createElement('style');
            style.innerHTML = `
                #terminal .xterm { padding: 10px; height: 100%; box-sizing: border-box; }
                #terminal .xterm-screen { width: 100% !important; }
            `;
            document.head.appendChild(style);

            term.open(container);

            setTimeout(() => {
                fitAddon.fit();
            }, 100);

            term.write('Welcome :3\r\n$ ');

            const resizeObserver = new ResizeObserver(() => {
                if (container.clientWidth > 0 && container.clientHeight > 0) {
                    requestAnimationFrame(() => {
                        fitAddon.fit();
                        term.scrollToBottom();
                    });
                }
            });
            resizeObserver.observe(container.closest('.window') || container);

            term.onKey(async e => {
                const char = e.key;
                const domEvent = e.domEvent;

                if (char === '\r') {
                    term.write('\r\n');

                    await handleCommand(window.termApp.buffer, term);

                    window.termApp.buffer = "";
                    term.write('$ ');
                } 
                else if (char === '\u007F') { // bkspc
                    if (window.termApp.buffer.length > 0) {
                        window.termApp.buffer = window.termApp.buffer.slice(0, -1);
                        
                        if (term.buffer.active.cursorX === 0) {
                            term.write(`\x1b[A\x1b[${term.cols}G `);
                            term.write(`\x1b[A\x1b[${term.cols}G`);
                        } else {
                            term.write('\b \b');
                        }
                    }
                } 
                else if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown') {
                    if (window.termApp.history.length === 0) return;

                    if (domEvent.key === 'ArrowUp') {
                        if (window.termApp.historyIndex > 0) {
                            window.termApp.historyIndex--;
                        }
                    } else if (domEvent.key === 'ArrowDown') {
                        if (window.termApp.historyIndex < window.termApp.history.length) {
                            window.termApp.historyIndex++;
                        }
                    }

                    term.write('\r\x1b[K$ ');

                    if (window.termApp.historyIndex === window.termApp.history.length) {
                        window.termApp.buffer = "";
                    } else {
                        window.termApp.buffer = window.termApp.history[window.termApp.historyIndex];
                    }

                    term.write(window.termApp.buffer);
                } 
                else {
                    if (domEvent.key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
                        term.write(char);
                        window.termApp.buffer += char;
                    }
                }
            });
        }

    } catch (err) {
        console.error("Failed to load xterm.js:", err);
    }
})();