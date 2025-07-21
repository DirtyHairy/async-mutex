import * as assert from 'assert';

import { InstalledClock, install } from '@sinonjs/fake-timers';

import { E_CANCELED, E_UNLOCKWAITERS_CANCELED } from '../src/errors';
import SemaphoreInterface from '../src/SemaphoreInterface';
import { withTimer } from './util';

export const semaphoreSuite = (factory: (maxConcurrency: number, cancelError?: Error, unlockCancelError?: Error) => SemaphoreInterface): void => {
    let semaphore: SemaphoreInterface;
    let clock: InstalledClock;

    setup(() => {
        clock = install();
        semaphore = factory(2);
    });

    teardown(() => clock.uninstall());

    test('acquire does not block while the semaphore has not reached zero', async () => {
        const values: Array<number> = [];

        semaphore.acquire().then(([value]) => {
            values.push(value);
        });
        semaphore.acquire().then(([value]) => {
            values.push(value);
        });

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [1, 2]);
    });

    test('acquire with weight does block while the semaphore has reached zero until it is released again', async () => {
        const values: Array<number> = [];

        semaphore.acquire(2).then(([value, release]) => {
            values.push(value);
            setTimeout(release, 100);
        });
        semaphore.acquire(1).then(([value]) => values.push(value));

        await clock.tickAsync(0);

        assert.deepStrictEqual(values.sort(), [2]);

        await clock.runAllAsync();

        assert.deepStrictEqual(values.sort(), [2, 2]);
    });

    test('acquire unblocks high-priority tasks first', async () => {
        const values: Array<number> = [];

        // priority=0; runs first because nothing else is waiting
        semaphore.acquire(2, 0).then(([, release]) => {
            values.push(0);
            setTimeout(release, 100);
        });

        // priority=-1; queues first
        semaphore.acquire(2, -1).then(([, release]) => {
            values.push(-1);
            setTimeout(release, 100);
        });

        // priority=+1; jumps ahead of priority=-1
        semaphore.acquire(2, +1).then(([, release]) => {
            values.push(+1);
            setTimeout(release, 100);
        });

        await clock.runAllAsync();
        assert.deepStrictEqual(values, [0, +1, -1]);
    });

    test('acquire allows light high-priority tasks to skip the line', async () => {
        let executed = false;
        semaphore.acquire(3, 0);
        semaphore.acquire(1, 1).then(([, release]) => {
            executed = true;
            setTimeout(release, 100);
        });
        await clock.runAllAsync();
        assert.strictEqual(executed, true);
    });

    test('acquire prioritizes high-priority tasks even if they are heavier', async () => {
        const values: Array<number> = [];

        // two items with weight 1; runs first because nothing else is waiting
        semaphore.acquire(1, 0).then(([, release]) => {
            values.push(0);
            setTimeout(release, 100);
        });
        semaphore.acquire(1, 0).then(([, release]) => {
            values.push(0);
            setTimeout(release, 100);
        });

        // low-priority item with weight 1
        semaphore.acquire(1, -1).then(([, release]) => {
            values.push(-1);
            setTimeout(release, 100);
        });

        // high-priority item with weight 2; should run before the others
        semaphore.acquire(2, +1).then(([, release]) => {
            values.push(+1);
            setTimeout(release, 100);
        });

        await clock.runAllAsync();
        assert.deepStrictEqual(values, [0, 0, +1, -1]);
    });

    test('acquire allows heavy items to run eventually', async () => {
        let done = false;
        async function lightLoop() {
            while (!done) {
                const [, release] = await semaphore.acquire(1);
                await new Promise((resolve) => { setTimeout(resolve, 10); });
                release();
            }
        }
        lightLoop();
        await clock.tickAsync(5);
        lightLoop();
        semaphore.acquire(2).then(() => { done = true; });
        await clock.tickAsync(10);
        await clock.tickAsync(10);
        assert.strictEqual(done, true);
    });

    test('acquire blocks when the semaphore has reached zero until it is released again', async () => {
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

    test('the semaphore increments again after a release', async () => {
        semaphore.acquire().then(([, release]) => setTimeout(release, 100));
        semaphore.acquire().then(([, release]) => setTimeout(release, 200));

        await clock.tickAsync(250);

        const [value] = await semaphore.acquire();

        assert.strictEqual(value, 2);
    });

    test('a semaphore can be initialized to negative values', async () => {
        semaphore = factory(-2);

        let value: number | undefined = undefined;
        semaphore.acquire().then(([x]) => {
            value = x;
        });

        await clock.tickAsync(0);
        assert.strictEqual(value, undefined);

        semaphore.release(2);
        await clock.tickAsync(0);
        assert.strictEqual(value, undefined);

        semaphore.release(2);
        await clock.tickAsync(0);
        assert.strictEqual(value, 2);
    });

    test('the releaser is idempotent', async () => {
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

    test('the releaser increments by the correct weight', async () => {
        await semaphore.acquire(2);
        assert.strictEqual(semaphore.getValue(), 0);

        semaphore.release(2);
        assert.strictEqual(semaphore.getValue(), 2);

        await semaphore.acquire();
        assert.strictEqual(semaphore.getValue(), 1);

        semaphore.release();
        assert.strictEqual(semaphore.getValue(), 2);
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

    test('runExclusive passes the correct weight', async () => {
        semaphore.runExclusive(() => undefined, 2);
        assert.strictEqual(semaphore.getValue(), 0);

        await clock.runAllAsync();
        assert.strictEqual(semaphore.getValue(), 2);
    });

    test('runExclusive executes high-priority tasks first', async () => {
        const values: number[] = [];
        semaphore.runExclusive(() => { values.push(0) }, 2);
        semaphore.runExclusive(() => { values.push(-1) }, 2, -1);
        semaphore.runExclusive(() => { values.push(+1) }, 2, +1);
        await clock.runAllAsync();
        assert.deepStrictEqual(values, [0, +1, -1]);
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

    test("getValue returns the Semaphore's value", () => {
        assert.strictEqual(semaphore.getValue(), 2);
        semaphore.acquire();

        assert.strictEqual(semaphore.getValue(), 1);
    });

    test('setValue sets the semaphore value and runs all applicable waiters', async () => {
        semaphore = factory(0);

        let flag1 = false;
        let flag2 = false;
        let flag3 = false;

        semaphore.acquire(1).then(() => (flag1 = true));
        semaphore.acquire(2).then(() => (flag2 = true));
        semaphore.acquire(4).then(() => (flag3 = true));

        semaphore.setValue(3);

        await clock.runAllAsync();

        assert.strictEqual(flag1, true);
        assert.strictEqual(flag2, true);
        assert.strictEqual(flag3, false);
    });

    test('setValue works fine with isolated weights', async () => {
        let flag = false;
        semaphore.acquire(4).then(() => (flag = true));
        semaphore.acquire(8);

        semaphore.setValue(4);
        await clock.tickAsync(1);

        assert.strictEqual(flag, true);
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

    test('cancel rejects all pending locks with E_CANCELED', async () => {
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

    test('a canceled waiter will not lock the semaphore again', async () => {
        const [, release] = await semaphore.acquire(2);

        semaphore.acquire().then(undefined, () => undefined);
        semaphore.cancel();

        assert(semaphore.isLocked());

        release();

        assert(!semaphore.isLocked());
    });

    test('cancel works fine with isolated weights', () => {
        const ticket = semaphore.acquire(3);

        semaphore.cancel();

        assert.rejects(ticket);
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

    test('waitForUnlock only unblocks if the configured weight can be acquired', async () => {
        await semaphore.acquire(2);

        let flag1 = false;
        let flag2 = false;

        semaphore.waitForUnlock(1).then(() => (flag1 = true));
        semaphore.waitForUnlock(2).then(() => (flag2 = true));

        semaphore.release(1);
        await clock.tickAsync(0);

        assert.deepStrictEqual([flag1, flag2], [true, false]);

        semaphore.release(1);
        await clock.tickAsync(0);

        assert.deepStrictEqual([flag1, flag2], [true, true]);
    });

    test('waitForUnlock unblocks only high-priority waiters immediately', async () => {
        const calledBack: number[] = [];
        semaphore.acquire(3, 1);  // A big heavy waiting task
        semaphore.waitForUnlock(1, 0).then(() => { calledBack.push(0); });  // Low priority
        semaphore.waitForUnlock(1, 2).then(() => { calledBack.push(2); });  // High priority
        semaphore.waitForUnlock(1, 1).then(() => { calledBack.push(1); });  // Queued behind the heavy task
        await clock.runAllAsync();
        assert.deepStrictEqual(calledBack, [2]);
    });

    test('waitForUnlock unblocks waiters of descending priority as the queue drains', async () => {
        let calledBack = false;
        let release: SemaphoreInterface.Releaser;

        semaphore.acquire(2, 2).then(([, r]) => { release = r; });
        semaphore.acquire(2, 0).then(([, r]) => { setTimeout(r, 100); });

        semaphore.waitForUnlock(2, 1).then(() => { calledBack = true; });

        await clock.tickAsync(0);
        assert.strictEqual(calledBack, false);
        release!();
        await clock.tickAsync(0);
        assert.strictEqual(calledBack, true);
        await clock.runAllAsync();
    });

    test('waitForUnlock resolves immediately when the queue is empty', async () => {
        let calledBack = false;
        semaphore.waitForUnlock(1).then(() => { calledBack = true; });
        await clock.tickAsync(0);
        assert.strictEqual(calledBack, true);
    });

    test('waitForUnlock only unblocks when the semaphore can actually be acquired again', async () => {
        semaphore.acquire(2);
        semaphore.acquire(2);

        let flag = false;
        semaphore.waitForUnlock().then(() => (flag = true));

        semaphore.release(2);
        await clock.tickAsync(0);

        assert.strictEqual(flag, false);

        semaphore.release(2);
        await clock.tickAsync(0);

        assert.strictEqual(flag, true);
    });

    test('trying to acquire with a negative weight throws', () => {
        assert.throws(() => semaphore.acquire(-1));
    });

    test('trying to release with a negative weight throws', () => {
        assert.throws(() => semaphore.release(-1));
    });

    test('trying to waitForUnlock with a negative weight throws', () => {
        assert.throws(() => semaphore.waitForUnlock(-1));
    });

    test('cancelUnlockWaiters rejects all pending unlockWaiters with E_UNLOCKWAITERS_CANCELED', async () => {
        await semaphore.acquire();
        await semaphore.acquire();

        const res1 = semaphore.waitForUnlock();
        const res2 = semaphore.waitForUnlock();

        semaphore.cancelUnlockWaiters();

        await assert.rejects(res1, E_UNLOCKWAITERS_CANCELED);
        await assert.rejects(res2, E_UNLOCKWAITERS_CANCELED);
    });

    test('cancelUnlockWaiters rejects with a custom error if provided', async () => {
        const err = new Error();
        const semaphore = factory(2, E_CANCELED, err);

        await semaphore.acquire();
        await semaphore.acquire();

        const res1 = semaphore.waitForUnlock();

        semaphore.cancelUnlockWaiters();

        await assert.rejects(res1, err);
    });

    test('cancelUnlockWaiters works fine with isolated weights', async () => {
        const res1 = semaphore.waitForUnlock(3);
        const res2 = semaphore.waitForUnlock(5);

        semaphore.cancelUnlockWaiters();

        await assert.rejects(res1, E_UNLOCKWAITERS_CANCELED);
        await assert.rejects(res2, E_UNLOCKWAITERS_CANCELED);
    });
};
