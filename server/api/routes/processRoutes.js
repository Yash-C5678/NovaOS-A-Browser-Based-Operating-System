import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();


/*
 * =========================================================
 * PROCESS MANAGER
 * =========================================================
 *
 * The Kernel remains the central integration point for
 * process-related OS subsystems.
 *
 * A manually-created process with a memory limit must be
 * registered with:
 *
 *     ProcessManager
 *          ↓
 *     MemoryManager
 *          ↓
 *     PagingManager
 *          ↓
 *     VirtualMemoryManager
 *          ↓
 *     SegmentationManager
 *
 * This keeps manually-created processes consistent with
 * processes launched through the Kernel.
 * =========================================================
 */


/*
 * =========================================================
 * GET ALL PROCESSES
 * =========================================================
 */

router.get(
    "/",
    (req, res) => {
        try {
            res.json({
                success: true,
                data:
                    kernel
                        .getProcessManager()
                        .getAllProcesses()
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
 * GET PROCESS STATE COUNTS
 * =========================================================
 */

router.get(
    "/states",
    (req, res) => {
        try {
            res.json({
                success: true,
                data:
                    kernel
                        .getProcessManager()
                        .getStateCounts()
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
 * GET PROCESS BY PID
 * =========================================================
 */

router.get(
    "/:pid",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .getProcess(
                        req.params.pid
                    );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Process not found."
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
 * CREATE PROCESS
 * =========================================================
 *
 * POST /api/processes
 *
 * Body:
 *
 * {
 *     applicationId: "terminal",
 *     priority: 1,
 *     memoryLimit: 256,
 *     arrivalTime: 0,
 *     burstTime: 5
 * }
 *
 * Processes created here are real NovaOS processes.
 *
 * If memoryLimit > 0, the process also receives:
 *
 *     - conventional memory allocation
 *     - paging address space
 *     - virtual-memory address space
 *     - segmentation address space
 *
 * This is required so that Virtual Memory can actually
 * page-in a page belonging to a manually-created process.
 * =========================================================
 */

router.post(
    "/",
    (req, res) => {
        const processManager =
            kernel.getProcessManager();

        let process = null;

        try {
            /*
             * Make sure the Kernel is operational.
             */
            kernel.ensureBooted();


            const {
                applicationId,
                priority = 0,
                memoryLimit = null,
                arrivalTime = 0,
                burstTime = 1
            } = req.body || {};


            /*
             * =================================================
             * INPUT VALIDATION
             * =================================================
             */

            const numericPriority =
                Number(priority);

            const numericArrivalTime =
                Number(arrivalTime);

            const numericBurstTime =
                Number(burstTime);

            let numericMemoryLimit =
                null;

            if (
                memoryLimit !== null &&
                memoryLimit !== undefined &&
                memoryLimit !== ""
            ) {
                numericMemoryLimit =
                    Number(memoryLimit);

                if (
                    !Number.isFinite(
                        numericMemoryLimit
                    ) ||
                    numericMemoryLimit <= 0
                ) {
                    throw new Error(
                        "Memory limit must be a positive number or left empty."
                    );
                }
            }


            if (
                !Number.isFinite(
                    numericPriority
                )
            ) {
                throw new Error(
                    "Priority must be a valid number."
                );
            }


            if (
                !Number.isFinite(
                    numericArrivalTime
                ) ||
                numericArrivalTime < 0
            ) {
                throw new Error(
                    "Arrival time must be a non-negative number."
                );
            }


            if (
                !Number.isFinite(
                    numericBurstTime
                ) ||
                numericBurstTime <= 0
            ) {
                throw new Error(
                    "Burst time must be greater than 0."
                );
            }


            const normalizedApplicationId =
                String(
                    applicationId ??
                    ""
                ).trim();

            if (
                !normalizedApplicationId
            ) {
                throw new Error(
                    "Application ID is required."
                );
            }


            /*
             * =================================================
             * CREATE REAL PROCESS
             * =================================================
             */

            process =
                processManager.createProcess({
                    applicationId:
                        normalizedApplicationId,

                    priority:
                        numericPriority,

                    memoryLimit:
                        numericMemoryLimit,

                    arrivalTime:
                        numericArrivalTime,

                    burstTime:
                        numericBurstTime
                });


            /*
             * =================================================
             * MEMORY / PAGING / VM INTEGRATION
             * =================================================
             *
             * A process without memory does not receive a
             * paging or virtual-memory address space.
             *
             * A process with memory receives all required
             * memory subsystem registrations.
             */

            if (
                process.memoryLimit !==
                null &&
                process.memoryLimit !==
                undefined
            ) {

                /*
                 * Conventional memory allocation.
                 */

                kernel
                    .getMemoryManager()
                    .allocate(
                        process.pid,
                        process.memoryLimit
                    );


                /*
                 * Create the real paging address space.
                 *
                 * This is the critical fix for Virtual Memory.
                 */

                kernel.ensurePagingProcess(
                    process
                );


                /*
                 * Attach Virtual Memory to the
                 * PagingManager address space.
                 */

                kernel.ensureVirtualMemoryProcess(
                    process
                );


                /*
                 * Keep segmentation synchronized
                 * with the same real process.
                 */

                kernel.ensureSegmentationProcess(
                    process
                );
            }


            /*
             * =================================================
             * RETURN CREATED PROCESS
             * =================================================
             */

            res.status(201).json({
                success: true,
                data:
                    process
            });

        } catch (error) {

            /*
             * =================================================
             * ROLLBACK
             * =================================================
             *
             * If subsystem registration fails after the real
             * process has been created, clean up the resources
             * that were successfully allocated.
             *
             * This prevents partially-created processes from
             * remaining in the kernel.
             * =================================================
             */

            if (process) {
                const pid =
                    process.pid;

                try {
                    if (
                        kernel
                            .getMemoryManager()
                            .hasAllocation(
                                pid
                            )
                    ) {
                        kernel
                            .getMemoryManager()
                            .deallocate(
                                pid
                            );
                    }
                } catch {
                    // Preserve the original error.
                }


                try {
                    if (
                        typeof kernel
                            .removeVirtualMemoryProcess ===
                        "function"
                    ) {
                        kernel
                            .removeVirtualMemoryProcess(
                                pid
                            );
                    }
                } catch {
                    // Preserve the original error.
                }


                try {
                    if (
                        typeof kernel
                            .removePagingProcess ===
                        "function"
                    ) {
                        kernel
                            .removePagingProcess(
                                pid
                            );
                    }
                } catch {
                    // Preserve the original error.
                }


                try {
                    if (
                        typeof kernel
                            .removeSegmentationProcess ===
                        "function"
                    ) {
                        kernel
                            .removeSegmentationProcess(
                                pid
                            );
                    }
                } catch {
                    // Preserve the original error.
                }


                try {
                    processManager.terminateProcess(
                        pid
                    );
                } catch {
                    // Preserve the original error.
                }
            }


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
 * START PROCESS
 * =========================================================
 *
 * NEW → READY
 * =========================================================
 */

router.post(
    "/:pid/start",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .startProcess(
                        req.params.pid
                    );

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
 * RUN PROCESS
 * =========================================================
 *
 * READY → RUNNING
 * =========================================================
 */

router.post(
    "/:pid/run",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .runProcess(
                        req.params.pid
                    );

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
 * PREEMPT PROCESS
 * =========================================================
 *
 * RUNNING → READY
 * =========================================================
 */

router.post(
    "/:pid/preempt",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .preemptProcess(
                        req.params.pid
                    );

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
 * WAIT PROCESS
 * =========================================================
 *
 * RUNNING → WAITING
 * =========================================================
 */

router.post(
    "/:pid/wait",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .waitProcess(
                        req.params.pid
                    );

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
 * RESUME PROCESS
 * =========================================================
 *
 * WAITING → READY
 * =========================================================
 */

router.post(
    "/:pid/resume",
    (req, res) => {
        try {
            const process =
                kernel
                    .getProcessManager()
                    .resumeProcess(
                        req.params.pid
                    );

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
 * TERMINATE PROCESS
 * =========================================================
 *
 * All memory subsystems are cleaned up by Kernel.
 *
 *     Conventional memory
 *     Virtual Memory
 *     Paging
 *     Segmentation
 *     Process
 * =========================================================
 */

router.post(
    "/:pid/terminate",
    (req, res) => {
        try {
            const process =
                kernel.terminateProcess(
                    req.params.pid
                );

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


export default router;