export declare class FreeSwitchEventEmitter<E extends string, T extends Record<E, (...args: any[]) => void>> {
    private __on;
    private __once;
    constructor();
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean;
    on<K extends keyof T>(event: K, handler: T[K]): this;
    once<K extends keyof T>(event: K, handler: T[K]): this;
    __onceAsync<K extends keyof T>(event: K): Promise<Parameters<T[K]>>;
    removeListener<K extends keyof T>(event: K, handler: T[K]): void;
    removeAllListeners(): void;
}
export declare const once: <E extends string, T extends Record<string, (...args: any[]) => void>, K extends keyof T>(emitter: FreeSwitchEventEmitter<E, T>, event: K) => Promise<Parameters<T[K]>>;
//# sourceMappingURL=event-emitter.d.ts.map