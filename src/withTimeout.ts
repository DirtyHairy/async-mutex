/* eslint-disable @typescript-eslint/no-explicit-any */
import { E_TIMEOUT } from './errors';
import MutexInterface from './MutexInterface';
import SemaphoreInterface from './SemaphoreInterface';

export function withTimeout(mutex: MutexInterface, timeout: number, timeoutError?: Error): MutexInterface;
export function withTimeout(semaphore: SemaphoreInterface, timeout: number, timeoutError?: Error): SemaphoreInterface;
export function withTimeout(sync: MutexInterface | SemaphoreInterface, timeout: number, timeoutError = E_TIMEOUT): any {
    return {
        acquire: (weightOrPriority?: number, priority?: number): Promise<MutexInterface.Releaser | [number, SemaphoreInterface.Releaser]> => {
            let weight: number | undefined;
            if (isSemaphore(sync)) {
                weight = weightOrPriority;
            } else {
                weight = undefined;
                priority = weightOrPriority;
            }
            if (weight !== undefined && weight <= 0) {
                throw new Error(`invalid weight ${weight}: must be positive`);
            }

            return new Promise(async (resolve, reject) => {
                let isTimeout = false;

                const handle = setTimeout(() => {
                    isTimeout = true;
                    reject(timeoutError);
                }, timeout);

                try {
                    const ticket = await (isSemaphore(sync)
                        ? sync.acquire(weight, priority)
                        : sync.acquire(priority)
                    );
                    if (isTimeout) {
                        const release = Array.isArray(ticket) ? ticket[1] : ticket;

                        release();
                    } else {
                        clearTimeout(handle);
                        resolve(ticket);
                    }
                } catch (e) {
                    if (!isTimeout) {
                        clearTimeout(handle);

                        reject(e);
                    }
                }
            });
        },

        async runExclusive<T>(callback: (value?: number) => Promise<T> | T, weight?: number, priority?: number): Promise<T> {
            let release: () => void = () => undefined;

            try {
                const ticket = await this.acquire(weight, priority);

                if (Array.isArray(ticket)) {
                    release = ticket[1];

                    return await callback(ticket[0]);
                } else {
                    release = ticket;

                    return await callback();
                }
            } finally {
                release();
            }
        },

        release(weight?: number): void {
            sync.release(weight);
        },

        cancel(): void {
            return sync.cancel();
        },

        waitForUnlock: (weightOrPriority?: number, priority?: number): Promise<void> => {
            let weight: number | undefined;
            if (isSemaphore(sync)) {
                weight = weightOrPriority;
            } else {
                weight = undefined;
                priority = weightOrPriority;
            }
            if (weight !== undefined && weight <= 0) {
                throw new Error(`invalid weight ${weight}: must be positive`);
            }

            return new Promise((resolve, reject) => {
                const handle = setTimeout(() => reject(timeoutError), timeout);
                (isSemaphore(sync)
                    ? sync.waitForUnlock(weight, priority)
                    : sync.waitForUnlock(priority)
                ).then(() => {
                    clearTimeout(handle);
                    resolve();
                });
            });
        },

        isLocked: (): boolean => sync.isLocked(),

        getValue: (): number => (sync as SemaphoreInterface).getValue(),

        setValue: (value: number) => (sync as SemaphoreInterface).setValue(value),
    };
}

function isSemaphore(sync: SemaphoreInterface | MutexInterface): sync is SemaphoreInterface {
    return (sync as SemaphoreInterface).getValue !== undefined;
}
