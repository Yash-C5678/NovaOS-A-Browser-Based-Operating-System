import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

const manager = () =>
    kernel.getDeadlockManager();

/*
 * =========================================================
 * STATUS
 * =========================================================
 */

router.get("/", (req, res) => {
    res.json({
        success: true,
        data: manager().getStatistics()
    });
});

/*
 * =========================================================
 * DEADLOCK TABLE
 * =========================================================
 */

router.get("/table", (req, res) => {
    res.json({
        success: true,
        data: manager().getDeadlockTable()
    });
});

/*
 * =========================================================
 * RESOURCES
 * =========================================================
 */

router.post("/resources", (req, res) => {
    try {
        const resource =
            manager().registerResource(req.body);

        res.status(201).json({
            success: true,
            data: resource
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * PROCESSES
 * =========================================================
 */

router.post("/processes", (req, res) => {
    try {
        const process =
            manager().registerProcess(req.body);

        res.status(201).json({
            success: true,
            data: process
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * ALLOCATION
 * =========================================================
 */

router.post("/processes/:pid/allocate", (req, res) => {
    try {
        const process =
            manager().allocateResources(
                req.params.pid,
                req.body.allocation
            );

        res.json({
            success: true,
            data: process
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * RELEASE
 * =========================================================
 */

router.post("/processes/:pid/release", (req, res) => {
    try {
        const process =
            manager().releaseResources(
                req.params.pid,
                req.body.release
            );

        res.json({
            success: true,
            data: process
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * RESOURCE REQUEST
 * =========================================================
 */

router.post("/processes/:pid/request", (req, res) => {
    try {
        const result =
            manager().requestResources(
                req.params.pid,
                req.body.request
            );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * BANKER'S SAFETY ALGORITHM
 * =========================================================
 */

router.post("/safety", (req, res) => {
    try {
        const result =
            manager().checkSafety();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * DEADLOCK DETECTION
 * =========================================================
 */

router.post("/detect", (req, res) => {
    try {
        const result =
            manager().detectDeadlock();

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * RESET
 * =========================================================
 */

router.post("/reset", (req, res) => {
    try {
        manager().reset();

        res.json({
            success: true,
            data: manager().getStatistics()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * REMOVE PROCESS
 * =========================================================
 */

router.delete("/processes/:pid", (req, res) => {
    try {
        const removed =
            manager().removeProcess(
                req.params.pid
            );

        res.json({
            success: true,
            data: removed
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

/*
 * =========================================================
 * REMOVE RESOURCE
 * =========================================================
 */

router.delete("/resources/:id", (req, res) => {
    try {
        const removed =
            manager().removeResource(
                req.params.id
            );

        res.json({
            success: true,
            data: removed
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;