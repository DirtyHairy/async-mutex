import { MutexOptions, MutexInterface } from './MutexInterface';
import Semaphore from './Semaphore';

class Mutex implements MutexInterface {
    constructor(cancelError?: Error) {
        this._semaphore = new Semaphore(1, cancelError);
    }

    async acquire(options?: MutexOptions): Promise<MutexInterface.Releaser> {
        const [, releaser] = await this._semaphore.acquire(options);

        return releaser;
    }

    runExclusive<T>(callback: MutexInterface.Worker<T>, options?: MutexOptions): Promise<T> {
        return this._semaphore.runExclusive(() => callback(), options);
    }

    isLocked(): boolean {
        return this._semaphore.isLocked();
    }

    waitForUnlock(priority = 0): Promise<void> {
        return this._semaphore.waitForUnlock(1, priority);
    }

    release(): void {
        if (this._semaphore.isLocked()) this._semaphore.release();
    }

    cancel(): void {
        return this._semaphore.cancel();
    }

    private _semaphore: Semaphore;
}

export default Mutex;
