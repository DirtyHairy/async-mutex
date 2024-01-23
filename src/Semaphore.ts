import { E_CANCELED } from './errors';
import SemaphoreInterface from './SemaphoreInterface';


interface Nice {
    nice: number;
}

interface QueueEntry {
    resolve(result: [number, SemaphoreInterface.Releaser]): void;

    reject(error: unknown): void;

    weight: number;
    nice: number;
}

interface Waiter {
    resolve(): void;

    nice: number;
}

class Semaphore implements SemaphoreInterface {
    constructor(private _value: number, private _cancelError: Error = E_CANCELED) {
    }

    acquire(weight = 1, nice = 0): Promise<[number, SemaphoreInterface.Releaser]> {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        return new Promise((resolve, reject) => {
            const task = { resolve, reject, weight, nice };
            const i = this._queue.findIndex((other) => nice < other.nice);
            if (i === 0 && weight <= this._value) {
                // Needs immediate dispatch, skip the queue
                this._dispatchItem(task);
            } else if (i === -1) {
                this._queue.push(task);
            } else {
                this._queue.splice(i, 0, task);
            }
            this._dispatchQueue();
        });
    }

    async runExclusive<T>(callback: SemaphoreInterface.Worker<T>, weight = 1, nice = 0): Promise<T> {
        const [value, release] = await this.acquire(weight, nice);

        try {
            return await callback(value);
        } finally {
            release();
        }
    }

    waitForUnlock(weight = 1, nice = 0): Promise<void> {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        if (this._couldLockImmediately(weight, nice)) {
            return Promise.resolve();
        } else {
            return new Promise((resolve) => {
                if (!this._weightedWaiters[weight - 1]) this._weightedWaiters[weight - 1] = [];
                insertSorted(this._weightedWaiters[weight - 1], { resolve, nice });
                this._dispatchQueue();
            });
        }
    }

    isLocked(): boolean {
        return this._value <= 0;
    }

    getValue(): number {
        return this._value;
    }

    setValue(value: number): void {
        this._value = value;
        this._dispatchQueue();
    }

    release(weight = 1): void {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        this._value += weight;
        this._dispatchQueue();
    }

    cancel(): void {
        this._queue.forEach((entry) => entry.reject(this._cancelError));
        this._queue = [];
    }

    private _dispatchQueue(): void {
        while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
            this._dispatchItem(this._queue.shift()!);
        }
        this._drainUnlockWaiters();
    }

    private _dispatchItem(item: QueueEntry): void {
        const previousValue = this._value;
        this._value -= item.weight;
        item.resolve([previousValue, this._newReleaser(item.weight)]);
    }

    private _newReleaser(weight: number): () => void {
        let called = false;

        return () => {
            if (called) return;
            called = true;

            this.release(weight);
        };
    }

    private _drainUnlockWaiters(): void {
        if (this._queue.length === 0) {
            for (let weight = this._value; weight > 0; weight--) {
                const waiters = this._weightedWaiters[weight - 1];
                if (!waiters) continue;
                waiters.forEach((waiter) => waiter.resolve());
                this._weightedWaiters[weight - 1] = [];
            }
        } else {
            const queuedNice = this._queue[0].nice;
            for (let weight = this._value; weight > 0; weight--) {
                const waiters = this._weightedWaiters[weight - 1];
                if (!waiters) continue;
                const i = waiters.findIndex((waiter) => waiter.nice >= queuedNice);
                (i === -1 ? waiters : waiters.splice(0, i))
                    .forEach((waiter => { waiter.resolve(); }));
            }
        }
    }

    private _couldLockImmediately(weight: number, nice: number) {
        return (this._queue.length === 0 || this._queue[0].nice > nice) &&
            weight <= this._value;
    }

    private _queue: Array<QueueEntry> = [];
    private _weightedWaiters: Array<Array<Waiter>> = [];
}

function insertSorted<T extends Nice>(a: T[], v: T) {
    const i = a.findIndex((other) => v.nice < other.nice);
    if (i === -1) {
        a.push(v);
    } else {
        a.splice(i, 0, v);
    }
}

export default Semaphore;
