import MutexInterface from './MutexInterface';
import Semaphore from './Semaphore';

class Mutex implements MutexInterface {
    async acquire(): Promise<MutexInterface.Releaser> {
        const [, releaser] = await this._semaphore.acquire();

        return releaser;
    }

    runExclusive<T>(callback: MutexInterface.Worker<T>): Promise<T> {
        return this._semaphore.runExclusive(() => callback());
    }

    isLocked(): boolean {
        return this._semaphore.isLocked();
    }

    /** @deprecated Deprecated in 0.3.0, will be removed in 0.4.0. Use runExclusive instead. */
    release(): void {
        this._semaphore.release();
    }

    private _semaphore = new Semaphore(1);
}

export default Mutex;
