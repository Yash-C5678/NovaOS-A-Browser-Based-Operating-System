import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import NovaIcon from "../ui/NovaIcon";

const API_BASE =
    "http://localhost:5000/api";

const REFRESH_INTERVAL = 1000;

const STATE_CLASS = {
    new: "new",
    ready: "ready",
    running: "running",
    waiting: "waiting",
    terminated: "terminated",
    blocked: "waiting",
    suspended: "waiting"
};


function ProcessManager() {
    const [processes, setProcesses] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [actionLoading, setActionLoading] =
        useState(null);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);

    const [showCreate, setShowCreate] =
        useState(false);

    const [selectedPid, setSelectedPid] =
        useState(null);

    const [search, setSearch] =
        useState("");

    const [stateFilter, setStateFilter] =
        useState("all");

    const [form, setForm] =
        useState({
            applicationId: "terminal",
            priority: 0,
            memoryLimit: "",
            arrivalTime: 0,
            burstTime: 5
        });


    /*
     * =========================================================
     * LOAD PROCESSES
     * =========================================================
     */

    const loadProcesses =
        useCallback(
            async () => {
                try {
                    setError("");

                    const response =
                        await fetch(
                            `${API_BASE}/processes`
                        );

                    if (!response.ok) {
                        throw new Error(
                            `Process API returned ${response.status}`
                        );
                    }

                    const result =
                        await response.json();

                    const data =
                        Array.isArray(result)
                            ? result
                            : Array.isArray(
                                result?.data
                            )
                                ? result.data
                                : Array.isArray(
                                    result?.data?.processes
                                )
                                    ? result.data.processes
                                    : [];

                    setProcesses(data);

                    setLastUpdated(
                        new Date()
                    );

                    setSelectedPid(
                        (currentPid) => {
                            if (
                                currentPid ===
                                null
                            ) {
                                return null;
                            }

                            const exists =
                                data.some(
                                    (process) =>
                                        String(
                                            getPid(
                                                process
                                            )
                                        ) ===
                                        String(
                                            currentPid
                                        )
                                );

                            return exists
                                ? currentPid
                                : null;
                        }
                    );
                } catch (err) {
                    setError(
                        err.message ||
                        "Unable to load processes."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    useEffect(() => {
        loadProcesses();

        const interval =
            setInterval(
                loadProcesses,
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        loadProcesses
    ]);


    /*
     * =========================================================
     * CREATE PROCESS
     * =========================================================
     */

    const createProcess =
        async (event) => {
            event.preventDefault();

            try {
                setActionLoading(
                    "create"
                );

                setError("");

                const body = {
                    applicationId:
                        form.applicationId.trim(),

                    priority:
                        Number(
                            form.priority
                        ),

                    memoryLimit:
                        form.memoryLimit ===
                            ""
                            ? null
                            : Number(
                                form.memoryLimit
                            ),

                    arrivalTime:
                        Number(
                            form.arrivalTime
                        ),

                    burstTime:
                        Number(
                            form.burstTime
                        )
                };

                if (!body.applicationId) {
                    throw new Error(
                        "Application ID is required."
                    );
                }

                if (
                    body.burstTime <= 0
                ) {
                    throw new Error(
                        "Burst time must be greater than 0."
                    );
                }

                if (
                    body.arrivalTime < 0
                ) {
                    throw new Error(
                        "Arrival time cannot be negative."
                    );
                }

                const response =
                    await fetch(
                        `${API_BASE}/processes`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify(
                                    body
                                )
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.error ||
                        "Unable to create process."
                    );
                }

                setForm({
                    applicationId:
                        "terminal",
                    priority: 0,
                    memoryLimit: "",
                    arrivalTime: 0,
                    burstTime: 5
                });

                setShowCreate(false);

                await loadProcesses();
            } catch (err) {
                setError(
                    err.message ||
                    "Unable to create process."
                );
            } finally {
                setActionLoading(
                    null
                );
            }
        };


    /*
     * =========================================================
     * PROCESS ACTION
     * =========================================================
     */

    const sendAction =
        async (
            action,
            processId
        ) => {
            if (
                processId === null ||
                processId === undefined
            ) {
                return;
            }

            try {
                setActionLoading(
                    `${action}-${processId}`
                );

                setError("");

                const endpoints = {
                    start:
                        `/processes/${processId}/start`,

                    run:
                        `/processes/${processId}/run`,

                    preempt:
                        `/processes/${processId}/preempt`,

                    wait:
                        `/processes/${processId}/wait`,

                    resume:
                        `/processes/${processId}/resume`,

                    terminate:
                        `/processes/${processId}/terminate`
                };

                const endpoint =
                    endpoints[action];

                if (!endpoint) {
                    throw new Error(
                        `Unsupported process action: ${action}`
                    );
                }

                const response =
                    await fetch(
                        `${API_BASE}${endpoint}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.error ||
                        `Unable to ${action} process.`
                    );
                }

                await loadProcesses();
            } catch (err) {
                setError(
                    err.message ||
                    `Unable to ${action} process.`
                );
            } finally {
                setActionLoading(
                    null
                );
            }
        };


    /*
     * =========================================================
     * FORM HANDLING
     * =========================================================
     */

    const updateForm =
        (
            field,
            value
        ) => {
            setForm(
                (current) => ({
                    ...current,
                    [field]: value
                })
            );
        };


    /*
     * =========================================================
     * PROCESS FIELD HELPERS
     * =========================================================
     */

    function getPid(process) {
        return (
            process.pid ??
            process.id ??
            process.processId ??
            "—"
        );
    }

    function getState(process) {
        return String(
            process.state ??
            process.status ??
            "unknown"
        ).toLowerCase();
    }

    function getPriority(process) {
        return (
            process.priority ??
            "—"
        );
    }

    function getArrival(process) {
        return (
            process.arrivalTime ??
            "—"
        );
    }

    function getBurst(process) {
        return (
            process.burstTime ??
            "—"
        );
    }

    function getRemaining(process) {
        return (
            process.remainingTime ??
            process.remainingBurstTime ??
            "—"
        );
    }

    function getApplication(process) {
        return (
            process.applicationName ??
            process.applicationId ??
            process.name ??
            "System Process"
        );
    }

    function getMemory(process) {
        return (
            process.memoryLimit ??
            process.memory ??
            process.memoryUsage ??
            process.memorySize ??
            "—"
        );
    }


    /*
     * =========================================================
     * STATISTICS
     * =========================================================
     */

    const stats =
        useMemo(() => {
            const normalized =
                processes.map(
                    (process) => ({
                        ...process,
                        normalizedState:
                            getState(
                                process
                            )
                    })
                );

            return {
                total:
                    normalized.length,

                new:
                    normalized.filter(
                        (p) =>
                            p.normalizedState ===
                            "new"
                    ).length,

                running:
                    normalized.filter(
                        (p) =>
                            p.normalizedState ===
                            "running"
                    ).length,

                ready:
                    normalized.filter(
                        (p) =>
                            p.normalizedState ===
                            "ready"
                    ).length,

                waiting:
                    normalized.filter(
                        (p) =>
                            p.normalizedState ===
                            "waiting" ||
                            p.normalizedState ===
                            "blocked"
                    ).length,

                terminated:
                    normalized.filter(
                        (p) =>
                            p.normalizedState ===
                            "terminated"
                    ).length
            };
        }, [processes]);


    /*
     * =========================================================
     * FILTERED PROCESSES
     * =========================================================
     */

    const filteredProcesses =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return processes.filter(
                (process) => {
                    const state =
                        getState(
                            process
                        );

                    const pid =
                        String(
                            getPid(
                                process
                            )
                        ).toLowerCase();

                    const application =
                        String(
                            getApplication(
                                process
                            )
                        ).toLowerCase();

                    const matchesSearch =
                        !query ||
                        pid.includes(
                            query
                        ) ||
                        application.includes(
                            query
                        );

                    const matchesState =
                        stateFilter ===
                        "all" ||
                        state ===
                        stateFilter;

                    return (
                        matchesSearch &&
                        matchesState
                    );
                }
            );
        }, [
            processes,
            search,
            stateFilter
        ]);


    /*
     * =========================================================
     * SELECTED PROCESS
     * =========================================================
     */

    const selectedProcess =
        useMemo(() => {
            if (
                selectedPid ===
                null
            ) {
                return null;
            }

            return (
                processes.find(
                    (process) =>
                        String(
                            getPid(
                                process
                            )
                        ) ===
                        String(
                            selectedPid
                        )
                ) || null
            );
        }, [
            processes,
            selectedPid
        ]);


    /*
     * =========================================================
     * HELPERS FOR UI
     * =========================================================
     */

    const formatUpdated =
        lastUpdated
            ? lastUpdated.toLocaleTimeString()
            : "Waiting...";


    const getStateLabel =
        (state) => {
            if (!state) {
                return "Unknown";
            }

            return state
                .charAt(0)
                .toUpperCase() +
                state.slice(1);
        };


    const getActionLabel =
        (action) => {
            const labels = {
                start: "Starting",
                run: "Running",
                preempt: "Preempting",
                wait: "Waiting",
                resume: "Resuming",
                terminate: "Terminating"
            };

            return (
                labels[action] ||
                "Working"
            );
        };


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="nova-process-manager">

            <style>{`

                /* =====================================================
                   ROOT
                   ===================================================== */

                .nova-process-manager {
                    width: 100%;
                    height: 100%;
                    min-height: 500px;
                    box-sizing: border-box;
                    padding: 22px;
                    overflow: auto;

                    background: var(--nova-bg-1, #0d1324);
                    color: var(--nova-text, #f1f5ff);

                    font-family:
                        Inter,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }


                .nova-process-manager *,
                .nova-process-manager *::before,
                .nova-process-manager *::after {
                    box-sizing: border-box;
                }


                /* =====================================================
                   SCROLLBAR
                   ===================================================== */

                .nova-process-manager::-webkit-scrollbar {
                    width: 9px;
                    height: 9px;
                }

                .nova-process-manager::-webkit-scrollbar-track {
                    background: transparent;
                }

                .nova-process-manager::-webkit-scrollbar-thumb {
                    background: #c9c5e8;
                    border-radius: 20px;
                }

                .nova-process-manager::-webkit-scrollbar-thumb:hover {
                    background: #aaa4d5;
                }


                /* =====================================================
                   HEADER
                   ===================================================== */

                .nova-pm-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 20px;
                }


                .nova-pm-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 7px;

                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;

                    color: #7668c9;

                    margin-bottom: 6px;
                }


                .nova-pm-eyebrow::before {
                    content: "";
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;

                    background: #7c5cff;

                    box-shadow:
                        0 0 0 4px
                        rgba(124, 92, 255, 0.12);
                }


                .nova-pm-header h1 {
                    margin: 0;

                    font-size: 27px;
                    line-height: 1.1;
                    letter-spacing: -0.035em;

                    color: var(--nova-text, #f1f5ff);
                }


                .nova-pm-header p {
                    margin: 7px 0 0;

                    color: var(--nova-text-muted, #71809a);
                    font-size: 13px;
                    line-height: 1.5;
                }


                .nova-pm-header-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;

                    gap: 9px;
                    flex-wrap: wrap;
                }


                .nova-pm-live {
                    display: flex;
                    align-items: center;
                    gap: 7px;

                    padding: 8px 11px;

                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 10px;

                    background:
                        var(--nova-surface-strong, #171e32);

                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;

                    color: var(--nova-text-secondary, #aebbd1);

                    box-shadow:
                        0 3px 14px
                        rgba(48, 35, 100, 0.04);
                }


                .nova-pm-live-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;

                    background: #22c55e;

                    box-shadow:
                        0 0 0 4px
                        rgba(34, 197, 94, 0.12),
                        0 0 10px
                        rgba(34, 197, 94, 0.45);
                }


                .nova-pm-refresh-text {
                    font-size: 10px;
                    color: #918da4;
                    font-weight: 600;
                }


                .nova-pm-create-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;

                    border: 0;
                    border-radius: 10px;

                    padding: 10px 14px;

                    background:
                        linear-gradient(
                            135deg,
                            #7657ff,
                            #5c46d6
                        );

                    color: white;

                    font-size: 12px;
                    font-weight: 800;

                    cursor: pointer;

                    box-shadow:
                        0 7px 18px
                        rgba(101, 76, 220, 0.25);

                    transition:
                        transform 0.15s ease,
                        box-shadow 0.15s ease,
                        filter 0.15s ease;
                }


                .nova-pm-create-button:hover {
                    transform: translateY(-1px);

                    box-shadow:
                        0 10px 22px
                        rgba(101, 76, 220, 0.30);

                    filter: brightness(1.03);
                }


                .nova-pm-create-button:active {
                    transform: translateY(0);
                }


                /* =====================================================
                   STAT CARDS
                   ===================================================== */

                .nova-pm-stats {
                    display: grid;

                    grid-template-columns:
                        repeat(6, minmax(110px, 1fr));

                    gap: 10px;

                    margin-bottom: 18px;
                }


                .nova-pm-stat {
                    position: relative;

                    min-width: 0;

                    padding: 14px;

                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 13px;

                    background:
                        var(--nova-surface-strong, #171e32);

                    box-shadow:
                        0 5px 18px
                        rgba(47, 34, 101, 0.045);

                    overflow: hidden;
                }


                .nova-pm-stat::before {
                    content: "";

                    position: absolute;
                    left: 0;
                    top: 0;

                    width: 100%;
                    height: 3px;

                    background:
                        var(--stat-accent);
                }


                .nova-pm-stat.total {
                    --stat-accent: #7c5cff;
                }

                .nova-pm-stat.new {
                    --stat-accent: #8b5cf6;
                }

                .nova-pm-stat.ready {
                    --stat-accent: #3b82f6;
                }

                .nova-pm-stat.running {
                    --stat-accent: #14b8a6;
                }

                .nova-pm-stat.waiting {
                    --stat-accent: #f59e0b;
                }

                .nova-pm-stat.terminated {
                    --stat-accent: #ef476f;
                }


                .nova-pm-stat-label {
                    color: var(--nova-text-muted, #71809a);

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }


                .nova-pm-stat-value {
                    margin-top: 5px;

                    font-size: 23px;
                    line-height: 1;

                    font-weight: 800;

                    color: var(--nova-text, #f1f5ff);
                }


                /* =====================================================
                   MAIN GRID
                   ===================================================== */

                .nova-pm-main {
                    display: grid;

                    grid-template-columns:
                        minmax(0, 1fr)
                        285px;

                    gap: 14px;

                    align-items: start;
                }


                /* =====================================================
                   PANEL
                   ===================================================== */

                .nova-pm-panel {
                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 15px;

                    background:
                        var(--nova-surface, #12182a);

                    box-shadow:
                        0 7px 25px
                        rgba(49, 34, 109, 0.055);

                    overflow: hidden;
                }


                .nova-pm-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    gap: 12px;

                    padding: 14px 16px;

                    border-bottom:
                        1px solid
                        var(--nova-border-soft, rgba(148, 163, 184, 0.10));
                }


                .nova-pm-panel-title {
                    display: flex;
                    align-items: center;
                    gap: 9px;

                    color: var(--nova-text, #f1f5ff);

                    font-size: 13px;
                    font-weight: 800;
                }


                .nova-pm-panel-icon {
                    display: grid;
                    place-items: center;

                    width: 29px;
                    height: 29px;

                    border-radius: 9px;

                    background:
                        #eeeafd;

                    color: #6651d5;
                }


                .nova-pm-panel-subtitle {
                    margin-top: 2px;

                    color: #89849b;

                    font-size: 10px;
                    font-weight: 500;
                }


                /* =====================================================
                   FILTER BAR
                   ===================================================== */

                .nova-pm-toolbar {
                    display: flex;
                    align-items: center;

                    gap: 9px;

                    padding: 12px 14px;

                    border-bottom:
                        1px solid
                        var(--nova-border-soft, rgba(148, 163, 184, 0.10));

                    background:
                        var(--nova-surface-strong, #171e32);
                }


                .nova-pm-search {
                    position: relative;
                    flex: 1;
                    min-width: 160px;
                }


                .nova-pm-search input {
                    width: 100%;

                    padding:
                        9px 11px 9px 34px;

                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 99px;

                    outline: none;

                    background: var(--nova-surface, #12182a);

                    color: var(--nova-text, #f1f5ff);

                    font-size: 11px;

                    transition:
                        border-color 0.15s ease,
                        box-shadow 0.15s ease;
                }


                .nova-pm-search::before {
                    content: "⌕";

                    position: absolute;
                    left: 12px;
                    top: 50%;

                    transform:
                        translateY(-53%);

                    color: #8a84a3;

                    font-size: 17px;

                    pointer-events: none;
                }


                .nova-pm-search input:focus {
                    border-color: #9a8be8;

                    box-shadow:
                        0 0 0 3px
                        rgba(124, 92, 255, 0.10);
                }


                .nova-pm-filter {
                    padding: 9px 10px;

                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 9px;

                    outline: none;

                    background: var(--nova-surface, #12182a);

                    color: var(--nova-text, #f1f5ff);

                    font-size: 11px;
                    font-weight: 700;

                    cursor: pointer;
                }


                .nova-pm-filter:focus {
                    border-color: #9a8be8;
                }


                /* =====================================================
                   TABLE
                   ===================================================== */

                .nova-pm-table-wrap {
                    width: 100%;
                    overflow-x: auto;
                }


                .nova-pm-table {
                    width: 100%;

                    border-collapse: collapse;

                    min-width: 830px;
                }


                .nova-pm-table th {
                    padding:
                        10px 12px;

                    background:
                        var(--nova-surface-strong, #171e32);

                    border-bottom:
                        1px solid
                        var(--nova-border, #252f48);

                    color: var(--nova-text-muted, #71809a);

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 0.08em;
                    text-align: left;
                }


                .nova-pm-table td {
                    padding:
                        11px 12px;

                    border-bottom:
                        1px solid
                        var(--nova-border-soft, rgba(148, 163, 184, 0.10));

                    color: var(--nova-text-secondary, #aebbd1);

                    font-size: 11px;

                    white-space: nowrap;
                }


                .nova-pm-table tbody tr {
                    cursor: pointer;

                    transition:
                        background 0.12s ease;
                }


                .nova-pm-table tbody tr:hover {
                    background:
                        var(--nova-surface-hover, rgba(255, 255, 255, 0.04));
                }


                .nova-pm-table tbody tr.selected {
                    background:
                        var(--nova-process-soft, rgba(59, 130, 246, 0.14));
                }


                .nova-pm-table tbody tr.selected td:first-child {
                    box-shadow:
                        inset 3px 0 0
                        #7558e8;
                }


                .nova-pm-pid {
                    font-family:
                        "SFMono-Regular",
                        Consolas,
                        monospace;

                    color: #6550cf;

                    font-weight: 800;
                }


                .nova-pm-app {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }


                .nova-pm-app-icon {
                    display: grid;
                    place-items: center;

                    width: 25px;
                    height: 25px;

                    border-radius: 7px;

                    background:
                        #eeeafd;

                    color: #6751d4;
                }


                .nova-pm-app-name {
                    color: #332d48;
                    font-weight: 700;
                }


                /* =====================================================
                   STATUS BADGES
                   ===================================================== */

                .nova-pm-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;

                    padding:
                        4px 8px;

                    border-radius: 999px;

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 0.03em;
                }


                .nova-pm-status-dot {
                    width: 6px;
                    height: 6px;

                    border-radius: 50%;

                    background:
                        currentColor;
                }


                .nova-pm-status.new {
                    background: #f0eaff;
                    color: #7651d5;
                }


                .nova-pm-status.ready {
                    background: #eaf2ff;
                    color: #3976d8;
                }


                .nova-pm-status.running {
                    background: #e6faf5;
                    color: #109a82;
                }


                .nova-pm-status.waiting {
                    background: #fff5df;
                    color: #c27c00;
                }


                .nova-pm-status.terminated {
                    background: #ffeaf0;
                    color: #d13b65;
                }


                /* =====================================================
                   ROW ACTION
                   ===================================================== */

                .nova-pm-row-action {
                    border: 0;

                    padding:
                        5px 9px;

                    border-radius: 7px;

                    background:
                        #eeeafd;

                    color: #624dcc;

                    font-size: 9px;
                    font-weight: 800;

                    cursor: pointer;
                }


                .nova-pm-row-action:hover {
                    background:
                        #e2dcff;
                }


                .nova-pm-row-action:disabled {
                    opacity: 0.55;
                    cursor: wait;
                }


                /* =====================================================
                   EMPTY / LOADING
                   ===================================================== */

                .nova-pm-empty {
                    padding: 48px 20px;

                    text-align: center;

                    color: #8c879f;
                }


                .nova-pm-empty-icon {
                    display: grid;
                    place-items: center;

                    width: 45px;
                    height: 45px;

                    margin: 0 auto 11px;

                    border-radius: 13px;

                    background:
                        #efedfa;

                    color: #7664ce;
                }


                .nova-pm-empty-title {
                    color: #4a435e;

                    font-size: 13px;
                    font-weight: 800;
                }


                .nova-pm-empty-text {
                    margin-top: 4px;

                    font-size: 10px;
                }


                .nova-pm-loading {
                    padding: 42px;

                    text-align: center;

                    color: #756e8d;

                    font-size: 11px;
                    font-weight: 700;
                }


                .nova-pm-spinner {
                    width: 25px;
                    height: 25px;

                    margin:
                        0 auto 10px;

                    border:
                        2px solid
                        #e4e0f3;

                    border-top-color:
                        #7558e8;

                    border-radius: 50%;

                    animation:
                        nova-pm-spin
                        0.8s linear infinite;
                }


                @keyframes nova-pm-spin {
                    to {
                        transform: rotate(360deg);
                    }
                }


                /* =====================================================
                   SIDE DETAILS
                   ===================================================== */

                .nova-pm-details {
                    position: sticky;
                    top: 0;
                }


                .nova-pm-details-body {
                    padding: 15px;
                }


                .nova-pm-selected-card {
                    padding: 14px;

                    border:
                        1px solid
                        var(--nova-border, #252f48);

                    border-radius: 12px;

                    background:
                        var(--nova-surface-strong, #171e32);

                    margin-bottom: 13px;
                }


                .nova-pm-selected-label {
                    color: #89829e;

                    font-size: 9px;
                    font-weight: 800;

                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }


                .nova-pm-selected-pid {
                    margin-top: 5px;

                    color: #5741c1;

                    font-family:
                        "SFMono-Regular",
                        Consolas,
                        monospace;

                    font-size: 21px;
                    font-weight: 800;
                }


                .nova-pm-selected-app {
                    margin-top: 3px;

                    color: #504a64;

                    font-size: 11px;
                    font-weight: 700;
                }


                .nova-pm-detail-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 7px;

                    margin-bottom: 14px;
                }


                .nova-pm-detail-item {
                    padding: 10px;

                    border:
                        1px solid
                        #ebe8f4;

                    border-radius: 9px;

                    background: #fbfbfe;
                }


                .nova-pm-detail-item span {
                    display: block;

                    color: #918ca2;

                    font-size: 8px;
                    font-weight: 800;

                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }


                .nova-pm-detail-item strong {
                    display: block;

                    margin-top: 4px;

                    color: #39334e;

                    font-size: 12px;
                }


                /* =====================================================
                   ACTIONS
                   ===================================================== */

                .nova-pm-actions-title {
                    margin-bottom: 8px;

                    color: #77718c;

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }


                .nova-pm-actions {
                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 7px;
                }


                .nova-pm-action-button {
                    min-height: 32px;

                    border:
                        1px solid
                        #ded9f0;

                    border-radius: 8px;

                    background: white;

                    color: #594d7d;

                    font-size: 10px;
                    font-weight: 800;

                    cursor: pointer;

                    transition:
                        background 0.12s ease,
                        border-color 0.12s ease,
                        transform 0.12s ease;
                }


                .nova-pm-action-button:hover {
                    transform: translateY(-1px);

                    border-color:
                        #c8c0e9;

                    background:
                        #f7f5ff;
                }


                .nova-pm-action-button.primary {
                    border-color:
                        #765ce0;

                    background:
                        #7055dc;

                    color: white;
                }


                .nova-pm-action-button.primary:hover {
                    background:
                        #6248cf;
                }


                .nova-pm-action-button.warning {
                    border-color:
                        #f1d49b;

                    background:
                        #fff8e9;

                    color: #ae6e00;
                }


                .nova-pm-action-button.danger {
                    grid-column:
                        1 / -1;

                    border-color:
                        #f2bfd0;

                    background:
                        #fff0f4;

                    color: #c43860;
                }


                .nova-pm-action-button:disabled {
                    opacity: 0.55;
                    cursor: wait;
                    transform: none;
                }


                .nova-pm-no-selection {
                    padding: 24px 10px;

                    text-align: center;

                    color: #918ba3;
                }


                .nova-pm-no-selection-icon {
                    margin-bottom: 8px;

                    color: #9b93b2;
                }


                .nova-pm-no-selection strong {
                    display: block;

                    color: #5e576e;

                    font-size: 11px;
                }


                .nova-pm-no-selection span {
                    display: block;

                    margin-top: 4px;

                    font-size: 9px;
                    line-height: 1.5;
                }


                /* =====================================================
                   ERROR
                   ===================================================== */

                .nova-pm-error {
                    display: flex;
                    align-items: flex-start;
                    gap: 9px;

                    margin-bottom: 13px;

                    padding: 10px 12px;

                    border:
                        1px solid
                        #f2c6d3;

                    border-radius: 10px;

                    background:
                        #fff1f4;

                    color: #b83258;

                    font-size: 10px;
                    line-height: 1.45;
                }


                .nova-pm-error strong {
                    display: block;

                    margin-bottom: 2px;

                    font-size: 10px;
                }


                /* =====================================================
                   CREATE MODAL
                   ===================================================== */

                .nova-pm-create-overlay {
                    position: fixed;

                    inset: 0;

                    z-index: 9999;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 20px;

                    background:
                        rgba(
                            29,
                            23,
                            59,
                            0.38
                        );

                    backdrop-filter:
                        blur(5px);
                }


                .nova-pm-create-modal {
                    width: min(
                        440px,
                        100%
                    );

                    border:
                        1px solid
                        #ded8f0;

                    border-radius: 17px;

                    background:
                        #ffffff;

                    box-shadow:
                        0 25px 70px
                        rgba(31, 21, 72, 0.22);

                    overflow: hidden;
                }


                .nova-pm-create-header {
                    padding: 17px 18px;

                    border-bottom:
                        1px solid
                        #ebe8f4;

                    background:
                        linear-gradient(
                            135deg,
                            #f7f4ff,
                            #ffffff
                        );
                }


                .nova-pm-create-header h2 {
                    margin: 0;

                    color: #29223f;

                    font-size: 17px;
                }


                .nova-pm-create-header p {
                    margin: 4px 0 0;

                    color: #827c96;

                    font-size: 10px;
                }


                .nova-pm-form {
                    padding: 18px;
                }


                .nova-process-manager .nova-pm-create-modal .nova-pm-form-grid {
                    display: grid !important;

                    grid-template-columns:
                        repeat(2, minmax(0, 1fr)) !important;

                    gap: 12px !important;
                }


                .nova-pm-form-group {
                    display: flex;
                    flex-direction: column;

                    gap: 5px;
                }


                .nova-process-manager .nova-pm-create-modal .nova-pm-form-group.full {
                    grid-column: 1 / -1 !important;
                }


                .nova-pm-form-group label {
                    color: #625b76;

                    font-size: 9px;
                    font-weight: 800;

                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                }


                .nova-pm-form-group input {
                    width: 100%;

                    padding: 9px 10px;

                    border:
                        1px solid
                        #ddd9eb;

                    border-radius: 8px;

                    outline: none;

                    background: #fcfcff;

                    color: #302a45;

                    font-size: 11px;
                }


                .nova-pm-form-group input:focus {
                    border-color:
                        #9383e3;

                    box-shadow:
                        0 0 0 3px
                        rgba(124, 92, 255, 0.09);
                }


                .nova-pm-form-actions {
                    display: flex;
                    justify-content: flex-end;

                    gap: 8px;

                    margin-top: 17px;
                }


                .nova-pm-form-button {
                    padding: 9px 13px;

                    border-radius: 8px;

                    border:
                        1px solid
                        #ddd9eb;

                    background: white;

                    color: #625a75;

                    font-size: 10px;
                    font-weight: 800;

                    cursor: pointer;
                }


                .nova-pm-form-button.primary {
                    border-color:
                        #7257dd;

                    background:
                        #7055dc;

                    color: white;
                }


                .nova-pm-form-button:disabled {
                    opacity: 0.55;
                    cursor: wait;
                }


                /* =====================================================
                   FOOTER
                   ===================================================== */

                .nova-pm-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    gap: 10px;

                    margin-top: 12px;

                    color: #9791a8;

                    font-size: 9px;
                }


                .nova-pm-footer strong {
                    color: #746d88;
                }


                /* =====================================================
                   RESPONSIVE
                   ===================================================== */

                @media (max-width: 1100px) {
                    .nova-pm-stats {
                        grid-template-columns:
                            repeat(3, 1fr);
                    }

                    .nova-pm-main {
                        grid-template-columns:
                            minmax(0, 1fr);
                    }

                    .nova-pm-details {
                        position: static;
                    }
                }


                @media (max-width: 650px) {
                    .nova-process-manager .nova-pm-create-modal .nova-pm-form-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .nova-process-manager .nova-pm-create-modal .nova-pm-form-group.full {
                        grid-column: auto !important;
                    }
                }

            `}</style>


            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="nova-pm-header">

                <div>
                    <div className="nova-pm-eyebrow">
                        Process Control
                    </div>

                    <h1>
                        Task Manager
                    </h1>

                    <p>
                        Monitor processes, inspect lifecycle
                        state and control execution.
                    </p>
                </div>


                <div className="nova-pm-header-actions">

                    <div className="nova-pm-live">
                        <span className="nova-pm-live-dot" />

                        LIVE

                        <span className="nova-pm-refresh-text">
                            1s refresh
                        </span>
                    </div>


                    <button
                        type="button"
                        className="nova-pm-create-button"
                        onClick={() =>
                            setShowCreate(true)
                        }
                    >
                        <NovaIcon
                            name="application"
                            size={14}
                        />

                        Create Process
                    </button>

                </div>

            </div>


            {/* =====================================================
                ERROR
            ===================================================== */}

            {error && (
                <div className="nova-pm-error">

                    <NovaIcon
                        name="application"
                        size={16}
                    />

                    <div>
                        <strong>
                            Process Manager Error
                        </strong>

                        {error}
                    </div>

                </div>
            )}


            {/* =====================================================
                STATISTICS
            ===================================================== */}

            <div className="nova-pm-stats">

                <div className="nova-pm-stat total">
                    <div className="nova-pm-stat-label">
                        Total
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.total}
                    </div>
                </div>


                <div className="nova-pm-stat new">
                    <div className="nova-pm-stat-label">
                        New
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.new}
                    </div>
                </div>


                <div className="nova-pm-stat ready">
                    <div className="nova-pm-stat-label">
                        Ready
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.ready}
                    </div>
                </div>


                <div className="nova-pm-stat running">
                    <div className="nova-pm-stat-label">
                        Running
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.running}
                    </div>
                </div>


                <div className="nova-pm-stat waiting">
                    <div className="nova-pm-stat-label">
                        Waiting
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.waiting}
                    </div>
                </div>


                <div className="nova-pm-stat terminated">
                    <div className="nova-pm-stat-label">
                        Terminated
                    </div>

                    <div className="nova-pm-stat-value">
                        {stats.terminated}
                    </div>
                </div>

            </div>


            {/* =====================================================
                MAIN
            ===================================================== */}

            <div className="nova-pm-main">

                {/* =================================================
                    PROCESS TABLE
                ================================================= */}

                <div className="nova-pm-panel">

                    <div className="nova-pm-panel-header">

                        <div>

                            <div className="nova-pm-panel-title">

                                <span className="nova-pm-panel-icon">
                                    <NovaIcon
                                        name="process"
                                        size={15}
                                    />
                                </span>

                                Process Table

                            </div>

                            <div className="nova-pm-panel-subtitle">
                                Live kernel process state
                            </div>

                        </div>

                        <div className="nova-pm-refresh-text">
                            Updated {formatUpdated}
                        </div>

                    </div>


                    {/* =================================================
                        TOOLBAR
                    ================================================= */}

                    <div className="nova-pm-toolbar">

                        <div className="nova-pm-search">

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search PID or application..."
                            />

                        </div>


                        <select
                            className="nova-pm-filter"
                            value={stateFilter}
                            onChange={(event) =>
                                setStateFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All States
                            </option>

                            <option value="new">
                                New
                            </option>

                            <option value="ready">
                                Ready
                            </option>

                            <option value="running">
                                Running
                            </option>

                            <option value="waiting">
                                Waiting
                            </option>

                            <option value="terminated">
                                Terminated
                            </option>
                        </select>

                    </div>


                    {/* =================================================
                        TABLE
                    ================================================= */}

                    {loading ? (

                        <div className="nova-pm-loading">

                            <div className="nova-pm-spinner" />

                            Loading process table...

                        </div>

                    ) : filteredProcesses.length === 0 ? (

                        <div className="nova-pm-empty">

                            <div className="nova-pm-empty-icon">

                                <NovaIcon
                                    name="process"
                                    size={21}
                                />

                            </div>

                            <div className="nova-pm-empty-title">
                                No processes found
                            </div>

                            <div className="nova-pm-empty-text">
                                Try changing the search or
                                state filter.
                            </div>

                        </div>

                    ) : (

                        <div className="nova-pm-table-wrap">

                            <table className="nova-pm-table">

                                <thead>

                                    <tr>

                                        <th>
                                            PID
                                        </th>

                                        <th>
                                            APPLICATION
                                        </th>

                                        <th>
                                            STATE
                                        </th>

                                        <th>
                                            PRIORITY
                                        </th>

                                        <th>
                                            ARRIVAL
                                        </th>

                                        <th>
                                            BURST
                                        </th>

                                        <th>
                                            REMAINING
                                        </th>

                                        <th>
                                            MEMORY
                                        </th>

                                        <th>
                                            ACTION
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {filteredProcesses.map(
                                        (process) => {

                                            const pid =
                                                getPid(
                                                    process
                                                );

                                            const state =
                                                getState(
                                                    process
                                                );

                                            const stateClass =
                                                STATE_CLASS[
                                                state
                                                ] ||
                                                "new";

                                            const isSelected =
                                                String(
                                                    selectedPid
                                                ) ===
                                                String(
                                                    pid
                                                );

                                            const action =
                                                actionLoading?.endsWith(
                                                    `-${pid}`
                                                )
                                                    ? actionLoading.split(
                                                        "-"
                                                    )[0]
                                                    : null;

                                            return (

                                                <tr
                                                    key={
                                                        String(
                                                            pid
                                                        )
                                                    }
                                                    className={
                                                        isSelected
                                                            ? "selected"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        setSelectedPid(
                                                            pid
                                                        )
                                                    }
                                                >

                                                    <td>
                                                        <span className="nova-pm-pid">
                                                            {pid}
                                                        </span>
                                                    </td>


                                                    <td>

                                                        <div className="nova-pm-app">

                                                            <span className="nova-pm-app-icon">
                                                                <NovaIcon
                                                                    name="application"
                                                                    size={13}
                                                                />
                                                            </span>

                                                            <span className="nova-pm-app-name">
                                                                {
                                                                    getApplication(
                                                                        process
                                                                    )
                                                                }
                                                            </span>

                                                        </div>

                                                    </td>


                                                    <td>

                                                        <span
                                                            className={
                                                                `nova-pm-status ${stateClass}`
                                                            }
                                                        >
                                                            <span className="nova-pm-status-dot" />

                                                            {
                                                                getStateLabel(
                                                                    state
                                                                )
                                                            }
                                                        </span>

                                                    </td>


                                                    <td>
                                                        {
                                                            getPriority(
                                                                process
                                                            )
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            getArrival(
                                                                process
                                                            )
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            getBurst(
                                                                process
                                                            )
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            getRemaining(
                                                                process
                                                            )
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            getMemory(
                                                                process
                                                            )
                                                        }
                                                    </td>


                                                    <td>

                                                        {state !==
                                                            "terminated" ? (

                                                            <button
                                                                type="button"
                                                                className="nova-pm-row-action"
                                                                disabled={
                                                                    actionLoading !==
                                                                    null
                                                                }
                                                                onClick={(
                                                                    event
                                                                ) => {
                                                                    event.stopPropagation();

                                                                    sendAction(
                                                                        "terminate",
                                                                        pid
                                                                    );
                                                                }}
                                                            >
                                                                {action ===
                                                                    "terminate"
                                                                    ? "Stopping..."
                                                                    : "Terminate"}
                                                            </button>

                                                        ) : (

                                                            <span className="nova-pm-refresh-text">
                                                                Finished
                                                            </span>

                                                        )}

                                                    </td>

                                                </tr>

                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>


                {/* =================================================
                    DETAILS PANEL
                ================================================= */}

                <div className="nova-pm-panel nova-pm-details">

                    <div className="nova-pm-panel-header">

                        <div>

                            <div className="nova-pm-panel-title">

                                <span className="nova-pm-panel-icon">
                                    <NovaIcon
                                        name="process"
                                        size={15}
                                    />
                                </span>

                                Process Details

                            </div>

                            <div className="nova-pm-panel-subtitle">
                                Selected process
                            </div>

                        </div>

                    </div>


                    <div className="nova-pm-details-body">

                        {!selectedProcess ? (

                            <div className="nova-pm-no-selection">

                                <div className="nova-pm-no-selection-icon">
                                    <NovaIcon
                                        name="process"
                                        size={25}
                                    />
                                </div>

                                <strong>
                                    No process selected
                                </strong>

                                <span>
                                    Select a process from the
                                    table to inspect its state
                                    and control its lifecycle.
                                </span>

                            </div>

                        ) : (

                            <>

                                <div className="nova-pm-selected-card">

                                    <div className="nova-pm-selected-label">
                                        Process ID
                                    </div>

                                    <div className="nova-pm-selected-pid">
                                        {getPid(
                                            selectedProcess
                                        )}
                                    </div>

                                    <div className="nova-pm-selected-app">
                                        {getApplication(
                                            selectedProcess
                                        )}
                                    </div>

                                </div>


                                <div className="nova-pm-detail-grid">

                                    <div className="nova-pm-detail-item">

                                        <span>
                                            State
                                        </span>

                                        <strong>
                                            {getStateLabel(
                                                getState(
                                                    selectedProcess
                                                )
                                            )}
                                        </strong>

                                    </div>


                                    <div className="nova-pm-detail-item">

                                        <span>
                                            Priority
                                        </span>

                                        <strong>
                                            {getPriority(
                                                selectedProcess
                                            )}
                                        </strong>

                                    </div>


                                    <div className="nova-pm-detail-item">

                                        <span>
                                            Arrival
                                        </span>

                                        <strong>
                                            {getArrival(
                                                selectedProcess
                                            )}
                                        </strong>

                                    </div>


                                    <div className="nova-pm-detail-item">

                                        <span>
                                            Burst
                                        </span>

                                        <strong>
                                            {getBurst(
                                                selectedProcess
                                            )}
                                        </strong>

                                    </div>


                                    <div className="nova-pm-detail-item">

                                        <span>
                                            Remaining
                                        </span>

                                        <strong>
                                            {getRemaining(
                                                selectedProcess
                                            )}
                                        </strong>

                                    </div>


                                    <div className="nova-pm-detail-item">

                                        <span>
                                            Memory
                                        </span>

                                        <strong>
                                            {getMemory(
                                                selectedProcess
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                <div className="nova-pm-actions-title">
                                    Lifecycle Controls
                                </div>


                                <div className="nova-pm-actions">

                                    {getState(
                                        selectedProcess
                                    ) === "new" && (

                                            <button
                                                type="button"
                                                className="nova-pm-action-button primary"
                                                onClick={() =>
                                                    sendAction(
                                                        "start",
                                                        getPid(
                                                            selectedProcess
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    actionLoading !==
                                                    null
                                                }
                                            >
                                                {actionLoading ===
                                                    `start-${getPid(selectedProcess)}`
                                                    ? "Starting..."
                                                    : "Start"}
                                            </button>

                                        )}


                                    {getState(
                                        selectedProcess
                                    ) === "ready" && (

                                            <button
                                                type="button"
                                                className="nova-pm-action-button primary"
                                                onClick={() =>
                                                    sendAction(
                                                        "run",
                                                        getPid(
                                                            selectedProcess
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    actionLoading !==
                                                    null
                                                }
                                            >
                                                {actionLoading ===
                                                    `run-${getPid(selectedProcess)}`
                                                    ? "Running..."
                                                    : "Run"}
                                            </button>

                                        )}


                                    {getState(
                                        selectedProcess
                                    ) === "running" && (

                                            <>

                                                <button
                                                    type="button"
                                                    className="nova-pm-action-button warning"
                                                    onClick={() =>
                                                        sendAction(
                                                            "preempt",
                                                            getPid(
                                                                selectedProcess
                                                            )
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading !==
                                                        null
                                                    }
                                                >
                                                    {actionLoading ===
                                                        `preempt-${getPid(selectedProcess)}`
                                                        ? "Preempting..."
                                                        : "Preempt"}
                                                </button>


                                                <button
                                                    type="button"
                                                    className="nova-pm-action-button warning"
                                                    onClick={() =>
                                                        sendAction(
                                                            "wait",
                                                            getPid(
                                                                selectedProcess
                                                            )
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading !==
                                                        null
                                                    }
                                                >
                                                    {actionLoading ===
                                                        `wait-${getPid(selectedProcess)}`
                                                        ? "Waiting..."
                                                        : "Wait"}
                                                </button>

                                            </>

                                        )}


                                    {getState(
                                        selectedProcess
                                    ) === "waiting" && (

                                            <button
                                                type="button"
                                                className="nova-pm-action-button primary"
                                                onClick={() =>
                                                    sendAction(
                                                        "resume",
                                                        getPid(
                                                            selectedProcess
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    actionLoading !==
                                                    null
                                                }
                                            >
                                                {actionLoading ===
                                                    `resume-${getPid(selectedProcess)}`
                                                    ? "Resuming..."
                                                    : "Resume"}
                                            </button>

                                        )}


                                    {getState(
                                        selectedProcess
                                    ) !== "terminated" && (

                                            <button
                                                type="button"
                                                className="nova-pm-action-button danger"
                                                onClick={() =>
                                                    sendAction(
                                                        "terminate",
                                                        getPid(
                                                            selectedProcess
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    actionLoading !==
                                                    null
                                                }
                                            >
                                                {actionLoading ===
                                                    `terminate-${getPid(selectedProcess)}`
                                                    ? "Terminating..."
                                                    : "Terminate Process"}
                                            </button>

                                        )}

                                </div>

                            </>

                        )}

                    </div>

                </div>

            </div>


            {/* =====================================================
                FOOTER
            ===================================================== */}

            <div className="nova-pm-footer">

                <span>
                    <strong>
                        NovaOS Kernel
                    </strong>
                    {" "}· Process Management
                </span>

                <span>
                    {processes.length} process
                    {processes.length === 1
                        ? ""
                        : "es"} detected
                </span>

            </div>


            {/* =====================================================
                CREATE PROCESS MODAL
            ===================================================== */}

            {showCreate && (

                <div
                    className="nova-pm-create-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowCreate(
                                false
                            );
                        }
                    }}
                >

                    <div className="nova-pm-create-modal">

                        <div className="nova-pm-create-header">

                            <h2>
                                Create Process
                            </h2>

                            <p>
                                Register a new process with
                                the NovaOS kernel.
                            </p>

                        </div>


                        <form
                            className="nova-pm-form"
                            onSubmit={
                                createProcess
                            }
                        >

                            <div className="nova-pm-form-grid">

                                <div className="nova-pm-form-group full">

                                    <label>
                                        Application ID
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            form.applicationId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "applicationId",
                                                event.target.value
                                            )
                                        }
                                        placeholder="terminal"
                                    />

                                </div>


                                <div className="nova-pm-form-group">

                                    <label>
                                        Priority
                                    </label>

                                    <input
                                        type="number"
                                        value={
                                            form.priority
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "priority",
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="nova-pm-form-group">

                                    <label>
                                        Memory Limit
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            form.memoryLimit
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "memoryLimit",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Optional"
                                    />

                                </div>


                                <div className="nova-pm-form-group">

                                    <label>
                                        Arrival Time
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            form.arrivalTime
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "arrivalTime",
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="nova-pm-form-group">

                                    <label>
                                        Burst Time
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        value={
                                            form.burstTime
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "burstTime",
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>

                            </div>


                            <div className="nova-pm-form-actions">

                                <button
                                    type="button"
                                    className="nova-pm-form-button"
                                    onClick={() =>
                                        setShowCreate(
                                            false
                                        )
                                    }
                                    disabled={
                                        actionLoading !==
                                        null
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="nova-pm-form-button primary"
                                    disabled={
                                        actionLoading !==
                                        null
                                    }
                                >
                                    {actionLoading ===
                                        "create"
                                        ? "Creating..."
                                        : "Create Process"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}


export default ProcessManager;