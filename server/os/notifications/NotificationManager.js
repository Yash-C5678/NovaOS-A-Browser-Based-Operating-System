/*
 * =========================================================
 * NOVAOS NOTIFICATION MANAGER
 * =========================================================
 *
 * Central in-memory notification subsystem for NovaOS.
 *
 * Responsibilities:
 * - Create system/application notifications
 * - Maintain notification history
 * - Track read/unread state
 * - Remove individual notifications
 * - Clear notification history
 * - Consume NovaOS SystemEvents
 * - Allow API/frontend layers to subscribe to changes
 *
 * This manager intentionally does NOT use SQLite yet.
 * NovaOS Phase 2 currently keeps OS simulation state in memory.
 *
 * =========================================================
 */

const NOTIFICATION_TYPES = Object.freeze({
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error"
});


const NOTIFICATION_SOURCES = Object.freeze({
    SYSTEM: "system",
    APPLICATION: "application",
    PROCESS: "process",
    MEMORY: "memory",
    IO: "io",
    FILESYSTEM: "filesystem",
    CAMERA: "camera",
    SCHEDULER: "scheduler",
    SYNCHRONIZATION: "synchronization",
    DEADLOCK: "deadlock",
    VIRTUAL_MEMORY: "virtual-memory",
    PAGE_REPLACEMENT: "page-replacement"
});


const EVENT_NOTIFICATION_MAP = Object.freeze({

    APPLICATION_REGISTERED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.APPLICATION,
        title: "Application Registered"
    },

    PROCESS_CREATED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.PROCESS,
        title: "Process Created"
    },

    PROCESS_STARTED: {
        type: NOTIFICATION_TYPES.SUCCESS,
        source: NOTIFICATION_SOURCES.PROCESS,
        title: "Process Started"
    },

    PROCESS_TERMINATED: {
        type: NOTIFICATION_TYPES.SUCCESS,
        source: NOTIFICATION_SOURCES.PROCESS,
        title: "Process Terminated"
    },

    WINDOW_CREATED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.SYSTEM,
        title: "Window Opened"
    },

    WINDOW_MINIMIZED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.SYSTEM,
        title: "Window Minimized"
    },

    WINDOW_MAXIMIZED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.SYSTEM,
        title: "Window Maximized"
    },

    WINDOW_RESTORED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.SYSTEM,
        title: "Window Restored"
    },

    WINDOW_CLOSED: {
        type: NOTIFICATION_TYPES.INFO,
        source: NOTIFICATION_SOURCES.SYSTEM,
        title: "Window Closed"
    }

});


function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


function normalizeString(
    value,
    fallback = ""
) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        return fallback;
    }

    return value.trim();
}


function normalizeType(type) {
    const normalized =
        normalizeString(
            type,
            NOTIFICATION_TYPES.INFO
        ).toLowerCase();

    if (
        Object.values(
            NOTIFICATION_TYPES
        ).includes(normalized)
    ) {
        return normalized;
    }

    return NOTIFICATION_TYPES.INFO;
}


function normalizeSource(source) {
    const normalized =
        normalizeString(
            source,
            NOTIFICATION_SOURCES.SYSTEM
        ).toLowerCase();

    return normalized;
}


function cloneNotification(
    notification
) {
    return {
        ...notification,
        metadata:
            notification.metadata
                ? {
                    ...notification.metadata
                }
                : {}
    };
}


export class NotificationManager {

    constructor({
        maxHistory = 200
    } = {}) {

        if (
            !Number.isInteger(
                maxHistory
            ) ||
            maxHistory <= 0
        ) {
            throw new Error(
                "NotificationManager maxHistory must be a positive integer."
            );
        }


        this.maxHistory =
            maxHistory;

        this.notifications =
            [];

        this.nextNotificationId =
            1;

        this.listeners =
            new Set();
    }


    /*
     * =========================================================
     * CREATE NOTIFICATION
     * =========================================================
     */

    createNotification({
        title,
        message,
        type = NOTIFICATION_TYPES.INFO,
        source = NOTIFICATION_SOURCES.SYSTEM,
        applicationId = null,
        processId = null,
        eventType = null,
        metadata = {},
        read = false,
        timestamp = null
    } = {}) {

        const normalizedTitle =
            normalizeString(
                title
            );

        const normalizedMessage =
            normalizeString(
                message
            );

        if (!normalizedTitle) {
            throw new Error(
                "Notification title is required."
            );
        }

        if (!normalizedMessage) {
            throw new Error(
                "Notification message is required."
            );
        }


        if (
            !isPlainObject(
                metadata
            )
        ) {
            throw new Error(
                "Notification metadata must be an object."
            );
        }


        const notification = {

            id:
                `notification-${this.nextNotificationId++}`,

            title:
                normalizedTitle,

            message:
                normalizedMessage,

            type:
                normalizeType(
                    type
                ),

            source:
                normalizeSource(
                    source
                ),

            applicationId:
                applicationId !== null
                    ? String(applicationId)
                    : null,

            processId:
                processId !== null
                    ? String(processId)
                    : null,

            eventType:
                eventType !== null
                    ? String(eventType)
                    : null,

            metadata: {
                ...metadata
            },

            read:
                Boolean(read),

            timestamp:
                timestamp instanceof Date
                    ? timestamp.toISOString()
                    : timestamp
                        ? new Date(timestamp).toISOString()
                        : new Date().toISOString()
        };


        this.notifications.unshift(
            notification
        );


        this.trimHistory();

        this.emitChange();

        return cloneNotification(
            notification
        );
    }


    /*
     * =========================================================
     * EVENT INTEGRATION
     * =========================================================
     *
     * NovaRuntime already produces SystemEvents.
     * This method translates only meaningful events into
     * user-facing notifications.
     *
     * Not every SystemEvent should become a notification.
     * For example, WINDOW_FOCUSED would create unnecessary
     * notification spam.
     */

    ingestEvent(
        event
    ) {

        if (
            !isPlainObject(
                event
            )
        ) {
            throw new Error(
                "NotificationManager.ingestEvent requires an event object."
            );
        }


        const eventType =
            normalizeString(
                event.type
            );


        if (!eventType) {
            return null;
        }


        const definition =
            EVENT_NOTIFICATION_MAP[
                eventType
            ];


        if (!definition) {
            return null;
        }


        const payload =
            isPlainObject(
                event.payload
            )
                ? event.payload
                : {};


        const applicationId =
            payload.applicationId ??
            null;

        const processId =
            payload.pid ??
            payload.processId ??
            null;

        const windowId =
            payload.windowId ??
            null;


        const applicationLabel =
            applicationId
                ? `Application '${applicationId}'`
                : "Application";


        let message;


        switch (
            eventType
        ) {

            case "APPLICATION_REGISTERED":

                message =
                    `${applicationLabel} was registered with NovaOS.`;

                break;


            case "PROCESS_CREATED":

                message =
                    processId
                        ? `Process ${processId} was created for ${applicationId ?? "an application"}.`
                        : "A new process was created.";

                break;


            case "PROCESS_STARTED":

                message =
                    processId
                        ? `Process ${processId} entered CPU execution.`
                        : "A process entered CPU execution.";

                break;


            case "PROCESS_TERMINATED":

                message =
                    processId
                        ? `Process ${processId} terminated.`
                        : "A process terminated.";

                break;


            case "WINDOW_CREATED":

                message =
                    windowId
                        ? `Window ${windowId} was opened.`
                        : "A new application window was opened.";

                break;


            case "WINDOW_MINIMIZED":

                message =
                    windowId
                        ? `Window ${windowId} was minimized.`
                        : "An application window was minimized.";

                break;


            case "WINDOW_MAXIMIZED":

                message =
                    windowId
                        ? `Window ${windowId} was maximized.`
                        : "An application window was maximized.";

                break;


            case "WINDOW_RESTORED":

                message =
                    windowId
                        ? `Window ${windowId} was restored.`
                        : "An application window was restored.";

                break;


            case "WINDOW_CLOSED":

                message =
                    windowId
                        ? `Window ${windowId} was closed.`
                        : "An application window was closed.";

                break;


            default:

                message =
                    `NovaOS reported event ${eventType}.`;
        }


        return this.createNotification({

            title:
                definition.title,

            message,

            type:
                definition.type,

            source:
                definition.source,

            applicationId,

            processId,

            eventType,

            metadata: {
                eventSource:
                    event.source ?? null,

                windowId
            },

            timestamp:
                event.timestamp ??
                null
        });
    }


    /*
     * =========================================================
     * READ STATE
     * =========================================================
     */

    markAsRead(
        notificationId
    ) {

        const notification =
            this.findNotification(
                notificationId
            );


        if (!notification) {
            return null;
        }


        if (
            !notification.read
        ) {
            notification.read =
                true;

            this.emitChange();
        }


        return cloneNotification(
            notification
        );
    }


    markAsUnread(
        notificationId
    ) {

        const notification =
            this.findNotification(
                notificationId
            );


        if (!notification) {
            return null;
        }


        if (
            notification.read
        ) {
            notification.read =
                false;

            this.emitChange();
        }


        return cloneNotification(
            notification
        );
    }


    markAllAsRead() {

        let changed =
            false;


        for (
            const notification
            of this.notifications
        ) {

            if (
                !notification.read
            ) {
                notification.read =
                    true;

                changed =
                    true;
            }
        }


        if (changed) {
            this.emitChange();
        }


        return this.getUnreadCount();
    }


    /*
     * =========================================================
     * DELETE / CLEAR
     * =========================================================
     */

    removeNotification(
        notificationId
    ) {

        const index =
            this.notifications.findIndex(
                (notification) =>
                    notification.id ===
                    String(
                        notificationId
                    )
            );


        if (
            index === -1
        ) {
            return false;
        }


        this.notifications.splice(
            index,
            1
        );


        this.emitChange();

        return true;
    }


    clearAll() {

        const hadNotifications =
            this.notifications.length > 0;


        this.notifications =
            [];


        if (
            hadNotifications
        ) {
            this.emitChange();
        }


        return hadNotifications;
    }


    clearRead() {

        const originalLength =
            this.notifications.length;


        this.notifications =
            this.notifications.filter(
                (notification) =>
                    !notification.read
            );


        const removed =
            originalLength -
            this.notifications.length;


        if (
            removed > 0
        ) {
            this.emitChange();
        }


        return removed;
    }


    /*
     * =========================================================
     * QUERY
     * =========================================================
     */

    findNotification(
        notificationId
    ) {

        const id =
            String(
                notificationId
            );


        return (
            this.notifications.find(
                (notification) =>
                    notification.id === id
            ) ?? null
        );
    }


    getNotification(
        notificationId
    ) {

        const notification =
            this.findNotification(
                notificationId
            );


        return notification
            ? cloneNotification(
                notification
            )
            : null;
    }


    getAll({
        unreadOnly = false,
        source = null,
        type = null,
        applicationId = null,
        processId = null
    } = {}) {

        let result =
            this.notifications;


        if (
            unreadOnly
        ) {
            result =
                result.filter(
                    (notification) =>
                        !notification.read
                );
        }


        if (
            source !== null
        ) {

            const normalizedSource =
                normalizeSource(
                    source
                );

            result =
                result.filter(
                    (notification) =>
                        notification.source ===
                        normalizedSource
                );
        }


        if (
            type !== null
        ) {

            const normalizedType =
                normalizeType(
                    type
                );

            result =
                result.filter(
                    (notification) =>
                        notification.type ===
                        normalizedType
                );
        }


        if (
            applicationId !== null
        ) {

            const normalizedApplicationId =
                String(
                    applicationId
                );

            result =
                result.filter(
                    (notification) =>
                        notification.applicationId ===
                        normalizedApplicationId
                );
        }


        if (
            processId !== null
        ) {

            const normalizedProcessId =
                String(
                    processId
                );

            result =
                result.filter(
                    (notification) =>
                        notification.processId ===
                        normalizedProcessId
                );
        }


        return result.map(
            cloneNotification
        );
    }


    getUnread() {

        return this.getAll({
            unreadOnly: true
        });
    }


    getUnreadCount() {

        return this.notifications.filter(
            (notification) =>
                !notification.read
        ).length;
    }


    getCount() {

        return this.notifications.length;
    }


    /*
     * =========================================================
     * STATISTICS
     * =========================================================
     */

    getStatistics() {

        const total =
            this.notifications.length;

        const unread =
            this.getUnreadCount();

        const read =
            total -
            unread;


        const byType = {

            [NOTIFICATION_TYPES.INFO]:
                0,

            [NOTIFICATION_TYPES.SUCCESS]:
                0,

            [NOTIFICATION_TYPES.WARNING]:
                0,

            [NOTIFICATION_TYPES.ERROR]:
                0
        };


        const bySource = {};


        for (
            const notification
            of this.notifications
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    byType,
                    notification.type
                )
            ) {
                byType[
                    notification.type
                ]++;
            }


            bySource[
                notification.source
            ] =
                (
                    bySource[
                        notification.source
                    ] ?? 0
                ) + 1;
        }


        return {

            total,

            unread,

            read,

            maxHistory:
                this.maxHistory,

            byType,

            bySource
        };
    }


    /*
     * =========================================================
     * SNAPSHOT
     * =========================================================
     */

    getSnapshot() {

        return {

            notifications:
                this.getAll(),

            unreadCount:
                this.getUnreadCount(),

            statistics:
                this.getStatistics()
        };
    }


    /*
     * =========================================================
     * SUBSCRIPTIONS
     * =========================================================
     *
     * The frontend/API integration can subscribe later without
     * modifying the notification storage implementation.
     */

    subscribe(
        listener
    ) {

        if (
            typeof listener !==
            "function"
        ) {
            throw new Error(
                "NotificationManager listener must be a function."
            );
        }


        this.listeners.add(
            listener
        );


        return () => {

            this.listeners.delete(
                listener
            );
        };
    }


    emitChange() {

        const snapshot =
            this.getSnapshot();


        for (
            const listener
            of this.listeners
        ) {

            try {

                listener(
                    snapshot
                );

            } catch (
                error
            ) {

                /*
                 * A notification subscriber must never
                 * break the OS notification subsystem.
                 */

                console.error(
                    "NovaOS notification listener error:",
                    error
                );
            }
        }
    }


    /*
     * =========================================================
     * INTERNAL HISTORY MANAGEMENT
     * =========================================================
     */

    trimHistory() {

        if (
            this.notifications.length <=
            this.maxHistory
        ) {
            return;
        }


        this.notifications =
            this.notifications.slice(
                0,
                this.maxHistory
            );
    }


    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    reset() {

        this.notifications =
            [];

        this.nextNotificationId =
            1;

        this.emitChange();
    }


    /*
     * =========================================================
     * CONFIGURATION
     * =========================================================
     */

    getMaxHistory() {

        return this.maxHistory;
    }


    setMaxHistory(
        maxHistory
    ) {

        if (
            !Number.isInteger(
                maxHistory
            ) ||
            maxHistory <= 0
        ) {
            throw new Error(
                "NotificationManager maxHistory must be a positive integer."
            );
        }


        this.maxHistory =
            maxHistory;

        this.trimHistory();

        this.emitChange();

        return this.maxHistory;
    }
}


export {
    NOTIFICATION_TYPES,
    NOTIFICATION_SOURCES
};