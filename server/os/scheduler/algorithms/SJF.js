export class SJF {
    constructor() {
        this.name = "SJF";
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
                    a.burstTime !==
                    b.burstTime
                ) {
                    return (
                        a.burstTime -
                        b.burstTime
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

    shouldPreempt() {
        return false;
    }
}