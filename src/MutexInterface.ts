interface MutexInterface {

    acquire(): Promise<MutexInterface.Releaser>;

    runExclusive<T>(callback: MutexInterface.Worker<T>): Promise<T>;

    isLocked(): boolean;

}

namespace MutexInterface {

    export interface Releaser {
        (): void;
    }

    export interface Worker<T> {
        (): Promise<T>|T;
    }

}

export default MutexInterface;
