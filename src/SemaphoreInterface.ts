interface SemaphoreInterface {
    acquire(weight?: number, priority?: number): Promise<[number, SemaphoreInterface.Releaser]>;

    runExclusive<T>(callback: SemaphoreInterface.Worker<T>, weight?: number, priority?: number): Promise<T>;

    waitForUnlock(weight?: number, priority?: number): Promise<void>;

    isLocked(): boolean;

    getValue(): number;

    setValue(value: number): void;

    release(weight?: number): void;

    cancel(): void;

    cancelUnlockWaiters(): void;
}

namespace SemaphoreInterface {
    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (value: number): Promise<T> | T;
    }
}

export default SemaphoreInterface;
