import { E_CANCELED } from './errors';
import SemaphoreInterface from './SemaphoreInterface';

interface QueueEntry {
    resolve: (ticket: [number, SemaphoreInterface.Releaser]) => void;
    reject: (err: Error) => void;
}

class Semaphore implements SemaphoreInterface {
    constructor(private _maxConcurrency: number, private _cancelError: Error = E_CANCELED) {
        if (_maxConcurrency <= 0) {
            throw new Error('semaphore must be initialized to a positive value');
        }

        this._value = _maxConcurrency;
    }

    acquire(): Promise<[number, SemaphoreInterface.Releaser]> {
        const locked = this.isLocked();
        const ticketPromise = new Promise<[number, SemaphoreInterface.Releaser]>((resolve, reject) =>
            this._queue.push({ resolve, reject })
        );

        if (!locked) this._dispatch();

        return ticketPromise;
    }

    async runExclusive<T>(callback: SemaphoreInterface.Worker<T>): Promise<T> {
        const [value, release] = await this.acquire();        
        try {
            const result = await callback(value);
            release();
            return result;
        } catch (error) {
            release();
            throw error;
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

    cancel(): void {
        this._queue.forEach((ticket) => ticket.reject(this._cancelError));
        this._queue = [];
    }

    private _dispatch(): void {
        const nextTicket = this._queue.shift();

        if (!nextTicket) return;

        let released = false;
        this._currentReleaser = () => {
            if (released) return;

            released = true;
            this._value++;

            this._dispatch();
        };

        nextTicket.resolve([this._value--, this._currentReleaser]);
    }

    private _queue: Array<QueueEntry> = [];
    private _currentReleaser: SemaphoreInterface.Releaser | undefined;
    private _value: number;
}

export default Semaphore;
