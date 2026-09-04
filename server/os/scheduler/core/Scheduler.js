import { PROCESS_STATES } from "../../core/constants/processStates.js";

export class Scheduler {
    constructor(processManager) {
        if (!processManager) {
            throw new Error("ProcessManager is required.");
        }

        this.processManager = processManager;
        this.algorithm = null;
    }

    setAlgorithm(algorithm) {
        if (
            !algorithm ||
            typeof algorithm.selectNext !== "function"
        ) {
            throw new Error(
                "Scheduler algorithm must implement selectNext()."
            );
        }

        this.algorithm = algorithm;
    }

    getAlgorithmName() {
        return this.algorithm?.name ?? null;
    }

    getReadyProcesses() {
        return this.processManager.getProcessesByState(
            PROCESS_STATES.READY
        );
    }

    selectNext(context = {}) {
        if (!this.algorithm) {
            throw new Error(
                "No scheduling algorithm has been configured."
            );
        }

        const readyProcesses =
            this.getReadyProcesses();

        if (readyProcesses.length === 0) {
            return null;
        }

        return this.algorithm.selectNext(
            readyProcesses,
            context
        );
    }

    shouldPreempt({
        currentTime = 0,
        runningProcess = null,
        readyProcesses = this.getReadyProcesses(),
        timeSinceDispatch = 0
    } = {}) {
        if (!this.algorithm) {
            throw new Error(
                "No scheduling algorithm has been configured."
            );
        }

        if (
            typeof this.algorithm.shouldPreempt !==
            "function"
        ) {
            return false;
        }

        if (!runningProcess) {
            return false;
        }

        return Boolean(
            this.algorithm.shouldPreempt({
                currentTime,
                runningProcess,
                readyProcesses,
                timeSinceDispatch
            })
        );
    }

    notifyPreemption(process) {
        if (
            this.algorithm &&
            typeof this.algorithm.onPreempt === "function"
        ) {
            this.algorithm.onPreempt(
                process,
                this.getReadyProcesses()
            );
        }
    }

    reset() {
        if (
            this.algorithm &&
            typeof this.algorithm.reset === "function"
        ) {
            this.algorithm.reset();
        }
    }
}