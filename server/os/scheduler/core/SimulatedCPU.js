import { PROCESS_STATES } from "../../core/constants/processStates.js";

export class SimulatedCPU {
    constructor(processManager) {
        if (!processManager) {
            throw new Error("ProcessManager is required.");
        }

        this.processManager = processManager;

        this.currentTime = 0;
        this.currentProcessId = null;

        this.totalCpuTime = 0;
        this.idleTime = 0;

        this.executionHistory = [];
    }

    getTime() {
        return this.currentTime;
    }

    getCurrentProcess() {
        if (this.currentProcessId === null) {
            return null;
        }

        return this.processManager.getProcess(
            this.currentProcessId
        );
    }

    executeUnit(pid) {
        if (!pid) {
            throw new Error("A process PID is required.");
        }

        const process =
            this.processManager.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        if (process.state !== PROCESS_STATES.RUNNING) {
            throw new Error(
                `Process '${pid}' must be running before CPU execution.`
            );
        }

        const executionTime = this.currentTime;

        this.currentProcessId = pid;

        this.processManager.executeProcessUnit(
            pid,
            executionTime
        );

        this.currentTime += 1;
        this.totalCpuTime += 1;

        this.executionHistory.push({
            time: executionTime,
            pid,
            endTime: this.currentTime,
            remainingBurstTime:
                process.remainingBurstTime
        });

        /*
         * A terminated process no longer owns the CPU.
         */
        if (process.state === PROCESS_STATES.TERMINATED) {
            this.currentProcessId = null;
        }

        return process;
    }

    idleUnit() {
        this.currentProcessId = null;

        this.executionHistory.push({
            time: this.currentTime,
            pid: null,
            endTime: this.currentTime + 1,
            idle: true
        });

        this.currentTime += 1;
        this.idleTime += 1;
    }

    getExecutionHistory() {
        return [...this.executionHistory];
    }

    getStatistics() {
        const elapsedTime = this.currentTime;

        const cpuUtilization =
            elapsedTime === 0
                ? 0
                : (this.totalCpuTime / elapsedTime) * 100;

        return {
            currentTime: this.currentTime,
            totalCpuTime: this.totalCpuTime,
            idleTime: this.idleTime,
            cpuUtilization:
                Number(cpuUtilization.toFixed(2))
        };
    }

    reset() {
        this.currentTime = 0;
        this.currentProcessId = null;

        this.totalCpuTime = 0;
        this.idleTime = 0;

        this.executionHistory = [];
    }
}