import SemaphoreInterface from './SemaphoreInterface';

class Semaphore implements SemaphoreInterface {
    constructor(private _maxConcurrency: number) {
        if (_maxConcurrency <= 0) {
            throw new Error('semaphore must be initialized to a positive value');
        }

        this._value = _maxConcurrency;
    }

    acquire(): Promise<[number, SemaphoreInterface.Releaser]> {
        const locked = this.isLocked();
        const ticket = new Promise<[number, SemaphoreInterface.Releaser]>((r) => this._queue.push(r));

        if (!locked) this._dispatch();

        return ticket;
    }

    async runExclusive<T>(callback: SemaphoreInterface.Worker<T>): Promise<T> {
        const [value, release] = await this.acquire();

        try {
            return await callback(value);
        } finally {
            release();
        }
    }

    isLocked(): boolean {
        return this._value <= 0;
    }

    /** @deprecated Deprecated in 0.3.0, will be removed in 0.4.0. Use runExclusive instead. */
    release(): void {
        if (this._maxConcurrency > 1) {
            throw new Error(
                'this method is unavailable on semaphores with concurrency > 1; use the scoped release returned by acquire instead'
            );
        }

        if (this._currentReleaser) {
            const releaser = this._currentReleaser;
            this._currentReleaser = undefined;

            releaser();
        }
    }

    private _dispatch(): void {
        const nextConsumer = this._queue.shift();

        if (!nextConsumer) return;

        let released = false;
        this._currentReleaser = () => {
            if (released) return;

            released = true;
            this._value++;

            this._dispatch();
        };

        nextConsumer([this._value--, this._currentReleaser]);
    }

    private _queue: Array<(lease: [number, SemaphoreInterface.Releaser]) => void> = [];
    private _currentReleaser: SemaphoreInterface.Releaser | undefined;
    private _value: number;
}

export default Semaphore;
