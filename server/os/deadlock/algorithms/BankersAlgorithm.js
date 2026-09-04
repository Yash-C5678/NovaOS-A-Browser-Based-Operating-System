export class BankersAlgorithm {
    constructor() {
        this.name = "Banker's Algorithm";
    }

    checkSafety({
        available,
        allocation,
        maximum
    }) {
        this.validateInput({
            available,
            allocation,
            maximum
        });

        const processIds =
            Object.keys(allocation);

        const work = [...available];

        const need = {};

        const finish = {};

        for (const pid of processIds) {
            need[pid] =
                maximum[pid].map(
                    (maximumValue, index) =>
                        maximumValue -
                        allocation[pid][index]
                );

            finish[pid] = false;
        }

        const safeSequence = [];

        let progress = true;

        while (
            progress &&
            safeSequence.length <
            processIds.length
        ) {
            progress = false;

            for (const pid of processIds) {
                if (finish[pid]) {
                    continue;
                }

                if (
                    this.canSatisfy(
                        need[pid],
                        work
                    )
                ) {
                    /*
                     * Simulate the process completing.
                     *
                     * Once it finishes, all resources
                     * currently allocated to it become
                     * available again.
                     */
                    for (
                        let i = 0;
                        i < work.length;
                        i++
                    ) {
                        work[i] +=
                            allocation[pid][i];
                    }

                    finish[pid] = true;

                    safeSequence.push(pid);

                    progress = true;
                }
            }
        }

        const safe =
            safeSequence.length ===
            processIds.length;

        const unsafeProcesses =
            processIds.filter(
                (pid) => !finish[pid]
            );

        return {
            safe,

            safeSequence,

            unsafeProcesses,

            need,

            available: [...available],

            finalWork: [...work]
        };
    }

    requestCanBeGranted({
        available,
        allocation,
        maximum,
        pid,
        request
    }) {
        this.validateInput({
            available,
            allocation,
            maximum
        });

        if (!pid) {
            throw new Error(
                "Process PID is required."
            );
        }

        if (!allocation[pid]) {
            throw new Error(
                `Process '${pid}' not found in allocation matrix.`
            );
        }

        if (!Array.isArray(request)) {
            throw new Error(
                "Resource request must be an array."
            );
        }

        if (
            request.length !==
            available.length
        ) {
            throw new Error(
                "Resource request has invalid dimensions."
            );
        }

        if (
            !request.every(
                (value) =>
                    Number.isInteger(value) &&
                    value >= 0
            )
        ) {
            throw new Error(
                "Resource request must contain non-negative integers."
            );
        }

        const need =
            maximum[pid].map(
                (maximumValue, index) =>
                    maximumValue -
                    allocation[pid][index]
            );

        /*
         * A process cannot request more than
         * its declared remaining maximum need.
         */
        const exceedsNeed =
            request.some(
                (value, index) =>
                    value > need[index]
            );

        if (exceedsNeed) {
            return {
                granted: false,
                safe: false,
                reason:
                    "Request exceeds the process's remaining maximum need."
            };
        }

        /*
         * The request cannot be immediately
         * satisfied if resources are unavailable.
         */
        const exceedsAvailable =
            request.some(
                (value, index) =>
                    value >
                    available[index]
            );

        if (exceedsAvailable) {
            return {
                granted: false,
                safe: false,
                reason:
                    "Request exceeds currently available resources."
            };
        }

        /*
         * Temporarily grant the request and run
         * the safety algorithm.
         */
        const simulatedAvailable =
            available.map(
                (value, index) =>
                    value - request[index]
            );

        const simulatedAllocation = {};

        const processIds =
            Object.keys(allocation);

        for (const processId of processIds) {
            simulatedAllocation[processId] =
                [...allocation[processId]];
        }

        simulatedAllocation[pid] =
            simulatedAllocation[pid].map(
                (value, index) =>
                    value + request[index]
            );

        const safetyResult =
            this.checkSafety({
                available:
                    simulatedAvailable,

                allocation:
                    simulatedAllocation,

                maximum
            });

        return {
            granted:
                safetyResult.safe,

            safe:
                safetyResult.safe,

            reason:
                safetyResult.safe
                    ? "Request can be safely granted."
                    : "Granting the request would leave the system in an unsafe state.",

            safeSequence:
                safetyResult.safeSequence,

            unsafeProcesses:
                safetyResult.unsafeProcesses
        };
    }

    calculateNeed({
        allocation,
        maximum
    }) {
        this.validateMatrices(
            allocation,
            maximum
        );

        const need = {};

        for (const pid of Object.keys(
            allocation
        )) {
            need[pid] =
                maximum[pid].map(
                    (maximumValue, index) =>
                        maximumValue -
                        allocation[pid][index]
                );
        }

        return need;
    }

    canSatisfy(
        need,
        available
    ) {
        if (
            need.length !==
            available.length
        ) {
            throw new Error(
                "Resource vector dimensions do not match."
            );
        }

        return need.every(
            (value, index) =>
                value <= available[index]
        );
    }

    validateInput({
        available,
        allocation,
        maximum
    }) {
        if (!Array.isArray(available)) {
            throw new Error(
                "Available resources must be an array."
            );
        }

        if (
            !available.every(
                (value) =>
                    Number.isInteger(value) &&
                    value >= 0
            )
        ) {
            throw new Error(
                "Available resources must contain non-negative integers."
            );
        }

        this.validateMatrices(
            allocation,
            maximum
        );

        const resourceCount =
            available.length;

        for (const pid of Object.keys(
            allocation
        )) {
            if (
                allocation[pid].length !==
                resourceCount
            ) {
                throw new Error(
                    `Allocation vector for process '${pid}' has invalid dimensions.`
                );
            }

            if (
                maximum[pid].length !==
                resourceCount
            ) {
                throw new Error(
                    `Maximum vector for process '${pid}' has invalid dimensions.`
                );
            }

            for (
                let i = 0;
                i < resourceCount;
                i++
            ) {
                if (
                    allocation[pid][i] >
                    maximum[pid][i]
                ) {
                    throw new Error(
                        `Allocation for process '${pid}' cannot exceed its maximum demand.`
                    );
                }
            }
        }
    }

    validateMatrices(
        allocation,
        maximum
    ) {
        if (
            !allocation ||
            typeof allocation !==
            "object" ||
            Array.isArray(allocation)
        ) {
            throw new Error(
                "Allocation matrix must be an object."
            );
        }

        if (
            !maximum ||
            typeof maximum !==
            "object" ||
            Array.isArray(maximum)
        ) {
            throw new Error(
                "Maximum matrix must be an object."
            );
        }

        const allocationPids =
            Object.keys(allocation);

        const maximumPids =
            Object.keys(maximum);

        if (
            allocationPids.length !==
            maximumPids.length
        ) {
            throw new Error(
                "Allocation and maximum matrices must contain the same processes."
            );
        }

        for (const pid of allocationPids) {
            if (
                !Array.isArray(
                    allocation[pid]
                )
            ) {
                throw new Error(
                    `Allocation vector for process '${pid}' must be an array.`
                );
            }

            if (
                !Array.isArray(
                    maximum[pid]
                )
            ) {
                throw new Error(
                    `Maximum vector for process '${pid}' must be an array.`
                );
            }

            if (
                allocation[pid].length !==
                maximum[pid].length
            ) {
                throw new Error(
                    `Allocation and maximum vectors for process '${pid}' must have the same dimensions.`
                );
            }

            if (
                !allocation[pid].every(
                    (value) =>
                        Number.isInteger(value) &&
                        value >= 0
                )
            ) {
                throw new Error(
                    `Allocation vector for process '${pid}' must contain non-negative integers.`
                );
            }

            if (
                !maximum[pid].every(
                    (value) =>
                        Number.isInteger(value) &&
                        value >= 0
                )
            ) {
                throw new Error(
                    `Maximum vector for process '${pid}' must contain non-negative integers.`
                );
            }
        }
    }
}