import * as assert from 'assert';

import { InstalledClock, install } from '@sinonjs/fake-timers';

import Mutex from '../src/Mutex';
import MutexInterface from '../src/MutexInterface';
import { withTimer } from './util';

export const mutexSuite = (factory: () => MutexInterface): void => {
    let mutex: MutexInterface;
    let clock: InstalledClock;

    setup(() => {
        mutex = factory();
        clock = install();
    });

    teardown(() => clock.uninstall());

    test('ownership is exclusive', () =>
        withTimer(clock)(async () => {
            let flag = false;

            const release = await mutex.acquire();

            setTimeout(() => {
                flag = true;
                release();
            }, 50);

            assert(!flag);

            (await mutex.acquire())();

            assert(flag);
        }));

    test('runExclusive passes result (immediate)', async () => {
        assert.strictEqual(await mutex.runExclusive(() => 10), 10);
    });

    test('runExclusive passes result (promise)', async () => {
        assert.strictEqual(await mutex.runExclusive(() => Promise.resolve(10)), 10);
    });

    test('runExclusive passes rejection', async () => {
        await assert.rejects(
            mutex.runExclusive(() => Promise.reject(new Error('foo'))),
            new Error('foo')
        );
    });

    test('runExclusive passes exception', async () => {
        await assert.rejects(
            mutex.runExclusive(() => {
                throw new Error('foo');
            }),
            new Error('foo')
        );
    });

    test('runExclusive is exclusive', () =>
        withTimer(clock)(async () => {
            let flag = false;

            mutex.runExclusive(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => {
                            flag = true;
                            resolve();
                        }, 50)
                    )
            );

            assert(!flag);

            await mutex.runExclusive(() => undefined);

            assert(flag);
        }));

    test('exceptions during runExclusive do not leave mutex locked', async () => {
        let flag = false;

        mutex
            .runExclusive<number>(() => {
                flag = true;
                throw new Error();
            })
            .then(undefined, () => undefined);

        assert(!flag);

        await mutex.runExclusive(() => undefined);

        assert(flag);
    });

    test('new mutex is unlocked', () => {
        assert(!mutex.isLocked());
    });

    test('isLocked reflects the mutex state', async () => {
        const lock1 = mutex.acquire(),
            lock2 = mutex.acquire();

        assert(mutex.isLocked());

        const releaser1 = await lock1;

        assert(mutex.isLocked());

        releaser1();

        assert(mutex.isLocked());

        const releaser2 = await lock2;

        assert(mutex.isLocked());

        releaser2();

        assert(!mutex.isLocked());
    });
};

suite('Mutex', () => mutexSuite(() => new Mutex()));
