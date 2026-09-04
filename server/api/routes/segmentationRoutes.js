import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

function getKernel() {
    return kernel;
}

function getSegmentationManager() {
    const manager =
        getKernel().getSegmentationManager();

    if (!manager) {
        throw new Error(
            "Segmentation subsystem is not available."
        );
    }

    return manager;
}

function getProcessManager() {
    const processManager =
        getKernel().getProcessManager();

    if (!processManager) {
        throw new Error(
            "Process Manager is not available."
        );
    }

    return processManager;
}

/*
 * =========================================================
 * SYNCHRONIZE SEGMENTATION WITH REAL PROCESSES
 * =========================================================
 */

function syncSegmentationProcesses() {
    const manager =
        getSegmentationManager();

    const processManager =
        getProcessManager();

    const realProcesses =
        processManager
            .getAllProcesses()
            .filter(
                (process) =>
                    process &&
                    process.state !==
                        "terminated"
            );

    const expectedPids =
        new Set(
            realProcesses.map(
                (process) =>
                    String(process.pid)
            )
        );

    for (
        const process of realProcesses
    ) {
        const pid =
            String(process.pid);

        if (
            !manager.hasProcess(pid)
        ) {
            manager.createProcess(
                pid
            );
        }
    }

    for (
        const process of manager.getProcesses()
    ) {
        if (
            !expectedPids.has(
                String(process.pid)
            )
        ) {
            manager.removeProcess(
                process.pid
            );
        }
    }

    return manager;
}

/*
 * =========================================================
 * ROOT SNAPSHOT
 * =========================================================
 */

router.get(
    "/",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

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
 * STATISTICS
 * =========================================================
 */

router.get(
    "/statistics",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

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
 * PROCESSES
 * =========================================================
 */

router.get(
    "/processes",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

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

router.get(
    "/processes/:pid",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const process =
                manager.getProcess(
                    req.params.pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Segmentation process not found."
                });
            }

            res.json({
                success: true,
                data: process
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
 * CREATE SEGMENTATION ADDRESS SPACE
 *
 * Only real NovaOS processes may be used.
 * =========================================================
 */

router.post(
    "/processes",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

            if (!pid) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Process ID is required."
                });
            }

            const process =
                getProcessManager()
                    .getProcess(pid);

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        `NovaOS process '${pid}' does not exist.`
                });
            }

            const segmentationProcess =
                manager.hasProcess(pid)
                    ? manager.getProcess(pid)
                    : manager.createProcess(
                        pid
                    );

            res.status(201).json({
                success: true,
                data:
                    segmentationProcess
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
 * SEGMENTS
 * =========================================================
 */

router.get(
    "/processes/:pid/segments",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const process =
                manager.getProcess(
                    req.params.pid
                );

            if (!process) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Segmentation process not found."
                });
            }

            res.json({
                success: true,
                data:
                    process.segments
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

router.get(
    "/processes/:pid/segments/:segmentNumber",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const segment =
                manager.getSegment(
                    req.params.pid,
                    req.params.segmentNumber
                );

            if (!segment) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Segment not found."
                });
            }

            res.json({
                success: true,
                data:
                    segment
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
 * ALLOCATE SEGMENT
 * =========================================================
 */

router.post(
    "/processes/:pid/segments",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const segment =
                manager.allocateSegment(
                    req.params.pid,
                    {
                        name:
                            req.body?.name,
                        type:
                            req.body?.type,
                        size:
                            Number(
                                req.body?.size
                            ),
                        permissions:
                            req.body?.permissions
                    }
                );

            res.status(201).json({
                success: true,
                data:
                    segment
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
 * RELEASE SEGMENT
 * =========================================================
 */

router.delete(
    "/processes/:pid/segments/:segmentNumber",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const segment =
                manager.releaseSegment(
                    req.params.pid,
                    req.params.segmentNumber
                );

            res.json({
                success: true,
                data:
                    segment
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
 * ADDRESS TRANSLATION
 * =========================================================
 */

router.post(
    "/translate",
    (req, res) => {
        try {
            const manager =
                syncSegmentationProcesses();

            const pid =
                String(
                    req.body?.pid ?? ""
                ).trim();

            const segmentNumber =
                Number(
                    req.body?.segmentNumber
                );

            const offset =
                Number(
                    req.body?.offset
                );

            const accessType =
                req.body?.accessType ??
                "r";

            if (!pid) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Process ID is required."
                });
            }

            const result =
                manager.translateAddress(
                    pid,
                    segmentNumber,
                    offset,
                    accessType
                );

            res.json({
                success:
                    result.success,
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
 * RESET
 * =========================================================
 */

router.post(
    "/reset",
    (req, res) => {
        try {
            const manager =
                getSegmentationManager();

            const result =
                manager.reset();

            /*
             * Immediately synchronize with currently
             * existing NovaOS processes after reset.
             */
            syncSegmentationProcesses();

            res.json({
                success: true,
                data:
                    manager.getSnapshot()
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