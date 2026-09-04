/*
 * =========================================================
 * NovaOS SYSTEM LOG MANAGER
 * =========================================================
 *
 * Central logging subsystem for NovaOS.
 *
 * Responsibilities:
 * - Store system/runtime log entries
 * - Accept existing SystemEvent objects
 * - Support log levels
 * - Support filtering and searching
 * - Track log statistics
 * - Provide snapshots for API/UI consumption
 * - Limit in-memory history
 * - Reset cleanly with the NovaOS kernel
 *
 * This does NOT replace SystemEvent.
 * It consumes the existing NovaOS event architecture.
 * =========================================================
 */

export class SystemLogManager {

    constructor({
        maxHistory = 1000
    } = {}) {

        if (
            !Number.isInteger(maxHistory) ||
            maxHistory < 1
        ) {
            throw new Error(
                "maxHistory must be a positive integer."
            );
        }

        this.maxHistory = maxHistory;

        this.logs = [];

        this.nextLogId = 1;

        this.statistics = {
            total: 0,
            debug: 0,
            info: 0,
            warning: 0,
            error: 0,
            critical: 0
        };
    }


    /* =====================================================
       LOG LEVELS
       ===================================================== */

    static get LEVELS() {

        return Object.freeze([
            "debug",
            "info",
            "warning",
            "error",
            "critical"
        ]);
    }


    normalizeLevel(level) {

        const normalized =
            String(level ?? "info")
                .trim()
                .toLowerCase();

        if (
            !SystemLogManager.LEVELS.includes(
                normalized
            )
        ) {
            throw new Error(
                `Invalid log level '${level}'.`
            );
        }

        return normalized;
    }


    /* =====================================================
       CREATE LOG
       ===================================================== */

    createLog({
        level = "info",
        source = "system",
        type = "SYSTEM",
        message = "",
        payload = {},
        timestamp = new Date()
    } = {}) {

        const normalizedLevel =
            this.normalizeLevel(level);

        if (
            !source ||
            typeof source !== "string"
        ) {
            throw new Error(
                "Log source is required and must be a string."
            );
        }

        if (
            !type ||
            typeof type !== "string"
        ) {
            throw new Error(
                "Log type is required and must be a string."
            );
        }

        if (
            typeof message !== "string"
        ) {
            throw new Error(
                "Log message must be a string."
            );
        }

        const date =
            timestamp instanceof Date
                ? timestamp
                : new Date(timestamp);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            throw new Error(
                "Invalid log timestamp."
            );
        }

        const log = {
            id:
                `log-${this.nextLogId++}`,

            level:
                normalizedLevel,

            source:
                source.trim(),

            type:
                type.trim(),

            message,

            payload:
                payload &&
                typeof payload === "object"
                    ? payload
                    : {},

            timestamp:
                date.toISOString()
        };

        this.logs.unshift(log);

        this.statistics.total += 1;

        this.statistics[
            normalizedLevel
        ] += 1;

        this.enforceHistoryLimit();

        return {
            ...log,

            payload: {
                ...log.payload
            }
        };
    }


    /* =====================================================
       INGEST SYSTEM EVENT
       ===================================================== */

    ingestEvent(
        event,
        {
            level = "info",
            message = null
        } = {}
    ) {

        if (!event) {
            throw new Error(
                "System event is required."
            );
        }

        if (
            typeof event !== "object"
        ) {
            throw new Error(
                "System event must be an object."
            );
        }

        const eventType =
            String(
                event.type ??
                "SYSTEM_EVENT"
            );

        const eventSource =
            String(
                event.source ??
                "system"
            );

        const eventMessage =
            message !== null
                ? String(message)
                : this.createEventMessage(
                      eventType,
                      eventSource,
                      event.payload
                  );

        return this.createLog({
            level,
            source: eventSource,
            type: eventType,
            message: eventMessage,
            payload:
                event.payload ?? {},
            timestamp:
                event.timestamp ??
                new Date()
        });
    }


    /* =====================================================
       EVENT MESSAGE GENERATOR
       ===================================================== */

    createEventMessage(
        eventType,
        source,
        payload = {}
    ) {

        const type =
            String(eventType)
                .trim()
                .toLowerCase()
                .replace(
                    /_/g,
                    " "
                );

        const formattedType =
            type.replace(
                /\b\w/g,
                character =>
                    character.toUpperCase()
            );

        const identifier =
            payload?.pid ??
            payload?.windowId ??
            payload?.applicationId ??
            payload?.notificationId ??
            null;

        if (identifier) {
            return `${formattedType} (${identifier})`;
        }

        if (source) {
            return `${formattedType} from ${source}`;
        }

        return formattedType;
    }


    /* =====================================================
       CONVENIENCE METHODS
       ===================================================== */

    debug(
        message,
        options = {}
    ) {

        return this.createLog({
            ...options,
            level: "debug",
            message
        });
    }


    info(
        message,
        options = {}
    ) {

        return this.createLog({
            ...options,
            level: "info",
            message
        });
    }


    warning(
        message,
        options = {}
    ) {

        return this.createLog({
            ...options,
            level: "warning",
            message
        });
    }


    error(
        message,
        options = {}
    ) {

        return this.createLog({
            ...options,
            level: "error",
            message
        });
    }


    critical(
        message,
        options = {}
    ) {

        return this.createLog({
            ...options,
            level: "critical",
            message
        });
    }


    /* =====================================================
       HISTORY
       ===================================================== */

    enforceHistoryLimit() {

        if (
            this.logs.length <=
            this.maxHistory
        ) {
            return;
        }

        this.logs =
            this.logs.slice(
                0,
                this.maxHistory
            );
    }


    getLogs() {

        return this.logs.map(
            log => ({
                ...log,

                payload: {
                    ...log.payload
                }
            })
        );
    }


    getLog(logId) {

        const log =
            this.logs.find(
                entry =>
                    entry.id ===
                    logId
            );

        if (!log) {
            return null;
        }

        return {
            ...log,

            payload: {
                ...log.payload
            }
        };
    }


    /* =====================================================
       FILTER BY LEVEL
       ===================================================== */

    getLogsByLevel(level) {

        const normalizedLevel =
            this.normalizeLevel(
                level
            );

        return this.getLogs().filter(
            log =>
                log.level ===
                normalizedLevel
        );
    }


    /* =====================================================
       FILTER BY SOURCE
       ===================================================== */

    getLogsBySource(source) {

        const normalizedSource =
            String(source ?? "")
                .trim()
                .toLowerCase();

        if (!normalizedSource) {
            return [];
        }

        return this.getLogs().filter(
            log =>
                log.source
                    .toLowerCase() ===
                normalizedSource
        );
    }


    /* =====================================================
       FILTER BY TYPE
       ===================================================== */

    getLogsByType(type) {

        const normalizedType =
            String(type ?? "")
                .trim()
                .toLowerCase();

        if (!normalizedType) {
            return [];
        }

        return this.getLogs().filter(
            log =>
                log.type
                    .toLowerCase() ===
                normalizedType
        );
    }


    /* =====================================================
       SEARCH
       ===================================================== */

    searchLogs(query) {

        const normalizedQuery =
            String(query ?? "")
                .trim()
                .toLowerCase();

        if (!normalizedQuery) {
            return this.getLogs();
        }

        return this.getLogs().filter(
            log => {

                const searchableText =
                    [
                        log.id,
                        log.level,
                        log.source,
                        log.type,
                        log.message,
                        JSON.stringify(
                            log.payload
                        )
                    ]
                        .join(" ")
                        .toLowerCase();

                return searchableText.includes(
                    normalizedQuery
                );
            }
        );
    }


    /* =====================================================
       RECENT LOGS
       ===================================================== */

    getRecentLogs(
        limit = 50
    ) {

        if (
            !Number.isInteger(limit) ||
            limit < 1
        ) {
            throw new Error(
                "Log limit must be a positive integer."
            );
        }

        return this.getLogs().slice(
            0,
            limit
        );
    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    getStatistics() {

        return {
            ...this.statistics,

            retained:
                this.logs.length,

            maxHistory:
                this.maxHistory
        };
    }


    /* =====================================================
       SNAPSHOT
       ===================================================== */

    getSnapshot() {

        return {
            logs:
                this.getLogs(),

            statistics:
                this.getStatistics()
        };
    }


    /* =====================================================
       CLEAR
       ===================================================== */

    clear() {

        this.logs = [];

        this.statistics = {
            total: 0,
            debug: 0,
            info: 0,
            warning: 0,
            error: 0,
            critical: 0
        };
    }


    /* =====================================================
       RESET
       ===================================================== */

    reset() {

        this.clear();

        this.nextLogId = 1;
    }
}