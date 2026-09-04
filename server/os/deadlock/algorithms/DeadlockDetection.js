export class DeadlockDetection {
    constructor() {
        this.name = "Deadlock Detection";
    }

    detect({
        available,
        allocation,
        request
    }) {
        this.validateInput({
            available,
            allocation,
            request
        });

        const work = [...available];

        const processIds =
            Object.keys(allocation);

        const finish = {};

        for (const pid of processIds) {
            finish[pid] = false;
        }

        const deadlockedProcesses = [];

        let progress = true;

        while (progress) {
            progress = false;

            for (const pid of processIds) {
                if (finish[pid]) {
                    continue;
                }

                const processRequest =
                    request[pid];

                if (
                    this.canSatisfy(
                        processRequest,
                        work
                    )
                ) {
                    /*
                     * Simulate completion of the
                     * process and release its
                     * currently allocated resources.
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
                    progress = true;
                }
            }
        }

        for (const pid of processIds) {
            if (!finish[pid]) {
                deadlockedProcesses.push(pid);
            }
        }

        return {
            deadlockDetected:
                deadlockedProcesses.length > 0,

            deadlockedProcesses,

            safe:
                deadlockedProcesses.length === 0,

            work
        };
    }

    canSatisfy(request, available) {
        if (
            request.length !==
            available.length
        ) {
            throw new Error(
                "Resource vector dimensions do not match."
            );
        }

        return request.every(
            (value, index) =>
                value <= available[index]
        );
    }

    validateInput({
        available,
        allocation,
        request
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

        if (
            !allocation ||
            typeof allocation !== "object" ||
            Array.isArray(allocation)
        ) {
            throw new Error(
                "Allocation matrix must be an object."
            );
        }

        if (
            !request ||
            typeof request !== "object" ||
            Array.isArray(request)
        ) {
            throw new Error(
                "Request matrix must be an object."
            );
        }

        const processIds =
            Object.keys(allocation);

        for (const pid of processIds) {
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
                allocation[pid].length !==
                available.length
            ) {
                throw new Error(
                    `Allocation vector for process '${pid}' has invalid dimensions.`
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
                !Array.isArray(
                    request[pid]
                )
            ) {
                throw new Error(
                    `Request vector for process '${pid}' must be an array.`
                );
            }

            if (
                request[pid].length !==
                available.length
            ) {
                throw new Error(
                    `Request vector for process '${pid}' has invalid dimensions.`
                );
            }

            if (
                !request[pid].every(
                    (value) =>
                        Number.isInteger(value) &&
                        value >= 0
                )
            ) {
                throw new Error(
                    `Request vector for process '${pid}' must contain non-negative integers.`
                );
            }
        }

        const requestProcessIds =
            Object.keys(request);

        for (
            const pid
            of requestProcessIds
        ) {
            if (
                !allocation[pid]
            ) {
                throw new Error(
                    `Request contains unknown process '${pid}'.`
                );
            }
        }
    }
}