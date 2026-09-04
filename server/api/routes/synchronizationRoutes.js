import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getSynchronizationManager()
                .getSynchronizationTable()
    });
});

router.get("/statistics", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getSynchronizationManager()
                .getStatistics()
    });
});

router.post("/mutex", (req, res) => {
    try {
        const mutex =
            kernel.getSynchronizationManager()
                .createMutex(req.body.id);

        res.status(201).json({
            success: true,
            data: mutex.toJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/mutex/:id/acquire", (req, res) => {
    try {
        const acquired =
            kernel.getSynchronizationManager()
                .acquireMutex(
                    req.params.id,
                    req.body.pid
                );

        res.json({
            success: true,
            acquired
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/mutex/:id/release", (req, res) => {
    try {
        const nextPid =
            kernel.getSynchronizationManager()
                .releaseMutex(
                    req.params.id,
                    req.body.pid
                );

        res.json({
            success: true,
            nextPid
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/semaphore", (req, res) => {
    try {
        const semaphore =
            kernel.getSynchronizationManager()
                .createSemaphore(req.body);

        res.status(201).json({
            success: true,
            data: semaphore.toJSON()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/semaphore/:id/wait", (req, res) => {
    try {
        const acquired =
            kernel.getSynchronizationManager()
                .waitSemaphore(
                    req.params.id,
                    req.body.pid
                );

        res.json({
            success: true,
            acquired
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/semaphore/:id/signal", (req, res) => {
    try {
        const nextPid =
            kernel.getSynchronizationManager()
                .signalSemaphore(
                    req.params.id
                );

        res.json({
            success: true,
            nextPid
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;