import { E_CANCELED, E_UNLOCKWAITERS_CANCELED } from './errors';
import SemaphoreInterface from './SemaphoreInterface';


interface Priority {
    priority: number;
}

interface QueueEntry {
    resolve(result: [number, SemaphoreInterface.Releaser]): void;
    reject(error: unknown): void;
    weight: number;
    priority: number;
}

interface Waiter {
    resolve(): void;
    reject(error: unknown): void;
    priority: number;
}

class Semaphore implements SemaphoreInterface {
    constructor(private _value: number, private _cancelError: Error = E_CANCELED, private _unlockCancelError: Error = E_UNLOCKWAITERS_CANCELED) { }

    acquire(weight = 1, priority = 0): Promise<[number, SemaphoreInterface.Releaser]> {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        return new Promise((resolve, reject) => {
            const task: QueueEntry = { resolve, reject, weight, priority };
            const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
            if (i === -1 && weight <= this._value) {
                // Needs immediate dispatch, skip the queue
                this._dispatchItem(task);
            } else {
                this._queue.splice(i + 1, 0, task);
            }
        });
    }

    async runExclusive<T>(callback: SemaphoreInterface.Worker<T>, weight = 1, priority = 0): Promise<T> {
        const [value, release] = await this.acquire(weight, priority);

        try {
            return await callback(value);
        } finally {
            release();
        }
    }

    waitForUnlock(weight = 1, priority = 0): Promise<void> {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        if (this._couldLockImmediately(weight, priority)) {
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                if (!this._weightedWaiters[weight - 1]) this._weightedWaiters[weight - 1] = [];
                insertSorted(this._weightedWaiters[weight - 1], { resolve, reject, priority });
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

    cancelUnlockWaiters(): void {
        this._weightedWaiters.forEach(waiters => waiters.forEach(waiter => waiter.reject(this._unlockCancelError)));
        this._weightedWaiters = [];
    }

    private _dispatchQueue(): void {
        this._drainUnlockWaiters();
        while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
            this._dispatchItem(this._queue.shift()!);
            this._drainUnlockWaiters();
        }
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
            const queuedPriority = this._queue[0].priority;
            for (let weight = this._value; weight > 0; weight--) {
                const waiters = this._weightedWaiters[weight - 1];
                if (!waiters) continue;
                const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
                (i === -1 ? waiters : waiters.splice(0, i))
                    .forEach((waiter => waiter.resolve()));
            }
        }
    }

    private _couldLockImmediately(weight: number, priority: number) {
        return (this._queue.length === 0 || this._queue[0].priority < priority) &&
            weight <= this._value;
    }

    /**
     * `_queue` is sorted in descending order by the `priority` value passed to each lock call.
     */

    private _queue: Array<QueueEntry> = [];

    /**
     * `_weightedWaiters` is sorted in ascending order by the `weight` argument of each `waitForUnlock(weight, priority)` call.
     * 
     * Each element of `_weightedWaiters` contains a list of "unlock waiters", which is sorted in descending order by the `priority` argument of each `waitForUnlock` call.
     */
    private _weightedWaiters: Array<Array<Waiter>> = [];
}

function insertSorted<T extends Priority>(a: T[], v: T) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
}

/**
 * Finds the index from the end of the list based on `predicate`, the found index is used to inset an item to `_queue` or `_weightedWaiters`.
 */

function findIndexFromEnd<T>(a: T[], predicate: (e: T) => boolean): number {
    for (let i = a.length - 1; i >= 0; i--) {
        if (predicate(a[i])) {
            return i;
        }
    }
    return -1;
}

export default Semaphore;
