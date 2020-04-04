import { InstalledClock } from '@sinonjs/fake-timers';

export const withTimer = async (clock: InstalledClock, test: () => Promise<void>): Promise<void> => {
    const result = test();

    await clock.runAllAsync();

    return result;
};
