import { BankersAlgorithm } from "../algorithms/BankersAlgorithm.js";
import { DeadlockDetection } from "../algorithms/DeadlockDetection.js";

export class DeadlockManager {
    constructor() {
        this.bankers =
            new BankersAlgorithm();

        this.detection =
            new DeadlockDetection();

        this.resources = new Map();
        this.processes = new Map();

        this.lastSafetyResult = null;
        this.lastDetectionResult = null;
    }

    registerResource({
        id,
        total
    }) {
        if (!id) {
            throw new Error(
                "Resource id is required."
            );
        }

        if (
            !Number.isInteger(total) ||
            total < 0
        ) {
            throw new Error(
                "Resource total must be a non-negative integer."
            );
        }

        if (this.resources.has(id)) {
            throw new Error(
                `Resource '${id}' is already registered.`
            );
        }

        this.resources.set(id, {
            id,
            total
        });

        return this.resources.get(id);
    }

    getResource(id) {
        return (
            this.resources.get(id) ??
            null
        );
    }

    getResources() {
        return Array.from(
            this.resources.values()
        ).map(
            (resource) => ({
                ...resource
            })
        );
    }

    registerProcess({
        pid,
        maximum
    }) {
        if (!pid) {
            throw new Error(
                "Process PID is required."
            );
        }

        if (this.processes.has(pid)) {
            throw new Error(
                `Process '${pid}' is already registered.`
            );
        }

        if (!Array.isArray(maximum)) {
            throw new Error(
                "Maximum resource demand must be an array."
            );
        }

        if (
            !maximum.every(
                (value) =>
                    Number.isInteger(value) &&
                    value >= 0
            )
        ) {
            throw new Error(
                "Maximum resource demand must contain non-negative integers."
            );
        }

        const resourceCount =
            this.resources.size;

        if (
            maximum.length !==
            resourceCount
        ) {
            throw new Error(
                "Maximum resource demand does not match the number of registered resources."
            );
        }

        this.processes.set(pid, {
            pid,
            maximum: [...maximum],
            allocation:
                new Array(resourceCount).fill(0)
        });

        return this.getProcess(pid);
    }

    getProcess(pid) {
        const process =
            this.processes.get(pid);

        if (!process) {
            return null;
        }

        return {
            pid: process.pid,
            maximum: [
                ...process.maximum
            ],
            allocation: [
                ...process.allocation
            ]
        };
    }

    getProcesses() {
        return Array.from(
            this.processes.values()
        ).map(
            (process) => ({
                pid: process.pid,
                maximum: [
                    ...process.maximum
                ],
                allocation: [
                    ...process.allocation
                ]
            })
        );
    }

    getAvailableResources() {
        const available = [];

        const resourceList =
            this.getResources();

        for (
            let i = 0;
            i < resourceList.length;
            i++
        ) {
            let allocated = 0;

            for (
                const process
                of this.processes.values()
            ) {
                allocated +=
                    process.allocation[i];
            }

            available.push(
                resourceList[i].total -
                allocated
            );
        }

        return available;
    }

    allocateResources(
        pid,
        allocation
    ) {
        const process =
            this.processes.get(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' is not registered.`
            );
        }

        if (!Array.isArray(allocation)) {
            throw new Error(
                "Allocation must be an array."
            );
        }

        if (
            allocation.length !==
            this.resources.size
        ) {
            throw new Error(
                "Allocation dimensions do not match the registered resources."
            );
        }

        if (
            !allocation.every(
                (value) =>
                    Number.isInteger(value) &&
                    value >= 0
            )
        ) {
            throw new Error(
                "Allocation must contain non-negative integers."
            );
        }

        for (
            let i = 0;
            i < allocation.length;
            i++
        ) {
            const newAllocation =
                process.allocation[i] +
                allocation[i];

            if (
                newAllocation >
                process.maximum[i]
            ) {
                throw new Error(
                    `Allocation for process '${pid}' exceeds its maximum demand.`
                );
            }

            const available =
                this.getAvailableResources();

            if (
                allocation[i] >
                available[i]
            ) {
                throw new Error(
                    `Insufficient available resource '${this.getResources()[i].id}'.`
                );
            }
        }

        for (
            let i = 0;
            i < allocation.length;
            i++
        ) {
            process.allocation[i] +=
                allocation[i];
        }

        return this.getProcess(pid);
    }

    releaseResources(
        pid,
        release
    ) {
        const process =
            this.processes.get(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' is not registered.`
            );
        }

        if (!Array.isArray(release)) {
            throw new Error(
                "Release vector must be an array."
            );
        }

        if (
            release.length !==
            this.resources.size
        ) {
            throw new Error(
                "Release vector dimensions do not match the registered resources."
            );
        }

        for (
            let i = 0;
            i < release.length;
            i++
        ) {
            if (
                !Number.isInteger(
                    release[i]
                ) ||
                release[i] < 0
            ) {
                throw new Error(
                    "Released resources must be non-negative integers."
                );
            }

            if (
                release[i] >
                process.allocation[i]
            ) {
                throw new Error(
                    `Process '${pid}' cannot release more resources than it currently holds.`
                );
            }
        }

        for (
            let i = 0;
            i < release.length;
            i++
        ) {
            process.allocation[i] -=
                release[i];
        }

        return this.getProcess(pid);
    }

    buildMatrices() {
        const processIds =
            Array.from(
                this.processes.keys()
            );

        const allocation = {};
        const maximum = {};

        for (const pid of processIds) {
            const process =
                this.processes.get(pid);

            allocation[pid] = [
                ...process.allocation
            ];

            maximum[pid] = [
                ...process.maximum
            ];
        }

        return {
            available:
                this.getAvailableResources(),

            allocation,

            maximum
        };
    }

    checkSafety() {
        const matrices =
            this.buildMatrices();

        const result =
            this.bankers.checkSafety(
                matrices
            );

        this.lastSafetyResult =
            result;

        return result;
    }

    requestResources(
        pid,
        request
    ) {
        const matrices =
            this.buildMatrices();

        const result =
            this.bankers.requestCanBeGranted({
                available:
                    matrices.available,

                allocation:
                    matrices.allocation,

                maximum:
                    matrices.maximum,

                pid,

                request
            });

        if (result.granted) {
            this.allocateResources(
                pid,
                request
            );
        }

        return {
            ...result,
            allocationGranted:
                result.granted
        };
    }

    detectDeadlock() {
        const matrices =
            this.buildMatrices();

        const need =
            this.bankers.calculateNeed({
                allocation:
                    matrices.allocation,

                maximum:
                    matrices.maximum
            });

        const result =
            this.detection.detect({
                available:
                    matrices.available,

                allocation:
                    matrices.allocation,

                request: need
            });

        this.lastDetectionResult =
            result;

        return result;
    }

    getNeedMatrix() {
        const matrices =
            this.buildMatrices();

        return this.bankers.calculateNeed({
            allocation:
                matrices.allocation,

            maximum:
                matrices.maximum
        });
    }

    getStatistics() {
        const safety =
            this.lastSafetyResult;

        const detection =
            this.lastDetectionResult;

        return {
            resourceCount:
                this.resources.size,

            processCount:
                this.processes.size,

            available:
                this.getAvailableResources(),

            safe:
                safety
                    ? safety.safe
                    : null,

            safeSequence:
                safety
                    ? [
                        ...safety.safeSequence
                    ]
                    : [],

            deadlockDetected:
                detection
                    ? detection.deadlockDetected
                    : null,

            deadlockedProcesses:
                detection
                    ? [
                        ...detection.deadlockedProcesses
                    ]
                    : []
        };
    }

    getDeadlockTable() {
        const matrices =
            this.buildMatrices();

        const need =
            this.getNeedMatrix();

        const table = [];

        for (const pid of Object.keys(
            matrices.allocation
        )) {
            table.push({
                pid,

                allocation: [
                    ...matrices.allocation[pid]
                ],

                maximum: [
                    ...matrices.maximum[pid]
                ],

                need: [
                    ...need[pid]
                ]
            });
        }

        return {
            resources:
                this.getResources(),

            available:
                matrices.available,

            processes: table
        };
    }

    removeProcess(pid) {
        if (!this.processes.has(pid)) {
            throw new Error(
                `Process '${pid}' is not registered.`
            );
        }

        const process =
            this.processes.get(pid);

        const hasAllocation =
            process.allocation.some(
                (value) => value > 0
            );

        if (hasAllocation) {
            throw new Error(
                `Process '${pid}' still holds allocated resources.`
            );
        }

        this.processes.delete(pid);

        return true;
    }

    removeResource(id) {
        if (!this.resources.has(id)) {
            throw new Error(
                `Resource '${id}' is not registered.`
            );
        }

        if (this.processes.size > 0) {
            throw new Error(
                "Resources cannot be removed while processes are registered."
            );
        }

        this.resources.delete(id);

        return true;
    }

    reset() {
        this.resources.clear();
        this.processes.clear();

        this.lastSafetyResult = null;
        this.lastDetectionResult = null;
    }
}