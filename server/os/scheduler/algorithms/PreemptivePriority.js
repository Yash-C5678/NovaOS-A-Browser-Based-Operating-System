export class PreemptivePriority {
    constructor() {
        this.name = "Preemptive Priority";
        this.preemptive = true;
    }

    selectNext(readyProcesses) {
        if (
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return null;
        }

        /*
         * Lower numeric priority value means
         * higher priority.
         *
         * Example:
         *
         * Priority 1 > Priority 2 > Priority 3
         *
         * Tie-breaking:
         * 1. Earlier arrival time
         * 2. Earlier arrival order
         */
        return [...readyProcesses].sort(
            (a, b) => {
                if (
                    a.priority !==
                    b.priority
                ) {
                    return (
                        a.priority -
                        b.priority
                    );
                }

                if (
                    a.arrivalTime !==
                    b.arrivalTime
                ) {
                    return (
                        a.arrivalTime -
                        b.arrivalTime
                    );
                }

                return (
                    a.arrivalOrder -
                    b.arrivalOrder
                );
            }
        )[0];
    }

    shouldPreempt({
        runningProcess,
        readyProcesses
    }) {
        if (
            !runningProcess ||
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return false;
        }

        const highestPriority =
            this.selectNext(
                readyProcesses
            );

        if (!highestPriority) {
            return false;
        }

        /*
         * Preempt only when a READY process has
         * strictly higher priority than the
         * currently running process.
         *
         * Since smaller numbers represent
         * higher priority:
         *
         * ready priority < running priority
         */
        return (
            highestPriority.priority <
            runningProcess.priority
        );
    }
}