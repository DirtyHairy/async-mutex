import MutexInterface from './MutexInterface';
import Semaphore from './Semaphore';

class Mutex implements MutexInterface {
    constructor(cancelError?: Error) {
        this._semaphore = new Semaphore(1, cancelError);
    }

    async acquire(priority = 0): Promise<MutexInterface.Releaser> {
        const [, releaser] = await this._semaphore.acquire(1, priority);

        return releaser;
    }

    runExclusive<T>(callback: MutexInterface.Worker<T>, priority = 0): Promise<T> {
        return this._semaphore.runExclusive(() => callback());
    }

    isLocked(): boolean {
        return this._semaphore.isLocked();
    }

    waitForUnlock(priority = 0): Promise<void> {
        return this._semaphore.waitForUnlock();
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
