import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import NovaIcon from "../ui/NovaIcon";


const REFRESH_INTERVAL = 1500;


const LEVELS = [
    "all",
    "debug",
    "info",
    "warning",
    "error",
    "critical"
];


function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString();
}


function formatTimestamp(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString();
}


function formatTime(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleTimeString();
}


function normalizeLevel(level) {
    const normalized =
        String(
            level ?? "info"
        )
            .trim()
            .toLowerCase();

    return LEVELS.includes(
        normalized
    )
        ? normalized
        : "info";
}


function getLevelClass(level) {
    return `system-log-level-${normalizeLevel(
        level
    )}`;
}


function getLevelLabel(level) {
    return normalizeLevel(
        level
    ).toUpperCase();
}


function getSourceLabel(source) {
    if (
        source === null ||
        source === undefined ||
        source === ""
    ) {
        return "unknown";
    }

    return String(source);
}


function safeJsonStringify(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "—";
    }

    try {
        return JSON.stringify(
            value,
            null,
            2
        );
    } catch {
        return String(value);
    }
}


function StatCard({
    icon,
    label,
    value,
    detail,
    tone = ""
}) {
    return (
        <div
            className={`system-logs-stat-card ${tone}`}
        >
            <div className="system-logs-stat-top">
                <div className="system-logs-stat-icon">
                    {icon}
                </div>

                <span>
                    {label}
                </span>
            </div>

            <strong>
                {value}
            </strong>

            {detail && (
                <small>
                    {detail}
                </small>
            )}
        </div>
    );
}


function EmptyState({
    title,
    message
}) {
    return (
        <div className="system-logs-empty">
            <div className="system-logs-empty-icon">
                <NovaIcon
                    name="application"
                    size={26}
                />
            </div>

            <h3>
                {title}
            </h3>

            <p>
                {message}
            </p>
        </div>
    );
}


function SystemLogs() {
    const [
        logs,
        setLogs
    ] = useState([]);

    const [
        statistics,
        setStatistics
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        refreshing,
        setRefreshing
    ] = useState(false);

    const [
        clearing,
        setClearing
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        lastUpdated,
        setLastUpdated
    ] = useState(null);

    const [
        search,
        setSearch
    ] = useState("");

    const [
        levelFilter,
        setLevelFilter
    ] = useState("all");

    const [
        sourceFilter,
        setSourceFilter
    ] = useState("all");

    const [
        typeFilter,
        setTypeFilter
    ] = useState("all");

    const [
        expandedLogId,
        setExpandedLogId
    ] = useState(null);


    /*
     * =========================================================
     * FETCH LOG DATA
     * =========================================================
     */

    const fetchLogs =
        useCallback(
            async ({
                silent = false
            } = {}) => {
                if (!silent) {
                    setRefreshing(true);
                }

                try {
                    const [
                        logsResponse,
                        statisticsResponse
                    ] =
                        await Promise.all([
                            fetch(
                                "/api/system-logs?limit=1000"
                            ),
                            fetch(
                                "/api/system-logs/statistics"
                            )
                        ]);

                    if (
                        !logsResponse.ok
                    ) {
                        throw new Error(
                            `System log request failed: ${logsResponse.status}`
                        );
                    }

                    if (
                        !statisticsResponse.ok
                    ) {
                        throw new Error(
                            `System log statistics request failed: ${statisticsResponse.status}`
                        );
                    }

                    const logsResult =
                        await logsResponse.json();

                    const statisticsResult =
                        await statisticsResponse.json();

                    if (
                        !logsResult.success
                    ) {
                        throw new Error(
                            logsResult.error ||
                            "Unable to retrieve system logs."
                        );
                    }

                    if (
                        !statisticsResult.success
                    ) {
                        throw new Error(
                            statisticsResult.error ||
                            "Unable to retrieve system log statistics."
                        );
                    }

                    const nextLogs =
                        Array.isArray(
                            logsResult.data
                        )
                            ? logsResult.data
                            : [];

                    setLogs(
                        nextLogs
                    );

                    setStatistics(
                        statisticsResult.data ??
                        null
                    );

                    setError("");
                    setLastUpdated(
                        new Date()
                    );
                } catch (
                    requestError
                ) {
                    setError(
                        requestError.message ||
                        "Unable to retrieve system logs."
                    );
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            []
        );


    /*
     * =========================================================
     * INITIAL LOAD + LIVE REFRESH
     * =========================================================
     */

    useEffect(() => {
        fetchLogs();

        const interval =
            setInterval(
                () => {
                    fetchLogs({
                        silent: true
                    });
                },
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        fetchLogs
    ]);


    /*
     * =========================================================
     * FILTER OPTIONS
     * =========================================================
     */

    const sourceOptions =
        useMemo(
            () => {
                const values =
                    new Set();

                for (
                    const log
                    of logs
                ) {
                    const source =
                        getSourceLabel(
                            log?.source
                        );

                    if (
                        source &&
                        source !== "unknown"
                    ) {
                        values.add(
                            source
                        );
                    }
                }

                return Array.from(
                    values
                ).sort(
                    (a, b) =>
                        a.localeCompare(
                            b
                        )
                );
            },
            [logs]
        );


    const typeOptions =
        useMemo(
            () => {
                const values =
                    new Set();

                for (
                    const log
                    of logs
                ) {
                    const type =
                        String(
                            log?.type ??
                            ""
                        ).trim();

                    if (type) {
                        values.add(
                            type
                        );
                    }
                }

                return Array.from(
                    values
                ).sort(
                    (a, b) =>
                        a.localeCompare(
                            b
                        )
                );
            },
            [logs]
        );


    /*
     * =========================================================
     * FILTERED LOGS
     * =========================================================
     */

    const filteredLogs =
        useMemo(
            () => {
                const normalizedSearch =
                    search
                        .trim()
                        .toLowerCase();

                return logs.filter(
                    (log) => {
                        const level =
                            normalizeLevel(
                                log?.level
                            );

                        const source =
                            getSourceLabel(
                                log?.source
                            );

                        const type =
                            String(
                                log?.type ??
                                ""
                            );

                        const message =
                            String(
                                log?.message ??
                                ""
                            );

                        if (
                            levelFilter !==
                                "all" &&
                            level !==
                                levelFilter
                        ) {
                            return false;
                        }

                        if (
                            sourceFilter !==
                                "all" &&
                            source !==
                                sourceFilter
                        ) {
                            return false;
                        }

                        if (
                            typeFilter !==
                                "all" &&
                            type !==
                                typeFilter
                        ) {
                            return false;
                        }

                        if (
                            normalizedSearch
                        ) {
                            const searchable =
                                [
                                    log?.id,
                                    level,
                                    source,
                                    type,
                                    message,
                                    safeJsonStringify(
                                        log?.payload
                                    )
                                ]
                                    .join(
                                        " "
                                    )
                                    .toLowerCase();

                            if (
                                !searchable.includes(
                                    normalizedSearch
                                )
                            ) {
                                return false;
                            }
                        }

                        return true;
                    }
                );
            },
            [
                logs,
                search,
                levelFilter,
                sourceFilter,
                typeFilter
            ]
        );


    /*
     * =========================================================
     * DISPLAY STATISTICS
     * =========================================================
     */

    const displayedStatistics =
        useMemo(
            () => {
                const counts = {
                    total: logs.length,
                    debug: 0,
                    info: 0,
                    warning: 0,
                    error: 0,
                    critical: 0
                };

                for (
                    const log
                    of logs
                ) {
                    const level =
                        normalizeLevel(
                            log?.level
                        );

                    if (
                        Object.prototype.hasOwnProperty.call(
                            counts,
                            level
                        )
                    ) {
                        counts[
                            level
                        ]++;
                    }
                }

                const backend =
                    statistics &&
                    typeof statistics ===
                        "object"
                        ? statistics
                        : {};

                return {
                    total:
                        Number.isFinite(
                            Number(
                                backend.total
                            )
                        )
                            ? Number(
                                backend.total
                            )
                            : counts.total,

                    debug:
                        Number.isFinite(
                            Number(
                                backend.debug
                            )
                        )
                            ? Number(
                                backend.debug
                            )
                            : counts.debug,

                    info:
                        Number.isFinite(
                            Number(
                                backend.info
                            )
                        )
                            ? Number(
                                backend.info
                            )
                            : counts.info,

                    warning:
                        Number.isFinite(
                            Number(
                                backend.warning
                            )
                        )
                            ? Number(
                                backend.warning
                            )
                            : counts.warning,

                    error:
                        Number.isFinite(
                            Number(
                                backend.error
                            )
                        )
                            ? Number(
                                backend.error
                            )
                            : counts.error,

                    critical:
                        Number.isFinite(
                            Number(
                                backend.critical
                            )
                        )
                            ? Number(
                                backend.critical
                            )
                            : counts.critical
                };
            },
            [
                logs,
                statistics
            ]
        );


    /*
     * =========================================================
     * CLEAR FILTERS
     * =========================================================
     */

    const clearFilters =
        () => {
            setSearch("");
            setLevelFilter("all");
            setSourceFilter("all");
            setTypeFilter("all");
        };


    const filtersActive =
        Boolean(
            search.trim() ||
            levelFilter !== "all" ||
            sourceFilter !== "all" ||
            typeFilter !== "all"
        );


    /*
     * =========================================================
     * CLEAR ALL LOGS
     * =========================================================
     */

    const clearLogs =
        async () => {
            if (
                clearing ||
                logs.length === 0
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    "Clear all NovaOS system logs?"
                );

            if (!confirmed) {
                return;
            }

            setClearing(true);
            setError("");

            try {
                const response =
                    await fetch(
                        "/api/system-logs",
                        {
                            method: "DELETE"
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Unable to clear system logs."
                    );
                }

                setLogs([]);
                setStatistics(
                    result.data?.statistics ??
                    null
                );
                setExpandedLogId(null);
                setLastUpdated(
                    new Date()
                );
            } catch (
                clearError
            ) {
                setError(
                    clearError.message ||
                    "Unable to clear system logs."
                );
            } finally {
                setClearing(false);
            }
        };


    /*
     * =========================================================
     * LOG DETAILS
     * =========================================================
     */

    const toggleLog =
        (logId) => {
            setExpandedLogId(
                (current) =>
                    current === logId
                        ? null
                        : logId
            );
        };


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div
            className="system-logs-app"
            style={{
                width: "100%",
                height: "100%",
                minHeight: "100%",
                boxSizing: "border-box",
                overflow: "auto",
                padding: "20px",
                background:
                    "var(--nova-bg, #09090f)",
                color:
                    "var(--nova-text, #f5f5f7)",
                fontFamily:
                    "Inter, system-ui, sans-serif"
            }}
        >
            <style>
                {`
                    .system-logs-app {
                        scrollbar-width: thin;
                    }

                    .system-logs-app *,
                    .system-logs-app *::before,
                    .system-logs-app *::after {
                        box-sizing: border-box;
                    }

                    .system-logs-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 20px;
                        margin-bottom: 18px;
                    }

                    .system-logs-title-row {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .system-logs-title-icon {
                        width: 42px;
                        height: 42px;
                        border-radius: 12px;
                        display: grid;
                        place-items: center;
                        background: var(--nova-accent-soft, rgba(124,92,255,.14));
                        border: 1px solid var(--nova-accent-border, rgba(124,92,255,.35));
                        color: var(--nova-accent, #7c5cff);
                    }

                    .system-logs-title h1 {
                        margin: 0;
                        font-size: 22px;
                        line-height: 1.2;
                        letter-spacing: -0.025em;
                    }

                    .system-logs-title p {
                        margin: 5px 0 0;
                        color: var(--nova-muted, rgba(245,245,247,.58));
                        font-size: 12px;
                    }

                    .system-logs-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-wrap: wrap;
                        justify-content: flex-end;
                    }

                    .system-logs-button {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 7px;
                        min-height: 34px;
                        padding: 8px 11px;
                        border-radius: 9px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.10));
                        background: rgba(255,255,255,.04);
                        color: inherit;
                        font: inherit;
                        font-size: 11px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: .16s ease;
                    }

                    .system-logs-button:hover:not(:disabled) {
                        background: rgba(255,255,255,.08);
                        border-color: var(--nova-accent-border, rgba(124,92,255,.35));
                    }

                    .system-logs-button:disabled {
                        cursor: not-allowed;
                        opacity: .45;
                    }

                    .system-logs-button.primary {
                        background: var(--nova-accent, #7c5cff);
                        border-color: var(--nova-accent, #7c5cff);
                        color: #fff;
                    }

                    .system-logs-button.danger {
                        color: #ffb4b4;
                        border-color: rgba(255,90,90,.20);
                        background: rgba(255,90,90,.06);
                    }

                    .system-logs-button.danger:hover:not(:disabled) {
                        background: rgba(255,90,90,.11);
                        border-color: rgba(255,90,90,.35);
                    }

                    .system-logs-stats {
                        display: grid;
                        grid-template-columns: repeat(6, minmax(0, 1fr));
                        gap: 10px;
                        margin-bottom: 14px;
                    }

                    .system-logs-stat-card {
                        min-width: 0;
                        padding: 13px;
                        border-radius: 12px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.10));
                        background: var(--nova-panel, rgba(20,20,30,.72));
                    }

                    .system-logs-stat-top {
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        color: var(--nova-muted, rgba(245,245,247,.58));
                        font-size: 10px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: .05em;
                    }

                    .system-logs-stat-icon {
                        display: grid;
                        place-items: center;
                        opacity: .85;
                    }

                    .system-logs-stat-card strong {
                        display: block;
                        margin-top: 8px;
                        font-size: 21px;
                        line-height: 1;
                        letter-spacing: -.02em;
                    }

                    .system-logs-stat-card small {
                        display: block;
                        margin-top: 6px;
                        font-size: 10px;
                        opacity: .45;
                    }

                    .system-logs-stat-card.warning strong {
                        color: #f5c66d;
                    }

                    .system-logs-stat-card.error strong,
                    .system-logs-stat-card.critical strong {
                        color: #ff9696;
                    }

                    .system-logs-toolbar {
                        display: grid;
                        grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(130px, .7fr)) auto;
                        gap: 8px;
                        align-items: center;
                        padding: 10px;
                        margin-bottom: 12px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.10));
                        border-radius: 12px;
                        background: var(--nova-panel, rgba(20,20,30,.72));
                    }

                    .system-logs-search {
                        position: relative;
                        min-width: 0;
                    }

                    .system-logs-search-icon {
                        position: absolute;
                        left: 11px;
                        top: 50%;
                        transform: translateY(-50%);
                        opacity: .45;
                        pointer-events: none;
                    }

                    .system-logs-input,
                    .system-logs-select {
                        width: 100%;
                        min-height: 34px;
                        border-radius: 8px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.10));
                        background: rgba(255,255,255,.035);
                        color: inherit;
                        outline: none;
                        font: inherit;
                        font-size: 11px;
                    }

                    .system-logs-input {
                        padding: 8px 10px 8px 32px;
                    }

                    .system-logs-select {
                        padding: 8px 28px 8px 9px;
                    }

                    .system-logs-input:focus,
                    .system-logs-select:focus {
                        border-color: var(--nova-accent-border, rgba(124,92,255,.45));
                        background: rgba(255,255,255,.05);
                    }

                    .system-logs-select option {
                        background: #171722;
                        color: #fff;
                    }

                    .system-logs-filter-info {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 34px;
                        padding: 0 8px;
                        font-size: 10px;
                        opacity: .55;
                        white-space: nowrap;
                    }

                    .system-logs-table-container {
                        border: 1px solid var(--nova-border, rgba(255,255,255,.10));
                        border-radius: 13px;
                        background: var(--nova-panel, rgba(20,20,30,.72));
                        overflow: hidden;
                    }

                    .system-logs-table-header {
                        display: grid;
                        grid-template-columns: 96px 150px minmax(120px, .7fr) minmax(150px, 1fr) 95px 30px;
                        gap: 10px;
                        align-items: center;
                        padding: 10px 13px;
                        border-bottom: 1px solid var(--nova-border, rgba(255,255,255,.08));
                        background: rgba(255,255,255,.025);
                        color: var(--nova-muted, rgba(245,245,247,.50));
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: .07em;
                    }

                    .system-logs-row {
                        border-bottom: 1px solid var(--nova-border, rgba(255,255,255,.06));
                    }

                    .system-logs-row:last-child {
                        border-bottom: 0;
                    }

                    .system-logs-row-main {
                        display: grid;
                        grid-template-columns: 96px 150px minmax(120px, .7fr) minmax(150px, 1fr) 95px 30px;
                        gap: 10px;
                        align-items: center;
                        min-height: 54px;
                        padding: 8px 13px;
                        cursor: pointer;
                        transition: background .14s ease;
                    }

                    .system-logs-row-main:hover {
                        background: rgba(255,255,255,.035);
                    }

                    .system-logs-row-main.expanded {
                        background: var(--nova-accent-soft, rgba(124,92,255,.08));
                    }

                    .system-logs-level {
                        display: inline-flex;
                        align-items: center;
                        width: fit-content;
                        padding: 4px 7px;
                        border-radius: 6px;
                        font-size: 9px;
                        font-weight: 900;
                        letter-spacing: .04em;
                        border: 1px solid rgba(255,255,255,.08);
                    }

                    .system-log-level-debug {
                        color: #b7b9c7;
                        background: rgba(183,185,199,.08);
                    }

                    .system-log-level-info {
                        color: #aeb9ff;
                        background: rgba(124,92,255,.09);
                    }

                    .system-log-level-warning {
                        color: #f5c66d;
                        background: rgba(245,198,109,.09);
                        border-color: rgba(245,198,109,.18);
                    }

                    .system-log-level-error {
                        color: #ff9c9c;
                        background: rgba(255,90,90,.09);
                        border-color: rgba(255,90,90,.18);
                    }

                    .system-log-level-critical {
                        color: #ff7c7c;
                        background: rgba(255,60,60,.13);
                        border-color: rgba(255,60,60,.28);
                    }

                    .system-logs-mono {
                        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
                        font-size: 10px;
                    }

                    .system-logs-id {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        opacity: .65;
                    }

                    .system-logs-source {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-size: 11px;
                    }

                    .system-logs-type {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-size: 10px;
                        font-weight: 700;
                    }

                    .system-logs-message {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        font-size: 11px;
                        opacity: .86;
                    }

                    .system-logs-time {
                        font-size: 10px;
                        opacity: .55;
                        white-space: nowrap;
                    }

                    .system-logs-expand {
                        display: grid;
                        place-items: center;
                        opacity: .45;
                    }

                    .system-logs-details {
                        padding: 0 13px 13px;
                        background: rgba(0,0,0,.08);
                    }

                    .system-logs-details-grid {
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 8px;
                        margin-bottom: 9px;
                    }

                    .system-logs-detail-box {
                        min-width: 0;
                        padding: 10px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.08));
                        border-radius: 9px;
                        background: rgba(255,255,255,.025);
                    }

                    .system-logs-detail-box span {
                        display: block;
                        margin-bottom: 5px;
                        color: var(--nova-muted, rgba(245,245,247,.48));
                        font-size: 9px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: .06em;
                    }

                    .system-logs-detail-box strong {
                        display: block;
                        overflow-wrap: anywhere;
                        font-size: 10px;
                        font-weight: 700;
                    }

                    .system-logs-payload {
                        margin: 0;
                        padding: 12px;
                        border: 1px solid var(--nova-border, rgba(255,255,255,.08));
                        border-radius: 9px;
                        background: rgba(0,0,0,.16);
                        color: rgba(245,245,247,.78);
                        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
                        font-size: 10px;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        overflow: auto;
                        max-height: 260px;
                    }

                    .system-logs-empty {
                        display: grid;
                        place-items: center;
                        min-height: 260px;
                        padding: 30px;
                        text-align: center;
                    }

                    .system-logs-empty-icon {
                        width: 54px;
                        height: 54px;
                        border-radius: 16px;
                        display: grid;
                        place-items: center;
                        margin-bottom: 12px;
                        background: rgba(255,255,255,.045);
                        border: 1px solid var(--nova-border, rgba(255,255,255,.08));
                        opacity: .6;
                    }

                    .system-logs-empty h3 {
                        margin: 0 0 5px;
                        font-size: 14px;
                    }

                    .system-logs-empty p {
                        max-width: 440px;
                        margin: 0;
                        font-size: 11px;
                        line-height: 1.5;
                        opacity: .5;
                    }

                    .system-logs-error {
                        display: flex;
                        align-items: flex-start;
                        gap: 9px;
                        margin-bottom: 12px;
                        padding: 10px 12px;
                        border-radius: 10px;
                        border: 1px solid rgba(255,90,90,.20);
                        background: rgba(255,90,90,.07);
                        color: #ffb4b4;
                        font-size: 11px;
                        line-height: 1.45;
                    }

                    .system-logs-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 10px;
                        padding-top: 10px;
                        font-size: 10px;
                        opacity: .48;
                    }

                    .system-logs-footer-left,
                    .system-logs-footer-right {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .system-logs-live-dot {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        background: #46d99b;
                        box-shadow: 0 0 0 3px rgba(70,217,155,.10);
                    }

                    @media (max-width: 1050px) {
                        .system-logs-stats {
                            grid-template-columns: repeat(3, minmax(0, 1fr));
                        }

                        .system-logs-toolbar {
                            grid-template-columns: 1fr 1fr;
                        }

                        .system-logs-filter-info {
                            justify-content: flex-start;
                        }
                    }

                    @media (max-width: 760px) {
                        .system-logs-header {
                            flex-direction: column;
                        }

                        .system-logs-actions {
                            justify-content: flex-start;
                        }

                        .system-logs-stats {
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                        }

                        .system-logs-toolbar {
                            grid-template-columns: 1fr;
                        }

                        .system-logs-table-container {
                            overflow-x: auto;
                        }

                        .system-logs-table-header,
                        .system-logs-row-main {
                            min-width: 720px;
                        }
                    }
                `}
            </style>


            <div className="system-logs-header">
                <div className="system-logs-title">
                    <div className="system-logs-title-row">
                        <div className="system-logs-title-icon">
                            <NovaIcon
                                name="application"
                                size={21}
                            />
                        </div>

                        <div>
                            <h1>
                                System Logs
                            </h1>

                            <p>
                                Kernel and runtime event history from the NovaOS logging subsystem.
                            </p>
                        </div>
                    </div>
                </div>


                <div className="system-logs-actions">
                    <button
                        type="button"
                        className="system-logs-button"
                        onClick={() =>
                            fetchLogs()
                        }
                        disabled={
                            refreshing ||
                            clearing
                        }
                    >
                        <NovaIcon
                            name="application"
                            size={14}
                        />

                        {refreshing
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>

                    <button
                        type="button"
                        className="system-logs-button danger"
                        onClick={
                            clearLogs
                        }
                        disabled={
                            clearing ||
                            refreshing ||
                            logs.length === 0
                        }
                    >
                        <NovaIcon
                            name="close"
                            size={14}
                        />

                        {clearing
                            ? "Clearing..."
                            : "Clear Logs"}
                    </button>
                </div>
            </div>


            {error && (
                <div
                    className="system-logs-error"
                    role="alert"
                >
                    <NovaIcon
                        name="close"
                        size={15}
                    />

                    <div>
                        <strong>
                            System logging error
                        </strong>

                        <div>
                            {error}
                        </div>
                    </div>
                </div>
            )}


            <div className="system-logs-stats">
                <StatCard
                    icon={
                        <NovaIcon
                            name="application"
                            size={13}
                        />
                    }
                    label="Total"
                    value={formatNumber(
                        displayedStatistics.total
                    )}
                    detail="All retained logs"
                />

                <StatCard
                    icon={
                        <NovaIcon
                            name="application"
                            size={13}
                        />
                    }
                    label="Debug"
                    value={formatNumber(
                        displayedStatistics.debug
                    )}
                    detail="Diagnostic events"
                />

                <StatCard
                    icon={
                        <NovaIcon
                            name="overview"
                            size={13}
                        />
                    }
                    label="Info"
                    value={formatNumber(
                        displayedStatistics.info
                    )}
                    detail="Normal events"
                />

                <StatCard
                    icon={
                        <NovaIcon
                            name="deadlock"
                            size={13}
                        />
                    }
                    label="Warnings"
                    value={formatNumber(
                        displayedStatistics.warning
                    )}
                    detail="Warning events"
                    tone="warning"
                />

                <StatCard
                    icon={
                        <NovaIcon
                            name="close"
                            size={13}
                        />
                    }
                    label="Errors"
                    value={formatNumber(
                        displayedStatistics.error
                    )}
                    detail="Failure events"
                    tone="error"
                />

                <StatCard
                    icon={
                        <NovaIcon
                            name="deadlock"
                            size={13}
                        />
                    }
                    label="Critical"
                    value={formatNumber(
                        displayedStatistics.critical
                    )}
                    detail="Critical events"
                    tone="critical"
                />
            </div>


            <div className="system-logs-toolbar">
                <div className="system-logs-search">
                    <span className="system-logs-search-icon">
                        <NovaIcon
                            name="application"
                            size={13}
                        />
                    </span>

                    <input
                        className="system-logs-input"
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search log ID, message, source, type..."
                        aria-label="Search system logs"
                    />
                </div>


                <select
                    className="system-logs-select"
                    value={levelFilter}
                    onChange={(event) =>
                        setLevelFilter(
                            event.target.value
                        )
                    }
                    aria-label="Filter by level"
                >
                    <option value="all">
                        All levels
                    </option>

                    {LEVELS
                        .filter(
                            (level) =>
                                level !==
                                "all"
                        )
                        .map(
                            (level) => (
                                <option
                                    key={
                                        level
                                    }
                                    value={
                                        level
                                    }
                                >
                                    {getLevelLabel(
                                        level
                                    )}
                                </option>
                            )
                        )}
                </select>


                <select
                    className="system-logs-select"
                    value={sourceFilter}
                    onChange={(event) =>
                        setSourceFilter(
                            event.target.value
                        )
                    }
                    aria-label="Filter by source"
                >
                    <option value="all">
                        All sources
                    </option>

                    {sourceOptions.map(
                        (source) => (
                            <option
                                key={
                                    source
                                }
                                value={
                                    source
                                }
                            >
                                {source}
                            </option>
                        )
                    )}
                </select>


                <select
                    className="system-logs-select"
                    value={typeFilter}
                    onChange={(event) =>
                        setTypeFilter(
                            event.target.value
                        )
                    }
                    aria-label="Filter by type"
                >
                    <option value="all">
                        All types
                    </option>

                    {typeOptions.map(
                        (type) => (
                            <option
                                key={
                                    type
                                }
                                value={
                                    type
                                }
                            >
                                {type}
                            </option>
                        )
                    )}
                </select>


                <div className="system-logs-filter-info">
                    {filteredLogs.length} of{" "}
                    {logs.length} logs
                </div>


                {filtersActive && (
                    <button
                        type="button"
                        className="system-logs-button"
                        onClick={
                            clearFilters
                        }
                    >
                        Clear Filters
                    </button>
                )}
            </div>


            <div className="system-logs-table-container">
                <div className="system-logs-table-header">
                    <div>
                        Level
                    </div>

                    <div>
                        Time
                    </div>

                    <div>
                        Source
                    </div>

                    <div>
                        Type / Message
                    </div>

                    <div>
                        ID
                    </div>

                    <div />
                </div>


                {loading ? (
                    <EmptyState
                        title="Loading system logs"
                        message="Connecting to the NovaOS system logging service..."
                    />
                ) : filteredLogs.length ===
                  0 ? (
                    <EmptyState
                        title={
                            logs.length === 0
                                ? "No system logs"
                                : "No matching logs"
                        }
                        message={
                            logs.length === 0
                                ? "Runtime and kernel events will appear here as NovaOS operates."
                                : "No retained log matches the current search and filters."
                        }
                    />
                ) : (
                    filteredLogs.map(
                        (log) => {
                            const level =
                                normalizeLevel(
                                    log?.level
                                );

                            const logId =
                                String(
                                    log?.id ??
                                    ""
                                );

                            const expanded =
                                expandedLogId ===
                                logId;

                            return (
                                <div
                                    key={
                                        logId ||
                                        `${log?.timestamp}-${log?.type}`
                                    }
                                    className="system-logs-row"
                                >
                                    <div
                                        className={`system-logs-row-main ${
                                            expanded
                                                ? "expanded"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            toggleLog(
                                                logId
                                            )
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(
                                            event
                                        ) => {
                                            if (
                                                event.key ===
                                                    "Enter" ||
                                                event.key ===
                                                    " "
                                            ) {
                                                event.preventDefault();

                                                toggleLog(
                                                    logId
                                                );
                                            }
                                        }}
                                    >
                                        <div>
                                            <span
                                                className={`system-logs-level ${getLevelClass(
                                                    level
                                                )}`}
                                            >
                                                {getLevelLabel(
                                                    level
                                                )}
                                            </span>
                                        </div>

                                        <div
                                            className="system-logs-time"
                                            title={formatTimestamp(
                                                log?.timestamp
                                            )}
                                        >
                                            {formatTime(
                                                log?.timestamp
                                            )}
                                        </div>

                                        <div
                                            className="system-logs-source"
                                            title={getSourceLabel(
                                                log?.source
                                            )}
                                        >
                                            {getSourceLabel(
                                                log?.source
                                            )}
                                        </div>

                                        <div>
                                            <div
                                                className="system-logs-type"
                                                title={String(
                                                    log?.type ??
                                                    "SYSTEM"
                                                )}
                                            >
                                                {String(
                                                    log?.type ??
                                                    "SYSTEM"
                                                )}
                                            </div>

                                            <div
                                                className="system-logs-message"
                                                title={String(
                                                    log?.message ??
                                                    ""
                                                )}
                                            >
                                                {String(
                                                    log?.message ??
                                                    "No message"
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="system-logs-id system-logs-mono"
                                            title={
                                                logId
                                            }
                                        >
                                            {logId ||
                                                "—"}
                                        </div>

                                        <div className="system-logs-expand">
                                            <NovaIcon
                                                name={
                                                    expanded
                                                        ? "overview"
                                                        : "application"
                                                }
                                                size={13}
                                            />
                                        </div>
                                    </div>


                                    {expanded && (
                                        <div className="system-logs-details">
                                            <div className="system-logs-details-grid">
                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Log ID
                                                    </span>

                                                    <strong className="system-logs-mono">
                                                        {
                                                            logId
                                                        }
                                                    </strong>
                                                </div>

                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Timestamp
                                                    </span>

                                                    <strong>
                                                        {formatTimestamp(
                                                            log?.timestamp
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Level
                                                    </span>

                                                    <strong>
                                                        {getLevelLabel(
                                                            level
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Source
                                                    </span>

                                                    <strong>
                                                        {getSourceLabel(
                                                            log?.source
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Event Type
                                                    </span>

                                                    <strong>
                                                        {String(
                                                            log?.type ??
                                                            "SYSTEM"
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="system-logs-detail-box">
                                                    <span>
                                                        Message
                                                    </span>

                                                    <strong>
                                                        {String(
                                                            log?.message ??
                                                            "No message"
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>

                                            <pre className="system-logs-payload">
                                                {safeJsonStringify(
                                                    log?.payload
                                                )}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )
                )}
            </div>


            <div className="system-logs-footer">
                <div className="system-logs-footer-left">
                    <span className="system-logs-live-dot" />

                    <span>
                        Live system logging
                    </span>

                    <span>
                        •
                    </span>

                    <span>
                        Refreshing every{" "}
                        {REFRESH_INTERVAL /
                            1000}
                        s
                    </span>
                </div>

                <div className="system-logs-footer-right">
                    <span>
                        {lastUpdated
                            ? `Updated ${formatTimestamp(
                                lastUpdated
                            )}`
                            : "Waiting for update"}
                    </span>
                </div>
            </div>
        </div>
    );
}


export default SystemLogs;