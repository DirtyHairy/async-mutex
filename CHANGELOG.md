# Changelog

## 0.5.0 - 2024/03/11

* Support priority queueing for mutexes and semaphores. A huge "thank you"
  goes to @dmurvihill who added this feature.
* Update dependencies.

## 0.4.1 - 2024/01/17

* Expand documentation and fix a few errors.
* Clear timeout after acquiring a lock in `withTimeout`.
* Thanks to AkatQuas and aryzing for their contributions.
* Update dependencies.

## 0.4.0 - 2022/09/02

This is a full rewrite of the core implementation.

* Allow negative values for semaphores.
* Allow weights for `semaphore.acquire` and `semaphore.runExclusive`.
  A waiter will be dispatched once the value of the semaphore is greater or
  equal to its weight.
* Add `semaphore.getValue` and `semaphore.setValue`.
* Allow weights for `semaphore.waitForUnlock`. The promise will only resolve
  once the value of the semaphore is greater or equal to its weight.
* Only resolve `waitForUnlock` once no waiters remain (fixes #52).
* `waitForUnlock` times out if the `withTimeout` decorator is used.

## 0.3.2 - 2021/08/30

* Add `waitForUnlock` for waiting until a mutex/semaphore is free for locking,
  thanks to Jason Gore.

## 0.3.1 - 2021/02/22

* `withTimeout`: make Jest happy and cancel timer when the mutex is acquired.
  Thanks to cantoine for the PR.

## 0.3.0 - 2021/02/05

 * Deprecate `Mutex::release` / `Semaphore::release` and remove them from the
   documentation. The methods are still available in 0.3.x, but will be removed in
   0.4.0.

   I don't like breaking existing APIs, but using those methods is inherently
   dangerous as they can accidentally release locks acquired in a completely
   different place. Furthermore, they are mostly useless for semaphores. I consider
   adding them an unfortunate mistake on my end.

   A safe alternative is the usage of `runExclusive` which allows to execute
   blocks exclusively and automatically manages acquiring and releasing the
   mutex or semaphore.
 * Add `Mutex::cancel` / `Semaphore::cancel` for rejecting all currently pending
   locks.
 * Add `tryAcquire` decorator for lock-or-fail semantics.

## 0.2.6 - 2020/11/28

 * Fix a nasty [bug](https://github.com/DirtyHairy/async-mutex/issues/27) related to
   consecutive calls to `Mutex::release`.

## 0.2.5 - 2020/11/28

 * Nothing new thanks to NPM. Go away. Install 0.2.6.

## 0.2.4 - 2020/07/09

 * Calling Semaphore::release on a semaphore with concurrency > 1 will not work
   as expected; throw an exception in this case
 * Make the warning on using Semaphore::release and Mutex::release more prominent

## 0.2.3 - 2020/06/18

 * Add alternate Semaphore::release and Mutex::release API
 * Work around build warnings with react native (and probably other bundlers)

## 0.2.2 - 2020/04/15

 * Improve compatibility with older versions of node 13, thanks to @josemiguelmelo

## 0.2.1 - 2020/04/06

 * Remove sourcemaps

## 0.2.0 - 2020/04/06

 * Add a `Semaphore`, reimplement `Mutex` on top of it
 * Add a `withTimeout` decorator that limits the time the program waits
   for the mutex or semaphore to become available
 * Support native ES6 imports on Node >= 12
 * Provide an ES6 module entrypoint for ES6 aware bundlers
 * Dependency bump
 * Switch from TSlint to ESlint
 * Enable code coverage in tests

## 0.1.4 - 2019/09/26

 * Documentation updates (thanks to hmil and 0xflotus)
 * Update build dependencies

## 0.1.3 - 2017/09/17

 * Move deps to devDependencies (thanks to Meirion Hughes for the PR)
 * Upgrade deps

## 0.1.2 - 2017/06/29

 * Move to yarn
 * Add tslint
 * Switch tests to use ES6
 * Add isLocked()

## 0.1.1 - 2017/01/04

 * Fix documentation for `acquire`

## 0.1.0 - 2016/10/13

 * Initial release
