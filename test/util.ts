import { Clock } from '@sinonjs/fake-timers';

export const withTimer = async (clock: Clock, test: () => Promise<void>): Promise<void> => {
    const result = test();

    await clock.runAllAsync();

    return result;
};
