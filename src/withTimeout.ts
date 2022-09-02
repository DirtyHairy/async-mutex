/* eslint-disable @typescript-eslint/no-explicit-any */
import { E_TIMEOUT } from './errors';
import MutexInterface from './MutexInterface';
import SemaphoreInterface from './SemaphoreInterface';

export function withTimeout(mutex: MutexInterface, timeout: number, timeoutError?: Error): MutexInterface;
export function withTimeout(semaphore: SemaphoreInterface, timeout: number, timeoutError?: Error): SemaphoreInterface;
export function withTimeout(sync: MutexInterface | SemaphoreInterface, timeout: number, timeoutError = E_TIMEOUT): any {
    return {
        acquire: (weight?: number): Promise<MutexInterface.Releaser | [number, SemaphoreInterface.Releaser]> =>
            new Promise(async (resolve, reject) => {
                let isTimeout = false;

                const handle = setTimeout(() => {
                    isTimeout = true;
                    reject(timeoutError);
                }, timeout);

                try {
                    const ticket = await sync.acquire(weight);

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
            }),

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

        release(): void {
            sync.release();
        },

        cancel(): void {
            return sync.cancel();
        },

        waitForUnlock: (weight?: number): Promise<void> => sync.waitForUnlock(weight),

        isLocked: (): boolean => sync.isLocked(),

        getValue: (): number => (sync as SemaphoreInterface).getValue?.(),

        setValue: (value: number) => (sync as SemaphoreInterface).setValue?.(value),
    };
}
