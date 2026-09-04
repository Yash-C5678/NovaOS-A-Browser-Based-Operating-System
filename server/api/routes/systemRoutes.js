import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

router.get("/state", (req, res) => {
    res.json({
        success: true,
        data: kernel.getSystemState()
    });
});

router.get("/status", (req, res) => {
    res.json({
        success: true,
        data: {
            booted: kernel.isBooted()
        }
    });
});

router.post("/boot", (req, res) => {
    try {
        const result = kernel.boot();

        res.json({
            success: true,
            booted: kernel.isBooted(),
            started: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/shutdown", (req, res) => {
    try {
        const result = kernel.shutdown();

        res.json({
            success: true,
            booted: kernel.isBooted(),
            shutdown: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/reset", (req, res) => {
    try {
        kernel.reset();

        res.json({
            success: true,
            message: "NovaOS kernel reset successfully.",
            data: kernel.getSystemState()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get("/events", (req, res) => {
    res.json({
        success: true,
        data: kernel.getRuntime().getEvents()
    });
});

export default router;