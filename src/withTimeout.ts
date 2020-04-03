import MutexInterface from './MutexInterface';
import SemaphoreInterface from './SemaphoreInterface';

const TIMEOUT_ERROR = new Error('Timeout');

export function wasTimeout(error: Error): boolean {
    return error === TIMEOUT_ERROR;
}

export function withTimeout(mutex: MutexInterface, timeout: number): MutexInterface;
export function withTimeout(semaphore: SemaphoreInterface, timeout: number): SemaphoreInterface;
export function withTimeout(sync: MutexInterface | SemaphoreInterface, timeout: number) {
    return {
        acquire: (): Promise<MutexInterface.Releaser | [number, SemaphoreInterface.Releaser]> =>
            new Promise(async (resolve, reject) => {
                let isTimeout = false;

                setTimeout(() => {
                    isTimeout = true;
                    reject(TIMEOUT_ERROR);
                }, timeout);

                const ticket = await sync.acquire();

                if (isTimeout) {
                    const release = Array.isArray(ticket) ? ticket[1] : ticket;

                    release();
                } else {
                    resolve(ticket);
                }
            }),

        async runExclusive<T>(callback: (value?: number) => Promise<T> | T): Promise<T> {
            let release: () => void = () => undefined;

            try {
                const ticket = await this.acquire();

                if (Array.isArray(ticket)) {
                    release = ticket[1];

                    return callback(ticket[0]);
                } else {
                    release = ticket;

                    return callback();
                }
            } finally {
                release();
            }
        },

        isLocked: (): boolean => sync.isLocked(),
    };
}
