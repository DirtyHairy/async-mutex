export interface MutexInterface {
    acquire(options?: MutexOptions): Promise<MutexInterface.Releaser>;

    runExclusive<T>(callback: MutexInterface.Worker<T>, priority?: number): Promise<T>;

    waitForUnlock(priority?: number): Promise<void>;

    isLocked(): boolean;

    release(): void;

    cancel(): void;
}

export interface MutexOptions {
    priority?: number;
}

export namespace MutexInterface {
    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (): Promise<T> | T;
    }
}

export default MutexInterface;
