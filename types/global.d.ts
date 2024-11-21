declare global {
    type EventBusListener = (...args: any[]) => void;
    type EventBusUnsubscriber = () => void;
}

export {};
