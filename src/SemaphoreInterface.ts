interface SemaphoreInterface {
    acquire(): Promise<[number, SemaphoreInterface.Releaser]>;

    weightedAcquire(weight: number): Promise<[number, SemaphoreInterface.Releaser]>;

    runExclusive<T>(callback: SemaphoreInterface.Worker<T>): Promise<T>;

    waitForUnlock(): Promise<void>;

    isLocked(): boolean;

    release(): void;

    cancel(): void;
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
