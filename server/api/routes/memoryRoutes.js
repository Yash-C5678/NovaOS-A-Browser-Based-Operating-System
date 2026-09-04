import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        success: true,
        data: kernel.getMemoryManager().getStatistics()
    });
});

router.get("/map", (req, res) => {
    res.json({
        success: true,
        data: kernel.getMemoryManager().getMemoryMap()
    });
});

router.get("/blocks", (req, res) => {
    res.json({
        success: true,
        data: kernel.getMemoryManager().getBlocks()
    });
});

router.get("/allocation/:pid", (req, res) => {
    const allocation =
        kernel.getMemoryManager().getAllocation(
            req.params.pid
        );

    res.json({
        success: true,
        data: allocation
    });
});

router.post("/allocate", (req, res) => {
    try {
        const { pid, size } = req.body;

        const block =
            kernel.getMemoryManager().allocate(
                pid,
                size
            );

        res.status(201).json({
            success: true,
            data: block
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/deallocate", (req, res) => {
    try {
        const { pid } = req.body;

        kernel.getMemoryManager().deallocate(pid);

        res.json({
            success: true,
            message: `Memory released from process '${pid}'.`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/algorithm", (req, res) => {
    try {
        const { algorithm } = req.body;

        kernel.getMemoryManager().setAlgorithm(
            algorithm
        );

        res.json({
            success: true,
            algorithm:
                kernel.getMemoryManager()
                    .getAlgorithmName()
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;