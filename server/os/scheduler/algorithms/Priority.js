export class Priority {
    constructor() {
        this.name = "Priority";
        this.preemptive = false;
    }

    selectNext(readyProcesses) {
        if (
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return null;
        }

        /*
         * Smaller priority number means
         * higher scheduling priority.
         *
         * Example:
         *
         * Priority 1 > Priority 2 > Priority 3
         *
         * If two processes have the same priority,
         * FCFS arrival order is used as the tie-breaker.
         */
        return [...readyProcesses].sort(
            (a, b) => {
                if (a.priority !== b.priority) {
                    return (
                        a.priority -
                        b.priority
                    );
                }

                return (
                    a.arrivalOrder -
                    b.arrivalOrder
                );
            }
        )[0];
    }

    shouldPreempt() {
        return false;
    }
}