import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();


function getRuntime() {
    return kernel.getRuntime();
}


function getWindowOrThrow(windowId) {
    const runtime = getRuntime();

    const window =
        runtime
            .getWindows()
            .find(
                (item) =>
                    item.id === windowId
            );

    if (!window) {
        throw new Error(
            `Window '${windowId}' not found.`
        );
    }

    return window;
}


/*
 * =========================================================
 * RUNTIME EVENT INGESTION
 * =========================================================
 *
 * Window operations are performed by NovaRuntime.
 * NovaRuntime creates SystemEvent objects for those
 * operations.
 *
 * The Kernel then ingests those newly-created events into:
 *
 *   Runtime Events
 *        ↓
 *   NotificationManager
 *        ↓
 *   SystemLogManager
 *
 * This helper records the current event count before an
 * operation and ingests everything generated afterwards.
 */

function runWindowOperation(
    operation
) {
    const runtime =
        getRuntime();

    const startIndex =
        runtime.getEvents().length;

    const window =
        operation(runtime);

    kernel.ingestRuntimeEventsFrom(
        startIndex
    );

    return window;
}


/* =========================================================
   APPLICATIONS
   ========================================================= */

router.get(
    "/",
    (req, res) => {
        res.json({
            success: true,
            data:
                getRuntime()
                    .listApplications()
        });
    }
);


router.get(
    "/:applicationId",
    (req, res) => {
        const application =
            getRuntime()
                .getApplication(
                    req.params
                        .applicationId
                );

        if (!application) {
            return res.status(404).json({
                success: false,
                error:
                    "Application not found."
            });
        }

        res.json({
            success: true,
            data: application
        });
    }
);


router.post(
    "/",
    (req, res) => {
        try {
            const application =
                kernel.registerApplication(
                    req.body
                );

            res.status(201).json({
                success: true,
                data: application
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   APPLICATION LAUNCH
   ========================================================= */

router.post(
    "/:applicationId/launch",
    (req, res) => {
        try {
            const result =
                kernel.launchApplication(
                    req.params
                        .applicationId
                );

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   WINDOW — FOCUS
   ========================================================= */

router.post(
    "/windows/:windowId/focus",
    (req, res) => {
        try {
            const window =
                runWindowOperation(
                    (runtime) =>
                        runtime.focusWindow(
                            req.params
                                .windowId
                        )
                );

            res.json({
                success: true,
                data: window
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   WINDOW — MINIMIZE
   ========================================================= */

router.post(
    "/windows/:windowId/minimize",
    (req, res) => {
        try {
            const window =
                runWindowOperation(
                    (runtime) =>
                        runtime.minimizeWindow(
                            req.params
                                .windowId
                        )
                );

            res.json({
                success: true,
                data: window
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   WINDOW — MAXIMIZE
   ========================================================= */

router.post(
    "/windows/:windowId/maximize",
    (req, res) => {
        try {
            const window =
                runWindowOperation(
                    (runtime) =>
                        runtime.maximizeWindow(
                            req.params
                                .windowId
                        )
                );

            res.json({
                success: true,
                data: window
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   WINDOW — RESTORE
   ========================================================= */

router.post(
    "/windows/:windowId/restore",
    (req, res) => {
        try {
            const window =
                runWindowOperation(
                    (runtime) =>
                        runtime.restoreWindow(
                            req.params
                                .windowId
                        )
                );

            res.json({
                success: true,
                data: window
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


/* =========================================================
   WINDOW — CLOSE
   ========================================================= */

router.post(
    "/windows/:windowId/close",
    (req, res) => {
        try {
            const window =
                runWindowOperation(
                    (runtime) =>
                        runtime.closeWindow(
                            req.params
                                .windowId
                        )
                );

            res.json({
                success: true,
                data: window
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
);


export default router;