/*
 * =========================================================
 * NOVAOS — PAGING MANAGER
 * =========================================================
 *
 * Educational simulation of a paged memory-management system.
 *
 * Responsibilities:
 * - Maintain physical frames
 * - Maintain per-process page tables
 * - Map virtual pages to physical frames
 * - Translate logical/virtual addresses
 * - Generate and track page faults
 * - Allocate and release pages
 * - Simulate page-in/page-out
 * - Track paging statistics
 *
 * This subsystem is intentionally independent from the existing
 * contiguous MemoryManager. It models paging as its own OS concept.
 * =========================================================
 */

export class PagingManager {
    constructor({
        physicalMemorySize = 1024,
        pageSize = 64
    } = {}) {
        if (
            !Number.isInteger(physicalMemorySize) ||
            physicalMemorySize <= 0
        ) {
            throw new Error(
                "physicalMemorySize must be a positive integer."
            );
        }

        if (
            !Number.isInteger(pageSize) ||
            pageSize <= 0
        ) {
            throw new Error(
                "pageSize must be a positive integer."
            );
        }

        if (
            physicalMemorySize % pageSize !==
            0
        ) {
            throw new Error(
                "physicalMemorySize must be divisible by pageSize."
            );
        }

        this.physicalMemorySize =
            physicalMemorySize;

        this.pageSize =
            pageSize;

        this.frameCount =
            physicalMemorySize /
            pageSize;

        /*
         * Physical frames.
         *
         * A frame contains:
         * - frameNumber
         * - allocated
         * - pid
         * - pageNumber
         * - loadedAt
         */

        this.frames =
            new Array(
                this.frameCount
            )
                .fill(null)
                .map(
                    (_, frameNumber) => ({
                        frameNumber,
                        allocated: false,
                        pid: null,
                        pageNumber: null,
                        loadedAt: null
                    })
                );

        /*
         * Page tables.
         *
         * Map:
         *
         * pid -> Map(pageNumber -> pageEntry)
         */

        this.pageTables =
            new Map();

        /*
         * Per-process virtual memory configuration.
         *
         * pid -> process paging information
         */

        this.processes =
            new Map();

        /*
         * FIFO-style page replacement tracking.
         *
         * Entries are:
         * {
         *     pid,
         *     pageNumber,
         *     loadedAt
         * }
         */

        this.pageQueue =
            [];

        /*
         * Statistics.
         */

        this.statistics = {
            pageFaults: 0,
            pageHits: 0,
            translations: 0,
            pagesLoaded: 0,
            pagesUnloaded: 0,
            allocations: 0,
            releases: 0
        };
    }

    /*
     * =========================================================
     * PROCESS / ADDRESS-SPACE MANAGEMENT
     * =========================================================
     */

    createProcess(
        pid,
        virtualMemorySize
    ) {
        this.validatePid(pid);

        if (
            !Number.isInteger(
                virtualMemorySize
            ) ||
            virtualMemorySize <= 0
        ) {
            throw new Error(
                "virtualMemorySize must be a positive integer."
            );
        }

        if (
            virtualMemorySize %
            this.pageSize !==
            0
        ) {
            throw new Error(
                "virtualMemorySize must be divisible by pageSize."
            );
        }

        if (
            this.processes.has(pid)
        ) {
            throw new Error(
                `Paging address space for PID ${pid} already exists.`
            );
        }

        const pageCount =
            virtualMemorySize /
            this.pageSize;

        const pageTable =
            new Map();

        for (
            let pageNumber = 0;
            pageNumber < pageCount;
            pageNumber++
        ) {
            pageTable.set(
                pageNumber,
                {
                    pageNumber,
                    frameNumber: null,
                    present: false,
                    referenced: false,
                    modified: false,
                    loadedAt: null
                }
            );
        }

        this.pageTables.set(
            pid,
            pageTable
        );

        this.processes.set(
            pid,
            {
                pid,
                virtualMemorySize,
                pageCount,
                createdAt: new Date()
            }
        );

        return this.getProcess(
            pid
        );
    }

    removeProcess(
        pid
    ) {
        this.validatePid(pid);

        if (
            !this.processes.has(pid)
        ) {
            throw new Error(
                `Paging address space for PID ${pid} does not exist.`
            );
        }

        this.releaseProcessPages(
            pid
        );

        this.pageTables.delete(
            pid
        );

        this.processes.delete(
            pid
        );

        return true;
    }

    getProcess(
        pid
    ) {
        this.validatePid(pid);

        const process =
            this.processes.get(
                pid
            );

        if (!process) {
            return null;
        }

        return {
            ...process,
            allocatedPages:
                this.getAllocatedPages(
                    pid
                ).length
        };
    }

    listProcesses() {
        return Array.from(
            this.processes.values()
        ).map(
            (process) =>
                this.getProcess(
                    process.pid
                )
        );
    }

    /*
     * =========================================================
     * PAGE ALLOCATION
     * =========================================================
     */

    allocatePage(
        pid,
        pageNumber
    ) {
        this.validatePid(pid);

        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        if (
            page.present
        ) {
            return {
                success: true,
                alreadyAllocated: true,
                page:
                    this.clonePage(
                        page
                    )
            };
        }

        const frame =
            this.findFreeFrame();

        if (!frame) {
            throw new Error(
                "No free physical frame is available."
            );
        }

        this.mapPageToFrame(
            pid,
            pageNumber,
            frame.frameNumber
        );

        this.statistics.allocations++;

        return {
            success: true,
            alreadyAllocated: false,
            page:
                this.clonePage(
                    this.getPageEntry(
                        pid,
                        pageNumber
                    )
                )
        };
    }

    allocatePages(
        pid,
        count
    ) {
        this.validatePid(pid);

        if (
            !Number.isInteger(count) ||
            count <= 0
        ) {
            throw new Error(
                "count must be a positive integer."
            );
        }

        const process =
            this.processes.get(
                pid
            );

        if (!process) {
            throw new Error(
                `Paging address space for PID ${pid} does not exist.`
            );
        }

        const results = [];

        for (
            let pageNumber = 0;
            pageNumber < process.pageCount &&
            results.length < count;
            pageNumber++
        ) {
            const page =
                this.getPageEntry(
                    pid,
                    pageNumber
                );

            if (
                !page.present
            ) {
                results.push(
                    this.allocatePage(
                        pid,
                        pageNumber
                    )
                );
            }
        }

        return {
            requested: count,
            allocated: results.length,
            results
        };
    }

    releasePage(
        pid,
        pageNumber
    ) {
        this.validatePid(pid);

        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        if (
            !page.present
        ) {
            return {
                success: true,
                released: false
            };
        }

        const frameNumber =
            page.frameNumber;

        this.unmapPage(
            pid,
            pageNumber
        );

        this.statistics.releases++;

        return {
            success: true,
            released: true,
            frameNumber
        };
    }

    releaseProcessPages(
        pid
    ) {
        this.validatePid(pid);

        const pageTable =
            this.pageTables.get(
                pid
            );

        if (!pageTable) {
            return 0;
        }

        let released = 0;

        for (
            const page
            of pageTable.values()
        ) {
            if (
                page.present
            ) {
                this.unmapPage(
                    pid,
                    page.pageNumber
                );

                released++;
            }
        }

        return released;
    }

    /*
     * =========================================================
     * ADDRESS TRANSLATION
     * =========================================================
     *
     * Logical address:
     *
     *     +-------------------+----------+
     *     |   Page Number     | Offset   |
     *     +-------------------+----------+
     *
     * pageNumber =
     * floor(logicalAddress / pageSize)
     *
     * offset =
     * logicalAddress % pageSize
     *
     * Physical address:
     *
     *     frameNumber * pageSize + offset
     */

    translateAddress(
        pid,
        logicalAddress
    ) {
        this.validatePid(pid);

        if (
            !Number.isInteger(
                logicalAddress
            ) ||
            logicalAddress < 0
        ) {
            throw new Error(
                "logicalAddress must be a non-negative integer."
            );
        }

        const process =
            this.processes.get(
                pid
            );

        if (!process) {
            throw new Error(
                `Paging address space for PID ${pid} does not exist.`
            );
        }

        if (
            logicalAddress >=
            process.virtualMemorySize
        ) {
            throw new Error(
                `Logical address ${logicalAddress} is outside the process virtual address space.`
            );
        }

        const pageNumber =
            Math.floor(
                logicalAddress /
                this.pageSize
            );

        const offset =
            logicalAddress %
            this.pageSize;

        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        this.statistics.translations++;

        /*
         * Page hit.
         */

        if (
            page.present
        ) {
            page.referenced = true;

            this.statistics.pageHits++;

            return {
                success: true,
                pageFault: false,
                pid,
                logicalAddress,
                pageNumber,
                offset,
                frameNumber:
                    page.frameNumber,
                physicalAddress:
                    page.frameNumber *
                    this.pageSize +
                    offset
            };
        }

        /*
         * Page fault.
         *
         * The page is not resident.
         */

        this.statistics.pageFaults++;

        const loaded =
            this.handlePageFault(
                pid,
                pageNumber
            );

        return {
            success: true,
            pageFault: true,
            pid,
            logicalAddress,
            pageNumber,
            offset,
            frameNumber:
                loaded.frameNumber,
            physicalAddress:
                loaded.frameNumber *
                this.pageSize +
                offset
        };
    }

    /*
     * =========================================================
     * PAGE FAULT HANDLING
     * =========================================================
     */

    handlePageFault(
        pid,
        pageNumber
    ) {
        this.validatePid(pid);

        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        if (
            page.present
        ) {
            return {
                frameNumber:
                    page.frameNumber,
                replaced: false
            };
        }

        let frame =
            this.findFreeFrame();

        let replaced = null;

        /*
         * No free frame:
         * perform FIFO page replacement.
         */

        if (!frame) {
            replaced =
                this.selectReplacementPage();

            if (!replaced) {
                throw new Error(
                    "Unable to select a page for replacement."
                );
            }

            frame =
                this.frames[
                replaced.frameNumber
                ];

            this.unmapPage(
                replaced.pid,
                replaced.pageNumber
            );

            this.statistics.pagesUnloaded++;
        }

        this.mapPageToFrame(
            pid,
            pageNumber,
            frame.frameNumber
        );

        this.statistics.pagesLoaded++;

        return {
            frameNumber:
                frame.frameNumber,
            replaced
        };
    }

    /*
     * =========================================================
     * PAGE TABLE ACCESS
     * =========================================================
     */

    getPageTable(
        pid
    ) {
        this.validatePid(pid);

        const pageTable =
            this.pageTables.get(
                pid
            );

        if (!pageTable) {
            throw new Error(
                `Paging address space for PID ${pid} does not exist.`
            );
        }

        return Array.from(
            pageTable.values()
        ).map(
            (page) =>
                this.clonePage(
                    page
                )
        );
    }

    getPage(
        pid,
        pageNumber
    ) {
        return this.clonePage(
            this.getPageEntry(
                pid,
                pageNumber
            )
        );
    }

    getAllocatedPages(
        pid
    ) {
        this.validatePid(pid);

        const pageTable =
            this.pageTables.get(
                pid
            );

        if (!pageTable) {
            return [];
        }

        return Array.from(
            pageTable.values()
        )
            .filter(
                (page) =>
                    page.present
            )
            .map(
                (page) =>
                    this.clonePage(
                        page
                    )
            );
    }

    /*
     * =========================================================
     * PHYSICAL FRAME ACCESS
     * =========================================================
     */

    getFrames() {
        return this.frames.map(
            (frame) => ({
                ...frame
            })
        );
    }

    getFrame(
        frameNumber
    ) {
        if (
            !Number.isInteger(
                frameNumber
            ) ||
            frameNumber < 0 ||
            frameNumber >=
            this.frameCount
        ) {
            throw new Error(
                `Invalid frame number: ${frameNumber}`
            );
        }

        return {
            ...this.frames[
            frameNumber
            ]
        };
    }

    getFreeFrames() {
        return this.frames
            .filter(
                (frame) =>
                    !frame.allocated
            )
            .map(
                (frame) =>
                    frame.frameNumber
            );
    }

    getUsedFrames() {
        return this.frames
            .filter(
                (frame) =>
                    frame.allocated
            )
            .map(
                (frame) => ({
                    ...frame
                })
            );
    }

    /*
     * =========================================================
     * PAGE REFERENCE / MODIFICATION
     * =========================================================
     */

    referencePage(
        pid,
        pageNumber
    ) {
        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        page.referenced = true;

        return this.clonePage(
            page
        );
    }

    modifyPage(
        pid,
        pageNumber
    ) {
        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        if (
            !page.present
        ) {
            this.handlePageFault(
                pid,
                pageNumber
            );
        }

        page.modified = true;
        page.referenced = true;

        return this.clonePage(
            page
        );
    }

    /*
     * =========================================================
     * STATISTICS
     * =========================================================
     */

    getStatistics() {
        const usedFrames =
            this.frames.filter(
                (frame) =>
                    frame.allocated
            ).length;

        const freeFrames =
            this.frameCount -
            usedFrames;

        const totalPages =
            Array.from(
                this.processes.values()
            ).reduce(
                (
                    total,
                    process
                ) =>
                    total +
                    process.pageCount,
                0
            );

        const residentPages =
            Array.from(
                this.pageTables.values()
            ).reduce(
                (
                    total,
                    pageTable
                ) =>
                    total +
                    Array.from(
                        pageTable.values()
                    ).filter(
                        (page) =>
                            page.present
                    ).length,
                0
            );

        const pageFaultRate =
            this.statistics.translations >
                0
                ? this.statistics.pageFaults /
                this.statistics.translations
                : 0;

        return {
            physicalMemorySize:
                this.physicalMemorySize,

            pageSize:
                this.pageSize,

            frameCount:
                this.frameCount,

            usedFrames,

            freeFrames,

            totalPages,

            residentPages,

            processCount:
                this.processes.size,

            pageFaults:
                this.statistics.pageFaults,

            pageHits:
                this.statistics.pageHits,

            translations:
                this.statistics.translations,

            pagesLoaded:
                this.statistics.pagesLoaded,

            pagesUnloaded:
                this.statistics.pagesUnloaded,

            allocations:
                this.statistics.allocations,

            releases:
                this.statistics.releases,

            pageFaultRate,

            utilization:
                this.frameCount > 0
                    ? usedFrames /
                    this.frameCount
                    : 0
        };
    }

    /*
     * =========================================================
     * SNAPSHOT
     * =========================================================
     */

    getSnapshot() {
        return {
            configuration: {
                physicalMemorySize:
                    this.physicalMemorySize,

                pageSize:
                    this.pageSize,

                frameCount:
                    this.frameCount
            },

            statistics:
                this.getStatistics(),

            frames:
                this.getFrames(),

            processes:
                this.listProcesses(),

            pageTables:
                Array.from(
                    this.pageTables.entries()
                ).map(
                    (
                        [pid, pageTable]
                    ) => ({
                        pid,
                        pages:
                            Array.from(
                                pageTable.values()
                            ).map(
                                (page) =>
                                    this.clonePage(
                                        page
                                    )
                            )
                    })
                ),

            replacementQueue:
                this.pageQueue.map(
                    (entry) => ({
                        ...entry
                    })
                )
        };
    }

    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    reset() {
        this.frames =
            new Array(
                this.frameCount
            )
                .fill(null)
                .map(
                    (_, frameNumber) => ({
                        frameNumber,
                        allocated: false,
                        pid: null,
                        pageNumber: null,
                        loadedAt: null
                    })
                );

        this.pageTables.clear();

        this.processes.clear();

        this.pageQueue = [];

        this.statistics = {
            pageFaults: 0,
            pageHits: 0,
            translations: 0,
            pagesLoaded: 0,
            pagesUnloaded: 0,
            allocations: 0,
            releases: 0
        };
    }

    /*
     * =========================================================
     * INTERNAL — FRAME MANAGEMENT
     * =========================================================
     */

    findFreeFrame() {
        return this.frames.find(
            (frame) =>
                !frame.allocated
        ) || null;
    }

    mapPageToFrame(
        pid,
        pageNumber,
        frameNumber
    ) {
        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        const frame =
            this.frames[
            frameNumber
            ];

        if (!frame) {
            throw new Error(
                `Invalid frame number: ${frameNumber}`
            );
        }

        if (
            frame.allocated
        ) {
            throw new Error(
                `Frame ${frameNumber} is already allocated.`
            );
        }

        const loadedAt =
            new Date();

        page.frameNumber =
            frameNumber;

        page.present =
            true;

        page.referenced =
            false;

        page.modified =
            false;

        page.loadedAt =
            loadedAt;

        frame.allocated =
            true;

        frame.pid =
            pid;

        frame.pageNumber =
            pageNumber;

        frame.loadedAt =
            loadedAt;

        /*
         * Add to FIFO replacement queue.
         */

        this.pageQueue.push({
            pid,
            pageNumber,
            frameNumber,
            loadedAt
        });

        return frame;
    }

    unmapPage(
        pid,
        pageNumber
    ) {
        const page =
            this.getPageEntry(
                pid,
                pageNumber
            );

        if (
            !page.present
        ) {
            return false;
        }

        const frameNumber =
            page.frameNumber;

        const frame =
            this.frames[
            frameNumber
            ];

        if (frame) {
            frame.allocated =
                false;

            frame.pid =
                null;

            frame.pageNumber =
                null;

            frame.loadedAt =
                null;
        }

        page.frameNumber =
            null;

        page.present =
            false;

        page.referenced =
            false;

        page.modified =
            false;

        page.loadedAt =
            null;

        this.pageQueue =
            this.pageQueue.filter(
                (entry) =>
                    !(
                        entry.pid === pid &&
                        entry.pageNumber ===
                        pageNumber
                    )
            );

        return true;
    }

    selectReplacementPage() {
        /*
         * FIFO:
         * the oldest currently resident page
         * is selected for replacement.
         */

        if (
            this.pageQueue.length === 0
        ) {
            return null;
        }

        const entry =
            this.pageQueue[0];

        return {
            ...entry
        };
    }

    /*
     * =========================================================
     * INTERNAL — VALIDATION
     * =========================================================
     */

    validatePid(
        pid
    ) {
        if (
            pid === null ||
            pid === undefined ||
            pid === ""
        ) {
            throw new Error(
                "A valid process ID is required."
            );
        }
    }

    getPageEntry(
        pid,
        pageNumber
    ) {
        this.validatePid(pid);

        if (
            !Number.isInteger(
                pageNumber
            ) ||
            pageNumber < 0
        ) {
            throw new Error(
                "pageNumber must be a non-negative integer."
            );
        }

        const pageTable =
            this.pageTables.get(
                pid
            );

        if (!pageTable) {
            throw new Error(
                `Paging address space for PID ${pid} does not exist.`
            );
        }

        const page =
            pageTable.get(
                pageNumber
            );

        if (!page) {
            throw new Error(
                `Page ${pageNumber} does not exist for PID ${pid}.`
            );
        }

        return page;
    }

    clonePage(
        page
    ) {
        return {
            ...page
        };
    }
}