export class Semaphore {
    constructor({
        id,
        initialCount = 1
    }) {
        if (!id) {
            throw new Error(
                "Semaphore id is required."
            );
        }

        if (
            !Number.isInteger(initialCount) ||
            initialCount < 0
        ) {
            throw new Error(
                "Semaphore initial count must be a non-negative integer."
            );
        }

        this.id = id;

        this.initialCount = initialCount;
        this.count = initialCount;

        this.waitQueue = [];
    }

    wait(pid) {
        if (!pid) {
            throw new Error(
                "PID is required for semaphore wait."
            );
        }

        /*
         * Resource is available.
         */
        if (this.count > 0) {
            this.count--;

            return true;
        }

        /*
         * No resource is available.
         * Put the process into the FIFO
         * waiting queue.
         */
        if (!this.waitQueue.includes(pid)) {
            this.waitQueue.push(pid);
        }

        return false;
    }

    signal() {
        /*
         * If processes are waiting, wake the
         * first process instead of increasing
         * the available resource count.
         */
        if (this.waitQueue.length > 0) {
            return this.waitQueue.shift();
        }

        /*
         * No waiting process.
         * Return one resource to the semaphore.
         */
        this.count++;

        return null;
    }

    getCount() {
        return this.count;
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
        this.count =
            this.initialCount;

        this.waitQueue = [];
    }

    toJSON() {
        return {
            id: this.id,
            count: this.count,
            waitQueue:
                this.getWaitQueue(),
            waitingCount:
                this.getWaitingCount()
        };
    }
}