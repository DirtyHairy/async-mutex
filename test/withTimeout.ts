import * as assert from 'assert';

import { InstalledClock, install } from '@sinonjs/fake-timers';

import Mutex from '../src/Mutex';
import MutexInterface from '../src/MutexInterface';
import Semaphore from '../src/Semaphore';
import SemaphoreInterface from '../src/SemaphoreInterface';
import { mutexSuite } from './mutex';
import { semaphoreSuite } from './semaphore';
import { withTimeout } from '../src/withTimeout';

suite('waitFor', () => {
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

            test('acquire rejects with timeout error if timeout is exceeded', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                const ticket = mutex.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(110);
                return assert.rejects(ticket, error);
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

            test('runExclusive rejects with timeout error if timeout is exceeded', async () => {
                mutex.acquire().then((release) => setTimeout(release, 150));

                const result = mutex.runExclusive(() => undefined);
                result.then(undefined, () => undefined);

                await clock.tickAsync(110);

                return assert.rejects(result, error);
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
        });

        suite('Mutex API', () => mutexSuite(() => withTimeout(new Mutex(), 500)));
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

            test('acquire rejects with timeout error if timeout is exceeded', async () => {
                semaphore.acquire();
                semaphore.acquire().then(([, release]) => setTimeout(release, 150));

                const ticket = semaphore.acquire();
                ticket.then(undefined, () => undefined);

                await clock.tickAsync(110);
                return assert.rejects(ticket, error);
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

                return assert.rejects(result, error);
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
        });

        suite('Semaphore API', () => semaphoreSuite(() => withTimeout(new Semaphore(2), 500)));
    });
});
