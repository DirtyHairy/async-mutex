# async-mutex API Reference

A concise reference for the async-mutex library, which provides synchronization primitives for asynchronous JavaScript/TypeScript operations.

## Installation

```bash
npm install async-mutex
```

## Importing

```javascript
// CommonJS
const { Mutex, Semaphore, withTimeout, tryAcquire } = require('async-mutex');

// ES6
import { Mutex, Semaphore, withTimeout, tryAcquire } from 'async-mutex';

// TypeScript
import { 
  Mutex, MutexInterface, 
  Semaphore, SemaphoreInterface, 
  withTimeout, tryAcquire,
  E_TIMEOUT, E_ALREADY_LOCKED, E_CANCELED 
} from 'async-mutex';
```

## Mutex

A mutual exclusion mechanism for synchronizing asynchronous operations.

### Constructor

```typescript
const mutex = new Mutex(cancelError?: Error);
```

- `cancelError`: Optional custom error used when canceling pending locks (default: `E_CANCELED`)

### Methods

#### `acquire(priority?: number): Promise<MutexInterface.Releaser>`

Acquires the mutex, returning a promise that resolves with a release function.

- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise resolving to a release function that must be called to release the mutex

```typescript
// Async/await style
const release = await mutex.acquire();
try {
  // Critical section
} finally {
  release();
}

// Promise style
mutex
  .acquire()
  .then(release => {
    try {
      // Critical section
    } finally {
      release();
    }
  });
```

#### `runExclusive<T>(callback: () => Promise<T> | T, priority?: number): Promise<T>`

Runs a callback exclusively when the mutex is available.

- `callback`: Function to execute when mutex is acquired
- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise resolving to the callback's return value

```typescript
// Async/await style
const result = await mutex.runExclusive(async () => {
  // Critical section
  return someValue;
});

// Promise style
mutex
  .runExclusive(() => {
    // Critical section
    return someValue;
  })
  .then(result => {
    // Use result
  });
```

#### `release(): void`

Releases the mutex if it's locked.

```typescript
mutex.release();
```

#### `waitForUnlock(priority?: number): Promise<void>`

Waits until the mutex is available without acquiring it.

- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise that resolves when the mutex becomes available

```typescript
// Async/await style
await mutex.waitForUnlock();

// Promise style
mutex
  .waitForUnlock()
  .then(() => {
    // Mutex is now available (but not acquired)
  });
```

#### `isLocked(): boolean`

Checks if the mutex is currently locked.

```typescript
if (mutex.isLocked()) {
  // Mutex is locked
}
```

#### `cancel(): void`

Cancels all pending lock requests.

```typescript
mutex.cancel();
```

## Semaphore

A counting semaphore for controlling access to multiple resources.

### Constructor

```typescript
const semaphore = new Semaphore(initialValue: number, cancelError?: Error);
```

- `initialValue`: Initial value of the semaphore (positive integer)
- `cancelError`: Optional custom error used when canceling pending locks (default: `E_CANCELED`)

### Methods

#### `acquire(weight?: number, priority?: number): Promise<[number, SemaphoreInterface.Releaser]>`

Acquires the semaphore, returning a promise that resolves with the current value and a release function.

- `weight`: Optional weight to decrement the semaphore by (default: 1)
- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise resolving to a tuple of [current value, release function]

```typescript
// Async/await style
const [value, release] = await semaphore.acquire();
try {
  // Critical section using value
} finally {
  release();
}

// Promise style
semaphore
  .acquire()
  .then(([value, release]) => {
    try {
      // Critical section using value
    } finally {
      release();
    }
  });
```

#### `runExclusive<T>(callback: (value: number) => Promise<T> | T, weight?: number, priority?: number): Promise<T>`

Runs a callback exclusively when the semaphore is available.

- `callback`: Function to execute when semaphore is acquired (receives current value)
- `weight`: Optional weight to decrement the semaphore by (default: 1)
- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise resolving to the callback's return value

```typescript
// Async/await style
const result = await semaphore.runExclusive(async (value) => {
  // Critical section using value
  return someValue;
});

// Promise style
semaphore
  .runExclusive((value) => {
    // Critical section using value
    return someValue;
  })
  .then(result => {
    // Use result
  });
```

#### `release(weight?: number): void`

Releases the semaphore, incrementing it by the specified weight.

- `weight`: Optional weight to increment the semaphore by (default: 1)

```typescript
semaphore.release();
```

#### `waitForUnlock(weight?: number, priority?: number): Promise<void>`

Waits until the semaphore is available without acquiring it.

- `weight`: Optional weight to check availability for (default: 1)
- `priority`: Optional priority value (higher values = higher priority, default: 0)
- Returns: Promise that resolves when the semaphore becomes available

```typescript
// Async/await style
await semaphore.waitForUnlock();

// Promise style
semaphore
  .waitForUnlock()
  .then(() => {
    // Semaphore is now available (but not acquired)
  });
```

#### `isLocked(): boolean`

Checks if the semaphore is currently locked (value <= 0).

```typescript
if (semaphore.isLocked()) {
  // Semaphore is locked
}
```

#### `getValue(): number`

Gets the current value of the semaphore.

```typescript
const value = semaphore.getValue();
```

#### `setValue(value: number): void`

Sets the value of the semaphore.

- `value`: New value for the semaphore

```typescript
semaphore.setValue(5);
```

#### `cancel(): void`

Cancels all pending lock requests.

```typescript
semaphore.cancel();
```

## Utility Functions

### `withTimeout`

Decorates a mutex or semaphore with timeout functionality.

```typescript
const mutexWithTimeout = withTimeout(mutex, timeoutMs, customError?);
const semaphoreWithTimeout = withTimeout(semaphore, timeoutMs, customError?);
```

- `mutex/semaphore`: The mutex or semaphore to decorate
- `timeoutMs`: Timeout in milliseconds
- `customError`: Optional custom error (default: `E_TIMEOUT`)

### `tryAcquire`

Decorates a mutex or semaphore to fail immediately if not available.

```typescript
const nonBlockingMutex = tryAcquire(mutex, customError?);
const nonBlockingSemaphore = tryAcquire(semaphore, customError?);
```

- `mutex/semaphore`: The mutex or semaphore to decorate
- `customError`: Optional custom error (default: `E_ALREADY_LOCKED`)

## Error Constants

- `E_TIMEOUT`: Error thrown when a timeout occurs
- `E_ALREADY_LOCKED`: Error thrown when a resource is already locked
- `E_CANCELED`: Error thrown when a pending lock is canceled