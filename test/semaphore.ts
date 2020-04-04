import * as assert from 'assert';

import { InstalledClock, install } from '@sinonjs/fake-timers';

import Semaphore from '../src/Semaphore';
import SemaphoreInterface from '../src/SemaphoreInterface';
import { withTimer } from './util';

export const semaphoreSuite = (factory: () => SemaphoreInterface): void => {
    let semaphore: SemaphoreInterface;
    let clock: InstalledClock;

    setup(() => {
        clock = install();
        semaphore = factory();
    });

    teardown(() => clock.uninstall());

    test('acquire does not block while the semaphore has not reached zero', async () => {
        const values: Array<number> = [];

        semaphore.acquire().then(([value]) => values.push(value));
        semaphore.acquire().then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepEqual(values.sort(), [1, 2]);
    });

    test('acquire blocks when the semaphore has reached zero', async () => {
        const values: Array<number> = [];

        semaphore.acquire().then(([value]) => values.push(value));
        semaphore.acquire().then(([value, release]) => {
            values.push(value);
            setTimeout(release, 100);
        });
        semaphore.acquire().then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepEqual(values.sort(), [1, 2]);

        await clock.runAllAsync();

        assert.deepEqual(values.sort(), [1, 1, 2]);
    });

    test('the semaphore increments again after a release', async () => {
        semaphore.acquire().then(([, release]) => setTimeout(release, 100));
        semaphore.acquire().then(([, release]) => setTimeout(release, 200));

        await clock.tickAsync(250);

        const [value] = await semaphore.acquire();

        assert.strictEqual(value, 2);
    });

    test('release is idempotent', async () => {
        const values: Array<number> = [];

        semaphore.acquire().then(([value, release]) => {
            values.push(value);
            setTimeout(() => {
                release();
                release();
            }, 50);
        });

        semaphore.acquire().then(([value, release]) => {
            values.push(value);
            setTimeout(release, 100);
        });

        await clock.tickAsync(10);

        semaphore.acquire().then(([value]) => values.push(value));
        semaphore.acquire().then(([value]) => values.push(value));

        await clock.tickAsync(10);

        assert.deepEqual(values.sort(), [1, 2]);

        await clock.tickAsync(40);

        assert.deepEqual(values.sort(), [1, 1, 2]);

        await clock.tickAsync(50);

        assert.deepEqual(values.sort(), [1, 1, 1, 2]);
    });

    test('runExclusive passes semaphore value', async () => {
        let value = -1;

        semaphore.runExclusive((v) => (value = v));

        await clock.tickAsync(0);

        assert.strictEqual(value, 2);
    });

    test('runExclusive passes result (immediate)', async () => {
        assert.strictEqual(await semaphore.runExclusive(() => 10), 10);
    });

    test('runExclusive passes result (promise)', async () => {
        assert.strictEqual(await semaphore.runExclusive(() => Promise.resolve(10)), 10);
    });

    test('runExclusive passes rejection', async () => {
        await assert.rejects(
            semaphore.runExclusive(() => Promise.reject(new Error('foo'))),
            new Error('foo')
        );
    });

    test('runExclusive passes exception', async () => {
        await assert.rejects(
            semaphore.runExclusive(() => {
                throw new Error('foo');
            }),
            new Error('foo')
        );
    });

    test('runExclusive is exclusive', () =>
        withTimer(clock, async () => {
            let flag = false;

            semaphore.acquire();

            semaphore.runExclusive(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => {
                            flag = true;
                            resolve();
                        }, 50)
                    )
            );

            assert(!flag);

            await semaphore.runExclusive(() => undefined);

            assert(flag);
        }));

    test('exceptions during runExclusive do not leave semaphore locked', async () => {
        let flag = false;

        semaphore.acquire();

        semaphore
            .runExclusive<number>(() => {
                flag = true;
                throw new Error();
            })
            .then(undefined, () => undefined);

        assert(!flag);

        await semaphore.runExclusive(() => undefined);

        assert(flag);
    });

    test('new semaphore is unlocked', () => {
        assert(!semaphore.isLocked());
    });

    test('isLocked reflects the semaphore state', async () => {
        const lock1 = semaphore.acquire(),
            lock2 = semaphore.acquire();

        semaphore.acquire();

        assert(semaphore.isLocked());

        const [, releaser1] = await lock1;

        assert(semaphore.isLocked());

        releaser1();

        assert(semaphore.isLocked());

        const [, releaser2] = await lock2;

        assert(semaphore.isLocked());

        releaser2();

        assert(!semaphore.isLocked());
    });
};

suite('Semaphore', () => {
    semaphoreSuite(() => new Semaphore(2));

    test('Semaphore constructor throws if value <= 0', () => {
        assert.throws(() => new Semaphore(0));
        assert.throws(() => new Semaphore(-1));
    });
});
