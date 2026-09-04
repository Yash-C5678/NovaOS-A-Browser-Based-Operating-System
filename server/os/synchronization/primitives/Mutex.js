export class Mutex {
    constructor(id) {
        if (!id) {
            throw new Error(
                "Mutex id is required."
            );
        }

        this.id = id;

        this.locked = false;
        this.ownerPid = null;

        this.waitQueue = [];
    }

    acquire(pid) {
        if (!pid) {
            throw new Error(
                "PID is required to acquire mutex."
            );
        }

        /*
         * The process already owns the mutex.
         * A mutex is non-reentrant in NovaOS.
         */
        if (this.ownerPid === pid) {
            throw new Error(
                `Process '${pid}' already owns mutex '${this.id}'.`
            );
        }

        /*
         * Mutex is currently locked.
         * Add the process to the FIFO waiting queue.
         */
        if (this.locked) {
            if (!this.waitQueue.includes(pid)) {
                this.waitQueue.push(pid);
            }

            return false;
        }

        /*
         * Mutex is available.
         */
        this.locked = true;
        this.ownerPid = pid;

        return true;
    }

    release(pid) {
        if (!pid) {
            throw new Error(
                "PID is required to release mutex."
            );
        }

        if (!this.locked) {
            throw new Error(
                `Mutex '${this.id}' is not locked.`
            );
        }

        /*
         * Only the process that owns the mutex
         * may release it.
         */
        if (this.ownerPid !== pid) {
            throw new Error(
                `Process '${pid}' does not own mutex '${this.id}'.`
            );
        }

        this.locked = false;
        this.ownerPid = null;

        /*
         * Return the next waiting process.
         * Ownership is NOT automatically transferred here.
         * The synchronization manager decides when
         * the process actually acquires the mutex.
         */
        return this.waitQueue.shift() ?? null;
    }

    isLocked() {
        return this.locked;
    }

    isOwnedBy(pid) {
        return (
            this.locked &&
            this.ownerPid === pid
        );
    }

    getOwner() {
        return this.ownerPid;
    }

    getWaitQueue() {
        return [...this.waitQueue];
    }

    getWaitingCount() {
        return this.waitQueue.length;
    }

    removeWaitingProcess(pid) {
        const index =
            this.waitQueue.indexOf(pid);

        if (index === -1) {
            return false;
        }

        this.waitQueue.splice(index, 1);

        return true;
    }

    reset() {
        this.locked = false;
        this.ownerPid = null;
        this.waitQueue = [];
    }

    toJSON() {
        return {
            id: this.id,
            locked: this.locked,
            ownerPid: this.ownerPid,
            waitQueue: this.getWaitQueue(),
            waitingCount:
                this.getWaitingCount()
        };
    }
}