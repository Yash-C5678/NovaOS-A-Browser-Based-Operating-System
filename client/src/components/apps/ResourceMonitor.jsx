import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import NovaIcon from "../ui/NovaIcon";

const API_BASE = "/api";

const REFRESH_INTERVAL = 1000;

function ResourceMonitor() {
    const [systemState, setSystemState] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);

    const [history, setHistory] =
        useState([]);

    /*
     * =========================================================
     * FETCH SYSTEM STATE
     * =========================================================
     */

    const fetchSystemState =
        useCallback(async () => {
            try {
                const response =
                    await fetch(
                        `${API_BASE}/system/state`
                    );

                if (!response.ok) {
                    throw new Error(
                        `System state request failed: ${response.status}`
                    );
                }

                const result =
                    await response.json();

                if (
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Unable to retrieve system state."
                    );
                }

                const state =
                    result.data;

                setSystemState(state);

                setLastUpdated(
                    new Date()
                );

                setError("");

                /*
                 * Keep a small rolling history so the
                 * monitor can show recent activity.
                 */
                setHistory(
                    (current) => {
                        const processes =
                            Array.isArray(
                                state.processes
                            )
                                ? state.processes
                                : [];

                        const running =
                            processes.filter(
                                (process) =>
                                    String(
                                        process.state
                                    ).toLowerCase() ===
                                    "running"
                            ).length;

                        const total =
                            processes.length;

                        const cpuActivity =
                            total > 0
                                ? Math.round(
                                    (
                                        running /
                                        total
                                    ) *
                                    100
                                )
                                : 0;

                        const memory =
                            state.memory ||
                            {};

                        const memoryUtilization =
                            Number(
                                memory.utilization
                            ) || 0;

                        const io =
                            state.io ||
                            {};

                        const point = {
                            time:
                                new Date().toLocaleTimeString(
                                    [],
                                    {
                                        minute:
                                            "2-digit",
                                        second:
                                            "2-digit"
                                    }
                                ),

                            cpu:
                                cpuActivity,

                            memory:
                                memoryUtilization,

                            processes:
                                total,

                            io:
                                (
                                    Number(
                                        io.activeRequests
                                    ) || 0
                                ) +
                                (
                                    Number(
                                        io.queuedRequests
                                    ) || 0
                                )
                        };

                        return [
                            ...current,
                            point
                        ].slice(-30);
                    }
                );
            } catch (requestError) {
                setError(
                    requestError.message ||
                    "NovaOS system monitor is unavailable."
                );
            } finally {
                setLoading(false);
            }
        }, []);


    /*
     * =========================================================
     * LIVE POLLING
     * =========================================================
     */

    useEffect(() => {
        fetchSystemState();

        const interval =
            setInterval(
                fetchSystemState,
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        fetchSystemState
    ]);


    /*
     * =========================================================
     * NORMALIZED SYSTEM DATA
     * =========================================================
     */

    const processes =
        useMemo(
            () =>
                Array.isArray(
                    systemState?.processes
                )
                    ? systemState.processes
                    : [],
            [systemState]
        );


    const memory =
        systemState?.memory ||
        {};


    const devices =
        systemState?.devices ||
        {};


    const io =
        systemState?.io ||
        {};


    /*
     * =========================================================
     * PROCESS STATISTICS
     * =========================================================
     */

    const processStats =
        useMemo(() => {
            const states =
                processes.map(
                    (process) =>
                        String(
                            process.state ||
                            ""
                        ).toLowerCase()
                );

            return {
                total:
                    processes.length,

                running:
                    states.filter(
                        (state) =>
                            state ===
                            "running"
                    ).length,

                ready:
                    states.filter(
                        (state) =>
                            state ===
                            "ready"
                    ).length,

                waiting:
                    states.filter(
                        (state) =>
                            state ===
                            "waiting"
                    ).length,

                new:
                    states.filter(
                        (state) =>
                            state ===
                            "new"
                    ).length,

                terminated:
                    states.filter(
                        (state) =>
                            state ===
                            "terminated"
                    ).length
            };
        }, [processes]);


    /*
     * =========================================================
     * CPU ACTIVITY
     * =========================================================
     *
     * The backend currently does not expose a physical CPU
     * utilization percentage.
     *
     * Therefore this is a simulation metric based on the
     * proportion of processes currently in RUNNING state.
     */

    const cpuActivity =
        processStats.total > 0
            ? Math.round(
                (
                    processStats.running /
                    processStats.total
                ) *
                100
            )
            : 0;


    /*
     * =========================================================
     * MEMORY
     * =========================================================
     */

    const memoryUtilization =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    memory.utilization
                ) || 0
            )
        );


    const totalMemory =
        Number(
            memory.total
        ) || 0;


    const allocatedMemory =
        Number(
            memory.allocated
        ) || 0;


    const freeMemory =
        Number(
            memory.free
        ) ||
        Math.max(
            0,
            totalMemory -
            allocatedMemory
        );


    /*
     * =========================================================
     * I/O
     * =========================================================
     */

    const activeIO =
        Number(
            io.activeRequests
        ) || 0;


    const queuedIO =
        Number(
            io.queuedRequests
        ) || 0;


    const completedIO =
        Number(
            io.completedRequests
        ) || 0;


    const cancelledIO =
        Number(
            io.cancelledRequests
        ) || 0;


    /*
     * =========================================================
     * DEVICE STATISTICS
     * =========================================================
     */

    const deviceCount =
        Number(
            devices.totalDevices
        ) ||
        Number(
            devices.total
        ) ||
        (
            Array.isArray(
                devices.devices
            )
                ? devices.devices.length
                : 0
        );


    const busyDevices =
        Number(
            devices.busyDevices
        ) ||
        Number(
            devices.activeDevices
        ) ||
        0;


    /*
     * =========================================================
     * UPTIME
     * =========================================================
     */

    const uptime =
        useMemo(() => {
            const bootTime =
                systemState?.bootTime;

            if (!bootTime) {
                return "Offline";
            }

            const boot =
                new Date(
                    bootTime
                );

            if (
                Number.isNaN(
                    boot.getTime()
                )
            ) {
                return "Unknown";
            }

            const seconds =
                Math.max(
                    0,
                    Math.floor(
                        (
                            Date.now() -
                            boot.getTime()
                        ) /
                        1000
                    )
                );

            const days =
                Math.floor(
                    seconds /
                    86400
                );

            const hours =
                Math.floor(
                    (
                        seconds %
                        86400
                    ) /
                    3600
                );

            const minutes =
                Math.floor(
                    (
                        seconds %
                        3600
                    ) /
                    60
                );

            const remainingSeconds =
                seconds %
                60;

            if (days > 0) {
                return `${days}d ${hours}h ${minutes}m`;
            }

            if (hours > 0) {
                return `${hours}h ${minutes}m ${remainingSeconds}s`;
            }

            return `${minutes}m ${remainingSeconds}s`;
        }, [
            systemState,
            lastUpdated
        ]);


    /*
     * =========================================================
     * STORAGE INFORMATION
     * =========================================================
     *
     * The current backend does not expose physical storage
     * capacity. We therefore report VFS availability rather
     * than inventing disk capacity.
     */

    const storageStatus =
        "Virtual filesystem";


    /*
     * =========================================================
     * NETWORK INFORMATION
     * =========================================================
     *
     * The current backend exposes a network device but does
     * not yet expose byte counters. Keep the value honest.
     */

    const networkStatus =
        "Monitoring unavailable";


    /*
     * =========================================================
     * FORMATTERS
     * =========================================================
     */

    const formatValue =
        (value) => {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return "—";
            }

            return value;
        };


    const getStateClass =
        (state) => {
            const normalized =
                String(
                    state ||
                    "unknown"
                ).toLowerCase();

            if (
                normalized ===
                "running"
            ) {
                return "running";
            }

            if (
                normalized ===
                "ready"
            ) {
                return "ready";
            }

            if (
                normalized ===
                "waiting" ||
                normalized ===
                "blocked"
            ) {
                return "waiting";
            }

            if (
                normalized ===
                "terminated"
            ) {
                return "terminated";
            }

            return "new";
        };


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="nova-resource-monitor">

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .nova-resource-monitor {
                    width: 100%;
                    height: 100%;
                    min-height: 500px;

                    overflow: auto;

                    padding: 20px;

                    background:
                        #f6f7fb;

                    color:
                        #242238;

                    font-family:
                        Inter,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .nova-resource-monitor::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }

                .nova-resource-monitor::-webkit-scrollbar-track {
                    background: transparent;
                }

                .nova-resource-monitor::-webkit-scrollbar-thumb {
                    background: #c9cbd6;
                    border-radius: 20px;
                }


                /*
                 * HEADER
                 */

                .nrm-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;

                    gap: 20px;

                    margin-bottom: 18px;
                }

                .nrm-title-block h1 {
                    margin: 0;

                    font-size: 25px;
                    line-height: 1.15;

                    color: #222038;
                }

                .nrm-title-block p {
                    margin: 6px 0 0;

                    color: #77768a;

                    font-size: 12px;
                }

                .nrm-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    padding: 8px 11px;

                    border:
                        1px solid
                        #dfe1e9;

                    border-radius: 9px;

                    background:
                        #ffffff;

                    color:
                        #66677a;

                    font-size: 10px;
                    font-weight: 700;
                }

                .nrm-status-dot {
                    width: 7px;
                    height: 7px;

                    border-radius: 50%;

                    background:
                        #22a06b;
                }


                /*
                 * ERROR
                 */

                .nrm-error {
                    margin-bottom: 14px;

                    padding: 10px 12px;

                    border:
                        1px solid
                        #f0c5cf;

                    border-radius: 9px;

                    background:
                        #fff2f5;

                    color:
                        #b83c59;

                    font-size: 11px;
                }


                /*
                 * RESOURCE CARDS
                 */

                .nrm-resource-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(4, minmax(0, 1fr));

                    gap: 11px;

                    margin-bottom: 14px;
                }

                .nrm-resource-card {
                    padding: 15px;

                    border:
                        1px solid
                        #e1e2e9;

                    border-radius: 12px;

                    background:
                        #ffffff;

                    box-shadow:
                        0 4px 14px
                        rgba(35, 37, 55, 0.04);
                }

                .nrm-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    margin-bottom: 10px;
                }

                .nrm-card-label {
                    color:
                        #858597;

                    font-size: 9px;
                    font-weight: 800;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.09em;
                }

                .nrm-card-icon {
                    display: grid;
                    place-items: center;

                    width: 28px;
                    height: 28px;

                    border-radius: 8px;

                    background:
                        #f0effa;

                    color:
                        #6254b8;
                }

                .nrm-card-value {
                    color:
                        #25233a;

                    font-size: 24px;
                    font-weight: 800;

                    line-height: 1;
                }

                .nrm-card-subtitle {
                    margin-top: 5px;

                    color:
                        #8b8b9a;

                    font-size: 9px;
                }


                /*
                 * PROGRESS
                 */

                .nrm-progress {
                    width: 100%;
                    height: 6px;

                    margin-top: 11px;

                    overflow: hidden;

                    border-radius: 20px;

                    background:
                        #ececf2;
                }

                .nrm-progress-fill {
                    height: 100%;

                    border-radius: 20px;

                    background:
                        #7165c7;

                    transition:
                        width 0.3s ease;
                }


                /*
                 * MAIN GRID
                 */

                .nrm-main-grid {
                    display: grid;

                    grid-template-columns:
                        minmax(0, 1.5fr)
                        minmax(260px, 0.8fr);

                    gap: 14px;

                    margin-bottom: 14px;
                }


                /*
                 * PANEL
                 */

                .nrm-panel {
                    overflow: hidden;

                    border:
                        1px solid
                        #e1e2e9;

                    border-radius: 12px;

                    background:
                        #ffffff;

                    box-shadow:
                        0 4px 14px
                        rgba(35, 37, 55, 0.035);
                }

                .nrm-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    padding: 13px 15px;

                    border-bottom:
                        1px solid
                        #ececf1;
                }

                .nrm-panel-title {
                    color:
                        #302d45;

                    font-size: 12px;
                    font-weight: 800;
                }

                .nrm-panel-subtitle {
                    margin-top: 3px;

                    color:
                        #8b8b9a;

                    font-size: 9px;
                }

                .nrm-panel-body {
                    padding: 15px;
                }


                /*
                 * ACTIVITY GRAPH
                 */

                .nrm-chart {
                    display: flex;
                    align-items: flex-end;

                    gap: 4px;

                    height: 170px;

                    padding:
                        10px 3px 4px;

                    border-bottom:
                        1px solid
                        #e9e9ef;
                }

                .nrm-chart-column {
                    display: flex;
                    flex-direction: column;

                    justify-content: flex-end;

                    flex: 1;

                    height: 100%;

                    min-width: 3px;
                }

                .nrm-chart-bar {
                    width: 100%;

                    min-height: 2px;

                    border-radius:
                        4px 4px 1px 1px;

                    background:
                        #7668c8;

                    opacity: 0.82;

                    transition:
                        height 0.25s ease;
                }

                .nrm-chart-empty {
                    display: flex;
                    align-items: center;
                    justify-content: center;

                    width: 100%;
                    height: 100%;

                    color:
                        #9999a8;

                    font-size: 10px;
                }

                .nrm-chart-labels {
                    display: flex;
                    justify-content: space-between;

                    margin-top: 8px;

                    color:
                        #9999a8;

                    font-size: 8px;
                }


                /*
                 * MEMORY DETAIL
                 */

                .nrm-memory-big {
                    display: flex;
                    align-items: baseline;

                    gap: 5px;
                }

                .nrm-memory-big strong {
                    color:
                        #28253e;

                    font-size: 28px;
                }

                .nrm-memory-big span {
                    color:
                        #858597;

                    font-size: 10px;
                }

                .nrm-memory-row {
                    display: flex;
                    justify-content: space-between;

                    margin-top: 12px;

                    padding-bottom: 9px;

                    border-bottom:
                        1px solid
                        #eeeeF2;

                    font-size: 10px;
                }

                .nrm-memory-row:last-child {
                    border-bottom: 0;
                }

                .nrm-memory-row span {
                    color:
                        #898998;
                }

                .nrm-memory-row strong {
                    color:
                        #4b485d;
                }


                /*
                 * PROCESS SUMMARY
                 */

                .nrm-process-summary {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 7px;

                    margin-bottom: 12px;
                }

                .nrm-process-stat {
                    padding: 9px;

                    border:
                        1px solid
                        #ececf1;

                    border-radius: 8px;

                    background:
                        #fafafd;
                }

                .nrm-process-stat span {
                    display: block;

                    color:
                        #9292a0;

                    font-size: 8px;

                    text-transform:
                        uppercase;
                }

                .nrm-process-stat strong {
                    display: block;

                    margin-top: 3px;

                    color:
                        #403d54;

                    font-size: 15px;
                }


                /*
                 * PROCESS TABLE
                 */

                .nrm-table-wrap {
                    overflow-x: auto;
                }

                .nrm-table {
                    width: 100%;

                    border-collapse:
                        collapse;

                    min-width:
                        420px;
                }

                .nrm-table th {
                    padding:
                        8px 10px;

                    background:
                        #f8f8fb;

                    color:
                        #888896;

                    font-size: 8px;
                    font-weight: 800;

                    text-align: left;

                    letter-spacing:
                        0.06em;
                }

                .nrm-table td {
                    padding:
                        9px 10px;

                    border-top:
                        1px solid
                        #eeeeF2;

                    color:
                        #514e61;

                    font-size: 10px;
                }

                .nrm-pid {
                    color:
                        #6254b8;

                    font-family:
                        Consolas,
                        monospace;

                    font-weight:
                        700;
                }


                /*
                 * STATE
                 */

                .nrm-state {
                    display: inline-flex;
                    align-items: center;

                    padding:
                        3px 7px;

                    border-radius:
                        999px;

                    font-size:
                        8px;

                    font-weight:
                        800;
                }

                .nrm-state.running {
                    background:
                        #e5f8ef;

                    color:
                        #168054;
                }

                .nrm-state.ready {
                    background:
                        #e9f1ff;

                    color:
                        #3971c4;
                }

                .nrm-state.waiting {
                    background:
                        #fff3df;

                    color:
                        #ad730c;
                }

                .nrm-state.terminated {
                    background:
                        #ffedf1;

                    color:
                        #c74461;
                }

                .nrm-state.new {
                    background:
                        #f0edfb;

                    color:
                        #705dc0;
                }


                /*
                 * I/O
                 */

                .nrm-io-list {
                    display: flex;
                    flex-direction: column;

                    gap: 8px;
                }

                .nrm-io-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    padding: 10px;

                    border:
                        1px solid
                        #ececf1;

                    border-radius: 8px;

                    background:
                        #fbfbfd;
                }

                .nrm-io-label {
                    color:
                        #787889;

                    font-size:
                        9px;
                }

                .nrm-io-value {
                    color:
                        #3f3c51;

                    font-size:
                        13px;

                    font-weight:
                        800;
                }


                /*
                 * SYSTEM INFORMATION
                 */

                .nrm-info-list {
                    display: flex;
                    flex-direction: column;

                    gap: 10px;
                }

                .nrm-info-row {
                    display: flex;
                    justify-content: space-between;

                    gap: 15px;

                    padding-bottom:
                        9px;

                    border-bottom:
                        1px solid
                        #eeeeF2;
                }

                .nrm-info-row:last-child {
                    border-bottom: 0;
                    padding-bottom: 0;
                }

                .nrm-info-row span {
                    color:
                        #898998;

                    font-size:
                        9px;
                }

                .nrm-info-row strong {
                    color:
                        #454257;

                    font-size:
                        10px;

                    text-align:
                        right;
                }


                /*
                 * FOOTER
                 */

                .nrm-footer {
                    display: flex;
                    justify-content: space-between;

                    gap: 10px;

                    color:
                        #9999a7;

                    font-size:
                        9px;
                }


                /*
                 * LOADING
                 */

                .nrm-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;

                    min-height:
                        300px;

                    color:
                        #858596;

                    font-size:
                        11px;
                }

                .nrm-spinner {
                    width: 22px;
                    height: 22px;

                    margin-right: 9px;

                    border:
                        2px solid
                        #e3e3eb;

                    border-top-color:
                        #7165c7;

                    border-radius:
                        50%;

                    animation:
                        nrm-spin
                        0.8s linear infinite;
                }

                @keyframes nrm-spin {
                    to {
                        transform:
                            rotate(360deg);
                    }
                }


                /*
                 * RESPONSIVE
                 */

                @media (max-width: 950px) {
                    .nrm-resource-grid {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .nrm-main-grid {
                        grid-template-columns:
                            1fr;
                    }
                }

                @media (max-width: 600px) {
                    .nova-resource-monitor {
                        padding: 13px;
                    }

                    .nrm-header {
                        flex-direction:
                            column;
                    }

                    .nrm-resource-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .nrm-process-summary {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }
                }

            `}</style>


            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="nrm-header">

                <div className="nrm-title-block">

                    <h1>
                        Resource Monitor
                    </h1>

                    <p>
                        Live overview of NovaOS kernel
                        resources and subsystem activity.
                    </p>

                </div>


                <div className="nrm-status">

                    <span className="nrm-status-dot" />

                    {systemState?.booted
                        ? "KERNEL ONLINE"
                        : "KERNEL OFFLINE"}

                    <span>
                        · {lastUpdated
                            ? lastUpdated.toLocaleTimeString()
                            : "waiting"}
                    </span>

                </div>

            </div>


            {/* =====================================================
                ERROR
            ===================================================== */}

            {error && (
                <div className="nrm-error">
                    {error}
                </div>
            )}


            {/* =====================================================
                LOADING
            ===================================================== */}

            {loading ? (

                <div className="nrm-loading">

                    <div className="nrm-spinner" />

                    Loading NovaOS resource state...

                </div>

            ) : (

                <>

                    {/* =============================================
                        RESOURCE SUMMARY
                    ============================================= */}

                    <div className="nrm-resource-grid">

                        {/* CPU */}

                        <div className="nrm-resource-card">

                            <div className="nrm-card-top">

                                <span className="nrm-card-label">
                                    CPU Activity
                                </span>

                                <span className="nrm-card-icon">
                                    <NovaIcon
                                        name="process"
                                        size={15}
                                    />
                                </span>

                            </div>

                            <div className="nrm-card-value">
                                {cpuActivity}%
                            </div>

                            <div className="nrm-card-subtitle">
                                Based on running processes
                            </div>

                            <div className="nrm-progress">

                                <div
                                    className="nrm-progress-fill"
                                    style={{
                                        width:
                                            `${cpuActivity}%`
                                    }}
                                />

                            </div>

                        </div>


                        {/* MEMORY */}

                        <div className="nrm-resource-card">

                            <div className="nrm-card-top">

                                <span className="nrm-card-label">
                                    Memory
                                </span>

                                <span className="nrm-card-icon">
                                    <NovaIcon
                                        name="memory"
                                        size={15}
                                    />
                                </span>

                            </div>

                            <div className="nrm-card-value">
                                {memoryUtilization}%
                            </div>

                            <div className="nrm-card-subtitle">
                                {allocatedMemory} / {totalMemory} MB allocated
                            </div>

                            <div className="nrm-progress">

                                <div
                                    className="nrm-progress-fill"
                                    style={{
                                        width:
                                            `${memoryUtilization}%`
                                    }}
                                />

                            </div>

                        </div>


                        {/* PROCESSES */}

                        <div className="nrm-resource-card">

                            <div className="nrm-card-top">

                                <span className="nrm-card-label">
                                    Processes
                                </span>

                                <span className="nrm-card-icon">
                                    <NovaIcon
                                        name="process"
                                        size={15}
                                    />
                                </span>

                            </div>

                            <div className="nrm-card-value">
                                {processStats.total}
                            </div>

                            <div className="nrm-card-subtitle">
                                {processStats.running} running ·{" "}
                                {processStats.ready} ready
                            </div>

                            <div className="nrm-progress">

                                <div
                                    className="nrm-progress-fill"
                                    style={{
                                        width:
                                            `${cpuActivity}%`
                                    }}
                                />

                            </div>

                        </div>


                        {/* I/O */}

                        <div className="nrm-resource-card">

                            <div className="nrm-card-top">

                                <span className="nrm-card-label">
                                    I/O Activity
                                </span>

                                <span className="nrm-card-icon">
                                    <NovaIcon
                                        name="io"
                                        size={15}
                                    />
                                </span>

                            </div>

                            <div className="nrm-card-value">
                                {
                                    activeIO +
                                    queuedIO
                                }
                            </div>

                            <div className="nrm-card-subtitle">
                                {activeIO} active ·{" "}
                                {queuedIO} queued
                            </div>

                            <div className="nrm-progress">

                                <div
                                    className="nrm-progress-fill"
                                    style={{
                                        width:
                                            `${activeIO +
                                                queuedIO >
                                                0
                                                ? 100
                                                : 0
                                            }%`
                                    }}
                                />

                            </div>

                        </div>

                    </div>


                    {/* =============================================
                        MAIN GRID
                    ============================================= */}

                    <div className="nrm-main-grid">

                        {/* =========================================
                            ACTIVITY
                        ========================================= */}

                        <div className="nrm-panel">

                            <div className="nrm-panel-header">

                                <div>

                                    <div className="nrm-panel-title">
                                        Recent System Activity
                                    </div>

                                    <div className="nrm-panel-subtitle">
                                        Last {history.length} samples
                                    </div>

                                </div>

                                <div className="nrm-card-label">
                                    LIVE
                                </div>

                            </div>


                            <div className="nrm-panel-body">

                                <div className="nrm-chart">

                                    {history.length === 0 ? (

                                        <div className="nrm-chart-empty">
                                            Waiting for resource samples...
                                        </div>

                                    ) : (

                                        history.map(
                                            (
                                                point,
                                                index
                                            ) => (

                                                <div
                                                    key={`${point.time}-${index}`}
                                                    className="nrm-chart-column"
                                                    title={`${point.time} · CPU activity ${point.cpu}%`}
                                                >

                                                    <div
                                                        className="nrm-chart-bar"
                                                        style={{
                                                            height:
                                                                `${Math.max(
                                                                    2,
                                                                    point.cpu
                                                                )}%`
                                                        }}
                                                    />

                                                </div>

                                            )
                                        )

                                    )}

                                </div>


                                <div className="nrm-chart-labels">

                                    <span>
                                        Older
                                    </span>

                                    <span>
                                        CPU activity
                                    </span>

                                    <span>
                                        Now
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* =========================================
                            MEMORY
                        ========================================= */}

                        <div className="nrm-panel">

                            <div className="nrm-panel-header">

                                <div>

                                    <div className="nrm-panel-title">
                                        Memory Status
                                    </div>

                                    <div className="nrm-panel-subtitle">
                                        NovaOS memory manager
                                    </div>

                                </div>

                            </div>


                            <div className="nrm-panel-body">

                                <div className="nrm-memory-big">

                                    <strong>
                                        {allocatedMemory}
                                    </strong>

                                    <span>
                                        MB allocated
                                    </span>

                                </div>


                                <div className="nrm-progress">

                                    <div
                                        className="nrm-progress-fill"
                                        style={{
                                            width:
                                                `${memoryUtilization}%`
                                        }}
                                    />

                                </div>


                                <div className="nrm-memory-row">

                                    <span>
                                        Total memory
                                    </span>

                                    <strong>
                                        {formatValue(
                                            totalMemory
                                        )} MB
                                    </strong>

                                </div>


                                <div className="nrm-memory-row">

                                    <span>
                                        Allocated
                                    </span>

                                    <strong>
                                        {formatValue(
                                            allocatedMemory
                                        )} MB
                                    </strong>

                                </div>


                                <div className="nrm-memory-row">

                                    <span>
                                        Free
                                    </span>

                                    <strong>
                                        {formatValue(
                                            freeMemory
                                        )} MB
                                    </strong>

                                </div>


                                <div className="nrm-memory-row">

                                    <span>
                                        Utilization
                                    </span>

                                    <strong>
                                        {memoryUtilization}%
                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =============================================
                        PROCESS + I/O
                    ============================================= */}

                    <div className="nrm-main-grid">

                        {/* PROCESS PANEL */}

                        <div className="nrm-panel">

                            <div className="nrm-panel-header">

                                <div>

                                    <div className="nrm-panel-title">
                                        Active Processes
                                    </div>

                                    <div className="nrm-panel-subtitle">
                                        Current kernel process table
                                    </div>

                                </div>

                            </div>


                            <div className="nrm-panel-body">

                                <div className="nrm-process-summary">

                                    <div className="nrm-process-stat">
                                        <span>
                                            Total
                                        </span>

                                        <strong>
                                            {processStats.total}
                                        </strong>
                                    </div>


                                    <div className="nrm-process-stat">
                                        <span>
                                            Running
                                        </span>

                                        <strong>
                                            {processStats.running}
                                        </strong>
                                    </div>


                                    <div className="nrm-process-stat">
                                        <span>
                                            Ready
                                        </span>

                                        <strong>
                                            {processStats.ready}
                                        </strong>
                                    </div>


                                    <div className="nrm-process-stat">
                                        <span>
                                            Waiting
                                        </span>

                                        <strong>
                                            {processStats.waiting}
                                        </strong>
                                    </div>


                                    <div className="nrm-process-stat">
                                        <span>
                                            New
                                        </span>

                                        <strong>
                                            {processStats.new}
                                        </strong>
                                    </div>


                                    <div className="nrm-process-stat">
                                        <span>
                                            Terminated
                                        </span>

                                        <strong>
                                            {processStats.terminated}
                                        </strong>
                                    </div>

                                </div>


                                {processes.length === 0 ? (

                                    <div className="nrm-chart-empty">
                                        No processes currently exist.
                                    </div>

                                ) : (

                                    <div className="nrm-table-wrap">

                                        <table className="nrm-table">

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
                                                        REMAINING
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                {processes.map(
                                                    (process) => {

                                                        const state =
                                                            String(
                                                                process.state ||
                                                                "unknown"
                                                            ).toLowerCase();

                                                        return (

                                                            <tr
                                                                key={
                                                                    String(
                                                                        process.pid
                                                                    )
                                                                }
                                                            >

                                                                <td>

                                                                    <span className="nrm-pid">
                                                                        {
                                                                            process.pid
                                                                        }
                                                                    </span>

                                                                </td>


                                                                <td>
                                                                    {
                                                                        process.applicationId ||
                                                                        process.applicationName ||
                                                                        process.name ||
                                                                        "System Process"
                                                                    }
                                                                </td>


                                                                <td>

                                                                    <span
                                                                        className={
                                                                            `nrm-state ${getStateClass(
                                                                                state
                                                                            )}`
                                                                        }
                                                                    >
                                                                        {
                                                                            state
                                                                                .charAt(
                                                                                    0
                                                                                )
                                                                                .toUpperCase() +
                                                                            state.slice(
                                                                                1
                                                                            )
                                                                        }
                                                                    </span>

                                                                </td>


                                                                <td>
                                                                    {
                                                                        formatValue(
                                                                            process.priority
                                                                        )
                                                                    }
                                                                </td>


                                                                <td>
                                                                    {
                                                                        formatValue(
                                                                            process.remainingTime ??
                                                                            process.remainingBurstTime
                                                                        )
                                                                    }
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

                        </div>


                        {/* I/O PANEL */}

                        <div className="nrm-panel">

                            <div className="nrm-panel-header">

                                <div>

                                    <div className="nrm-panel-title">
                                        I/O Activity
                                    </div>

                                    <div className="nrm-panel-subtitle">
                                        I/O controller statistics
                                    </div>

                                </div>

                            </div>


                            <div className="nrm-panel-body">

                                <div className="nrm-io-list">

                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Active requests
                                        </span>

                                        <span className="nrm-io-value">
                                            {activeIO}
                                        </span>

                                    </div>


                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Queued requests
                                        </span>

                                        <span className="nrm-io-value">
                                            {queuedIO}
                                        </span>

                                    </div>


                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Completed requests
                                        </span>

                                        <span className="nrm-io-value">
                                            {completedIO}
                                        </span>

                                    </div>


                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Cancelled requests
                                        </span>

                                        <span className="nrm-io-value">
                                            {cancelledIO}
                                        </span>

                                    </div>


                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Devices
                                        </span>

                                        <span className="nrm-io-value">
                                            {deviceCount}
                                        </span>

                                    </div>


                                    <div className="nrm-io-row">

                                        <span className="nrm-io-label">
                                            Busy devices
                                        </span>

                                        <span className="nrm-io-value">
                                            {busyDevices}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =============================================
                        SYSTEM INFORMATION
                    ============================================= */}

                    <div className="nrm-panel">

                        <div className="nrm-panel-header">

                            <div>

                                <div className="nrm-panel-title">
                                    System Information
                                </div>

                                <div className="nrm-panel-subtitle">
                                    NovaOS runtime information
                                </div>

                            </div>

                        </div>


                        <div className="nrm-panel-body">

                            <div className="nrm-info-list">

                                <div className="nrm-info-row">

                                    <span>
                                        Kernel status
                                    </span>

                                    <strong>
                                        {
                                            systemState?.booted
                                                ? "Running"
                                                : "Stopped"
                                        }
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        Boot time
                                    </span>

                                    <strong>
                                        {
                                            systemState?.bootTime
                                                ? new Date(
                                                    systemState.bootTime
                                                ).toLocaleString()
                                                : "—"
                                        }
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        System uptime
                                    </span>

                                    <strong>
                                        {uptime}
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        Registered applications
                                    </span>

                                    <strong>
                                        {
                                            formatValue(
                                                systemState?.applications
                                            )
                                        }
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        Active windows
                                    </span>

                                    <strong>
                                        {
                                            Array.isArray(
                                                systemState?.windows
                                            )
                                                ? systemState.windows.length
                                                : "—"
                                        }
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        Storage
                                    </span>

                                    <strong>
                                        {storageStatus}
                                    </strong>

                                </div>


                                <div className="nrm-info-row">

                                    <span>
                                        Network
                                    </span>

                                    <strong>
                                        {networkStatus}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* =============================================
                        FOOTER
                    ============================================= */}

                    <div className="nrm-footer">

                        <span>
                            NovaOS Resource Monitor
                        </span>

                        <span>
                            Refresh interval: 1 second
                        </span>

                    </div>

                </>

            )}

        </div>
    );
}


export default ResourceMonitor;