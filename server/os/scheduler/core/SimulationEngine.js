import { PROCESS_STATES } from "../../core/constants/processStates.js";

export class SimulationEngine {
    constructor({
        processManager,
        scheduler,
        dispatcher,
        cpu
    }) {
        if (!processManager) {
            throw new Error("ProcessManager is required.");
        }

        if (!scheduler) {
            throw new Error("Scheduler is required.");
        }

        if (!dispatcher) {
            throw new Error("Dispatcher is required.");
        }

        if (!cpu) {
            throw new Error("SimulatedCPU is required.");
        }

        this.processManager = processManager;
        this.scheduler = scheduler;
        this.dispatcher = dispatcher;
        this.cpu = cpu;

        this.currentTime = 0;
        this.timeline = [];

        this.running = false;
        this.completed = false;

        this.timeSinceDispatch = 0;
    }

    step() {
        if (this.completed) {
            return {
                completed: true,
                idle: false,
                time: this.currentTime,
                pid: null
            };
        }

        /*
         * 1. Admit all processes whose arrival time
         *    has been reached.
         */
        this.admitProcesses();

        let current =
            this.dispatcher.getCurrentProcess();

        /*
         * 2. Ask the scheduler whether the current
         *    process must be preempted.
         */
        if (current) {
            const readyProcesses =
                this.scheduler.getReadyProcesses();

            const shouldPreempt =
                this.scheduler.shouldPreempt({
                    currentTime: this.currentTime,
                    runningProcess: current,
                    readyProcesses,
                    timeSinceDispatch:
                        this.timeSinceDispatch
                });

            if (shouldPreempt) {
                const preemptedProcess = current;

                this.dispatcher.releaseCPU();

                this.scheduler.notifyPreemption(
                    preemptedProcess
                );

                current = null;
                this.timeSinceDispatch = 0;
            }
        }

        /*
         * 3. CPU is free -> choose next process.
         */
        if (!current) {
            const next =
                this.scheduler.selectNext({
                    currentTime: this.currentTime,
                    runningProcess: null,
                    timeSinceDispatch: 0
                });

            if (next) {
                this.dispatcher.dispatch(next.pid);

                current =
                    this.dispatcher.getCurrentProcess();

                this.timeSinceDispatch = 0;
            }
        }

        /*
         * 4. No READY process -> CPU idle.
         */
        if (!current) {
            this.cpu.idleUnit();

            this.currentTime =
                this.cpu.getTime();

            this.checkCompletion();

            return {
                completed: this.completed,
                idle: true,
                time: this.currentTime,
                pid: null
            };
        }

        /*
         * 5. Execute exactly one CPU time unit.
         */
        const startTime = this.currentTime;

        this.cpu.executeUnit(current.pid);

        this.currentTime =
            this.cpu.getTime();

        this.timeSinceDispatch++;

        this.recordExecution(
            current.pid,
            startTime,
            this.currentTime
        );

        /*
         * 6. Process finished.
         */
        if (
            current.state ===
            PROCESS_STATES.TERMINATED
        ) {
            this.dispatcher.releaseCPU();

            this.timeSinceDispatch = 0;
        }

        this.checkCompletion();

        return {
            completed: this.completed,
            idle: false,
            time: this.currentTime,
            pid: current.pid
        };
    }

    run() {
        this.running = true;

        while (!this.completed) {
            this.step();
        }

        this.running = false;

        return this.getResult();
    }

    pause() {
        this.running = false;
    }

    reset() {
        this.currentTime = 0;
        this.timeline = [];

        this.running = false;
        this.completed = false;

        this.timeSinceDispatch = 0;

        if (
            typeof this.processManager.reset ===
            "function"
        ) {
            this.processManager.reset();
        }

        this.cpu.reset();
        this.dispatcher.reset();

        if (
            typeof this.scheduler.reset ===
            "function"
        ) {
            this.scheduler.reset();
        }
    }

    admitProcesses() {
        const processes =
            this.processManager.getAllProcesses();

        for (const process of processes) {
            if (
                process.state ===
                PROCESS_STATES.NEW &&
                process.arrivalTime <=
                this.currentTime
            ) {
                this.processManager.startProcess(
                    process.pid
                );
            }
        }
    }

    recordExecution(
        pid,
        startTime,
        endTime
    ) {
        const previous =
            this.timeline[
            this.timeline.length - 1
            ];

        if (
            previous &&
            previous.pid === pid &&
            previous.endTime === startTime
        ) {
            previous.endTime = endTime;
            return;
        }

        this.timeline.push({
            pid,
            startTime,
            endTime
        });
    }

    checkCompletion() {
        const processes =
            this.processManager.getAllProcesses();

        this.completed =
            processes.length > 0 &&
            processes.every(
                (process) =>
                    process.state ===
                    PROCESS_STATES.TERMINATED
            );
    }

    isComplete() {
        return this.completed;
    }

    isRunning() {
        return this.running;
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getTimeline() {
        return this.timeline.map(
            (segment) => ({
                ...segment
            })
        );
    }

    getStatistics() {
        return {
            ...this.cpu.getStatistics(),
            contextSwitches:
                this.dispatcher.getContextSwitchCount()
        };
    }

    getProcessResults() {
        return this.processManager
            .getAllProcesses()
            .map((process) => ({
                pid: process.pid,
                applicationId:
                    process.applicationId,
                priority:
                    process.priority,
                arrivalTime:
                    process.arrivalTime,
                burstTime:
                    process.burstTime,
                remainingBurstTime:
                    process.remainingBurstTime,
                startTime:
                    process.startTime,
                completionTime:
                    process.completionTime,
                turnaroundTime:
                    process.turnaroundTime,
                waitingTime:
                    process.waitingTime,
                responseTime:
                    process.responseTime,
                cpuTime:
                    process.cpuTime,
                state: process.state
            }));
    }

    getAverageMetrics() {
        const results =
            this.getProcessResults();

        if (results.length === 0) {
            return {
                averageWaitingTime: 0,
                averageTurnaroundTime: 0,
                averageResponseTime: 0
            };
        }

        const totalWaiting =
            results.reduce(
                (sum, process) =>
                    sum +
                    (process.waitingTime ?? 0),
                0
            );

        const totalTurnaround =
            results.reduce(
                (sum, process) =>
                    sum +
                    (process.turnaroundTime ?? 0),
                0
            );

        const totalResponse =
            results.reduce(
                (sum, process) =>
                    sum +
                    (process.responseTime ?? 0),
                0
            );

        return {
            averageWaitingTime:
                totalWaiting /
                results.length,

            averageTurnaroundTime:
                totalTurnaround /
                results.length,

            averageResponseTime:
                totalResponse /
                results.length
        };
    }

    getResult() {
        return {
            algorithm:
                this.scheduler.getAlgorithmName(),

            completed:
                this.completed,

            currentTime:
                this.currentTime,

            timeline:
                this.getTimeline(),

            statistics:
                this.getStatistics(),

            averages:
                this.getAverageMetrics(),

            processes:
                this.getProcessResults()
        };
    }
}