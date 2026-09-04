export class Dispatcher {
    constructor(processManager) {
        if (!processManager) {
            throw new Error(
                "ProcessManager is required."
            );
        }

        this.processManager = processManager;

        this.currentProcessId = null;
        this.contextSwitchCount = 0;
    }

    dispatch(pid) {
        if (!pid) {
            throw new Error(
                "A process PID is required for dispatch."
            );
        }

        const target =
            this.processManager.getProcess(pid);

        if (!target) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        /*
         * The requested process already owns the CPU.
         * No context switch is required.
         */
        if (
            this.currentProcessId === pid &&
            target.state === "running"
        ) {
            return target;
        }

        /*
         * If another process currently owns the CPU,
         * switch away from it.
         */
        if (
            this.currentProcessId !== null &&
            this.currentProcessId !== pid
        ) {
            const current =
                this.processManager.getProcess(
                    this.currentProcessId
                );

            if (
                current &&
                current.state === "running"
            ) {
                this.processManager.preemptProcess(
                    current.pid
                );
            }

            this.currentProcessId = null;

            /*
             * Actual process-to-process dispatch.
             */
            this.contextSwitchCount++;
        }

        /*
         * The target must be READY.
         */
        if (target.state !== "ready") {
            throw new Error(
                `Process '${pid}' cannot be dispatched from state '${target.state}'.`
            );
        }

        /*
         * Put target into RUNNING state.
         */
        this.processManager.runProcess(pid);

        this.currentProcessId = pid;

        return target;
    }

    releaseCPU() {
        if (
            this.currentProcessId === null
        ) {
            return null;
        }

        const process =
            this.processManager.getProcess(
                this.currentProcessId
            );

        if (!process) {
            this.currentProcessId = null;
            return null;
        }

        /*
         * IMPORTANT:
         *
         * If the process is still RUNNING, this is
         * an actual preemption.
         *
         * Therefore count a context switch here.
         */
        if (
            process.state === "running"
        ) {
            this.processManager.preemptProcess(
                process.pid
            );

            this.contextSwitchCount++;
        }

        /*
         * If the process is TERMINATED, it is simply
         * releasing the CPU. That is NOT counted as
         * a context switch.
         */
        this.currentProcessId = null;

        return process;
    }

    getCurrentProcess() {
        if (
            this.currentProcessId === null
        ) {
            return null;
        }

        return this.processManager.getProcess(
            this.currentProcessId
        );
    }

    getContextSwitchCount() {
        return this.contextSwitchCount;
    }

    reset() {
        this.currentProcessId = null;
        this.contextSwitchCount = 0;
    }
}