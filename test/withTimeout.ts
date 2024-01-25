import * as assert from 'assert';

import { InstalledClock, install } from '@sinonjs/fake-timers';

import { E_TIMEOUT } from './../src/errors';
import Mutex from '../src/Mutex';
import MutexInterface from '../src/MutexInterface';
import Semaphore from '../src/Semaphore';
import SemaphoreInterface from '../src/SemaphoreInterface';
import { mutexSuite } from './mutex';
import { semaphoreSuite } from './semaphoreSuite';
import { withTimeout } from '../src/withTimeout';

suite('withTimeout', () => {
    suite('Mutex', () => {
        suite('timeout behavior', () => {
            let clock: InstalledClock;
            let mutex: MutexInterface;
            const error = new Error();

            setup(() => {
                mutex = withTimeout(new Mutex(), 100, error);
                clock = install();
            });

            teardown(() => clock.uninstall());

            test('acquire clears timeout if lock is acquired', async () => {
                await mutex.acquire().then((release) => release());
                mutex.acquire().then((release) => setTimeout(release, 75));

                await clock.tickAsync(25);
                assert.strictEqual(clock.countTimers(), 1);
            });

            test('acquire rejects with timeout error if timeout is exceeded', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                const ticket = mutex.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(110);
                await assert.rejects(ticket, error);
            });

            test('after a timeout, acquire does automatically release the mutex once it is acquired', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                mutex.acquire().then(undefined, () => undefined);

                await clock.tickAsync(160);

                let flag = false;

                mutex.acquire().then(() => (flag = true));

                await clock.tickAsync(0);

                assert.strictEqual(flag, true);
            });

            test('runExclusive rejects with E_TIMEOUT if no error is specified', async () => {
                const mutex = withTimeout(new Mutex(), 100);
                mutex.acquire().then((release) => setTimeout(release, 150));

                const result = mutex.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(110);

                await assert.rejects(result, E_TIMEOUT);
            });

            test('runExclusive does not run the callback if timeout is exceeded', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                let flag = false;

                const result = mutex.runExclusive(() => (flag = true));
                result.then(undefined, () => undefined);

                await clock.tickAsync(160);

                assert.strictEqual(flag, false);
            });

            test('after a timeout, runExclusive automatically releases the mutex once it is acquired', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                const result = mutex.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(160);

                let flag = false;

                mutex.runExclusive(() => (flag = true));

                await clock.tickAsync(0);

                assert.strictEqual(flag, true);
            });

            test('a canceled lock with timeout will not lock the mutex again', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                const ticket = mutex.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(120);
                mutex.cancel();

                assert(mutex.isLocked());

                await clock.tickAsync(50);

                assert(!mutex.isLocked());
            });

            test('waitForUnlock times out', async () => {
                mutex.acquire();
                let state = 'PENDING';

                mutex.waitForUnlock()
                    .then(() => { state = 'RESOLVED'; })
                    .catch(() => { state = 'REJECTED'; });
                await clock.tickAsync(120);

                assert.strictEqual(state, 'REJECTED');
            });
        });

        suite('Mutex API', () => mutexSuite((e) => withTimeout(new Mutex(e), 500)));
    });

    suite('Semaphore', () => {
        suite('timeout behavior', () => {
            let clock: InstalledClock;
            let semaphore: SemaphoreInterface;
            const error = new Error();

            setup(() => {
                semaphore = withTimeout(new Semaphore(2), 100, error);
                clock = install();
            });

            teardown(() => clock.uninstall());

            test('acquire clears timeout if lock is acquired', async () => {
                await semaphore.acquire().then(([, release]) => release());
                semaphore.acquire().then(([, release]) => setTimeout(release, 75));

                await clock.tickAsync(25);
                assert.strictEqual(clock.countTimers(), 1);
            });

            test('acquire rejects with timeout error if timeout is exceeded', async () => {
                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                const ticket = semaphore.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(110);
                await assert.rejects(ticket, error);
            });

            test('after a timeout, acquire does automatically release the semaphore once it is acquired', async () => {
                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                semaphore.acquire().then(undefined, () => undefined);

                await clock.tickAsync(160);

                let flag = false;

                semaphore.acquire().then(() => (flag = true));

                await clock.tickAsync(0);

                assert.strictEqual(flag, true);
            });

            test('runExclusive rejects with timeout error if timeout is exceeded', async () => {
                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                const result = semaphore.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(110);

                await assert.rejects(result, error);
            });

            test('runExclusive rejects with E_TIMEOUT if no error is specified', async () => {
                const semaphore = withTimeout(new Semaphore(2), 0);

                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                const result = semaphore.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(110);

                await assert.rejects(result, E_TIMEOUT);
            });

            test('runExclusive does not run the callback if timeout is exceeded', async () => {
                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                let flag = false;

                const result = semaphore.runExclusive(() => (flag = true));
                result.then(undefined, () => undefined);

                await clock.tickAsync(160);

                assert.strictEqual(flag, false);
            });

            test('after a timeout, runExclusive automatically releases the semamphore once it is acquired', async () => {
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                const result = semaphore.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(160);

                let flag = false;

                semaphore.runExclusive(() => (flag = true));

                await clock.tickAsync(0);

                assert.strictEqual(flag, true);
            });

            test('a canceled lock with timeout will not lock the semaphore again', async () => {
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));
                semaphore.acquire().then(([, release]) => setTimeout(release, 200));

                const ticket = semaphore.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(120);
                semaphore.cancel();

                assert(semaphore.isLocked());

                await clock.tickAsync(50);

                assert(!semaphore.isLocked());
            });

            test('waitForUnlock times out', async () => {
                semaphore.acquire(2);
                let state = 'PENDING';

                semaphore.waitForUnlock()
                    .then(() => { state = 'RESOLVED'; })
                    .catch(() => { state = 'REJECTED'; });

                await clock.tickAsync(120);
                assert.strictEqual(state, 'REJECTED');
            });
        });

        suite('Semaphore API', () =>
            semaphoreSuite((maxConcurrency: number, err?: Error) =>
                withTimeout(new Semaphore(maxConcurrency, err), 500)
            )
        );
    });
});
