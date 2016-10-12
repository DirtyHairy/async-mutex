# What is it?

This package implements a mutex for synchronizing asynchronous operations in
Javascript.

The term "mutex" usually refers to a data structure used to synchronize
concurrent processes running on different threads. For example, before accessing
a non-threadsafe resource, a thread will lock the mutex. This is guranteed
to block the thread until no other thread holds a lock on the mutex and thus
enforces exclusive access to the resource. Once the operation is complete, the
thread releases the lock, allowing other threads to aquire a lock and access the
resource.

While Javascript is strictly single-threaded, the asynchronous nature of its
execution model allows for race conditions that require similar synchronization
primitives. Consider for example a library communicating with a web worker that
needs to exchange several subsequent messages with the worker in order to achieve
a task. As these messages are exchanged in an asynchronous manner, it is perfectly
possible that the library is called again during this process. Depending on the
way state is handled during the async process, this will lead to race conditions
that are hard to fix and even harder to track down.

This library solves the problem by applying the concept of mutexes to Javascript.
A mutex is locked by providing a worker callback that will be called once no other locks
are held on the mutex. Once the async process is complete (usually taking multiple
spins of the event loop), a callback supplied to the worker is called in order
to release the mutex, allowing the next scheduled worker to execute.

# How to use it?

## Installation

You can install the library into your project via npm

    npm install async-mutex

The library is written in Typescript and will work in any environment that
supports ES5 and ES6 promises. If ES6 promises are not supported natively,
a shim can be used (e.g. [core-js](https://github.com/zloirock/core-js)).
No external typings are required for using this library with
Typescript (version >= 2).

## Importing

ES5 / CommonJS

    var asyncMutex = require('async-mutex').Mutex;

ES6

    import {Mutex} from 'async-mutex';

Typescript

    import {Mutex, MutexInterface} from 'async-mutex';

##  API

### Creating

ES5/ES6/Typescript

    const mutex = new Mutex();

Create a new mutex.

### Locking

ES5/ES6/Typescript

    mutex.acquire(function(release) {
        // ...
    });

`acquire` schedules the supplied callback to be executed once the mutex is unlocked.
The mutex is locked during execution. Once the callback has finished its work, it
calls `release()` in order to release the mutex.

**IMPORTANT:** `acquire` will not take care of any exceptions throws during execution
of the callback --- it is your own responsibility to make sure that the mutex is
released in case of an exception.

### Synchronized code execution

ES5/ES6/Typescript

    mutex
        .runExclusive(function() {
            // ...
        })
        .then(function(result) {
            // ...
        });

`runExclusive` schedules the supplied callback to be run once the mutex is unlocked.
The function is expected to return a [Promises/A+](https://promisesaplus.com/)
compliant promise. Once the promise is resolved (or rejected), the mutex is released.
`runExclusive` returns a promise that adops the state of the function result.

The mutex is released and the result rejected if an exception occurs during execution
if the callback.

# License

Feel free to use this library under the conditions of the MIT license.