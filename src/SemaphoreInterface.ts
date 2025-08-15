export interface SemaphoreInterface {
    acquire(options?: SemaphoreOptions): Promise<[number, SemaphoreInterface.Releaser]>;

    runExclusive<T>(callback: SemaphoreInterface.Worker<T>, options?: SemaphoreOptions): Promise<T>;

    waitForUnlock(options?: SemaphoreOptions): Promise<void>;

    isLocked(): boolean;

    getValue(): number;

    setValue(value: number): void;

    release(weight?: number): void;

    cancel(): void;
}

export interface SemaphoreOptions {
    weight?: number;
    priority?: number;
}

export namespace SemaphoreInterface {
    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (value: number): Promise<T> | T;
    }
}

export default SemaphoreInterface;
