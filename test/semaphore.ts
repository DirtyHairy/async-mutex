import * as assert from 'assert';

import { Clock, install } from '@sinonjs/fake-timers';

import { E_CANCELED } from '../src/errors';
import Semaphore from '../src/Semaphore';
import SemaphoreInterface from '../src/SemaphoreInterface';
import { withTimer } from './util';

export const semaphoreSuite = (factory: (maxConcurrency: number, err?: Error) => SemaphoreInterface): void => {
    let semaphore: SemaphoreInterface;
    let clock: Clock;

    setup(() => {
        clock = install();
        semaphore = factory(2);
    });

    teardown(() => clock.uninstall());

    test('acquire does not block while the semaphore has not reached zero', async () => {
        const values: Array<number> = [];

        semaphore.acquire().then(([value]) => values.push(value));
        semaphore.acquire().then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [1, 2]);
    });

    test('weightedAcquire does not block while the semaphore has not reached zero', async () => {
        const values: Array<number> = [];

        semaphore.weightedAcquire(1).then(([value]) => values.push(value));
        semaphore.weightedAcquire(1).then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [1, 2]);
    });

    test('weightedAcquire does block while the semaphore has reached zero', async () => {
        const values: Array<number> = [];

        semaphore.weightedAcquire(2).then(([value]) => values.push(value));
        semaphore.weightedAcquire(1).then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [2]);
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

        assert.deepStrictEqual(values.sort(), [1, 2]);

        await clock.runAllAsync();

        assert.deepStrictEqual(values.sort(), [1, 1, 2]);
    });

    test('weightedAcquire blocks when the semaphore has reached zero and unblocked on release', async () => {
        const values: Array<number> = [];

        semaphore.weightedAcquire(1).then(([value, release]) => { 
            values.push(value)
            release() 
        });
        semaphore.weightedAcquire(3).then(([value, release]) => {
            values.push(value);
            setTimeout(() => {
                release();
            }, 100);
        });
        semaphore.weightedAcquire(1).then(([value, release]) => {
            values.push(value)
            release();
        });

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [-1, 1, 2]);

        await clock.runAllAsync();

        assert.deepStrictEqual(values.sort(), [-1, 1, 2]);
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

        assert.deepStrictEqual(values.sort(), [1, 2]);

        await clock.tickAsync(40);

        assert.deepStrictEqual(values.sort(), [1, 1, 2]);

        await clock.tickAsync(50);

        assert.deepStrictEqual(values.sort(), [1, 1, 1, 2]);
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
                            resolve(undefined);
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

    test('the release method releases a locked semaphore', async () => {
        semaphore = factory(1);

        await semaphore.acquire();
        assert(semaphore.isLocked());

        semaphore.release();

        assert(!semaphore.isLocked());
    });

    test('calling release on a unlocked semaphore does not throw', () => {
        semaphore = factory(1);

        semaphore.release();
    });

    test('calling release on a semaphore with concurrency > 1 throws', () => {
        assert.throws(() => semaphore.release());
    });

    test('cancel rejects all pending locks witth E_CANCELED', async () => {
        await semaphore.acquire();
        await semaphore.acquire();

        const ticket = semaphore.acquire();
        const result = semaphore.runExclusive(() => undefined);

        semaphore.cancel();

        await assert.rejects(ticket, E_CANCELED);
        await assert.rejects(result, E_CANCELED);
    });

    test('cancel rejects with a custom error if provided', async () => {
        const err = new Error();
        const semaphore = factory(2, err);

        await semaphore.acquire();
        await semaphore.acquire();

        const ticket = semaphore.acquire();

        semaphore.cancel();

        await assert.rejects(ticket, err);
    });

    test('a canceled semaphore will not lock the mutex again', async () => {
        const [, release] = await semaphore.acquire();
        await semaphore.acquire();

        semaphore.acquire().then(undefined, () => undefined);
        semaphore.cancel();

        assert(semaphore.isLocked());

        release();

        assert(!semaphore.isLocked());
    });

    test('waitForUnlock does not block while the semaphore has not reached zero', async () => {
        let taskCalls = 0;

        const awaitUnlockWrapper = async () => {
            await semaphore.waitForUnlock();
            taskCalls++;
        };

        awaitUnlockWrapper();
        awaitUnlockWrapper();
        await clock.tickAsync(1);

        assert.strictEqual(taskCalls, 2);
    });

    test('waitForUnlock blocks when the semaphore has reached zero', async () => {
        let taskCalls = 0;

        const awaitUnlockWrapper = async () => {
            await semaphore.waitForUnlock();
            taskCalls++;
        };

        semaphore.acquire();
        semaphore.acquire();

        awaitUnlockWrapper();
        awaitUnlockWrapper();
        await clock.tickAsync(0);

        assert.strictEqual(taskCalls, 0);
    });

    test('waitForUnlock unblocks after a release', async () => {
        let taskCalls = 0;

        const awaitUnlockWrapper = async () => {
            await semaphore.waitForUnlock();
            taskCalls++;
        };

        const lock = semaphore.acquire();
        semaphore.acquire();

        awaitUnlockWrapper();
        awaitUnlockWrapper();
        await clock.tickAsync(0);

        assert.strictEqual(taskCalls, 0);

        const [, releaser] = await lock;
        releaser();
        await clock.tickAsync(0);

        assert.strictEqual(taskCalls, 2);
    });
};

suite('Semaphore', () => {
    semaphoreSuite((maxConcurrency: number, err?: Error) => new Semaphore(maxConcurrency, err));

    test('Semaphore constructor throws if value <= 0', () => {
        assert.throws(() => new Semaphore(0));
        assert.throws(() => new Semaphore(-1));
    });
});
