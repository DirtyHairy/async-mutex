interface MutexInterface {
    acquire(): Promise<MutexInterface.Releaser>;

    runExclusive<T>(callback: MutexInterface.Worker<T>): Promise<T>;

    waitForUnlock(): Promise<void>;

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
