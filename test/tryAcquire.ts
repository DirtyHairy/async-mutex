import * as assert from 'assert';

import { Clock, install } from '@sinonjs/fake-timers';

import { E_ALREADY_LOCKED } from '../src/errors';
import Mutex from '../src/Mutex';
import Semaphore from '../src/Semaphore';
import { tryAcquire } from '../src/tryAcquire';

suite('tryAcquire', () => {
    suite('Mutex', () => {
        let clock: Clock;

        setup(() => {
            clock = install();
        });

        teardown(() => clock.uninstall());

        test('acquire rejects with error if mutex is already locked', async () => {
            const error = new Error();
            const mutex = tryAcquire(new Mutex(), error);

            await mutex.acquire();

            const ticket = mutex.acquire();
            ticket.then(undefined, undefined);

            await clock.tickAsync(0);

            await assert.rejects(ticket, error);
        });

        test('acquire rejects with E_ALREADY_LOCKER if no error is provided', async () => {
            const mutex = tryAcquire(new Mutex());
            await mutex.acquire();

            const ticket = mutex.acquire();
            ticket.then(undefined, undefined);

            await clock.tickAsync(0);

            await assert.rejects(ticket, E_ALREADY_LOCKED);
        });

        test('acquire locks the mutex if it is not already locked', async () => {
            const mutex = tryAcquire(new Mutex());

            await mutex.acquire();

            assert(mutex.isLocked());
        });
    });

    suite('Semaphore', () => {
        let clock: Clock;

        setup(() => {
            clock = install();
        });

        teardown(() => clock.uninstall());

        test('acquire rejects with error if semaphore is already locked', async () => {
            const error = new Error();
            const semaphore = tryAcquire(new Semaphore(2), error);

            await semaphore.acquire();
            await semaphore.acquire();

            const ticket = semaphore.acquire();
            ticket.then(undefined, undefined);

            await clock.tickAsync(0);

            await assert.rejects(ticket, error);
        });

        test('acquire rejects with E_ALREADY_LOCKER if no error is provided', async () => {
            const semaphore = tryAcquire(new Semaphore(2));

            await semaphore.acquire();
            await semaphore.acquire();

            const ticket = semaphore.acquire();
            ticket.then(undefined, undefined);

            await clock.tickAsync(0);

            await assert.rejects(ticket, E_ALREADY_LOCKED);
        });

        test('acquire locks the semaphore if it is not already locked', async () => {
            const semaphore = tryAcquire(new Semaphore(2));

            await semaphore.acquire();
            await semaphore.acquire();

            assert(semaphore.isLocked());
        });
    });
});
