type EventBusListener = (...args: any[]) => void;
type EventBusUnsubscriber = () => void;

class EventBusState {
    listeners: Map<string, Set<EventBusListener>>;
    oneTimeListeners: Set<EventBusListener>;

    constructor() {
        this.listeners = new Map();
        this.oneTimeListeners = new Set();
    }

    addListener(eventName: string, listener: EventBusListener): void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)!.add(listener);
    }

    removeListener(eventName: string, listener: EventBusListener): void {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName)!.delete(listener);
            if (this.listeners.get(eventName)!.size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    markAsOneTime(listener: EventBusListener): void {
        this.oneTimeListeners.add(listener);
    }

    removeOneTimeListener(listener: EventBusListener): void {
        this.oneTimeListeners.delete(listener);
    }
}

class EventBusCommands {
    constructor(private state: EventBusState) {}

    subscribe(eventName: string, listener: EventBusListener): EventBusUnsubscriber {
        this.state.addListener(eventName, listener);
        return () => this.unsubscribe(eventName, listener);
    }

    subscribeOnce(eventName: string, listener: EventBusListener): EventBusUnsubscriber {
        const wrappedListener: EventBusListener = (...args: any[]) => {
            this.unsubscribe(eventName, wrappedListener);
            listener(...args);
        };
        this.state.markAsOneTime(wrappedListener);
        return this.subscribe(eventName, wrappedListener);
    }

    unsubscribe(eventName: string, listener: EventBusListener): void {
        this.state.removeListener(eventName, listener);
        if (this.state.oneTimeListeners.has(listener)) {
            this.state.removeOneTimeListener(listener);
        }
    }

    removeAllListeners(eventName?: string): void {
        if (eventName) {
            if (this.state.listeners.has(eventName)) {
                this.state.listeners.get(eventName)!.clear();
                this.state.listeners.delete(eventName);
            }
        } else {
            this.state.listeners.clear();
            this.state.oneTimeListeners.clear();
        }
    }

    emit(eventName: string, ...args: any[]): void {
        if (this.state.listeners.has(eventName)) {
            this.state.listeners.get(eventName)!.forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }
}

class EventBusQueries {
    constructor(private state: EventBusState) {}

    getListenerCount(eventName: string): number {
        return this.state.listeners.has(eventName)
            ? this.state.listeners.get(eventName)!.size
            : 0;
    }

    hasListeners(eventName: string): boolean {
        return this.state.listeners.has(eventName) &&
            this.state.listeners.get(eventName)!.size > 0;
    }

    getEventNames(): string[] {
        return Array.from(this.state.listeners.keys());
    }
}

class EventBus {
    private commands: EventBusCommands;
    private queries: EventBusQueries;

    constructor() {
        const state = new EventBusState();
        this.commands = new EventBusCommands(state);
        this.queries = new EventBusQueries(state);
    }

    // Command methods
    subscribe(eventName: string, listener: EventBusListener): EventBusUnsubscriber {
        return this.commands.subscribe(eventName, listener);
    }

    subscribeOnce(eventName: string, listener: EventBusListener): EventBusUnsubscriber {
        return this.commands.subscribeOnce(eventName, listener);
    }

    unsubscribe(eventName: string, listener: EventBusListener): void {
        this.commands.unsubscribe(eventName, listener);
    }

    removeAllListeners(eventName?: string): void {
        this.commands.removeAllListeners(eventName);
    }

    emit(eventName: string, ...args: any[]): void {
        this.commands.emit(eventName, ...args);
    }

    // Query methods
    getListenerCount(eventName: string): number {
        return this.queries.getListenerCount(eventName);
    }

    hasListeners(eventName: string): boolean {
        return this.queries.hasListeners(eventName);
    }

    getEventNames(): string[] {
        return this.queries.getEventNames();
    }
}

export const eventBus = Object.freeze(new EventBus());
