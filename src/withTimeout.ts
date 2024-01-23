/* eslint-disable @typescript-eslint/no-explicit-any */
import { E_TIMEOUT } from './errors';
import MutexInterface from './MutexInterface';
import SemaphoreInterface from './SemaphoreInterface';

export function withTimeout(mutex: MutexInterface, timeout: number, timeoutError?: Error): MutexInterface;
export function withTimeout(semaphore: SemaphoreInterface, timeout: number, timeoutError?: Error): SemaphoreInterface;
export function withTimeout(sync: MutexInterface | SemaphoreInterface, timeout: number, timeoutError = E_TIMEOUT): any {
    return {
        acquire: (weight?: number, nice?: number): Promise<MutexInterface.Releaser | [number, SemaphoreInterface.Releaser]> => {
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
                    const ticket = await sync.acquire(weight, nice);

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

        async runExclusive<T>(callback: (value?: number) => Promise<T> | T, weight?: number): Promise<T> {
            let release: () => void = () => undefined;

            try {
                const ticket = await this.acquire(weight);

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

        waitForUnlock: (weight?: number): Promise<void> => {
            if (weight !== undefined && weight <= 0) {
                throw new Error(`invalid weight ${weight}: must be positive`);
            }

            return new Promise((resolve, reject) => {
                const handle = setTimeout(() => reject(timeoutError), timeout);
                sync.waitForUnlock(weight).then(() => {
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
