import express from "express";
import cors from "cors";

import { kernel } from "./api/kernel.js";

import systemRoutes from "./api/routes/systemRoutes.js";
import applicationRoutes from "./api/routes/applicationRoutes.js";
import processRoutes from "./api/routes/processRoutes.js";
import memoryRoutes from "./api/routes/memoryRoutes.js";
import ioRoutes from "./api/routes/ioRoutes.js";
import synchronizationRoutes from "./api/routes/synchronizationRoutes.js";
import deadlockRoutes from "./api/routes/deadlockRoutes.js";
import filesystemRoutes from "./api/routes/filesystemRoutes.js";
import schedulerRoutes from "./api/routes/schedulerRoutes.js";
import pagingRoutes from "./api/routes/pagingRoutes.js";
import segmentationRoutes from "./api/routes/segmentationRoutes.js";
import virtualMemoryRoutes from "./api/routes/virtualMemoryRoutes.js";
import pageReplacementRoutes from "./api/routes/pageReplacementRoutes.js";
import notificationRoutes from "./api/routes/notificationRoutes.js";
import authenticationRoutes from "./api/routes/authenticationRoutes.js";
import systemLogRoutes from "./api/routes/systemLogRoutes.js";


const app = express();


app.use(
    cors({
        origin: true,
        credentials: true
    })
);


app.use(
    express.json({
        limit: "25mb"
    })
);


/*
 * =========================================================
 * NOVAOS KERNEL
 * =========================================================
 */

app.locals.kernel =
    kernel;


/*
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get(
    "/api/health",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            service:
                "NovaOS API",

            status:
                "online"
        });
    }
);


/*
 * =========================================================
 * SYSTEM
 * =========================================================
 */

app.use(
    "/api/system",
    systemRoutes
);


/*
 * =========================================================
 * APPLICATIONS
 * =========================================================
 */

app.use(
    "/api/applications",
    applicationRoutes
);


/*
 * =========================================================
 * PROCESSES
 * =========================================================
 */

app.use(
    "/api/processes",
    processRoutes
);


/*
 * =========================================================
 * MEMORY MANAGEMENT
 * =========================================================
 */

app.use(
    "/api/memory",
    memoryRoutes
);


/*
 * =========================================================
 * PAGING
 * =========================================================
 */

app.use(
    "/api/paging",
    pagingRoutes
);


/*
 * =========================================================
 * VIRTUAL MEMORY
 * =========================================================
 */

app.use(
    "/api/virtual-memory",
    virtualMemoryRoutes
);


/*
 * =========================================================
 * PAGE REPLACEMENT
 * =========================================================
 *
 * Provides:
 *
 * GET  /api/page-replacement/algorithms
 * GET  /api/page-replacement/statistics
 * GET  /api/page-replacement/snapshot
 * GET  /api/page-replacement/default
 * POST /api/page-replacement/default
 * POST /api/page-replacement/simulate
 * POST /api/page-replacement/compare
 * POST /api/page-replacement/victim
 * POST /api/page-replacement/reset
 *
 * Supported algorithms:
 *
 * FIFO
 * LRU
 * Optimal
 * Second Chance
 * Clock
 */

app.use(
    "/api/page-replacement",
    pageReplacementRoutes
);


/*
 * =========================================================
 * SEGMENTATION
 * =========================================================
 */

app.use(
    "/api/segmentation",
    segmentationRoutes
);


/*
 * =========================================================
 * I/O MANAGEMENT
 * =========================================================
 */

app.use(
    "/api/io",
    ioRoutes
);


/*
 * =========================================================
 * PROCESS SYNCHRONIZATION
 * =========================================================
 */

app.use(
    "/api/synchronization",
    synchronizationRoutes
);


/*
 * =========================================================
 * DEADLOCK MANAGEMENT
 * =========================================================
 */

app.use(
    "/api/deadlock",
    deadlockRoutes
);


/*
 * =========================================================
 * FILESYSTEM
 * =========================================================
 */

app.use(
    "/api/filesystem",
    filesystemRoutes
);


/*
 * =========================================================
 * CPU SCHEDULER
 * =========================================================
 */

app.use(
    "/api/scheduler",
    schedulerRoutes
);


/*
 * =========================================================
 * NOTIFICATIONS
 * =========================================================
 *
 * Provides:
 *
 * GET    /api/notifications
 * GET    /api/notifications/unread
 * GET    /api/notifications/snapshot
 * GET    /api/notifications/statistics
 * GET    /api/notifications/:notificationId
 * POST   /api/notifications/:notificationId/read
 * POST   /api/notifications/:notificationId/unread
 * POST   /api/notifications/read-all
 * DELETE /api/notifications/:notificationId
 * DELETE /api/notifications
 */

app.use(
    "/api/notifications",
    notificationRoutes
);


/*
 * =========================================================
 * AUTHENTICATION / USER SYSTEM
 * =========================================================
 *
 * Provides:
 *
 * POST   /api/auth/register
 * POST   /api/auth/login
 * POST   /api/auth/logout
 * GET    /api/auth/current
 * GET    /api/auth/snapshot
 * GET    /api/auth/users
 * POST   /api/auth/users
 * PATCH  /api/auth/users/:userId/enable
 * PATCH  /api/auth/users/:userId/disable
 * DELETE /api/auth/users/:userId
 * GET    /api/auth/profile
 */

app.use(
    "/api/auth",
    authenticationRoutes
);


/*
 * =========================================================
 * SYSTEM LOGGING
 * =========================================================
 *
 * Provides:
 *
 * GET    /api/system-logs
 * GET    /api/system-logs/recent
 * GET    /api/system-logs/snapshot
 * GET    /api/system-logs/statistics
 * GET    /api/system-logs/:logId
 * DELETE /api/system-logs
 *
 * Query support:
 *
 * ?level=error
 * ?source=kernel
 * ?type=PROCESS_CREATED
 * ?search=terminal
 * ?limit=50
 */

app.use(
    "/api/system-logs",
    systemLogRoutes
);


/*
 * =========================================================
 * 404 HANDLER
 * =========================================================
 */

app.use(
    (
        req,
        res
    ) => {

        res.status(
            404
        ).json({

            success:
                false,

            error:
                "API endpoint not found."
        });
    }
);


/*
 * =========================================================
 * ERROR HANDLER
 * =========================================================
 */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            error
        );


        res.status(
            500
        ).json({

            success:
                false,

            error:
                "Internal server error."
        });
    }
);


export default app;