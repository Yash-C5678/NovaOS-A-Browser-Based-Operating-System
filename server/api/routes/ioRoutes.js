import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        success: true,
        data: kernel.getIOController().getStatistics()
    });
});

router.get("/active", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getIOController()
                .getActiveRequests()
    });
});

router.get("/queued", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getIOController()
                .getQueuedRequests()
    });
});

router.get("/completed", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getIOController()
                .getCompletedRequests()
    });
});

router.get("/cancelled", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getIOController()
                .getCancelledRequests()
    });
});

router.get("/devices", (req, res) => {
    res.json({
        success: true,
        data:
            kernel.getDeviceManager()
                .getStatistics()
    });
});

router.post("/request", (req, res) => {
    try {
        const request =
            kernel.getProcessIOManager().requestIO(
                req.body
            );

        res.status(201).json({
            success: true,
            data: request
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/execute/:requestId", (req, res) => {
    try {
        const result =
            kernel.getProcessIOManager()
                .executeRequestUnit(
                    req.params.requestId
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

router.post("/cancel/:requestId", (req, res) => {
    try {
        const result =
            kernel.getProcessIOManager()
                .cancelRequest(
                    req.params.requestId
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

export default router;