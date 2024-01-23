import { E_CANCELED } from './errors';
import SemaphoreInterface from './SemaphoreInterface';


interface QueueEntry {
    resolve(result: [number, SemaphoreInterface.Releaser]): void;
    reject(error: unknown): void;
    weight: number;
    nice: number;
}

class Semaphore implements SemaphoreInterface {
    constructor(private _value: number, private _cancelError: Error = E_CANCELED) {}

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
        const [value, release] = await this.acquire(weight);

        try {
            return await callback(value);
        } finally {
            release();
        }
    }

    waitForUnlock(weight = 1, nice = 0): Promise<void> {
        if (weight <= 0) throw new Error(`invalid weight ${weight}: must be positive`);

        return new Promise((resolve) => {
            if (!this._weightedWaiters[weight - 1]) this._weightedWaiters[weight - 1] = [];
            this._weightedWaiters[weight - 1].push(resolve);

            this._dispatchQueue();
        });
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
        for (let weight = this._value; weight > 0; weight--) {
            if (!this._weightedWaiters[weight - 1]) continue;

            this._weightedWaiters[weight - 1].forEach((waiter) => waiter());
            this._weightedWaiters[weight - 1] = [];
        }
    }

    private _queue: Array<QueueEntry> = [];
    private _weightedWaiters: Array<Array<() => void>> = [];
}

export default Semaphore;
