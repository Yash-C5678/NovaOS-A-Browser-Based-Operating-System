export const IO_REQUEST_STATES = Object.freeze({
    QUEUED: "queued",
    ACTIVE: "active",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
});

export const IO_OPERATIONS = Object.freeze({
    READ: "read",
    WRITE: "write"
});

export class IORequest {
    constructor({
        id,
        pid,
        deviceId,
        operation,
        size = 1,
        duration = 1,
        createdAt = new Date()
    }) {
        if (!id) {
            throw new Error(
                "I/O request id is required."
            );
        }

        if (!pid) {
            throw new Error(
                "PID is required for an I/O request."
            );
        }

        if (!deviceId) {
            throw new Error(
                "Device id is required for an I/O request."
            );
        }

        if (
            !Object.values(IO_OPERATIONS).includes(
                operation
            )
        ) {
            throw new Error(
                `Invalid I/O operation '${operation}'.`
            );
        }

        if (
            !Number.isInteger(size) ||
            size <= 0
        ) {
            throw new Error(
                "I/O request size must be a positive integer."
            );
        }

        if (
            !Number.isInteger(duration) ||
            duration <= 0
        ) {
            throw new Error(
                "I/O request duration must be a positive integer."
            );
        }

        this.id = id;
        this.pid = pid;
        this.deviceId = deviceId;
        this.operation = operation;

        this.size = size;
        this.duration = duration;

        this.state =
            IO_REQUEST_STATES.QUEUED;

        this.createdAt = createdAt;

        this.startedAt = null;
        this.completedAt = null;

        this.startTime = null;
        this.completionTime = null;

        this.elapsedTime = 0;
    }

    start(simulationTime = null) {
        if (
            this.state !==
            IO_REQUEST_STATES.QUEUED
        ) {
            throw new Error(
                `I/O request '${this.id}' cannot start from state '${this.state}'.`
            );
        }

        this.state =
            IO_REQUEST_STATES.ACTIVE;

        this.startedAt = new Date();

        if (simulationTime !== null) {
            if (
                !Number.isInteger(simulationTime) ||
                simulationTime < 0
            ) {
                throw new Error(
                    "Simulation time must be a non-negative integer."
                );
            }

            this.startTime = simulationTime;
        }
    }

    executeUnit() {
        if (
            this.state !==
            IO_REQUEST_STATES.ACTIVE
        ) {
            throw new Error(
                `I/O request '${this.id}' must be active to execute.`
            );
        }

        if (
            this.elapsedTime >=
            this.duration
        ) {
            throw new Error(
                `I/O request '${this.id}' has already completed its required duration.`
            );
        }

        this.elapsedTime++;

        return this.isComplete();
    }

    complete(simulationTime = null) {
        if (
            this.state !==
            IO_REQUEST_STATES.ACTIVE
        ) {
            throw new Error(
                `I/O request '${this.id}' cannot complete from state '${this.state}'.`
            );
        }

        if (
            this.elapsedTime <
            this.duration
        ) {
            throw new Error(
                `I/O request '${this.id}' has not completed its required duration.`
            );
        }

        this.state =
            IO_REQUEST_STATES.COMPLETED;

        this.completedAt = new Date();

        if (simulationTime !== null) {
            if (
                !Number.isInteger(simulationTime) ||
                simulationTime < 0
            ) {
                throw new Error(
                    "Simulation time must be a non-negative integer."
                );
            }

            this.completionTime =
                simulationTime;
        }
    }

    cancel() {
        if (
            this.state ===
            IO_REQUEST_STATES.COMPLETED
        ) {
            throw new Error(
                `Completed I/O request '${this.id}' cannot be cancelled.`
            );
        }

        if (
            this.state ===
            IO_REQUEST_STATES.CANCELLED
        ) {
            return;
        }

        this.state =
            IO_REQUEST_STATES.CANCELLED;
    }

    isQueued() {
        return (
            this.state ===
            IO_REQUEST_STATES.QUEUED
        );
    }

    isActive() {
        return (
            this.state ===
            IO_REQUEST_STATES.ACTIVE
        );
    }

    isComplete() {
        return (
            this.elapsedTime >=
            this.duration
        );
    }

    isCompleted() {
        return (
            this.state ===
            IO_REQUEST_STATES.COMPLETED
        );
    }

    isCancelled() {
        return (
            this.state ===
            IO_REQUEST_STATES.CANCELLED
        );
    }

    getRemainingTime() {
        return Math.max(
            0,
            this.duration -
                this.elapsedTime
        );
    }

    toJSON() {
        return {
            id: this.id,
            pid: this.pid,
            deviceId: this.deviceId,
            operation: this.operation,
            size: this.size,
            duration: this.duration,
            state: this.state,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            startTime: this.startTime,
            completionTime:
                this.completionTime,
            elapsedTime: this.elapsedTime,
            remainingTime:
                this.getRemainingTime()
        };
    }
}