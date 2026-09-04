import { Mutex } from "../primitives/Mutex.js";
import { Semaphore } from "../primitives/Semaphore.js";

export class SynchronizationManager {
    constructor() {
        this.mutexes = new Map();
        this.semaphores = new Map();
    }

    createMutex(id) {
        if (!id) {
            throw new Error(
                "Mutex id is required."
            );
        }

        if (this.mutexes.has(id)) {
            throw new Error(
                `Mutex '${id}' already exists.`
            );
        }

        const mutex = new Mutex(id);

        this.mutexes.set(id, mutex);

        return mutex;
    }

    getMutex(id) {
        return this.mutexes.get(id) ?? null;
    }

    acquireMutex(id, pid) {
        const mutex = this.getMutex(id);

        if (!mutex) {
            throw new Error(
                `Mutex '${id}' not found.`
            );
        }

        return mutex.acquire(pid);
    }

    releaseMutex(id, pid) {
        const mutex = this.getMutex(id);

        if (!mutex) {
            throw new Error(
                `Mutex '${id}' not found.`
            );
        }

        return mutex.release(pid);
    }

    removeMutex(id) {
        const mutex = this.getMutex(id);

        if (!mutex) {
            throw new Error(
                `Mutex '${id}' not found.`
            );
        }

        if (mutex.isLocked()) {
            throw new Error(
                `Locked mutex '${id}' cannot be removed.`
            );
        }

        this.mutexes.delete(id);

        return true;
    }

    createSemaphore({
        id,
        initialCount = 1
    }) {
        if (!id) {
            throw new Error(
                "Semaphore id is required."
            );
        }

        if (this.semaphores.has(id)) {
            throw new Error(
                `Semaphore '${id}' already exists.`
            );
        }

        const semaphore =
            new Semaphore({
                id,
                initialCount
            });

        this.semaphores.set(
            id,
            semaphore
        );

        return semaphore;
    }

    getSemaphore(id) {
        return (
            this.semaphores.get(id) ??
            null
        );
    }

    waitSemaphore(id, pid) {
        const semaphore =
            this.getSemaphore(id);

        if (!semaphore) {
            throw new Error(
                `Semaphore '${id}' not found.`
            );
        }

        return semaphore.wait(pid);
    }

    signalSemaphore(id) {
        const semaphore =
            this.getSemaphore(id);

        if (!semaphore) {
            throw new Error(
                `Semaphore '${id}' not found.`
            );
        }

        return semaphore.signal();
    }

    removeSemaphore(id) {
        const semaphore =
            this.getSemaphore(id);

        if (!semaphore) {
            throw new Error(
                `Semaphore '${id}' not found.`
            );
        }

        if (
            semaphore.getWaitingCount() > 0
        ) {
            throw new Error(
                `Semaphore '${id}' has waiting processes and cannot be removed.`
            );
        }

        this.semaphores.delete(id);

        return true;
    }

    getMutexes() {
        return Array.from(
            this.mutexes.values()
        );
    }

    getSemaphores() {
        return Array.from(
            this.semaphores.values()
        );
    }

    getStatistics() {
        const mutexes =
            this.getMutexes();

        const semaphores =
            this.getSemaphores();

        return {
            mutexCount: mutexes.length,

            lockedMutexes:
                mutexes.filter(
                    (mutex) =>
                        mutex.isLocked()
                ).length,

            mutexWaitingProcesses:
                mutexes.reduce(
                    (total, mutex) =>
                        total +
                        mutex.getWaitingCount(),
                    0
                ),

            semaphoreCount:
                semaphores.length,

            semaphoreWaitingProcesses:
                semaphores.reduce(
                    (total, semaphore) =>
                        total +
                        semaphore.getWaitingCount(),
                    0
                )
        };
    }

    getSynchronizationTable() {
        return {
            mutexes:
                this.getMutexes().map(
                    (mutex) =>
                        mutex.toJSON()
                ),

            semaphores:
                this.getSemaphores().map(
                    (semaphore) =>
                        semaphore.toJSON()
                )
        };
    }

    reset() {
        for (const mutex of this.mutexes.values()) {
            mutex.reset();
        }

        for (
            const semaphore
            of this.semaphores.values()
        ) {
            semaphore.reset();
        }

        this.mutexes.clear();
        this.semaphores.clear();
    }
}