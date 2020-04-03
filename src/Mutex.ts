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

    private _semaphore = new Semaphore(1);
}

export default Mutex;
