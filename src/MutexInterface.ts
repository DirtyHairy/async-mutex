interface MutexInterface {
    acquire(priority?: number): Promise<MutexInterface.Releaser>;

    runExclusive<T>(callback: MutexInterface.Worker<T>, priority?: number): Promise<T>;

    waitForUnlock(priority?: number): Promise<void>;

    isLocked(): boolean;

    release(): void;

    cancel(): void;

    cancelUnlockWaiters(): void;
}

namespace MutexInterface {
    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (): Promise<T> | T;
    }
}

export default MutexInterface;
