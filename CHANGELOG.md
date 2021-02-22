# Changelog

## 0.3.1

* `withTimeout`: make Jest happy and cancel timer when the mutex is acquired.
  Thanks to cantoine for the PR.

## 0.3.0

 * Deprecate `Mutex::release` / `Semaphore::release` and remove them from the
   documentation. The methods are still available in 0.3.x, but will be removed in
   0.4.0.

   I don't like breaking existing APIs, but using those methods is inherently
   dangerous as they can accidentially release locks acquired in a completely
   different place. Furthermore, they are mostly useless for semaphores. I consider
   adding them an unfortunate mistake on my end.

   A safe alternative is the usage of `runExclusive` which allows to execute
   blocks exclusively and automatically manages acquiring and releasing the
   mutex or semaphore.
 * Add `Mutex::cancel` / `Semaphore::cancel` for rejecting all currently pending
   locks.
 * Add `tryAcquire` decorator for lock-or-fail semantics.

## 0.2.6

 * Fix a nasty [bug](https://github.com/DirtyHairy/async-mutex/issues/27) related to
   consecutive calls to `Mutex::release`.

## 0.2.5

 * Nothing new thanks to NPM. Go away. Install 0.2.6.

## 0.2.4

 * Calling Semaphore::release on a semaphore with concurrency > 1 will not work
   as expected; throw an exception in this case
 * Make the warning on using Semaphore::release and Mutex::release more prominent

## 0.2.3

 * Add alternate Semaphore::release and Mutex::release API
 * Work around build warnings with react native (and probably other bundlers)

## 0.2.2

 * Improve compatibility with older versions of node 13, thanks to @josemiguelmelo

## 0.2.1

 * Remove sourcemaps

## 0.2.0

 * Add a `Semaphore`, reimplement `Mutex` on top of it
 * Add a `withTimeout` decorator that limits the time the program waits
   for the mutex or semaphore to become available
 * Support native ES6 imports on Node >= 12
 * Provide an ES6 module entrypoint for ES6 aware bundlers
 * Dependency bump
 * Switch from TSlint to ESlint
 * Enable code coverage in tests

## 0.1.4

 * Documentation updates (thanks to hmil and 0xflotus)
 * Update build dependencies

## 0.1.3

 * Move deps to devDependencies (thanks to Meirion Hughes for the PR)
 * Upgrade deps

## 0.1.2

 * Move to yarn
 * Add tslint
 * Switch tests to use ES6
 * Add isLocked()

## 0.1.1

 * Fix documentation for `acquire`

## 0.1.0

 * Initial release
