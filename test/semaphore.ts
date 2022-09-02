import Semaphore from '../src/Semaphore';
import { semaphoreSuite } from './semaphoreSuite';

suite('Semaphore', () => {
    semaphoreSuite((maxConcurrency: number, err?: Error) => new Semaphore(maxConcurrency, err));
});
