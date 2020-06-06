import SemaphoreInterface from './SemaphoreInterface';

class Semaphore implements SemaphoreInterface {
    constructor(private _value: number) {
        if (_value <= 0) {
            throw new Error('semaphore must be initialized to a positive value');
        }
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

    private _dispatch(): void {
        const nextConsumer = this._queue.shift();

        if (!nextConsumer) return;

        let released = false;
        const release: SemaphoreInterface.Releaser = () => {
            if (released) return;

            released = true;
            this._value++;

            this._dispatch();
        };

        nextConsumer([this._value--, release]);
    }

    private _queue: Array<(lease: [number, SemaphoreInterface.Releaser]) => void> = [];
}

export default Semaphore;
