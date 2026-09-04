import express from "express";

const router = express.Router();


/*
 * =========================================================
 * KERNEL ACCESS
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
 * PAGING MANAGER ACCESS
 * =========================================================
 */

function getPagingManager(req) {
    const kernel =
        getKernel(req);

    if (
        typeof kernel.getPagingManager !==
        "function"
    ) {
        throw new Error(
            "Paging Manager is not registered with the kernel."
        );
    }

    return kernel.getPagingManager();
}


/*
 * =========================================================
 * PROCESS MANAGER ACCESS
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
 * PAGING SNAPSHOT PROCESSES
 * =========================================================
 *
 * PagingManager exposes its process state through
 * getSnapshot().
 *
 * We use that public API instead of depending on
 * internal Map structures or undocumented methods.
 */

function getPagingProcesses(manager) {
    const snapshot =
        manager.getSnapshot();

    if (
        !snapshot ||
        !Array.isArray(
            snapshot.processes
        )
    ) {
        return [];
    }

    return snapshot.processes;
}


/*
 * =========================================================
 * FIND PAGING PROCESS
 * =========================================================
 */

function findPagingProcess(
    manager,
    pid
) {
    const normalizedPid =
        String(pid);

    return (
        getPagingProcesses(
            manager
        ).find(
            (process) =>
                String(
                    process.pid
                ) === normalizedPid
        ) ?? null
    );
}


/*
 * =========================================================
 * SYNCHRONIZE REAL NOVAOS PROCESSES
 * =========================================================
 *
 * ProcessManager is the source of truth.
 *
 * A process receives a paging address space only when
 * it has a valid positive memoryLimit.
 *
 * The virtual address space is rounded upward to a
 * complete number of pages.
 */

function syncPagingProcesses(req) {
    const pagingManager =
        getPagingManager(req);

    const processManager =
        getProcessManager(req);

    const processes =
        processManager.getAllProcesses();

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


    /*
     * Build the expected paging process set
     * from the REAL NovaOS process table.
     */

    const expectedProcesses =
        new Map();


    for (
        const process
        of processes
    ) {
        if (!process) {
            continue;
        }


        /*
         * Terminated processes no longer own
         * a virtual address space.
         */

        if (
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


        const virtualMemorySize =
            Math.ceil(
                memoryLimit /
                pageSize
            ) * pageSize;


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
     * =====================================================
     * CREATE MISSING ADDRESS SPACES
     * =====================================================
     */

    for (
        const {
            pid,
            virtualMemorySize
        }
        of expectedProcesses.values()
    ) {
        const existing =
            findPagingProcess(
                pagingManager,
                pid
            );

        if (
            !existing
        ) {
            pagingManager.createProcess(
                pid,
                virtualMemorySize
            );
        }
    }


    /*
     * =====================================================
     * REMOVE ORPHANED ADDRESS SPACES
     * =====================================================
     *
     * This catches processes that:
     *
     * - were terminated
     * - were removed/reset
     * - no longer have a valid memoryLimit
     *
     * Their paging resources are released.
     */

    const currentPagingProcesses =
        getPagingProcesses(
            pagingManager
        );


    for (
        const pagingProcess
        of currentPagingProcesses
    ) {
        const pid =
            String(
                pagingProcess.pid
            );

        if (
            !expectedProcesses.has(
                pid
            )
        ) {
            pagingManager.removeProcess(
                pid
            );
        }
    }


    return pagingManager;
}


/*
 * =========================================================
 * GET /api/paging/
 * =========================================================
 *
 * Complete live paging snapshot.
 */

router.get(
    "/",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

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
 * GET /api/paging/statistics
 * =========================================================
 */

router.get(
    "/statistics",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

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
 * GET /api/paging/frames
 * =========================================================
 */

router.get(
    "/frames",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            res.json({
                success: true,
                data:
                    manager.getFrames()
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
 * GET /api/paging/processes
 * =========================================================
 *
 * Returns REAL NovaOS processes that have paging
 * address spaces.
 */

router.get(
    "/processes",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            res.json({
                success: true,
                data:
                    getPagingProcesses(
                        manager
                    )
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
 * GET /api/paging/processes/:pid
 * =========================================================
 */

router.get(
    "/processes/:pid",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

            const process =
                findPagingProcess(
                    manager,
                    pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `Paging information for process '${pid}' not found.`
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
 * POST /api/paging/processes
 * =========================================================
 *
 * Compatibility endpoint.
 *
 * It does NOT create an independent paging process.
 *
 * The supplied PID must already exist in the real
 * NovaOS ProcessManager.
 */

router.post(
    "/processes",
    (req, res) => {
        try {
            const processManager =
                getProcessManager(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

            if (!pid) {
                throw new Error(
                    "A real NovaOS process PID is required."
                );
            }


            const process =
                processManager.getProcess(
                    pid
                );

            if (!process) {
                throw new Error(
                    `NovaOS process '${pid}' does not exist.`
                );
            }


            if (
                process.state ===
                "terminated"
            ) {
                throw new Error(
                    `NovaOS process '${pid}' is terminated.`
                );
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
                throw new Error(
                    `NovaOS process '${pid}' does not have a valid memory limit.`
                );
            }


            const manager =
                syncPagingProcesses(req);

            const pagingProcess =
                findPagingProcess(
                    manager,
                    pid
                );


            res.json({
                success: true,
                data:
                    pagingProcess
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
 * DELETE /api/paging/processes/:pid
 * =========================================================
 *
 * Paging address spaces belong to real NovaOS
 * processes and therefore cannot be independently
 * deleted from the Paging application.
 */

router.delete(
    "/processes/:pid",
    (req, res) => {
        res.status(400).json({
            success: false,
            error:
                "Paging processes are managed by NovaOS ProcessManager. Terminate the real process instead."
        });
    }
);


/*
 * =========================================================
 * GET /api/paging/processes/:pid/pages
 * =========================================================
 */

router.get(
    "/processes/:pid/pages",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

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
 * POST /api/paging/processes/:pid/pages/allocate
 * =========================================================
 */

router.post(
    "/processes/:pid/pages/allocate",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const result =
                manager.allocatePage(
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
 * POST /api/paging/processes/:pid/pages/allocate-many
 * =========================================================
 */

router.post(
    "/processes/:pid/pages/allocate-many",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

            const count =
                Number(
                    req.body?.count
                );

            const result =
                manager.allocatePages(
                    pid,
                    count
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
 * DELETE /api/paging/processes/:pid/pages/:pageNumber
 * =========================================================
 */

router.delete(
    "/processes/:pid/pages/:pageNumber",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

            const pageNumber =
                Number(
                    req.params.pageNumber
                );

            const result =
                manager.releasePage(
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
 * GET /api/paging/processes/:pid/pages/:pageNumber
 * =========================================================
 */

router.get(
    "/processes/:pid/pages/:pageNumber",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.params.pid
                );

            const pageNumber =
                Number(
                    req.params.pageNumber
                );

            const page =
                manager.getPage(
                    pid,
                    pageNumber
                );

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
 * POST /api/paging/translate
 * =========================================================
 */

router.post(
    "/translate",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

            const logicalAddress =
                Number(
                    req.body?.logicalAddress
                );

            const result =
                manager.translateAddress(
                    pid,
                    logicalAddress
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
 * POST /api/paging/reference
 * =========================================================
 */

router.post(
    "/reference",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

            const pageNumber =
                Number(
                    req.body?.pageNumber
                );

            const result =
                manager.referencePage(
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
 * POST /api/paging/modify
 * =========================================================
 */

router.post(
    "/modify",
    (req, res) => {
        try {
            const manager =
                syncPagingProcesses(req);

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

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
 * POST /api/paging/reset
 * =========================================================
 *
 * Clears paging state.
 *
 * Real NovaOS processes remain untouched.
 *
 * On the next Paging API request, processes with valid
 * memory limits will automatically receive their paging
 * address spaces again.
 */

router.post(
    "/reset",
    (req, res) => {
        try {
            const manager =
                getPagingManager(req);

            manager.reset();

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