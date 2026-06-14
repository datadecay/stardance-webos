window.subscribers = window.subscribers || {};

export function subscribe(event, callback) {
    if (!window.subscribers[event]) {
        window.subscribers[event] = [];
    }
    const id = Date.now() + Math.random();
    window.subscribers[event].push({ callback: callback, id: id });
    return id;
}

export function publish(event, data) {
    if (window.subscribers[event]) {
        [...window.subscribers[event]].forEach(sub => {
            try {
                sub.callback(data);
            } catch (error) {
                console.error(`Error executing callback for event "${event}":`, error);
            }
        });
    }
}

export function unsubscribe(event, id) {
    if (window.subscribers[event]) {
        window.subscribers[event] = window.subscribers[event].filter(sub => sub.id !== id);
        
        if (window.subscribers[event].length === 0) {
            delete window.subscribers[event];
        }
    }
}