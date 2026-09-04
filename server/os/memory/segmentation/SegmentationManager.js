const SEGMENT_TYPES = Object.freeze({
    CODE: "code",
    DATA: "data",
    STACK: "stack",
    HEAP: "heap",
    SHARED: "shared",
    CUSTOM: "custom"
});

const PERMISSIONS = Object.freeze([
    "r",
    "w",
    "x"
]);

function cloneSegment(segment) {
    return {
        ...segment,
        permissions: [
            ...segment.permissions
        ]
    };
}

function cloneProcess(process) {
    const allocatedSize =
        process.segments.reduce(
            (total, segment) =>
                total + segment.limit,
            0
        );

    return {
        pid: process.pid,
        segmentCount:
            process.segments.length,
        allocatedSize,
        allocatedMemory:
            allocatedSize,
        totalLimit:
            allocatedSize,
        segments:
            process.segments.map(
                cloneSegment
            )
    };
}

export class SegmentationManager {
    constructor({
        physicalMemorySize = 1024,
        minimumSegmentSize = 1
    } = {}) {
        this.validatePhysicalMemorySize(
            physicalMemorySize
        );

        this.validateMinimumSegmentSize(
            minimumSegmentSize
        );

        this.physicalMemorySize =
            physicalMemorySize;

        this.minimumSegmentSize =
            minimumSegmentSize;

        this.processes =
            new Map();

        this.statistics = {
            translations: 0,
            successfulTranslations: 0,
            segmentationFaults: 0,
            protectionFaults: 0,
            segmentAllocations: 0,
            segmentReleases: 0,
            processesCreated: 0,
            processesRemoved: 0
        };
    }

    /*
     * =========================================================
     * VALIDATION
     * =========================================================
     */

    validatePhysicalMemorySize(value) {
        if (
            !Number.isInteger(value) ||
            value <= 0
        ) {
            throw new Error(
                "Physical memory size must be a positive integer."
            );
        }
    }

    validateMinimumSegmentSize(value) {
        if (
            !Number.isInteger(value) ||
            value <= 0
        ) {
            throw new Error(
                "Minimum segment size must be a positive integer."
            );
        }
    }

    normalizePid(pid) {
        if (
            pid === undefined ||
            pid === null ||
            String(pid).trim() === ""
        ) {
            throw new Error(
                "Process ID is required."
            );
        }

        return String(pid);
    }

    validateSegmentSize(size) {
        if (
            !Number.isInteger(size) ||
            size < this.minimumSegmentSize
        ) {
            throw new Error(
                `Segment size must be an integer greater than or equal to ${this.minimumSegmentSize}.`
            );
        }
    }

    validateSegmentType(type) {
        if (
            typeof type !== "string" ||
            type.trim() === ""
        ) {
            throw new Error(
                "Segment type is required."
            );
        }

        return type
            .trim()
            .toLowerCase();
    }

    normalizePermissions(
        permissions = ["r"]
    ) {
        if (
            !Array.isArray(
                permissions
            ) ||
            permissions.length === 0
        ) {
            throw new Error(
                "At least one segment permission is required."
            );
        }

        const normalized = [
            ...new Set(
                permissions.map(
                    (permission) =>
                        String(
                            permission
                        )
                            .trim()
                            .toLowerCase()
                )
            )
        ];

        for (
            const permission of normalized
        ) {
            if (
                !PERMISSIONS.includes(
                    permission
                )
            ) {
                throw new Error(
                    `Invalid permission '${permission}'. Use r, w or x.`
                );
            }
        }

        return normalized.sort();
    }

    validateOffset(offset) {
        if (
            !Number.isInteger(offset) ||
            offset < 0
        ) {
            throw new Error(
                "Segment offset must be a non-negative integer."
            );
        }
    }

    validateAccessType(accessType) {
        const normalized =
            String(
                accessType ?? "r"
            )
                .trim()
                .toLowerCase();

        if (
            !PERMISSIONS.includes(
                normalized
            )
        ) {
            throw new Error(
                `Invalid access type '${accessType}'. Use r, w or x.`
            );
        }

        return normalized;
    }

    /*
     * =========================================================
     * PROCESS MANAGEMENT
     * =========================================================
     */

    createProcess(pid) {
        const normalizedPid =
            this.normalizePid(pid);

        if (
            this.processes.has(
                normalizedPid
            )
        ) {
            return cloneProcess(
                this.processes.get(
                    normalizedPid
                )
            );
        }

        const process = {
            pid: normalizedPid,
            segments: [],
            nextSegmentNumber: 0
        };

        this.processes.set(
            normalizedPid,
            process
        );

        this.statistics.processesCreated +=
            1;

        return cloneProcess(
            process
        );
    }

    removeProcess(pid) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.processes.get(
                normalizedPid
            );

        if (!process) {
            return false;
        }

        this.statistics.segmentReleases +=
            process.segments.length;

        this.processes.delete(
            normalizedPid
        );

        this.statistics.processesRemoved +=
            1;

        return true;
    }

    hasProcess(pid) {
        const normalizedPid =
            this.normalizePid(pid);

        return this.processes.has(
            normalizedPid
        );
    }

    getProcess(pid) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.processes.get(
                normalizedPid
            );

        return process
            ? cloneProcess(process)
            : null;
    }

    getProcesses() {
        return Array.from(
            this.processes.values()
        ).map(cloneProcess);
    }

    /*
     * =========================================================
     * SEGMENT MANAGEMENT
     * =========================================================
     */

    allocateSegment(
        pid,
        {
            name,
            type = SEGMENT_TYPES.CUSTOM,
            size,
            permissions = ["r"]
        }
    ) {
        const normalizedPid =
            this.normalizePid(pid);

        this.validateSegmentSize(
            size
        );

        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );

        const normalizedType =
            this.validateSegmentType(
                type
            );

        const normalizedPermissions =
            this.normalizePermissions(
                permissions
            );

        const allocatedSize =
            process.segments.reduce(
                (
                    total,
                    segment
                ) =>
                    total +
                    segment.limit,
                0
            );

        const availableMemory =
            this.physicalMemorySize -
            allocatedSize;

        if (
            size >
            availableMemory
        ) {
            throw new Error(
                `Insufficient segmentation memory. Requested ${size}, available ${availableMemory}.`
            );
        }

        const segmentNumber =
            process.nextSegmentNumber++;

        const base =
            this.calculateNextBase(
                process
            );

        const segment = {
            segmentNumber,
            name:
                typeof name === "string" &&
                    name.trim() !== ""
                    ? name.trim()
                    : `${normalizedType}-${segmentNumber}`,
            type:
                normalizedType,
            base,
            limit: size,
            permissions:
                normalizedPermissions,
            present: true,
            allocatedAt:
                new Date().toISOString()
        };

        process.segments.push(
            segment
        );

        this.statistics.segmentAllocations +=
            1;

        return cloneSegment(
            segment
        );
    }

    releaseSegment(
        pid,
        segmentNumber
    ) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );

        const numericSegmentNumber =
            Number(segmentNumber);

        const index =
            process.segments.findIndex(
                (segment) =>
                    segment.segmentNumber ===
                    numericSegmentNumber
            );

        if (index === -1) {
            throw new Error(
                `Segment '${segmentNumber}' not found for process '${normalizedPid}'.`
            );
        }

        const [
            released
        ] =
            process.segments.splice(
                index,
                1
            );

        this.statistics.segmentReleases +=
            1;

        this.recalculateBases(
            process
        );

        return cloneSegment(
            released
        );
    }

    getSegment(
        pid,
        segmentNumber
    ) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );

        const numericSegmentNumber =
            Number(segmentNumber);

        const segment =
            process.segments.find(
                (item) =>
                    item.segmentNumber ===
                    numericSegmentNumber
            );

        return segment
            ? cloneSegment(segment)
            : null;
    }

    getSegments(pid) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );

        return process.segments.map(
            cloneSegment
        );
    }

    /*
     * =========================================================
     * ADDRESS TRANSLATION
     *
     * Logical address:
     *
     *     <segment number, offset>
     *
     * Physical address:
     *
     *     base + offset
     *
     * =========================================================
     */

    translateAddress(
        pid,
        segmentNumber,
        offset,
        accessType = "r"
    ) {
        const normalizedPid =
            this.normalizePid(pid);

        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );

        const normalizedSegmentNumber =
            Number(segmentNumber);

        if (
            !Number.isInteger(
                normalizedSegmentNumber
            ) ||
            normalizedSegmentNumber < 0
        ) {
            throw new Error(
                "Segment number must be a non-negative integer."
            );
        }

        this.validateOffset(
            offset
        );

        const normalizedAccess =
            this.validateAccessType(
                accessType
            );

        this.statistics.translations +=
            1;

        const segment =
            process.segments.find(
                (item) =>
                    item.segmentNumber ===
                    normalizedSegmentNumber
            );

        /*
         * -----------------------------------------------------
         * INVALID SEGMENT
         * -----------------------------------------------------
         */

        if (!segment) {
            this.statistics.segmentationFaults +=
                1;

            return {
                success: false,
                fault: true,
                faultType:
                    "SEGMENTATION_FAULT",
                pid: normalizedPid,
                segmentNumber:
                    normalizedSegmentNumber,
                offset,
                physicalAddress:
                    null,
                message:
                    `Segment ${normalizedSegmentNumber} does not exist.`
            };
        }

        /*
         * -----------------------------------------------------
         * SEGMENT NOT PRESENT
         * -----------------------------------------------------
         */

        if (!segment.present) {
            this.statistics.segmentationFaults +=
                1;

            return {
                success: false,
                fault: true,
                faultType:
                    "SEGMENTATION_FAULT",
                pid: normalizedPid,
                segmentNumber:
                    normalizedSegmentNumber,
                offset,
                physicalAddress:
                    null,
                message:
                    `Segment ${normalizedSegmentNumber} is not present.`
            };
        }

        /*
         * -----------------------------------------------------
         * OFFSET / LIMIT CHECK
         * -----------------------------------------------------
         */

        if (
            offset >=
            segment.limit
        ) {
            this.statistics.segmentationFaults +=
                1;

            return {
                success: false,
                fault: true,
                faultType:
                    "SEGMENTATION_FAULT",
                pid: normalizedPid,
                segmentNumber:
                    normalizedSegmentNumber,
                offset,
                limit:
                    segment.limit,
                physicalAddress:
                    null,
                message:
                    `Offset ${offset} exceeds segment limit ${segment.limit}.`
            };
        }

        /*
         * -----------------------------------------------------
         * PROTECTION CHECK
         * -----------------------------------------------------
         */

        if (
            !segment.permissions.includes(
                normalizedAccess
            )
        ) {
            this.statistics.protectionFaults +=
                1;

            return {
                success: false,
                fault: true,
                faultType:
                    "PROTECTION_FAULT",
                pid: normalizedPid,
                segmentNumber:
                    normalizedSegmentNumber,
                offset,
                permissions:
                    [
                        ...segment.permissions
                    ],
                requestedAccess:
                    normalizedAccess,
                physicalAddress:
                    null,
                message:
                    `Access '${normalizedAccess}' is not permitted for segment '${segment.name}'.`
            };
        }

        /*
         * -----------------------------------------------------
         * PHYSICAL ADDRESS
         * -----------------------------------------------------
         */

        const physicalAddress =
            segment.base +
            offset;

        if (
            physicalAddress >=
            this.physicalMemorySize
        ) {
            this.statistics.segmentationFaults +=
                1;

            return {
                success: false,
                fault: true,
                faultType:
                    "SEGMENTATION_FAULT",
                pid: normalizedPid,
                segmentNumber:
                    normalizedSegmentNumber,
                offset,
                physicalAddress:
                    null,
                message:
                    "Translated address exceeds physical memory."
            };
        }

        this.statistics.successfulTranslations +=
            1;

        return {
            success: true,
            fault: false,
            faultType: null,
            pid: normalizedPid,
            segmentNumber:
                normalizedSegmentNumber,
            offset,
            base:
                segment.base,
            limit:
                segment.limit,
            physicalAddress,
            permissions:
                [
                    ...segment.permissions
                ],
            requestedAccess:
                normalizedAccess,
            segmentName:
                segment.name,
            segmentType:
                segment.type
        };
    }

    /*
     * =========================================================
     * MEMORY STATISTICS
     * =========================================================
     */

    getStatistics() {
        const allocatedMemory =
            Array.from(
                this.processes.values()
            ).reduce(
                (
                    total,
                    process
                ) =>
                    total +
                    process.segments.reduce(
                        (
                            processTotal,
                            segment
                        ) =>
                            processTotal +
                            segment.limit,
                        0
                    ),
                0
            );

        const freeMemory =
            Math.max(
                0,
                this.physicalMemorySize -
                    allocatedMemory
            );

        const segmentCount =
            Array.from(
                this.processes.values()
            ).reduce(
                (
                    total,
                    process
                ) =>
                    total +
                    process.segments.length,
                0
            );

        const utilization =
            this.physicalMemorySize >
            0
                ? allocatedMemory /
                  this.physicalMemorySize
                : 0;

        const translations =
            this.statistics.translations;

        const totalFaults =
            this.statistics
                .segmentationFaults +
            this.statistics
                .protectionFaults;

        const faultRate =
            translations > 0
                ? totalFaults /
                  translations
                : 0;

        return {
            /*
             * Physical memory
             */
            physicalMemorySize:
                this.physicalMemorySize,

            /*
             * Canonical allocation field.
             */
            allocatedMemory,

            /*
             * Backward-compatible alias.
             */
            allocatedSize:
                allocatedMemory,

            freeMemory,

            utilization,

            /*
             * Processes and segments
             */
            processCount:
                this.processes.size,

            segmentCount,

            /*
             * Address translation
             */
            translations,

            successfulTranslations:
                this.statistics
                    .successfulTranslations,

            /*
             * Faults
             */
            segmentationFaults:
                this.statistics
                    .segmentationFaults,

            protectionFaults:
                this.statistics
                    .protectionFaults,

            totalFaults,

            faultRate,

            /*
             * Allocation/release counters
             */
            segmentAllocations:
                this.statistics
                    .segmentAllocations,

            segmentReleases:
                this.statistics
                    .segmentReleases,

            /*
             * Process lifecycle counters
             */
            processesCreated:
                this.statistics
                    .processesCreated,

            processesRemoved:
                this.statistics
                    .processesRemoved
        };
    }

    /*
     * =========================================================
     * SNAPSHOT
     * =========================================================
     */

    getSnapshot() {
        return {
            physicalMemorySize:
                this.physicalMemorySize,

            minimumSegmentSize:
                this.minimumSegmentSize,

            statistics:
                this.getStatistics(),

            processes:
                this.getProcesses()
        };
    }

    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    reset() {
        this.processes.clear();

        this.statistics = {
            translations: 0,
            successfulTranslations: 0,
            segmentationFaults: 0,
            protectionFaults: 0,
            segmentAllocations: 0,
            segmentReleases: 0,
            processesCreated: 0,
            processesRemoved: 0
        };

        return this.getSnapshot();
    }

    /*
     * =========================================================
     * INTERNAL HELPERS
     * =========================================================
     */

    getInternalProcessOrThrow(
        pid
    ) {
        const process =
            this.processes.get(pid);

        if (!process) {
            throw new Error(
                `Segmentation address space for process '${pid}' does not exist.`
            );
        }

        return process;
    }

    calculateNextBase(
        process
    ) {
        return process.segments.reduce(
            (
                maximum,
                segment
            ) =>
                Math.max(
                    maximum,
                    segment.base +
                        segment.limit
                ),
            0
        );
    }

    recalculateBases(
        process
    ) {
        let base = 0;

        for (
            const segment of
            process.segments
        ) {
            segment.base =
                base;

            base +=
                segment.limit;
        }
    }
}

export {
    SEGMENT_TYPES,
    PERMISSIONS
};