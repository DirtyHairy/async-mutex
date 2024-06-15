import Semaphore from '../src/Semaphore';
import { semaphoreSuite } from './semaphoreSuite';

suite('Semaphore', () => {
    semaphoreSuite((maxConcurrency: number, cancelError?: Error, unlockCancelError?: Error) => new Semaphore(maxConcurrency, cancelError, unlockCancelError));
});
