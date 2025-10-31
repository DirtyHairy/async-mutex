export class TimeoutError extends Error {
    constructor() {
        super('timeout while waiting for mutex to become available');
        this.name = 'TimeoutError';
        // Fix prototype chain for ES5
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

export class AlreadyLockedError extends Error {
    constructor() {
        super('mutex already locked');
        this.name = 'AlreadyLockedError';
        // Fix prototype chain for ES5
        Object.setPrototypeOf(this, AlreadyLockedError.prototype);
    }
}

export class CanceledError extends Error {
    constructor() {
        super('request for lock canceled');
        this.name = 'CanceledError';
        // Fix prototype chain for ES5
        Object.setPrototypeOf(this, CanceledError.prototype);
    }
}
