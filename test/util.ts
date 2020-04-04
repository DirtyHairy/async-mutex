import { InstalledClock } from '@sinonjs/fake-timers';

export const withTimer = (clock: InstalledClock) => (test: () => Promise<void>) => async (): Promise<void> => {
    const result = test();

    await clock.runAllAsync();

    return result;
};
