# Changelog

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
