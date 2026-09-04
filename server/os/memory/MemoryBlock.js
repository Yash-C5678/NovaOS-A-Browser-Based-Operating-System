export class MemoryBlock {
    constructor({
        start,
        size,
        pid = null
    }) {
        if (!Number.isInteger(start) || start < 0) {
            throw new Error(
                "Memory block start must be a non-negative integer."
            );
        }

        if (!Number.isInteger(size) || size <= 0) {
            throw new Error(
                "Memory block size must be a positive integer."
            );
        }

        this.start = start;
        this.size = size;
        this.pid = pid;
    }

    get end() {
        return this.start + this.size - 1;
    }

    get isFree() {
        return this.pid === null;
    }

    get isAllocated() {
        return this.pid !== null;
    }

    contains(address) {
        return (
            Number.isInteger(address) &&
            address >= this.start &&
            address <= this.end
        );
    }

    allocate(pid) {
        if (this.isAllocated) {
            throw new Error(
                `Memory block at ${this.start} is already allocated.`
            );
        }

        if (!pid) {
            throw new Error(
                "PID is required to allocate memory."
            );
        }

        this.pid = pid;
    }

    free() {
        this.pid = null;
    }

    clone() {
        return new MemoryBlock({
            start: this.start,
            size: this.size,
            pid: this.pid
        });
    }

    toJSON() {
        return {
            start: this.start,
            end: this.end,
            size: this.size,
            pid: this.pid,
            isFree: this.isFree
        };
    }
}