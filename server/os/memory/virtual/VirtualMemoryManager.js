import {
    EventEmitter
} from "events";


/*
 * =========================================================
 * VIRTUAL MEMORY MANAGER
 * =========================================================
 *
 * Virtual Memory sits above the existing PagingManager.
 *
 * Responsibilities:
 *
 * - Virtual address-space metadata
 * - Demand paging
 * - Resident/non-resident tracking
 * - Page-in
 * - Page-out / eviction
 * - Backing-store metadata
 * - Page reference tracking
 * - Memory-pressure detection
 * - Virtual-memory statistics
 * - Page replacement policy integration
 * - Configurable VM physical-frame limit
 *
 * PagingManager remains responsible for:
 *
 * - Physical frames
 * - Page tables
 * - Actual page allocation
 * - Physical address translation
 *
 * PageReplacementManager is responsible for:
 *
 * - FIFO
 * - LRU
 * - Optimal
 * - Second Chance
 * - Clock
 *
 * This manager coordinates the two subsystems.
 * =========================================================
 */

export class VirtualMemoryManager {

    constructor({
        pagingManager,

        pageReplacementManager = null,

        defaultEvictionPolicy = "fifo",

        /*
         * Optional VM-level physical frame limit.
         *
         * null means the VM may use all physical frames
         * supplied by PagingManager.
         *
         * Example:
         *
         *     physicalFrameLimit: 4
         *
         * means Virtual Memory will behave as though only
         * four physical frames are available, even if the
         * underlying simulated physical memory contains
         * more frames.
         */
        physicalFrameLimit = null
    } = {}) {

        if (!pagingManager) {
            throw new Error(
                "VirtualMemoryManager requires a PagingManager."
            );
        }


        this.pagingManager =
            pagingManager;


        /*
         * PageReplacementManager is injected by Kernel.
         *
         * It is optional during construction so that the
         * VM subsystem remains backwards compatible until
         * Kernel wires the two managers together.
         */
        this.pageReplacementManager =
            pageReplacementManager;


        this.defaultEvictionPolicy =
            this.normalizeEvictionPolicy(
                defaultEvictionPolicy
            );


        /*
         * VM-level physical frame limit.
         *
         * null = no artificial limit.
         */
        this.physicalFrameLimit =
            null;


        this.setPhysicalFrameLimit(
            physicalFrameLimit
        );


        /*
         * Monotonic runtime counters.
         *
         * These are intentionally numeric because the
         * PageReplacementManager uses numeric ordering
         * for FIFO/LRU/Clock decisions.
         */
        this.loadSequence =
            0;

        this.referenceSequence =
            0;


        /*
         * pid -> virtual-memory process
         */
        this.processes =
            new Map();


        /*
         * EventEmitter allows the OS to observe
         * page-in/page-out/page-fault/replacement activity.
         */
        this.events =
            new EventEmitter();


        this.statistics = {
            accesses: 0,

            pageHits: 0,
            pageFaults: 0,

            pagesLoaded: 0,
            pagesEvicted: 0,

            swapIns: 0,
            swapOuts: 0,

            translations: 0,
            successfulTranslations: 0,

            memoryPressureEvents: 0,

            replacements: 0,

            processesCreated: 0,
            processesRemoved: 0
        };
    }


    /*
     * =========================================================
     * PAGE REPLACEMENT MANAGER INTEGRATION
     * =========================================================
     */

    setPageReplacementManager(
        pageReplacementManager
    ) {
        if (
            pageReplacementManager !== null &&
            pageReplacementManager !== undefined
        ) {

            if (
                typeof pageReplacementManager.selectVictim !==
                "function"
            ) {
                throw new Error(
                    "PageReplacementManager must expose selectVictim()."
                );
            }
        }


        this.pageReplacementManager =
            pageReplacementManager;


        /*
         * Keep the VM policy synchronized with the
         * replacement manager's current default.
         */
        if (
            pageReplacementManager &&
            typeof pageReplacementManager.getDefaultAlgorithm ===
            "function"
        ) {
            this.defaultEvictionPolicy =
                this.normalizeEvictionPolicy(
                    pageReplacementManager
                        .getDefaultAlgorithm()
                );
        }


        return this.pageReplacementManager;
    }


    getPageReplacementManager() {
        return this.pageReplacementManager;
    }


    setDefaultEvictionPolicy(
        policy
    ) {
        const normalized =
            this.normalizeEvictionPolicy(
                policy
            );


        this.defaultEvictionPolicy =
            normalized;


        /*
         * The PageReplacementManager owns the actual
         * policy normalization/state when it is available.
         */
        if (
            this.pageReplacementManager &&
            typeof this.pageReplacementManager.setDefaultAlgorithm ===
            "function"
        ) {
            this.pageReplacementManager
                .setDefaultAlgorithm(
                    normalized
                );
        }


        this.emit(
            "eviction-policy-changed",
            {
                algorithm:
                    normalized
            }
        );


        return normalized;
    }


    getDefaultEvictionPolicy() {
        if (
            this.pageReplacementManager &&
            typeof this.pageReplacementManager.getDefaultAlgorithm ===
            "function"
        ) {
            return this.normalizeEvictionPolicy(
                this.pageReplacementManager
                    .getDefaultAlgorithm()
            );
        }


        return this.defaultEvictionPolicy;
    }


    /*
     * =========================================================
     * PHYSICAL FRAME LIMIT
     * =========================================================
     *
     * This is a VM-level allocation limit.
     *
     * It does NOT change the underlying PagingManager's
     * physical memory size.
     *
     * Example:
     *
     * Physical memory = 1024 bytes
     * Page size       = 64 bytes
     * Actual frames   = 16
     *
     * physicalFrameLimit = 4
     *
     * The VM layer will only allow four resident pages
     * before invoking the replacement algorithm.
     */

    setPhysicalFrameLimit(
        limit
    ) {
        if (
            limit ===
            null ||
            limit ===
            undefined ||
            limit ===
            ""
        ) {
            this.physicalFrameLimit =
                null;

            return null;
        }


        const numericLimit =
            Number(limit);


        if (
            !Number.isInteger(
                numericLimit
            ) ||
            numericLimit <= 0
        ) {
            throw new Error(
                "Physical frame limit must be a positive integer or null."
            );
        }


        const actualFrameCount =
            this.getActualPhysicalFrameCount();


        if (
            actualFrameCount > 0 &&
            numericLimit >
            actualFrameCount
        ) {
            throw new Error(
                `Physical frame limit ${numericLimit} exceeds the available physical frame count ${actualFrameCount}.`
            );
        }


        /*
         * Do not allow lowering the limit below the number
         * of pages that are currently resident.
         *
         * This avoids silently creating an impossible state.
         */
        const currentResidentPages =
            this.getResidentPages().length;


        if (
            numericLimit <
            currentResidentPages
        ) {
            throw new Error(
                `Physical frame limit ${numericLimit} is below the current resident-page count ${currentResidentPages}. Evict pages first or reset the VM subsystem.`
            );
        }


        this.physicalFrameLimit =
            numericLimit;


        this.emit(
            "physical-frame-limit-changed",
            {
                physicalFrameLimit:
                    numericLimit
            }
        );


        return numericLimit;
    }


    getPhysicalFrameLimit() {
        return this.physicalFrameLimit;
    }


    getActualPhysicalFrameCount() {
        try {

            const physicalMemorySize =
                Number(
                    this.pagingManager
                        .physicalMemorySize
                );

            const pageSize =
                Number(
                    this.pagingManager
                        .pageSize
                );


            if (
                Number.isInteger(
                    physicalMemorySize
                ) &&
                physicalMemorySize > 0 &&
                Number.isInteger(
                    pageSize
                ) &&
                pageSize > 0
            ) {
                return Math.floor(
                    physicalMemorySize /
                    pageSize
                );
            }


            const freeFrames =
                this.pagingManager
                    .getFreeFrames?.() ??
                [];


            const usedFrames =
                this.pagingManager
                    .getUsedFrames?.() ??
                [];


            return (
                Array.isArray(
                    freeFrames
                )
                    ? freeFrames.length
                    : 0
            ) +
            (
                Array.isArray(
                    usedFrames
                )
                    ? usedFrames.length
                    : 0
            );

        } catch {
            return 0;
        }
    }


    getCurrentResidentFrameCount() {
        return this.getResidentPages().length;
    }


    getAvailableVMFrames() {
        const actualFrameCount =
            this.getActualPhysicalFrameCount();


        if (
            this.physicalFrameLimit ===
            null
        ) {
            const freeFrames =
                this.pagingManager
                    .getFreeFrames?.() ??
                [];

            return Array.isArray(
                freeFrames
            )
                ? freeFrames.length
                : 0;
        }


        return Math.max(
            0,
            this.physicalFrameLimit -
            this.getCurrentResidentFrameCount()
        );
    }


    hasFrameLimitPressure() {
        if (
            this.physicalFrameLimit ===
            null
        ) {
            return false;
        }


        return (
            this.getCurrentResidentFrameCount() >=
            this.physicalFrameLimit
        );
    }


    /*
     * =========================================================
     * VALIDATION
     * =========================================================
     */

    normalizePid(
        pid
    ) {
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


    normalizeEvictionPolicy(
        policy
    ) {
        const normalized =
            String(
                policy ?? "fifo"
            )
                .trim()
                .toLowerCase()
                .replace(
                    /_/g,
                    "-"
                )
                .replace(
                    /\s+/g,
                    "-"
                );


        const aliases = {
            fifo:
                "fifo",

            lru:
                "lru",

            optimal:
                "optimal",

            opt:
                "optimal",

            min:
                "optimal",

            "secondchance":
                "second-chance",

            "second-chance":
                "second-chance",

            sc:
                "second-chance",

            clock:
                "clock"
        };


        const resolved =
            aliases[
                normalized
            ];


        if (!resolved) {
            throw new Error(
                `Unsupported virtual-memory eviction policy '${policy}'. ` +
                "Supported policies: fifo, lru, optimal, second-chance, clock."
            );
        }


        return resolved;
    }


    validatePageNumber(
        pageNumber
    ) {
        if (
            !Number.isInteger(
                pageNumber
            ) ||
            pageNumber < 0
        ) {
            throw new Error(
                "Page number must be a non-negative integer."
            );
        }
    }


    validateLogicalAddress(
        logicalAddress
    ) {
        if (
            !Number.isInteger(
                logicalAddress
            ) ||
            logicalAddress < 0
        ) {
            throw new Error(
                "Logical address must be a non-negative integer."
            );
        }
    }


    normalizeReferenceString(
        referenceString
    ) {
        if (
            referenceString ===
            undefined ||
            referenceString ===
            null
        ) {
            return [];
        }


        if (
            typeof referenceString ===
            "string"
        ) {
            const values =
                referenceString
                    .split(
                        /[\s,]+/
                    )
                    .filter(
                        (value) =>
                            value.length > 0
                    )
                    .map(
                        (value) =>
                            Number(value)
                    );


            if (
                values.some(
                    (value) =>
                        !Number.isInteger(
                            value
                        ) ||
                        value < 0
                )
            ) {
                throw new Error(
                    "Reference string must contain only non-negative integer page numbers."
                );
            }


            return values;
        }


        if (
            Array.isArray(
                referenceString
            )
        ) {
            const values =
                referenceString.map(
                    (value) =>
                        Number(value)
                );


            if (
                values.some(
                    (value) =>
                        !Number.isInteger(
                            value
                        ) ||
                        value < 0
                )
            ) {
                throw new Error(
                    "Reference string must contain only non-negative integer page numbers."
                );
            }


            return values;
        }


        throw new Error(
            "Reference string must be an array or a whitespace/comma-separated string."
        );
    }


    /*
     * =========================================================
     * PROCESS MANAGEMENT
     * =========================================================
     */

    createProcess(
        pid,
        virtualMemorySize
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        if (
            !Number.isInteger(
                virtualMemorySize
            ) ||
            virtualMemorySize <= 0
        ) {
            throw new Error(
                "Virtual memory size must be a positive integer."
            );
        }


        const existing =
            this.processes.get(
                normalizedPid
            );


        if (existing) {
            return this.cloneProcess(
                existing
            );
        }


        const pageSize =
            this.pagingManager.pageSize;


        if (
            !Number.isInteger(
                pageSize
            ) ||
            pageSize <= 0
        ) {
            throw new Error(
                "Paging page size is invalid."
            );
        }


        const pageCount =
            Math.ceil(
                virtualMemorySize /
                pageSize
            );


        /*
         * Every virtual page gets metadata,
         * but pages are loaded on demand.
         */
        const pages =
            new Map();


        for (
            let pageNumber = 0;
            pageNumber < pageCount;
            pageNumber += 1
        ) {

            pages.set(
                pageNumber,
                {
                    pageNumber,

                    resident:
                        false,

                    frameNumber:
                        null,

                    swapSlot:
                        null,

                    referenced:
                        false,

                    /*
                     * Explicit reference bit used by
                     * Second Chance and Clock.
                     */
                    referenceBit:
                        0,

                    modified:
                        false,

                    referenceCount:
                        0,

                    /*
                     * Numeric ordering metadata for
                     * PageReplacementManager.
                     */
                    loadOrder:
                        null,

                    lastReference:
                        null,

                    /*
                     * ISO timestamps remain useful
                     * for the UI and snapshots.
                     */
                    loadedAt:
                        null,

                    lastReferencedAt:
                        null,

                    evictedAt:
                        null
                }
            );
        }


        const process = {
            pid:
                normalizedPid,

            virtualMemorySize,

            pageSize,

            pageCount,

            pages,

            residentQueue:
                [],

            nextSwapSlot:
                0,

            /*
             * Optional future reference sequence.
             *
             * Used by Optimal when the caller supplies
             * a known sequence.
             */
            referenceString:
                [],

            referenceIndex:
                -1,

            accesses:
                0,

            pageHits:
                0,

            pageFaults:
                0,

            pagesLoaded:
                0,

            pagesEvicted:
                0
        };


        this.processes.set(
            normalizedPid,
            process
        );


        this.statistics.processesCreated +=
            1;


        this.emit(
            "process-created",
            {
                pid:
                    normalizedPid,

                virtualMemorySize,

                pageCount,

                pageSize
            }
        );


        return this.cloneProcess(
            process
        );
    }


    removeProcess(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const process =
            this.processes.get(
                normalizedPid
            );


        if (!process) {
            return false;
        }


        /*
         * Release all resident pages from
         * the real PagingManager.
         */
        for (
            const page of
            process.pages.values()
        ) {

            if (
                page.resident
            ) {
                this.releasePagingPage(
                    normalizedPid,
                    page.pageNumber
                );
            }
        }


        this.processes.delete(
            normalizedPid
        );


        this.statistics.processesRemoved +=
            1;


        this.emit(
            "process-removed",
            {
                pid:
                    normalizedPid
            }
        );


        return true;
    }


    hasProcess(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        return this.processes.has(
            normalizedPid
        );
    }


    getProcess(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const process =
            this.processes.get(
                normalizedPid
            );


        return process
            ? this.cloneProcess(
                process
            )
            : null;
    }


    getProcesses() {
        return Array.from(
            this.processes.values()
        ).map(
            (process) =>
                this.cloneProcess(
                    process
                )
        );
    }


    /*
     * =========================================================
     * OPTIONAL OPTIMAL REFERENCE SEQUENCE
     * =========================================================
     */

    setReferenceSequence(
        pid,
        referenceString
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        const references =
            this.normalizeReferenceString(
                referenceString
            );


        process.referenceString =
            references;


        process.referenceIndex =
            -1;


        return {
            success:
                true,

            pid:
                normalizedPid,

            referenceString:
                [
                    ...references
                ],

            referenceIndex:
                process.referenceIndex
        };
    }


    clearReferenceSequence(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        process.referenceString =
            [];


        process.referenceIndex =
            -1;


        return {
            success:
                true,

            pid:
                normalizedPid
        };
    }


    /*
     * =========================================================
     * SYNCHRONIZE WITH EXISTING PAGING PROCESS
     * =========================================================
     */

    syncProcess(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const pagingProcess =
            this.pagingManager.getProcess(
                normalizedPid
            );


        if (!pagingProcess) {
            return null;
        }


        const virtualMemorySize =
            Number(
                pagingProcess.virtualMemorySize
            );


        if (
            !Number.isInteger(
                virtualMemorySize
            ) ||
            virtualMemorySize <= 0
        ) {
            return null;
        }


        const existing =
            this.processes.get(
                normalizedPid
            );


        if (existing) {

            /*
             * If the real paging process changed its
             * virtual size, rebuild only when necessary.
             */
            if (
                existing.virtualMemorySize !==
                virtualMemorySize
            ) {

                this.removeProcess(
                    normalizedPid
                );


                return this.createProcess(
                    normalizedPid,
                    virtualMemorySize
                );
            }


            return this.cloneProcess(
                existing
            );
        }


        return this.createProcess(
            normalizedPid,
            virtualMemorySize
        );
    }


    /*
     * =========================================================
     * DEMAND PAGING ACCESS
     * =========================================================
     */

    access(
        pid,
        logicalAddress,
        {
            write = false,

            evictionPolicy =
                this.getDefaultEvictionPolicy(),

            referenceString =
                undefined,

            currentIndex =
                undefined
        } = {}
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        this.validateLogicalAddress(
            logicalAddress
        );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        if (
            logicalAddress >=
            process.virtualMemorySize
        ) {
            throw new Error(
                `Logical address ${logicalAddress} is outside virtual address space 0-${process.virtualMemorySize - 1}.`
            );
        }


        const pageSize =
            process.pageSize;


        const pageNumber =
            Math.floor(
                logicalAddress /
                pageSize
            );


        const offset =
            logicalAddress %
            pageSize;


        this.statistics.accesses +=
            1;


        process.accesses +=
            1;


        const page =
            process.pages.get(
                pageNumber
            );


        if (!page) {
            throw new Error(
                `Virtual page ${pageNumber} does not exist.`
            );
        }


        /*
         * -----------------------------------------------------
         * REFERENCE SEQUENCE
         * -----------------------------------------------------
         *
         * If the caller supplied a sequence, use it for
         * Optimal replacement.
         *
         * Otherwise use the process-level sequence if one
         * has been configured.
         */
        let optimalReferences =
            process.referenceString;


        let optimalIndex =
            process.referenceIndex;


        if (
            referenceString !==
            undefined
        ) {
            optimalReferences =
                this.normalizeReferenceString(
                    referenceString
                );
        }


        if (
            Number.isInteger(
                currentIndex
            )
        ) {
            optimalIndex =
                currentIndex;
        }


        /*
         * If a process reference sequence is being used
         * automatically, advance its logical index.
         */
        if (
            referenceString ===
            undefined &&
            optimalReferences.length > 0
        ) {

            const nextIndex =
                process.referenceIndex +
                1;


            if (
                nextIndex <
                optimalReferences.length
            ) {
                optimalIndex =
                    nextIndex;

                process.referenceIndex =
                    nextIndex;
            }
        }


        /*
         * -----------------------------------------------------
         * PAGE HIT
         * -----------------------------------------------------
         */

        if (
            page.resident
        ) {

            this.statistics.pageHits +=
                1;


            process.pageHits +=
                1;


            this.statistics.translations +=
                1;


            this.markPageReferenced(
                page,
                write
            );


            /*
             * Keep PagingManager reference metadata
             * synchronized where supported.
             */
            this.referencePagingPage(
                normalizedPid,
                pageNumber,
                write
            );


            const translation =
                this.translateResidentPage(
                    normalizedPid,
                    pageNumber,
                    offset
                );


            this.statistics.successfulTranslations +=
                translation.success
                    ? 1
                    : 0;


            this.emit(
                "page-hit",
                {
                    pid:
                        normalizedPid,

                    pageNumber,

                    logicalAddress,

                    offset,

                    frameNumber:
                        page.frameNumber
                }
            );


            return {
                success:
                    translation.success,

                pageFault:
                    false,

                pageHit:
                    true,

                pid:
                    normalizedPid,

                logicalAddress,

                pageNumber,

                offset,

                frameNumber:
                    page.frameNumber,

                physicalAddress:
                    translation.physicalAddress,

                loaded:
                    false,

                evictedPage:
                    null,

                evictionPolicy:
                    this.normalizeEvictionPolicy(
                        evictionPolicy
                    )
            };
        }


        /*
         * -----------------------------------------------------
         * PAGE FAULT
         * -----------------------------------------------------
         */

        this.statistics.pageFaults +=
            1;


        process.pageFaults +=
            1;


        /*
         * Memory pressure can come from either:
         *
         * 1. The actual physical memory being full.
         * 2. The configured VM-level frame limit being full.
         */
        const pressure =
            this.hasPhysicalMemoryPressure();


        const frameLimitPressure =
            this.hasFrameLimitPressure();


        if (
            pressure ||
            frameLimitPressure
        ) {
            this.statistics.memoryPressureEvents +=
                1;
        }


        this.emit(
            "page-fault",
            {
                pid:
                    normalizedPid,

                pageNumber,

                logicalAddress,

                offset,

                memoryPressure:
                    pressure,

                frameLimitPressure
            }
        );


        const eviction =
            this.ensurePhysicalCapacity(
                evictionPolicy,
                {
                    referenceString:
                        optimalReferences,

                    currentIndex:
                        optimalIndex
                }
            );


        const loaded =
            this.pageIn(
                normalizedPid,
                pageNumber
            );


        /*
         * The newly loaded page has just been referenced.
         */
        this.markPageReferenced(
            page,
            write
        );


        this.statistics.translations +=
            1;


        const translation =
            this.translateResidentPage(
                normalizedPid,
                pageNumber,
                offset
            );


        this.statistics.successfulTranslations +=
            translation.success
                ? 1
                : 0;


        return {
            success:
                translation.success,

            pageFault:
                true,

            pageHit:
                false,

            pid:
                normalizedPid,

            logicalAddress,

            pageNumber,

            offset,

            frameNumber:
                loaded.frameNumber,

            physicalAddress:
                translation.physicalAddress,

            loaded:
                true,

            evictedPage:
                eviction
                    ? eviction
                    : null,

            evictionPolicy:
                this.normalizeEvictionPolicy(
                    evictionPolicy
                )
        };
    }


    /*
     * =========================================================
     * PAGE IN
     * =========================================================
     */

    pageIn(
        pid,
        pageNumber
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        this.validatePageNumber(
            pageNumber
        );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        const page =
            process.pages.get(
                pageNumber
            );


        if (!page) {
            throw new Error(
                `Virtual page ${pageNumber} does not exist for process '${normalizedPid}'.`
            );
        }


        if (
            page.resident
        ) {
            return {
                success:
                    true,

                alreadyResident:
                    true,

                pid:
                    normalizedPid,

                pageNumber,

                frameNumber:
                    page.frameNumber
            };
        }


        /*
         * Ask PagingManager for a real physical frame.
         */
        const allocated =
            this.pagingManager.allocatePage(
                normalizedPid,
                pageNumber
            );


        const frameNumber =
            this.extractFrameNumber(
                allocated
            );


        if (
            frameNumber === null
        ) {
            throw new Error(
                `PagingManager did not return a frame for page ${pageNumber}.`
            );
        }


        const now =
            new Date().toISOString();


        page.resident =
            true;


        page.frameNumber =
            frameNumber;


        page.loadedAt =
            now;


        page.loadOrder =
            this.loadSequence++;


        page.evictedAt =
            null;


        /*
         * A newly paged-in page begins with a cleared
         * replacement reference bit. The actual access
         * marks it referenced immediately afterwards.
         */
        page.referenced =
            false;


        page.referenceBit =
            0;


        /*
         * A page brought back from backing storage
         * consumes its previous swap slot.
         */
        if (
            page.swapSlot !== null
        ) {
            this.statistics.swapIns +=
                1;
        }


        process.residentQueue.push(
            pageNumber
        );


        process.pagesLoaded +=
            1;


        this.statistics.pagesLoaded +=
            1;


        this.emit(
            "page-in",
            {
                pid:
                    normalizedPid,

                pageNumber,

                frameNumber,

                swapSlot:
                    page.swapSlot,

                loadOrder:
                    page.loadOrder
            }
        );


        return {
            success:
                true,

            alreadyResident:
                false,

            pid:
                normalizedPid,

            pageNumber,

            frameNumber,

            swapSlot:
                page.swapSlot,

            loadOrder:
                page.loadOrder
        };
    }


    /*
     * =========================================================
     * PAGE OUT / EVICTION
     * =========================================================
     */

    evictPage(
        pid,
        pageNumber
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        this.validatePageNumber(
            pageNumber
        );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        const page =
            process.pages.get(
                pageNumber
            );


        if (!page) {
            throw new Error(
                `Virtual page ${pageNumber} does not exist.`
            );
        }


        if (
            !page.resident
        ) {
            return {
                success:
                    false,

                alreadyNonResident:
                    true,

                pid:
                    normalizedPid,

                pageNumber
            };
        }


        /*
         * Dirty pages must conceptually be written
         * to backing storage before eviction.
         */

        let swapSlot =
            page.swapSlot;


        if (
            swapSlot === null
        ) {
            swapSlot =
                process.nextSwapSlot++;


            page.swapSlot =
                swapSlot;
        }


        if (
            page.modified
        ) {

            this.statistics.swapOuts +=
                1;


            page.modified =
                false;
        }


        const frameNumber =
            page.frameNumber;


        const released =
            this.releasePagingPage(
                normalizedPid,
                pageNumber
            );


        /*
         * Remove from the resident queue.
         *
         * The queue remains useful as diagnostic metadata,
         * while actual victim selection is delegated to
         * PageReplacementManager.
         */
        process.residentQueue =
            process.residentQueue.filter(
                (item) =>
                    item !==
                    pageNumber
            );


        page.resident =
            false;


        page.frameNumber =
            null;


        page.evictedAt =
            new Date().toISOString();


        /*
         * A reference bit is consumed/reset by eviction.
         */
        page.referenced =
            false;


        page.referenceBit =
            0;


        process.pagesEvicted +=
            1;


        this.statistics.pagesEvicted +=
            1;


        this.statistics.replacements +=
            1;


        const result = {
            success:
                true,

            pid:
                normalizedPid,

            pageNumber,

            frameNumber,

            swapSlot,

            released
        };


        this.emit(
            "page-out",
            result
        );


        this.emit(
            "page-replaced",
            {
                ...result,

                algorithm:
                    this.getDefaultEvictionPolicy()
            }
        );


        return result;
    }


    /*
     * =========================================================
     * ENSURE PHYSICAL CAPACITY
     * =========================================================
     *
     * If a VM-level frame limit exists, it takes priority.
     *
     * Otherwise the underlying PagingManager's physical
     * frame availability determines whether replacement
     * is necessary.
     * =========================================================
     */

    ensurePhysicalCapacity(
        evictionPolicy =
            this.getDefaultEvictionPolicy(),

        {
            referenceString =
                [],

            currentIndex =
                -1
        } = {}
    ) {
        const residentCount =
            this.getCurrentResidentFrameCount();


        /*
         * -----------------------------------------------------
         * VM-LEVEL FRAME LIMIT
         * -----------------------------------------------------
         *
         * When configured, replacement occurs as soon as
         * resident pages reach the configured limit.
         */
        if (
            this.physicalFrameLimit !==
            null
        ) {

            if (
                residentCount <
                this.physicalFrameLimit
            ) {
                return null;
            }


            const normalizedPolicy =
                this.normalizeEvictionPolicy(
                    evictionPolicy
                );


            const victim =
                this.selectVictim(
                    normalizedPolicy,
                    {
                        referenceString,

                        currentIndex
                    }
                );


            if (!victim) {
                throw new Error(
                    "VM physical frame limit has been reached and no virtual-memory page can be evicted."
                );
            }


            const eviction =
                this.evictPage(
                    victim.pid,
                    victim.pageNumber
                );


            return {
                ...eviction,

                algorithm:
                    normalizedPolicy,

                victim:
                    {
                        pid:
                            victim.pid,

                        pageNumber:
                            victim.pageNumber,

                        frameNumber:
                            victim.frameNumber ??
                            null
                    },

                physicalFrameLimit:
                    this.physicalFrameLimit
            };
        }


        /*
         * -----------------------------------------------------
         * UNDERLYING PHYSICAL MEMORY
         * -----------------------------------------------------
         */
        const freeFrames =
            this.pagingManager.getFreeFrames();


        if (
            Array.isArray(
                freeFrames
            ) &&
            freeFrames.length > 0
        ) {
            return null;
        }


        const normalizedPolicy =
            this.normalizeEvictionPolicy(
                evictionPolicy
            );


        const victim =
            this.selectVictim(
                normalizedPolicy,
                {
                    referenceString,

                    currentIndex
                }
            );


        if (!victim) {
            throw new Error(
                "Physical memory is full and no virtual-memory page can be evicted."
            );
        }


        const eviction =
            this.evictPage(
                victim.pid,
                victim.pageNumber
            );


        /*
         * Attach the selected policy to the result so
         * callers can see which algorithm actually made
         * the decision.
         */
        return {
            ...eviction,

            algorithm:
                normalizedPolicy,

            victim:
                {
                    pid:
                        victim.pid,

                    pageNumber:
                        victim.pageNumber,

                    frameNumber:
                        victim.frameNumber ??
                        null
                }
        };
    }


    /*
     * =========================================================
     * VICTIM SELECTION
     * =========================================================
     */

    selectVictim(
        evictionPolicy =
            this.getDefaultEvictionPolicy(),

        {
            referenceString =
                [],

            currentIndex =
                -1
        } = {}
    ) {
        const policy =
            this.normalizeEvictionPolicy(
                evictionPolicy
            );


        const residentPages =
            this.getResidentPages();


        if (
            residentPages.length ===
            0
        ) {
            return null;
        }


        /*
         * Delegate ALL supported policies to the dedicated
         * PageReplacementManager when available.
         */
        if (
            this.pageReplacementManager &&
            typeof this.pageReplacementManager.selectVictim ===
            "function"
        ) {

            const selected =
                this.pageReplacementManager
                    .selectVictim(
                        residentPages,
                        {
                            algorithm:
                                policy,

                            referenceString:
                                this.normalizeReferenceString(
                                    referenceString
                                ),

                            currentIndex
                        }
                    );


            if (
                selected
            ) {
                return selected;
            }


            return null;
        }


        /*
         * Backwards-compatible fallback.
         *
         * Before Kernel wires the replacement manager,
         * FIFO remains available so existing VM functionality
         * does not suddenly stop working.
         */
        if (
            policy ===
            "fifo"
        ) {
            return this.selectFIFOVictimFallback(
                residentPages
            );
        }


        throw new Error(
            `PageReplacementManager is not connected. Cannot use '${policy}' for runtime virtual-memory eviction.`
        );
    }


    getResidentPages() {
        const residentPages =
            [];


        for (
            const process
            of this.processes.values()
        ) {

            for (
                const page
                of process.pages.values()
            ) {

                if (
                    !page.resident
                ) {
                    continue;
                }


                /*
                 * PageReplacementManager expects the
                 * process ID to be present on the page
                 * object when used by VM globally.
                 */
                residentPages.push(
                    {
                        ...page,

                        pid:
                            process.pid
                    }
                );
            }
        }


        return residentPages;
    }


    selectFIFOVictimFallback(
        residentPages
    ) {
        let victim =
            null;


        for (
            const page
            of residentPages
        ) {

            if (
                !victim
            ) {
                victim =
                    page;

                continue;
            }


            const currentLoad =
                Number(
                    page.loadOrder
                );


            const victimLoad =
                Number(
                    victim.loadOrder
                );


            if (
                Number.isFinite(
                    currentLoad
                ) &&
                (
                    !Number.isFinite(
                        victimLoad
                    ) ||
                    currentLoad <
                    victimLoad
                )
            ) {
                victim =
                    page;

                continue;
            }


            if (
                currentLoad ===
                victimLoad
            ) {

                if (
                    page.pageNumber <
                    victim.pageNumber
                ) {
                    victim =
                        page;
                }
            }
        }


        return victim;
    }


    /*
     * =========================================================
     * TRANSLATE RESIDENT PAGE
     * =========================================================
     */

    translateResidentPage(
        pid,
        pageNumber,
        offset
    ) {
        const process =
            this.getInternalProcessOrThrow(
                pid
            );


        const page =
            process.pages.get(
                pageNumber
            );


        if (
            !page ||
            !page.resident
        ) {
            return {
                success:
                    false,

                physicalAddress:
                    null
            };
        }


        const logicalAddress =
            pageNumber *
            process.pageSize +
            offset;


        /*
         * Delegate physical translation to the
         * existing paging subsystem.
         */
        const result =
            this.pagingManager.translateAddress(
                pid,
                logicalAddress
            );


        return {
            ...result,

            success:
                result?.success !== false,

            physicalAddress:
                result?.physicalAddress ??
                null
        };
    }


    /*
     * =========================================================
     * REFERENCE PAGE
     * =========================================================
     */

    referencePage(
        pid,
        pageNumber,
        {
            write =
                false
        } = {}
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        this.validatePageNumber(
            pageNumber
        );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        const page =
            process.pages.get(
                pageNumber
            );


        if (!page) {
            throw new Error(
                `Virtual page ${pageNumber} does not exist.`
            );
        }


        if (
            !page.resident
        ) {
            return this.access(
                normalizedPid,
                pageNumber *
                process.pageSize,
                {
                    write
                }
            );
        }


        this.markPageReferenced(
            page,
            write
        );


        this.referencePagingPage(
            normalizedPid,
            pageNumber,
            write
        );


        return {
            success:
                true,

            pageFault:
                false,

            pageHit:
                true,

            pid:
                normalizedPid,

            pageNumber,

            frameNumber:
                page.frameNumber,

            referenced:
                true,

            referenceBit:
                page.referenceBit,

            modified:
                page.modified,

            lastReference:
                page.lastReference
        };
    }


    /*
     * =========================================================
     * MODIFY PAGE
     * =========================================================
     */

    modifyPage(
        pid,
        pageNumber
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        this.validatePageNumber(
            pageNumber
        );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        const page =
            process.pages.get(
                pageNumber
            );


        if (!page) {
            throw new Error(
                `Virtual page ${pageNumber} does not exist.`
            );
        }


        if (
            !page.resident
        ) {
            return this.access(
                normalizedPid,
                pageNumber *
                process.pageSize,
                {
                    write:
                        true
                }
            );
        }


        page.modified =
            true;


        this.markPageReferenced(
            page,
            true
        );


        this.referencePagingPage(
            normalizedPid,
            pageNumber,
            true
        );


        return {
            success:
                true,

            pid:
                normalizedPid,

            pageNumber,

            frameNumber:
                page.frameNumber,

            referenced:
                true,

            referenceBit:
                page.referenceBit,

            modified:
                true,

            lastReference:
                page.lastReference
        };
    }


    /*
     * =========================================================
     * PAGE REFERENCE METADATA
     * =========================================================
     */

    markPageReferenced(
        page,
        write = false
    ) {
        page.referenced =
            true;


        page.referenceBit =
            1;


        page.referenceCount +=
            1;


        page.lastReference =
            this.referenceSequence++;


        page.lastReferencedAt =
            new Date().toISOString();


        if (write) {
            page.modified =
                true;
        }


        return page;
    }


    referencePagingPage(
        pid,
        pageNumber,
        write = false
    ) {
        try {

            if (
                typeof this.pagingManager.referencePage ===
                "function"
            ) {
                this.pagingManager.referencePage(
                    pid,
                    pageNumber
                );
            }


            if (
                write &&
                typeof this.pagingManager.modifyPage ===
                "function"
            ) {
                this.pagingManager.modifyPage(
                    pid,
                    pageNumber
                );
            }

        } catch {
            /*
             * Paging metadata synchronization is optional.
             *
             * VirtualMemoryManager remains authoritative for
             * its own replacement metadata.
             */
        }
    }


    /*
     * =========================================================
     * PHYSICAL MEMORY PRESSURE
     * =========================================================
     */

    hasPhysicalMemoryPressure() {
        const freeFrames =
            this.pagingManager.getFreeFrames();


        /*
         * Actual hardware/simulated-memory pressure.
         */
        const physicalPressure =
            Array.isArray(
                freeFrames
            ) &&
            freeFrames.length ===
            0;


        /*
         * VM-level configured pressure.
         */
        const frameLimitPressure =
            this.hasFrameLimitPressure();


        return (
            physicalPressure ||
            frameLimitPressure
        );
    }


    /*
     * =========================================================
     * PAGE TABLE VIEW
     * =========================================================
     */

    getPageTable(
        pid
    ) {
        const normalizedPid =
            this.normalizePid(
                pid
            );


        const process =
            this.getInternalProcessOrThrow(
                normalizedPid
            );


        return Array.from(
            process.pages.values()
        ).map(
            (page) => ({
                pageNumber:
                    page.pageNumber,

                present:
                    page.resident,

                resident:
                    page.resident,

                frameNumber:
                    page.frameNumber,

                swapSlot:
                    page.swapSlot,

                referenced:
                    page.referenced,

                referenceBit:
                    page.referenceBit,

                modified:
                    page.modified,

                referenceCount:
                    page.referenceCount,

                loadOrder:
                    page.loadOrder,

                lastReference:
                    page.lastReference,

                loadedAt:
                    page.loadedAt,

                lastReferencedAt:
                    page.lastReferencedAt,

                evictedAt:
                    page.evictedAt
            })
        );
    }


    /*
     * =========================================================
     * MEMORY MAP
     * =========================================================
     */

    getMemoryMap() {
        const map =
            [];


        for (
            const process
            of this.processes.values()
        ) {

            for (
                const page
                of process.pages.values()
            ) {

                if (
                    !page.resident
                ) {
                    continue;
                }


                map.push({
                    pid:
                        process.pid,

                    pageNumber:
                        page.pageNumber,

                    frameNumber:
                        page.frameNumber,

                    logicalStart:
                        page.pageNumber *
                        process.pageSize,

                    logicalEnd:
                        (
                            page.pageNumber +
                            1
                        ) *
                        process.pageSize -
                        1,

                    physicalStart:
                        page.frameNumber *
                        process.pageSize,

                    physicalEnd:
                        (
                            page.frameNumber +
                            1
                        ) *
                        process.pageSize -
                        1,

                    referenced:
                        page.referenced,

                    referenceBit:
                        page.referenceBit,

                    modified:
                        page.modified,

                    loadOrder:
                        page.loadOrder,

                    lastReference:
                        page.lastReference
                });
            }
        }


        return map.sort(
            (a, b) =>
                a.frameNumber -
                b.frameNumber
        );
    }


    /*
     * =========================================================
     * STATISTICS
     * =========================================================
     */

    getStatistics() {
        let virtualMemorySize =
            0;


        let residentPages =
            0;


        let nonResidentPages =
            0;


        let modifiedPages =
            0;


        for (
            const process
            of this.processes.values()
        ) {

            virtualMemorySize +=
                process.virtualMemorySize;


            for (
                const page
                of process.pages.values()
            ) {

                if (
                    page.resident
                ) {
                    residentPages +=
                        1;
                } else {
                    nonResidentPages +=
                        1;
                }


                if (
                    page.modified
                ) {
                    modifiedPages +=
                        1;
                }
            }
        }


        const accesses =
            this.statistics.accesses;


        const pageHits =
            this.statistics.pageHits;


        const pageFaults =
            this.statistics.pageFaults;


        const hitRatio =
            accesses > 0
                ? pageHits /
                accesses
                : 0;


        const faultRatio =
            accesses > 0
                ? pageFaults /
                accesses
                : 0;


        let physicalMemorySize =
            0;


        let freeFrames =
            [];


        let usedFrames =
            [];


        try {

            physicalMemorySize =
                this.pagingManager
                    .physicalMemorySize ??
                0;


            freeFrames =
                this.pagingManager
                    .getFreeFrames() ??
                [];


            usedFrames =
                this.pagingManager
                    .getUsedFrames() ??
                [];

        } catch {
            /*
             * Keep statistics available even when optional
             * paging helpers are unavailable.
             */
        }


        const actualFrameCount =
            this.getActualPhysicalFrameCount();


        const currentResidentFrames =
            residentPages;


        const availableVMFrames =
            this.getAvailableVMFrames();


        const frameLimitPressure =
            this.hasFrameLimitPressure();


        const replacementManager =
            this.pageReplacementManager;


        let replacementAlgorithms =
            [];


        let replacementDefault =
            this.defaultEvictionPolicy;


        if (
            replacementManager
        ) {

            try {

                if (
                    typeof replacementManager
                        .getSupportedAlgorithms ===
                    "function"
                ) {
                    replacementAlgorithms =
                        replacementManager
                            .getSupportedAlgorithms();
                }


                if (
                    typeof replacementManager
                        .getDefaultAlgorithm ===
                    "function"
                ) {
                    replacementDefault =
                        replacementManager
                            .getDefaultAlgorithm();
                }

            } catch {
                /*
                 * Keep VM statistics functional.
                 */
            }
        }


        return {
            physicalMemorySize,

            actualPhysicalFrameCount:
                actualFrameCount,

            physicalFrameLimit:
                this.physicalFrameLimit,

            availableVMFrames,

            frameLimitPressure,

            currentResidentFrames,

            virtualMemorySize,

            processCount:
                this.processes.size,

            residentPages,

            nonResidentPages,

            modifiedPages,

            freeFrames:
                Array.isArray(
                    freeFrames
                )
                    ? freeFrames.length
                    : 0,

            usedFrames:
                Array.isArray(
                    usedFrames
                )
                    ? usedFrames.length
                    : 0,

            accesses,

            pageHits,

            pageFaults,

            hitRatio,

            faultRatio,

            pagesLoaded:
                this.statistics
                    .pagesLoaded,

            pagesEvicted:
                this.statistics
                    .pagesEvicted,

            replacements:
                this.statistics
                    .replacements,

            swapIns:
                this.statistics
                    .swapIns,

            swapOuts:
                this.statistics
                    .swapOuts,

            translations:
                this.statistics
                    .translations,

            successfulTranslations:
                this.statistics
                    .successfulTranslations,

            memoryPressureEvents:
                this.statistics
                    .memoryPressureEvents,

            processesCreated:
                this.statistics
                    .processesCreated,

            processesRemoved:
                this.statistics
                    .processesRemoved,

            evictionPolicy:
                replacementDefault,

            replacementAlgorithms
        };
    }


    /*
     * =========================================================
     * SNAPSHOT
     * =========================================================
     */

    getSnapshot() {
        return {
            statistics:
                this.getStatistics(),

            processes:
                this.getProcesses(),

            memoryMap:
                this.getMemoryMap()
        };
    }


    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    reset() {
        /*
         * Remove virtual-memory processes first so that
         * resident pages are released from PagingManager.
         */
        for (
            const process
            of Array.from(
                this.processes.values()
            )
        ) {

            this.removeProcess(
                process.pid
            );
        }


        this.statistics = {
            accesses:
                0,

            pageHits:
                0,

            pageFaults:
                0,

            pagesLoaded:
                0,

            pagesEvicted:
                0,

            swapIns:
                0,

            swapOuts:
                0,

            translations:
                0,

            successfulTranslations:
                0,

            memoryPressureEvents:
                0,

            replacements:
                0,

            processesCreated:
                0,

            processesRemoved:
                0
        };


        this.loadSequence =
            0;


        this.referenceSequence =
            0;


        this.events =
            new EventEmitter();


        return this.getSnapshot();
    }


    /*
     * =========================================================
     * EVENT API
     * =========================================================
     */

    on(
        event,
        listener
    ) {
        return this.events.on(
            event,
            listener
        );
    }


    once(
        event,
        listener
    ) {
        return this.events.once(
            event,
            listener
        );
    }


    off(
        event,
        listener
    ) {
        return this.events.off(
            event,
            listener
        );
    }


    emit(
        event,
        data
    ) {
        this.events.emit(
            event,
            data
        );
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
            this.processes.get(
                pid
            );


        if (!process) {
            throw new Error(
                `Virtual memory address space for process '${pid}' does not exist.`
            );
        }


        return process;
    }


    releasePagingPage(
        pid,
        pageNumber
    ) {
        try {

            return this.pagingManager.releasePage(
                pid,
                pageNumber
            );

        } catch (error) {

            /*
             * If the paging layer already removed the page,
             * don't hide the original virtual-memory state.
             */
            if (
                !String(
                    error?.message ??
                    ""
                )
                    .toLowerCase()
                    .includes(
                        "not found"
                    )
            ) {
                throw error;
            }


            return null;
        }
    }


    extractFrameNumber(
        result
    ) {
        if (
            Number.isInteger(
                result
            )
        ) {
            return result;
        }


        if (
            result &&
            Number.isInteger(
                result.frameNumber
            )
        ) {
            return result.frameNumber;
        }


        if (
            result &&
            Number.isInteger(
                result.frame
            )
        ) {
            return result.frame;
        }


        if (
            result &&
            result.page &&
            Number.isInteger(
                result.page.frameNumber
            )
        ) {
            return result.page.frameNumber;
        }


        return null;
    }


    clonePage(
        page
    ) {
        return {
            ...page
        };
    }


    cloneProcess(
        process
    ) {
        return {
            pid:
                process.pid,

            virtualMemorySize:
                process.virtualMemorySize,

            pageSize:
                process.pageSize,

            pageCount:
                process.pageCount,

            residentPageCount:
                Array.from(
                    process.pages.values()
                ).filter(
                    (page) =>
                        page.resident
                ).length,

            nonResidentPageCount:
                Array.from(
                    process.pages.values()
                ).filter(
                    (page) =>
                        !page.resident
                ).length,

            accesses:
                process.accesses,

            pageHits:
                process.pageHits,

            pageFaults:
                process.pageFaults,

            pagesLoaded:
                process.pagesLoaded,

            pagesEvicted:
                process.pagesEvicted,

            residentQueue:
                [
                    ...process.residentQueue
                ],

            referenceString:
                [
                    ...process.referenceString
                ],

            referenceIndex:
                process.referenceIndex,

            pages:
                Array.from(
                    process.pages.values()
                ).map(
                    (page) =>
                        this.clonePage(
                            page
                        )
                )
        };
    }
}


export default VirtualMemoryManager;