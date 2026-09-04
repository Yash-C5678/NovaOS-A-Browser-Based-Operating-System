import { Process } from "../core/entities/process/Process.js";
import { PROCESS_STATES } from "../core/constants/processStates.js";

export class ProcessManager {
    constructor() {
        this.processTable = new Map();

        this.nextPid = 1000;
        this.nextArrivalOrder = 0;
    }

    createProcess({
        applicationId,
        priority = 0,
        memoryLimit = null,
        arrivalTime = 0,
        burstTime = 1
    }) {
        const pid = `nova-${this.nextPid++}`;

        const process = new Process({
            pid,
            applicationId,
            priority,
            memoryLimit,
            arrivalOrder: this.nextArrivalOrder++,
            arrivalTime,
            burstTime
        });

        this.processTable.set(pid, process);

        return process;
    }

    getProcess(pid) {
        return this.processTable.get(pid) ?? null;
    }

    getAllProcesses() {
        return Array.from(this.processTable.values());
    }

    getProcessesByState(state) {
        return this.getAllProcesses().filter(
            (process) => process.state === state
        );
    }

    getReadyProcesses() {
        return this.getProcessesByState(
            PROCESS_STATES.READY
        );
    }

    getRunningProcess() {
        return (
            this.getProcessesByState(
                PROCESS_STATES.RUNNING
            )[0] ?? null
        );
    }

    getProcessesArrivedAt(time) {
        return this.getAllProcesses().filter(
            (process) =>
                process.arrivalTime <= time &&
                process.state !==
                PROCESS_STATES.TERMINATED
        );
    }

    getProcessesArrivingAt(time) {
        return this.getAllProcesses().filter(
            (process) =>
                process.arrivalTime === time
        );
    }

    startProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.start();

        return process;
    }

    runProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.run();

        return process;
    }

    waitProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.wait();

        return process;
    }

    preemptProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.preempt();

        return process;
    }

    resumeProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.resume();

        return process;
    }

    executeProcessUnit(pid, currentTime) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.executeUnit(currentTime);

        return process;
    }

    terminateProcess(pid) {
        const process = this.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        process.terminate();

        return process;
    }

    getProcessCount() {
        return this.processTable.size;
    }

    getStateCounts() {
        const counts = {
            [PROCESS_STATES.NEW]: 0,
            [PROCESS_STATES.READY]: 0,
            [PROCESS_STATES.RUNNING]: 0,
            [PROCESS_STATES.WAITING]: 0,
            [PROCESS_STATES.TERMINATED]: 0
        };

        for (const process of this.processTable.values()) {
            counts[process.state]++;
        }

        return counts;
    }

    allProcessesCompleted() {
        const processes = this.getAllProcesses();

        return (
            processes.length > 0 &&
            processes.every(
                (process) =>
                    process.state ===
                    PROCESS_STATES.TERMINATED
            )
        );
    }

    reset() {
        this.processTable.clear();

        this.nextPid = 1000;
        this.nextArrivalOrder = 0;
    }
}