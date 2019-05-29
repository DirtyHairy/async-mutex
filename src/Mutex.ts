import MutexInterface from './MutexInterface';

class Mutex implements MutexInterface {

    isLocked(): boolean {
        return this._pending;
    }

    acquire(): Promise<MutexInterface.Releaser> {
        const ticket = new Promise<MutexInterface.Releaser>(resolve => this._queue.push(resolve));

        if (!this._pending) {
            this._pending = true;
            this._dispatchNext();
        }

        return ticket;
    }

    runExclusive<T>(callback: MutexInterface.Worker<T>): Promise<T> {
        return this
            .acquire()
            .then(release => {
                    let result: T|Promise<T>;

                    try {
                        result = callback();
                    } catch (e) {
                        release();
                        throw(e);
                    }

                    return Promise
                        .resolve(result)
                        .then(
                            (x: T) => (release(), x),
                            e => {
                                release();
                                throw e;
                            }
                        );
                }
            );
    }

    private _dispatchNext = () => {
        const next = this._queue.shift();
        if (next === undefined) {
            this._pending = false;
        } else {
            next(this._dispatchNext);
        }
    }

    private _queue: Array<(release: MutexInterface.Releaser) => void> = [];
    private _pending = false;

}

export default Mutex;
