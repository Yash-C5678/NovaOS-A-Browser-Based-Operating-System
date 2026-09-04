import express from "express";


const router =
    express.Router();


/*
 * =========================================================
 * KERNEL ACCESS
 * =========================================================
 *
 * The application already exposes the kernel through the
 * existing route architecture. This helper intentionally
 * resolves it lazily so the router does not create another
 * Kernel instance.
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


function getNotificationManager(
    req
) {

    const kernel =
        getKernel(
            req
        );


    const manager =
        typeof kernel.getNotificationManager ===
            "function"
            ? kernel.getNotificationManager()
            : null;


    if (
        !manager
    ) {
        throw new Error(
            "NovaOS NotificationManager is not available."
        );
    }


    return manager;
}


/*
 * =========================================================
 * GET ALL NOTIFICATIONS
 * =========================================================
 *
 * Optional query parameters:
 *
 * unreadOnly=true
 * source=process
 * type=error
 * applicationId=terminal
 * processId=nova-1000
 */

router.get(
    "/",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const unreadOnly =
                String(
                    req.query.unreadOnly ??
                    "false"
                ).toLowerCase() ===
                "true";


            const source =
                req.query.source ??
                null;


            const type =
                req.query.type ??
                null;


            const applicationId =
                req.query.applicationId ??
                null;


            const processId =
                req.query.processId ??
                null;


            const notifications =
                manager.getAll({
                    unreadOnly,
                    source,
                    type,
                    applicationId,
                    processId
                });


            return res.json({
                success:
                    true,

                data:
                    notifications,

                count:
                    notifications.length,

                unreadCount:
                    manager.getUnreadCount()
            });

        } catch (
        error
        ) {

            console.error(
                "Notification list error:",
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
 * GET UNREAD NOTIFICATIONS
 * =========================================================
 */

router.get(
    "/unread",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const notifications =
                manager.getUnread();


            return res.json({

                success:
                    true,

                data:
                    notifications,

                count:
                    notifications.length,

                unreadCount:
                    manager.getUnreadCount()
            });

        } catch (
        error
        ) {

            console.error(
                "Unread notification error:",
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
 * GET NOTIFICATION SNAPSHOT
 * =========================================================
 *
 * Returns:
 *
 * {
 *     notifications: [],
 *     unreadCount: 0,
 *     statistics: {}
 * }
 *
 * This is the preferred endpoint for the future
 * Notification Center because it gets everything needed
 * for one UI refresh.
 */

router.get(
    "/snapshot",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
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
                "Notification snapshot error:",
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
 * GET NOTIFICATION STATISTICS
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
                getNotificationManager(
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
                "Notification statistics error:",
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
 * GET SINGLE NOTIFICATION
 * =========================================================
 */

router.get(
    "/:notificationId",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const notification =
                manager.getNotification(
                    req.params.notificationId
                );


            if (
                !notification
            ) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    error:
                        "Notification not found"
                });
            }


            return res.json({

                success:
                    true,

                data:
                    notification
            });

        } catch (
        error
        ) {

            console.error(
                "Notification lookup error:",
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
 * MARK ONE AS READ
 * =========================================================
 */

router.post(
    "/:notificationId/read",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const notification =
                manager.markAsRead(
                    req.params.notificationId
                );


            if (
                !notification
            ) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    error:
                        "Notification not found"
                });
            }


            return res.json({

                success:
                    true,

                data:
                    notification,

                unreadCount:
                    manager.getUnreadCount()
            });

        } catch (
        error
        ) {

            console.error(
                "Mark notification read error:",
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
 * MARK ONE AS UNREAD
 * =========================================================
 */

router.post(
    "/:notificationId/unread",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const notification =
                manager.markAsUnread(
                    req.params.notificationId
                );


            if (
                !notification
            ) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    error:
                        "Notification not found"
                });
            }


            return res.json({

                success:
                    true,

                data:
                    notification,

                unreadCount:
                    manager.getUnreadCount()
            });

        } catch (
        error
        ) {

            console.error(
                "Mark notification unread error:",
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
 * MARK ALL AS READ
 * =========================================================
 */

router.post(
    "/read-all",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            manager.markAllAsRead();


            return res.json({

                success:
                    true,

                unreadCount:
                    manager.getUnreadCount(),

                data:
                    manager.getSnapshot()
            });

        } catch (
        error
        ) {

            console.error(
                "Mark all notifications read error:",
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
 * DELETE ONE NOTIFICATION
 * =========================================================
 */

router.delete(
    "/:notificationId",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            const removed =
                manager.removeNotification(
                    req.params.notificationId
                );


            if (
                !removed
            ) {

                return res.status(
                    404
                ).json({

                    success:
                        false,

                    error:
                        "Notification not found"
                });
            }


            return res.json({

                success:
                    true,

                unreadCount:
                    manager.getUnreadCount(),

                data:
                    manager.getSnapshot()
            });

        } catch (
        error
        ) {

            console.error(
                "Delete notification error:",
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
 * DELETE ALL NOTIFICATIONS
 * =========================================================
 */

router.delete(
    "/",
    (
        req,
        res
    ) => {

        try {

            const manager =
                getNotificationManager(
                    req
                );


            manager.clearAll();


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
                "Clear notifications error:",
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