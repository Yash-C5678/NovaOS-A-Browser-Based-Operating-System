export class FCFS {
    constructor() {
        this.name = "FCFS";
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