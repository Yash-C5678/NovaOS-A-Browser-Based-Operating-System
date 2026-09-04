import express from "express";


const router =
    express.Router();


/*
 * =========================================================
 * KERNEL ACCESS
 * =========================================================
 *
 * The route uses the existing kernel instance exposed through
 * Express application locals.
 *
 * No second Kernel instance is created here.
 */

function getKernel(
    req
) {

    const kernel =
        req.app.locals.kernel;


    if (
        !kernel
    ) {
        throw new Error(
            "NovaOS kernel is not available."
        );
    }


    return kernel;
}


/*
 * =========================================================
 * SYSTEM LOG MANAGER ACCESS
 * =========================================================
 */

function getSystemLogManager(
    req
) {

    const kernel =
        getKernel(
            req
        );


    const manager =
        typeof kernel.getSystemLogManager ===
            "function"
            ? kernel.getSystemLogManager()
            : null;


    if (
        !manager
    ) {
        throw new Error(
            "NovaOS SystemLogManager is not available."
        );
    }


    return manager;
}


/*
 * =========================================================
 * GET ALL LOGS
 * =========================================================
 *
 * Optional query parameters:
 *
 * level=error
 * source=kernel
 * type=PROCESS_CREATED
 * search=terminal
 * limit=50
 */

router.get(
    "/",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            let logs;


            /*
             * Search takes priority when supplied.
             */

            if (
                req.query.search !==
                    undefined &&
                String(
                    req.query.search
                ).trim() !==
                    ""
            ) {

                logs =
                    manager.searchLogs(
                        req.query.search
                    );

            } else if (
                req.query.level !==
                    undefined
            ) {

                logs =
                    manager.getLogsByLevel(
                        req.query.level
                    );

            } else if (
                req.query.source !==
                    undefined
            ) {

                logs =
                    manager.getLogsBySource(
                        req.query.source
                    );

            } else if (
                req.query.type !==
                    undefined
            ) {

                logs =
                    manager.getLogsByType(
                        req.query.type
                    );

            } else {

                logs =
                    manager.getLogs();
            }


            /*
             * Optional result limit.
             */

            if (
                req.query.limit !==
                    undefined
            ) {

                const limit =
                    Number(
                        req.query.limit
                    );


                if (
                    !Number.isInteger(
                        limit
                    ) ||
                    limit < 1
                ) {

                    return res.status(
                        400
                    ).json({

                        success:
                            false,

                        error:
                            "Invalid limit",

                        message:
                            "limit must be a positive integer."
                    });
                }


                logs =
                    logs.slice(
                        0,
                        limit
                    );
            }


            return res.json({

                success:
                    true,

                data:
                    logs,

                count:
                    logs.length,

                statistics:
                    manager.getStatistics()
            });

        } catch (
            error
        ) {

            console.error(
                "System log list error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET RECENT LOGS
 * =========================================================
 *
 * Query:
 *
 * ?limit=50
 */

router.get(
    "/recent",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            const requestedLimit =
                req.query.limit !==
                    undefined
                    ? Number(
                        req.query.limit
                    )
                    : 50;


            if (
                !Number.isInteger(
                    requestedLimit
                ) ||
                requestedLimit < 1
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    error:
                        "Invalid limit",

                    message:
                        "limit must be a positive integer."
                });
            }


            const logs =
                manager.getRecentLogs(
                    requestedLimit
                );


            return res.json({

                success:
                    true,

                data:
                    logs,

                count:
                    logs.length
            });

        } catch (
            error
        ) {

            console.error(
                "Recent system logs error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET LOG SNAPSHOT
 * =========================================================
 *
 * Returns both logs and statistics.
 *
 * This is the preferred endpoint for the future
 * System Logs application.
 */

router.get(
    "/snapshot",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            return res.json({

                success:
                    true,

                data:
                    manager.getSnapshot()
            });

        } catch (
            error
        ) {

            console.error(
                "System log snapshot error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET LOG STATISTICS
 * =========================================================
 */

router.get(
    "/statistics",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            return res.json({

                success:
                    true,

                data:
                    manager.getStatistics()
            });

        } catch (
            error
        ) {

            console.error(
                "System log statistics error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * GET LOG BY ID
 * =========================================================
 */

router.get(
    "/:logId",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            const log =
                manager.getLog(
                    req.params.logId
                );


            if (
                !log
            ) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    error:
                        "Log not found"
                });
            }


            return res.json({

                success:
                    true,

                data:
                    log
            });

        } catch (
            error
        ) {

            console.error(
                "System log lookup error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * DELETE ALL LOGS
 * =========================================================
 *
 * Logging history is currently in-memory, so clearing logs
 * clears the current SystemLogManager history.
 */

router.delete(
    "/",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getSystemLogManager(
                    req
                );


            manager.clear();


            return res.json({

                success:
                    true,

                data:
                    manager.getSnapshot()
            });

        } catch (
            error
        ) {

            console.error(
                "Clear system logs error:",
                error
            );


            return res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Internal server error",

                message:
                    error.message
            });
        }
    }
);


export default router;