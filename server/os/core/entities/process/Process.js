import { PROCESS_STATES } from "../../constants/processStates.js";

export class Process {
    constructor({
        pid,
        applicationId,
        priority = 0,
        memoryLimit = null,
        arrivalOrder = 0,
        arrivalTime = 0,
        burstTime = 1
    }) {
        if (!pid) {
            throw new Error("Process PID is required.");
        }

        if (!applicationId) {
            throw new Error("Application id is required.");
        }

        if (!Number.isInteger(priority)) {
            throw new Error("Priority must be an integer.");
        }

        if (!Number.isInteger(arrivalTime) || arrivalTime < 0) {
            throw new Error(
                "Arrival time must be a non-negative integer."
            );
        }

        if (!Number.isInteger(burstTime) || burstTime <= 0) {
            throw new Error(
                "Burst time must be a positive integer."
            );
        }

        this.pid = pid;
        this.applicationId = applicationId;

        this.state = PROCESS_STATES.NEW;

        this.priority = priority;
        this.memoryLimit = memoryLimit;

        this.arrivalOrder = arrivalOrder;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.remainingBurstTime = burstTime;

        this.cpuTime = 0;
        this.waitingTime = 0;

        this.startTime = null;
        this.completionTime = null;
        this.responseTime = null;
        this.turnaroundTime = null;

        this.createdAt = new Date();
        this.startedAt = null;
        this.terminatedAt = null;
    }

    start() {
        if (this.state !== PROCESS_STATES.NEW) {
            throw new Error(
                `Process ${this.pid} cannot start from state ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.READY;
    }

    run() {
        if (this.state !== PROCESS_STATES.READY) {
            throw new Error(
                `Process ${this.pid} cannot run from state ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.RUNNING;

        if (this.startedAt === null) {
            this.startedAt = new Date();
        }
    }

    wait() {
        if (this.state !== PROCESS_STATES.RUNNING) {
            throw new Error(
                `Process ${this.pid} cannot enter waiting state from ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.WAITING;
    }

    wake() {
        if (this.state !== PROCESS_STATES.WAITING) {
            throw new Error(
                `Process ${this.pid} cannot wake from state ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.READY;
    }

    preempt() {
        if (this.state !== PROCESS_STATES.RUNNING) {
            throw new Error(
                `Process ${this.pid} cannot be preempted from state ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.READY;
    }

    resume() {
        if (this.state !== PROCESS_STATES.WAITING) {
            throw new Error(
                `Process ${this.pid} cannot resume from state ${this.state}.`
            );
        }

        this.state = PROCESS_STATES.READY;
    }

    executeUnit(currentTime) {
        if (this.state !== PROCESS_STATES.RUNNING) {
            throw new Error(
                `Process ${this.pid} must be running to execute.`
            );
        }

        if (!Number.isInteger(currentTime) || currentTime < 0) {
            throw new Error(
                "Simulation time must be a non-negative integer."
            );
        }

        if (this.remainingBurstTime <= 0) {
            throw new Error(
                `Process ${this.pid} has no remaining CPU burst.`
            );
        }

        if (this.startTime === null) {
            this.startTime = currentTime;
            this.responseTime =
                currentTime - this.arrivalTime;
        }

        this.remainingBurstTime -= 1;
        this.cpuTime += 1;

        if (this.remainingBurstTime === 0) {
            this.completionTime = currentTime + 1;

            this.turnaroundTime =
                this.completionTime - this.arrivalTime;

            this.waitingTime =
                this.turnaroundTime - this.burstTime;

            this.state = PROCESS_STATES.TERMINATED;
            this.terminatedAt = new Date();
        }
    }

    terminate() {
        if (this.state === PROCESS_STATES.TERMINATED) {
            return;
        }

        this.state = PROCESS_STATES.TERMINATED;
        this.terminatedAt = new Date();

        if (this.completionTime === null) {
            this.completionTime = this.startTime;
        }
    }

    reset() {
        this.state = PROCESS_STATES.NEW;

        this.remainingBurstTime = this.burstTime;

        this.cpuTime = 0;
        this.waitingTime = 0;

        this.startTime = null;
        this.completionTime = null;
        this.responseTime = null;
        this.turnaroundTime = null;

        this.startedAt = null;
        this.terminatedAt = null;
    }

    isCompleted() {
        return this.state === PROCESS_STATES.TERMINATED;
    }

    isReady() {
        return this.state === PROCESS_STATES.READY;
    }

    isRunning() {
        return this.state === PROCESS_STATES.RUNNING;
    }
}