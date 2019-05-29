import MutexInterface from './MutexInterface';

class Mutex implements MutexInterface {

    isLocked(): boolean {
        return this._pending;
    }

    acquire(): Promise<MutexInterface.Releaser> {
        const ticket = new Promise<MutexInterface.Releaser>(resolve => this._queue.push(resolve));

        if (!this._pending) {
            this._dispatchNext();
        }

        return ticket;
    }

    async runExclusive<T>(callback: MutexInterface.Worker<T>): Promise<T> {
        const release = await this.acquire();
        try {
            return await callback();
        } catch (e) {
            throw e;   
        } finally {
            release();     
        }
    }

    private _dispatchNext(): void {
        if (this._queue.length > 0) {
            this._pending = true;
            this._queue.shift()!(this._dispatchNext.bind(this));
        } else {
            this._pending = false;
        }
    }

    private _queue: Array<(release: MutexInterface.Releaser) => void> = [];
    private _pending = false;

}

export default Mutex;
