import express from "express";

const router = express.Router();


/*
 * =========================================================
 * KERNEL / VIRTUAL MEMORY ACCESS
 * =========================================================
 */

function getKernel(req) {
    const kernel =
        req.app.locals.kernel;

    if (!kernel) {
        throw new Error(
            "NovaOS kernel is not available."
        );
    }

    return kernel;
}


/*
 * =========================================================
 * PROCESS MANAGER
 * =========================================================
 */

function getProcessManager(req) {
    const kernel =
        getKernel(req);

    if (
        typeof kernel.getProcessManager !==
        "function"
    ) {
        throw new Error(
            "Process Manager is not available from the kernel."
        );
    }

    return kernel.getProcessManager();
}


/*
 * =========================================================
 * VIRTUAL MEMORY MANAGER
 * =========================================================
 */

function getVirtualMemoryManager(req) {
    const kernel =
        getKernel(req);

    if (
        typeof kernel.getVirtualMemoryManager !==
        "function"
    ) {
        throw new Error(
            "Virtual Memory Manager is not registered with the kernel."
        );
    }

    return kernel.getVirtualMemoryManager();
}


/*
 * =========================================================
 * SYNCHRONIZE VIRTUAL MEMORY PROCESSES
 * =========================================================
 */

function syncVirtualMemoryProcesses(req) {
    const kernel =
        getKernel(req);

    const virtualMemoryManager =
        getVirtualMemoryManager(req);

    const pagingManager =
        kernel.getPagingManager();

    const processManager =
        getProcessManager(req);

    const processes =
        processManager.getAllProcesses();

    const expectedProcesses =
        new Map();


    /*
     * ---------------------------------------------------------
     * Determine expected virtual-memory processes
     * ---------------------------------------------------------
     */

    for (
        const process
        of processes
    ) {
        if (
            !process ||
            process.state ===
            "terminated"
        ) {
            continue;
        }

        const memoryLimit =
            Number(
                process.memoryLimit
            );

        if (
            !Number.isFinite(
                memoryLimit
            ) ||
            memoryLimit <= 0
        ) {
            continue;
        }

        const pid =
            String(
                process.pid
            );

        let virtualMemorySize =
            null;


        const pagingProcess =
            pagingManager.getProcess(
                pid
            );

        if (
            pagingProcess &&
            Number.isFinite(
                Number(
                    pagingProcess.virtualMemorySize
                )
            )
        ) {
            virtualMemorySize =
                Number(
                    pagingProcess.virtualMemorySize
                );
        } else {
            const pageSize =
                pagingManager.pageSize;

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

            virtualMemorySize =
                Math.ceil(
                    memoryLimit /
                    pageSize
                ) *
                pageSize;
        }


        expectedProcesses.set(
            pid,
            {
                pid,
                virtualMemorySize,
                memoryLimit
            }
        );
    }


    /*
     * ---------------------------------------------------------
     * Create missing virtual-memory address spaces
     * ---------------------------------------------------------
     */

    for (
        const {
            pid,
            virtualMemorySize
        }
        of expectedProcesses.values()
    ) {
        const existing =
            virtualMemoryManager.getProcess(
                pid
            );

        if (!existing) {
            virtualMemoryManager.createProcess(
                pid,
                virtualMemorySize
            );
        }
    }


    /*
     * ---------------------------------------------------------
     * Remove stale virtual-memory processes
     * ---------------------------------------------------------
 */

    const virtualMemoryProcesses =
        virtualMemoryManager.getProcesses();

    for (
        const virtualProcess
        of virtualMemoryProcesses
    ) {
        const pid =
            String(
                virtualProcess.pid
            );

        if (
            !expectedProcesses.has(
                pid
            )
        ) {
            virtualMemoryManager.removeProcess(
                pid
            );
        }
    }


    return virtualMemoryManager;
}


/*
 * =========================================================
 * MANAGER ACCESS
 * =========================================================
 */

function getManager(req) {
    return syncVirtualMemoryProcesses(
        req
    );
}


/*
 * =========================================================
 * GET /
 * =========================================================
 */

router.get(
    "/",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            res.json({
                success: true,
                data:
                    manager.getSnapshot()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /statistics
 * =========================================================
 */

router.get(
    "/statistics",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            res.json({
                success: true,
                data:
                    manager.getStatistics()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /frame-limit
 * =========================================================
 *
 * Returns the current VM-level physical frame limit.
 *
 * Example:
 *
 * {
 *     physicalFrameLimit: 4,
 *     actualPhysicalFrameCount: 16,
 *     currentResidentFrames: 4,
 *     availableVMFrames: 0
 * }
 *
 * null means the VM can use all physical frames.
 */

router.get(
    "/frame-limit",
    (req, res) => {
        try {
            const manager =
                getVirtualMemoryManager(req);

            const statistics =
                manager.getStatistics();

            res.json({
                success: true,
                data: {
                    physicalFrameLimit:
                        manager.getPhysicalFrameLimit(),

                    actualPhysicalFrameCount:
                        statistics.actualPhysicalFrameCount,

                    currentResidentFrames:
                        statistics.currentResidentFrames,

                    availableVMFrames:
                        statistics.availableVMFrames,

                    frameLimitPressure:
                        statistics.frameLimitPressure
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /frame-limit
 * =========================================================
 *
 * Configure the VM-level physical frame limit.
 *
 * Body:
 *
 * {
 *     "physicalFrameLimit": 4
 * }
 *
 * To remove the artificial limit:
 *
 * {
 *     "physicalFrameLimit": null
 * }
 *
 * The underlying PagingManager physical memory is NOT
 * changed.
 */

router.post(
    "/frame-limit",
    (req, res) => {
        try {
            const manager =
                getVirtualMemoryManager(req);

            const value =
                req.body?.physicalFrameLimit;


            /*
             * Accept null explicitly to remove the limit.
             */
            const limit =
                value === null ||
                value === undefined ||
                value === ""
                    ? null
                    : Number(value);


            if (
                limit !== null &&
                (
                    !Number.isInteger(
                        limit
                    ) ||
                    limit <= 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "physicalFrameLimit must be a positive integer or null."
                });
            }


            const updatedLimit =
                manager.setPhysicalFrameLimit(
                    limit
                );


            const statistics =
                manager.getStatistics();


            res.json({
                success: true,
                data: {
                    physicalFrameLimit:
                        updatedLimit,

                    actualPhysicalFrameCount:
                        statistics.actualPhysicalFrameCount,

                    currentResidentFrames:
                        statistics.currentResidentFrames,

                    availableVMFrames:
                        statistics.availableVMFrames,

                    frameLimitPressure:
                        statistics.frameLimitPressure
                }
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /processes
 * =========================================================
 */

router.get(
    "/processes",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            res.json({
                success: true,
                data:
                    manager.getProcesses()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /processes/:pid
 * =========================================================
 */

router.get(
    "/processes/:pid",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.params.pid
                );

            const process =
                manager.getProcess(
                    pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Virtual memory information for process '${pid}' not found.`
                });
            }

            res.json({
                success: true,
                data:
                    process
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /processes
 * =========================================================
 */

router.post(
    "/processes",
    (req, res) => {
        try {
            const kernel =
                getKernel(req);

            const processManager =
                getProcessManager(req);

            const manager =
                getVirtualMemoryManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            if (!pid) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Process ID is required."
                });
            }

            const process =
                processManager.getProcess(
                    pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `NovaOS process '${pid}' not found.`
                });
            }

            if (
                process.state ===
                "terminated"
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        `NovaOS process '${pid}' is terminated.`
                });
            }

            const memoryLimit =
                Number(
                    process.memoryLimit
                );

            if (
                !Number.isFinite(
                    memoryLimit
                ) ||
                memoryLimit <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        `Process '${pid}' does not have a valid memory limit.`
                });
            }


            const pagingProcess =
                kernel.ensurePagingProcess(
                    process
                );

            const virtualMemorySize =
                pagingProcess?.virtualMemorySize ??
                Math.ceil(
                    memoryLimit /
                    manager.pagingManager.pageSize
                ) *
                manager.pagingManager.pageSize;


            const existing =
                manager.getProcess(
                    pid
                );

            const result =
                existing ??
                manager.createProcess(
                    pid,
                    virtualMemorySize
                );

            res.status(
                existing ? 200 : 201
            ).json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * DELETE /processes/:pid
 * =========================================================
 */

router.delete(
    "/processes/:pid",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.params.pid
                );

            const removed =
                manager.removeProcess(
                    pid
                );

            if (!removed) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Virtual memory process '${pid}' not found.`
                });
            }

            res.json({
                success: true,
                data: {
                    pid,
                    removed: true
                }
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /processes/:pid/pages
 * =========================================================
 */

router.get(
    "/processes/:pid/pages",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.params.pid
                );

            const process =
                manager.getProcess(
                    pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Virtual memory process '${pid}' not found.`
                });
            }

            res.json({
                success: true,
                data:
                    manager.getPageTable(
                        pid
                    )
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /processes/:pid/pages/:pageNumber
 * =========================================================
 */

router.get(
    "/processes/:pid/pages/:pageNumber",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.params.pid
                );

            const pageNumber =
                Number(
                    req.params.pageNumber
                );

            const process =
                manager.getProcess(
                    pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Virtual memory process '${pid}' not found.`
                });
            }

            if (
                !Number.isInteger(
                    pageNumber
                ) ||
                pageNumber < 0 ||
                pageNumber >=
                process.pageCount
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid virtual page number."
                });
            }

            const page =
                process.pages.find(
                    (item) =>
                        item.pageNumber ===
                        pageNumber
                );

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Virtual page ${pageNumber} not found.`
                });
            }

            res.json({
                success: true,
                data:
                    page
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /access
 * =========================================================
 */

router.post(
    "/access",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            const logicalAddress =
                Number(
                    req.body?.logicalAddress
                );

            const write =
                Boolean(
                    req.body?.write
                );

            const evictionPolicy =
                req.body?.evictionPolicy ??
                undefined;

            const referenceString =
                req.body?.referenceString ??
                undefined;

            const currentIndex =
                req.body?.currentIndex !==
                undefined
                    ? Number(
                        req.body.currentIndex
                    )
                    : undefined;

            if (!pid) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Process ID is required."
                });
            }

            if (
                !Number.isInteger(
                    logicalAddress
                ) ||
                logicalAddress < 0
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Logical address must be a non-negative integer."
                });
            }

            if (
                currentIndex !==
                    undefined &&
                (
                    !Number.isInteger(
                        currentIndex
                    ) ||
                    currentIndex < 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "currentIndex must be a non-negative integer when supplied."
                });
            }


            const result =
                manager.access(
                    pid,
                    logicalAddress,
                    {
                        write,
                        evictionPolicy,
                        referenceString,
                        currentIndex
                    }
                );

            res.json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /page-in
 * =========================================================
 */

router.post(
    "/page-in",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const result =
                manager.pageIn(
                    pid,
                    pageNumber
                );

            res.json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /page-out
 * =========================================================
 */

router.post(
    "/page-out",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const result =
                manager.evictPage(
                    pid,
                    pageNumber
                );

            res.json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /reference
 * =========================================================
 */

router.post(
    "/reference",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const write =
                Boolean(
                    req.body?.write
                );

            const result =
                manager.referencePage(
                    pid,
                    pageNumber,
                    {
                        write
                    }
                );

            res.json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /modify
 * =========================================================
 */

router.post(
    "/modify",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                );

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const result =
                manager.modifyPage(
                    pid,
                    pageNumber
                );

            res.json({
                success: true,
                data:
                    result
            });

        } catch (error) {
            res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /memory-map
 * =========================================================
 */

router.get(
    "/memory-map",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            res.json({
                success: true,
                data:
                    manager.getMemoryMap()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET /pressure
 * =========================================================
 */

router.get(
    "/pressure",
    (req, res) => {
        try {
            const manager =
                getManager(req);

            const statistics =
                manager.getStatistics();

            res.json({
                success: true,
                data: {
                    memoryPressure:
                        manager.hasPhysicalMemoryPressure(),

                    frameLimitPressure:
                        statistics.frameLimitPressure,

                    freeFrames:
                        statistics.freeFrames,

                    usedFrames:
                        statistics.usedFrames,

                    physicalFrameLimit:
                        statistics.physicalFrameLimit,

                    currentResidentFrames:
                        statistics.currentResidentFrames,

                    availableVMFrames:
                        statistics.availableVMFrames
                }
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * POST /reset
 * =========================================================
 */

router.post(
    "/reset",
    (req, res) => {
        try {
            const manager =
                getVirtualMemoryManager(req);

            manager.reset();

            /*
             * Restore VM address spaces for the REAL
             * NovaOS processes after resetting the VM layer.
             */

            syncVirtualMemoryProcesses(
                req
            );

            res.json({
                success: true,
                data:
                    manager.getSnapshot()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


export default router;