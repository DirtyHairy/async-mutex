interface MutexInterface {
    acquire(nice?: number): Promise<MutexInterface.Releaser>;

    runExclusive<T>(callback: MutexInterface.Worker<T>, nice?: number): Promise<T>;

    waitForUnlock(nice?: number): Promise<void>;

    isLocked(): boolean;

    release(): void;

    cancel(): void;
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
