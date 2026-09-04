import express from "express";
import { kernel } from "../kernel.js";

const router = express.Router();

const getManager = () => {
    kernel.ensureBooted();
    return kernel.getPageReplacementManager();
};

const getBody = (req) => {
    if (!req.body || typeof req.body !== "object") {
        throw new Error("Request body must be a JSON object.");
    }

    return req.body;
};

const sendSuccess = (res, data, status = 200) => {
    return res.status(status).json({
        success: true,
        ...data
    });
};

const sendError = (res, error, status = 400) => {
    return res.status(status).json({
        success: false,
        error: error instanceof Error
            ? error.message
            : String(error)
    });
};

/*
 * =========================================================
 * ALGORITHMS
 * =========================================================
 */

router.get("/algorithms", (req, res) => {
    try {
        const manager = getManager();

        return sendSuccess(res, {
            algorithms: manager.getSupportedAlgorithms()
        });
    } catch (error) {
        return sendError(res, error, 500);
    }
});

/*
 * =========================================================
 * STATISTICS
 * =========================================================
 */

router.get("/statistics", (req, res) => {
    try {
        const manager = getManager();

        return sendSuccess(res, {
            statistics: manager.getStatistics()
        });
    } catch (error) {
        return sendError(res, error, 500);
    }
});

/*
 * =========================================================
 * SNAPSHOT
 * =========================================================
 */

router.get("/snapshot", (req, res) => {
    try {
        const manager = getManager();

        return sendSuccess(res, {
            snapshot: manager.getSnapshot()
        });
    } catch (error) {
        return sendError(res, error, 500);
    }
});

/*
 * =========================================================
 * DEFAULT ALGORITHM
 * =========================================================
 */

router.get("/default", (req, res) => {
    try {
        const manager = getManager();

        return sendSuccess(res, {
            algorithm: manager.getDefaultAlgorithm()
        });
    } catch (error) {
        return sendError(res, error, 500);
    }
});

router.post("/default", (req, res) => {
    try {
        const manager = getManager();
        const body = getBody(req);

        if (!body.algorithm) {
            throw new Error("Algorithm is required.");
        }

        const algorithm =
            manager.setDefaultAlgorithm(
                body.algorithm
            );

        return sendSuccess(res, {
            algorithm
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/*
 * =========================================================
 * SIMULATE
 * =========================================================
 *
 * Body:
 *
 * {
 *   "algorithm": "fifo",
 *   "referenceString": [1,2,3,1,4,2,5],
 *   "frameCount": 3
 * }
 *
 * IMPORTANT:
 * PageReplacementManager expects:
 *
 * simulate(
 *     referenceString,
 *     frameCount,
 *     { algorithm }
 * )
 *
 * =========================================================
 */

router.post("/simulate", (req, res) => {
    try {
        const manager = getManager();
        const body = getBody(req);

        const {
            algorithm,
            referenceString,
            frameCount
        } = body;

        if (
            !Array.isArray(referenceString) &&
            typeof referenceString !== "string"
        ) {
            throw new Error(
                "Reference string must be an array or a whitespace/comma-separated string."
            );
        }

        const numericFrameCount =
            Number(frameCount);

        if (
            !Number.isInteger(
                numericFrameCount
            ) ||
            numericFrameCount <= 0
        ) {
            throw new Error(
                "frameCount must be a positive integer."
            );
        }

        const result =
            manager.simulate(
                referenceString,
                numericFrameCount,
                {
                    algorithm
                }
            );

        return sendSuccess(res, {
            result
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/*
 * =========================================================
 * COMPARE
 * =========================================================
 *
 * The manager's compare() method expects:
 *
 * compare(referenceString, frameCount)
 *
 * It automatically compares:
 *
 * FIFO
 * LRU
 * Optimal
 * Second Chance
 * Clock
 *
 * =========================================================
 */

router.post("/compare", (req, res) => {
    try {
        const manager = getManager();
        const body = getBody(req);

        const {
            referenceString,
            frameCount
        } = body;

        if (
            !Array.isArray(referenceString) &&
            typeof referenceString !== "string"
        ) {
            throw new Error(
                "Reference string must be an array or a whitespace/comma-separated string."
            );
        }

        const numericFrameCount =
            Number(frameCount);

        if (
            !Number.isInteger(
                numericFrameCount
            ) ||
            numericFrameCount <= 0
        ) {
            throw new Error(
                "frameCount must be a positive integer."
            );
        }

        const result =
            manager.compare(
                referenceString,
                numericFrameCount
            );

        return sendSuccess(res, {
            result
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/*
 * =========================================================
 * VICTIM SELECTION
 * =========================================================
 *
 * Body:
 *
 * {
 *   "algorithm": "fifo",
 *   "pages": [...]
 * }
 *
 * For Optimal:
 *
 * {
 *   "algorithm": "optimal",
 *   "pages": [...],
 *   "referenceString": [...],
 *   "currentIndex": 3
 * }
 *
 * =========================================================
 */

router.post("/victim", (req, res) => {
    try {
        const manager = getManager();
        const body = getBody(req);

        const {
            algorithm,
            pages,
            referenceString,
            currentIndex
        } = body;

        if (
            !Array.isArray(pages) ||
            pages.length === 0
        ) {
            throw new Error(
                "pages must be a non-empty array."
            );
        }

        const victim =
            manager.selectVictim(
                pages,
                {
                    algorithm,
                    referenceString,
                    currentIndex
                }
            );

        return sendSuccess(res, {
            victim
        });
    } catch (error) {
        return sendError(res, error);
    }
});

/*
 * =========================================================
 * RESET
 * =========================================================
 */

router.post("/reset", (req, res) => {
    try {
        const manager = getManager();

        const snapshot =
            manager.reset();

        return sendSuccess(res, {
            message:
                "Page replacement manager reset successfully.",

            snapshot
        });
    } catch (error) {
        return sendError(res, error, 500);
    }
});

export default router;