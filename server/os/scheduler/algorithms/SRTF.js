export class SRTF {
    constructor() {
        this.name = "SRTF";
    }

    selectNext(readyProcesses) {
        if (
            !readyProcesses ||
            readyProcesses.length === 0
        ) {
            return null;
        }

        return [...readyProcesses].sort(
            (a, b) => {
                if (
                    a.remainingBurstTime !==
                    b.remainingBurstTime
                ) {
                    return (
                        a.remainingBurstTime -
                        b.remainingBurstTime
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

        const shortest =
            this.selectNext(readyProcesses);

        if (!shortest) {
            return false;
        }

        return (
            shortest.remainingBurstTime <
            runningProcess.remainingBurstTime
        );
    }
}