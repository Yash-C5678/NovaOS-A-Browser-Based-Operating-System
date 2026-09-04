import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

const API_BASE = "/api/virtual-memory";
const REFRESH_INTERVAL = 1500;

const emptyStatistics = {
    physicalMemorySize: 0,
    virtualMemorySize: 0,
    processCount: 0,
    residentPages: 0,
    nonResidentPages: 0,
    modifiedPages: 0,
    freeFrames: 0,
    usedFrames: 0,
    accesses: 0,
    pageHits: 0,
    pageFaults: 0,
    hitRatio: 0,
    faultRatio: 0,
    pagesLoaded: 0,
    pagesEvicted: 0,
    swapIns: 0,
    swapOuts: 0,
    translations: 0,
    successfulTranslations: 0,
    memoryPressureEvents: 0,
    processesCreated: 0,
    processesRemoved: 0,
    evictionPolicy: "fifo"
};

const emptyForm = {
    logicalAddress: "",
    write: false
};


function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}


function normalizeObject(value) {
    return value && typeof value === "object"
        ? value
        : {};
}


function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString();
}


function formatRatio(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0.00%";
    }

    return `${(number * 100).toFixed(2)}%`;
}


function truncate(value, length = 20) {
    const text = String(value ?? "");

    if (text.length <= length) {
        return text;
    }

    return `${text.slice(0, length)}…`;
}


async function requestJson(
    url,
    options = {}
) {
    const response = await fetch(
        url,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (
        !response.ok ||
        payload?.success === false
    ) {
        throw new Error(
            payload?.error ||
            `Request failed with status ${response.status}.`
        );
    }

    return payload;
}


function StatusBadge({
    children,
    type = "neutral"
}) {
    return (
        <span
            className={`vm-status ${type}`}
        >
            <span className="vm-status-dot" />
            {children}
        </span>
    );
}


function Metric({
    label,
    value,
    detail
}) {
    return (
        <div className="vm-metric">
            <div className="vm-metric-label">
                {label}
            </div>

            <div className="vm-metric-value">
                {value}
            </div>

            {detail && (
                <div className="vm-metric-detail">
                    {detail}
                </div>
            )}
        </div>
    );
}


function Panel({
    title,
    subtitle,
    children,
    className = ""
}) {
    return (
        <section
            className={`vm-panel ${className}`}
        >
            <div className="vm-panel-header">
                <div>
                    <div className="vm-panel-title">
                        {title}
                    </div>

                    {subtitle && (
                        <div className="vm-panel-subtitle">
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>

            <div className="vm-panel-body">
                {children}
            </div>
        </section>
    );
}


export default function VirtualMemory() {
    const [
        statistics,
        setStatistics
    ] = useState(
        emptyStatistics
    );

    const [
        processes,
        setProcesses
    ] = useState([]);

    const [
        memoryMap,
        setMemoryMap
    ] = useState([]);

    const [
        selectedPid,
        setSelectedPid
    ] = useState("");

    const [
        selectedProcess,
        setSelectedProcess
    ] = useState(null);

    const [
        form,
        setForm
    ] = useState(
        emptyForm
    );

    const [
        lastResult,
        setLastResult
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        notice,
        setNotice
    ] = useState("");

    /*
     * =========================================================
     * LOAD SYSTEM DATA
     * =========================================================
     */

    const loadData = useCallback(
        async ({
            silent = false
        } = {}) => {
            if (!silent) {
                setLoading(true);
            }

            try {
                const [
                    statisticsResponse,
                    processesResponse,
                    memoryMapResponse
                ] = await Promise.all([
                    requestJson(
                        `${API_BASE}/statistics`
                    ),
                    requestJson(
                        `${API_BASE}/processes`
                    ),
                    requestJson(
                        `${API_BASE}/memory-map`
                    )
                ]);

                const nextStatistics =
                    normalizeObject(
                        statisticsResponse?.data
                    );

                const nextProcesses =
                    normalizeArray(
                        processesResponse?.data
                    );

                const nextMemoryMap =
                    normalizeArray(
                        memoryMapResponse?.data
                    );

                setStatistics({
                    ...emptyStatistics,
                    ...nextStatistics
                });

                setProcesses(
                    nextProcesses
                );

                setMemoryMap(
                    nextMemoryMap
                );

                setSelectedPid(
                    (currentPid) => {
                        const currentExists =
                            nextProcesses.some(
                                (process) =>
                                    String(
                                        process.pid
                                    ) ===
                                    String(
                                        currentPid
                                    )
                            );

                        if (
                            currentExists
                        ) {
                            return currentPid;
                        }

                        return (
                            nextProcesses[0]?.pid ??
                            ""
                        );
                    }
                );

                setError("");
            } catch (
                requestError
            ) {
                setError(
                    requestError.message ||
                    "Unable to retrieve virtual memory state."
                );
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        []
    );


    /*
     * =========================================================
     * LOAD SELECTED PROCESS
     * =========================================================
     */

    const loadSelectedProcess =
        useCallback(
            async (
                pid,
                {
                    silent = false
                } = {}
            ) => {
                if (!pid) {
                    setSelectedProcess(null);
                    return;
                }

                try {
                    const response =
                        await requestJson(
                            `${API_BASE}/processes/${encodeURIComponent(
                                pid
                            )}`
                        );

                    setSelectedProcess(
                        normalizeObject(
                            response?.data
                        )
                    );

                    if (!silent) {
                        setError("");
                    }
                } catch (
                    requestError
                ) {
                    if (!silent) {
                        setError(
                            requestError.message
                        );
                    }
                }
            },
            []
        );


    /*
     * =========================================================
     * INITIAL LOAD
     * =========================================================
     */

    useEffect(() => {
        loadData();
    }, [
        loadData
    ]);


    /*
     * =========================================================
     * SELECTED PROCESS LOAD
     * =========================================================
     */

    useEffect(() => {
        loadSelectedProcess(
            selectedPid
        );
    }, [
        selectedPid,
        loadSelectedProcess
    ]);


    /*
     * =========================================================
     * LIVE POLLING
     * =========================================================
     */

    useEffect(() => {
        const interval =
            setInterval(
                () => {
                    loadData({
                        silent: true
                    });

                    if (
                        selectedPid
                    ) {
                        loadSelectedProcess(
                            selectedPid,
                            {
                                silent: true
                            }
                        );
                    }
                },
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        loadData,
        loadSelectedProcess,
        selectedPid
    ]);


    /*
     * =========================================================
     * DERIVED DATA
     * =========================================================
     */

    const selectedPages =
        useMemo(
            () =>
                normalizeArray(
                    selectedProcess?.pages
                ),
            [
                selectedProcess
            ]
        );


    const residentPages =
        useMemo(
            () =>
                selectedPages.filter(
                    (page) =>
                        Boolean(
                            page.resident
                        )
                ),
            [
                selectedPages
            ]
        );


    const nonResidentPages =
        useMemo(
            () =>
                selectedPages.filter(
                    (page) =>
                        !page.resident
                ),
            [
                selectedPages
            ]
        );


    const memoryMapByFrame =
        useMemo(
            () => {
                const map =
                    new Map();

                memoryMap.forEach(
                    (entry) => {
                        map.set(
                            Number(
                                entry.frameNumber
                            ),
                            entry
                        );
                    }
                );

                return map;
            },
            [
                memoryMap
            ]
        );


    const frameCount =
        Number(
            statistics.freeFrames
        ) +
        Number(
            statistics.usedFrames
        );


    const utilization =
        frameCount > 0
            ? Number(
                statistics.usedFrames
            ) / frameCount
            : 0;


    /*
     * =========================================================
     * FORM
     * =========================================================
     */

    function updateForm(
        field,
        value
    ) {
        setForm(
            (current) => ({
                ...current,
                [field]: value
            })
        );
    }


    /*
     * =========================================================
     * SELECT PROCESS
     * =========================================================
     */

    function handleSelectProcess(
        pid
    ) {
        setSelectedPid(
            String(pid)
        );

        setLastResult(null);
        setError("");
        setNotice("");
    }


    /*
     * =========================================================
     * ACCESS VIRTUAL ADDRESS
     * =========================================================
     */

    async function handleAccess(
        event
    ) {
        event.preventDefault();

        if (!selectedPid) {
            setError(
                "Select a process first."
            );

            return;
        }

        const logicalAddress =
            Number(
                form.logicalAddress
            );

        if (
            !Number.isInteger(
                logicalAddress
            ) ||
            logicalAddress < 0
        ) {
            setError(
                "Enter a valid non-negative logical address."
            );

            return;
        }

        const process =
            processes.find(
                (item) =>
                    String(
                        item.pid
                    ) ===
                    String(
                        selectedPid
                    )
            );

        if (
            process &&
            logicalAddress >=
            Number(
                process.virtualMemorySize
            )
        ) {
            setError(
                `Logical address must be between 0 and ${
                    Number(
                        process.virtualMemorySize
                    ) - 1
                }.`
            );

            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const response =
                await requestJson(
                    `${API_BASE}/access`,
                    {
                        method: "POST",
                        body:
                            JSON.stringify({
                                pid:
                                    selectedPid,
                                logicalAddress,
                                write:
                                    Boolean(
                                        form.write
                                    )
                            })
                    }
                );

            const result =
                response?.data ?? null;

            setLastResult(
                result
            );

            if (
                result?.pageFault
            ) {
                setNotice(
                    result.evictedPage
                        ? "Page fault handled: page-in completed and a resident page was evicted."
                        : "Page fault handled: page-in completed."
                );
            } else {
                setNotice(
                    "Virtual address resolved as a page hit."
                );
            }

            setForm(
                (current) => ({
                    ...current,
                    logicalAddress: ""
                })
            );

            await loadData({
                silent: true
            });

            await loadSelectedProcess(
                selectedPid,
                {
                    silent: true
                }
            );
        } catch (
            requestError
        ) {
            setError(
                requestError.message
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * PAGE IN
     * =========================================================
     */

    async function handlePageIn(
        pageNumber
    ) {
        if (!selectedPid) {
            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const response =
                await requestJson(
                    `${API_BASE}/page-in`,
                    {
                        method: "POST",
                        body:
                            JSON.stringify({
                                pid:
                                    selectedPid,
                                pageNumber
                            })
                    }
                );

            setLastResult(
                response?.data ?? null
            );

            setNotice(
                `Page ${pageNumber} loaded into physical memory.`
            );

            await loadData({
                silent: true
            });

            await loadSelectedProcess(
                selectedPid,
                {
                    silent: true
                }
            );
        } catch (
            requestError
        ) {
            setError(
                requestError.message
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * PAGE OUT
     * =========================================================
     */

    async function handlePageOut(
        pageNumber
    ) {
        if (!selectedPid) {
            return;
        }

        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            const response =
                await requestJson(
                    `${API_BASE}/page-out`,
                    {
                        method: "POST",
                        body:
                            JSON.stringify({
                                pid:
                                    selectedPid,
                                pageNumber
                            })
                    }
                );

            setLastResult(
                response?.data ?? null
            );

            setNotice(
                `Page ${pageNumber} was paged out.`
            );

            await loadData({
                silent: true
            });

            await loadSelectedProcess(
                selectedPid,
                {
                    silent: true
                }
            );
        } catch (
            requestError
        ) {
            setError(
                requestError.message
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * RESET
     * =========================================================
     */

    async function handleReset() {
        setActionLoading(true);
        setError("");
        setNotice("");

        try {
            await requestJson(
                `${API_BASE}/reset`,
                {
                    method: "POST",
                    body:
                        JSON.stringify({})
                }
            );

            setLastResult(null);

            setNotice(
                "Virtual Memory subsystem reset successfully."
            );

            await loadData({
                silent: true
            });

            if (selectedPid) {
                await loadSelectedProcess(
                    selectedPid,
                    {
                        silent: true
                    }
                );
            }
        } catch (
            requestError
        ) {
            setError(
                requestError.message
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }


    /*
     * =========================================================
     * REFRESH
     * =========================================================
     */

    async function handleRefresh() {
        setNotice("");

        await loadData();

        if (selectedPid) {
            await loadSelectedProcess(
                selectedPid
            );
        }
    }


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="vm-app">

            <style>{`
                .vm-app {
                    box-sizing: border-box;
                    width: 100%;
                    min-height: 100%;
                    padding: 14px;
                    overflow: auto;
                    color: var(
                        --text-primary,
                        #f5f5f5
                    );
                    background:
                        linear-gradient(
                            180deg,
                            rgba(255,255,255,0.018),
                            rgba(255,255,255,0)
                        );
                    font-family:
                        Inter,
                        ui-sans-serif,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .vm-app *,
                .vm-app *::before,
                .vm-app *::after {
                    box-sizing: border-box;
                }

                .vm-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 12px;
                }

                .vm-eyebrow {
                    margin-bottom: 4px;
                    color:
                        var(
                            --accent-color,
                            #4f8cff
                        );
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }

                .vm-title {
                    margin: 0;
                    font-size: 20px;
                    line-height: 1.2;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .vm-subtitle {
                    margin-top: 4px;
                    max-width: 650px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 11px;
                    line-height: 1.45;
                }

                .vm-header-right {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .vm-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 8px;
                    border: 1px solid
                        rgba(255,255,255,0.09);
                    border-radius: 999px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 9px;
                    white-space: nowrap;
                }

                .vm-status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background:
                        #777;
                }

                .vm-status.success {
                    color: #9ed5a9;
                    border-color:
                        rgba(100,190,120,0.2);
                }

                .vm-status.success
                .vm-status-dot {
                    background: #73c983;
                }

                .vm-status.danger {
                    color: #ffb0b0;
                    border-color:
                        rgba(255,90,90,0.2);
                }

                .vm-status.danger
                .vm-status-dot {
                    background: #ff7777;
                }

                .vm-status.neutral
                .vm-status-dot {
                    background: #999;
                }

                .vm-updated {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 9px;
                }

                .vm-actions {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                }

                .vm-button {
                    appearance: none;
                    border: 1px solid
                        var(
                            --border-color,
                            rgba(255,255,255,0.09)
                        );
                    border-radius: 7px;
                    padding: 7px 10px;
                    background:
                        rgba(255,255,255,0.035);
                    color:
                        var(
                            --text-primary,
                            #f5f5f5
                        );
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition:
                        background 120ms ease,
                        border-color 120ms ease;
                }

                .vm-button:hover:not(:disabled) {
                    background:
                        rgba(255,255,255,0.07);
                    border-color:
                        rgba(255,255,255,0.16);
                }

                .vm-button.primary {
                    border-color:
                        rgba(79,140,255,0.35);
                    background:
                        rgba(79,140,255,0.13);
                }

                .vm-button.danger {
                    color: #ffb0b0;
                    border-color:
                        rgba(255,90,90,0.22);
                }

                .vm-button:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }

                .vm-alert {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin-bottom: 10px;
                    padding: 9px 10px;
                    border: 1px solid
                        rgba(255,255,255,0.09);
                    border-radius: 8px;
                    background:
                        rgba(255,255,255,0.025);
                    font-size: 10px;
                    line-height: 1.4;
                }

                .vm-alert.error {
                    color: #ffb0b0;
                    border-color:
                        rgba(255,90,90,0.2);
                    background:
                        rgba(255,90,90,0.05);
                }

                .vm-alert.notice {
                    color: #a8c9ff;
                    border-color:
                        rgba(79,140,255,0.2);
                    background:
                        rgba(79,140,255,0.05);
                }

                .vm-metrics {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            6,
                            minmax(110px, 1fr)
                        );
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .vm-metric {
                    min-width: 0;
                    padding: 10px;
                    border: 1px solid
                        var(
                            --border-color,
                            rgba(255,255,255,0.09)
                        );
                    border-radius: 9px;
                    background:
                        var(
                            --surface-primary,
                            rgba(255,255,255,0.035)
                        );
                }

                .vm-metric-label {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 9px;
                    margin-bottom: 6px;
                }

                .vm-metric-value {
                    font-size: 17px;
                    line-height: 1.1;
                    font-weight: 700;
                }

                .vm-metric-detail {
                    margin-top: 4px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .vm-grid {
                    display: grid;
                    grid-template-columns:
                        minmax(250px, 0.8fr)
                        minmax(430px, 1.6fr);
                    gap: 10px;
                    align-items: start;
                }

                .vm-column {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 0;
                }

                .vm-panel {
                    min-width: 0;
                    overflow: hidden;
                    border: 1px solid
                        var(
                            --border-color,
                            rgba(255,255,255,0.09)
                        );
                    border-radius: 9px;
                    background:
                        var(
                            --surface-primary,
                            rgba(255,255,255,0.035)
                        );
                }

                .vm-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 10px 12px;
                    border-bottom: 1px solid
                        var(
                            --border-color,
                            rgba(255,255,255,0.08)
                        );
                }

                .vm-panel-title {
                    font-size: 11px;
                    font-weight: 650;
                }

                .vm-panel-subtitle {
                    margin-top: 3px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                    line-height: 1.35;
                }

                .vm-panel-body {
                    padding: 10px;
                }

                .vm-process-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .vm-process {
                    width: 100%;
                    padding: 9px;
                    border: 1px solid
                        var(
                            --border-color,
                            rgba(255,255,255,0.08)
                        );
                    border-radius: 7px;
                    background: transparent;
                    color:
                        var(
                            --text-primary,
                            #f5f5f5
                        );
                    text-align: left;
                    cursor: pointer;
                }

                .vm-process:hover {
                    background:
                        rgba(255,255,255,0.035);
                }

                .vm-process.selected {
                    border-color:
                        var(
                            --accent-color,
                            #4f8cff
                        );
                    background:
                        rgba(79,140,255,0.09);
                }

                .vm-process-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .vm-process-pid {
                    font-size: 10px;
                    font-weight: 650;
                }

                .vm-process-pages {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-process-bottom {
                    display: flex;
                    gap: 5px;
                    flex-wrap: wrap;
                    margin-top: 6px;
                }

                .vm-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 6px;
                    border: 1px solid
                        rgba(255,255,255,0.09);
                    border-radius: 999px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                    line-height: 1;
                }

                .vm-badge.resident {
                    color: #9ed5a9;
                    border-color:
                        rgba(100,190,120,0.2);
                }

                .vm-badge.fault {
                    color: #ffb0b0;
                    border-color:
                        rgba(255,90,90,0.2);
                }

                .vm-badge.modified {
                    color: #ffd18c;
                    border-color:
                        rgba(255,170,70,0.2);
                }

                .vm-empty {
                    padding: 18px 10px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    text-align: center;
                    font-size: 9px;
                    line-height: 1.5;
                }

                .vm-pressure-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .vm-pressure-title {
                    font-size: 10px;
                    font-weight: 650;
                }

                .vm-pressure-detail {
                    margin-top: 3px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-progress {
                    height: 6px;
                    margin-top: 9px;
                    overflow: hidden;
                    border-radius: 999px;
                    background:
                        rgba(255,255,255,0.07);
                }

                .vm-progress-bar {
                    height: 100%;
                    width: ${Math.min(
                        100,
                        Math.max(
                            0,
                            utilization * 100
                        )
                    )}%;
                    border-radius: inherit;
                    background:
                        var(
                            --accent-color,
                            #4f8cff
                        );
                    transition: width 180ms ease;
                }

                .vm-two-stat {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                    margin-top: 8px;
                }

                .vm-mini-stat {
                    padding: 7px;
                    border-radius: 6px;
                    background:
                        rgba(255,255,255,0.025);
                }

                .vm-mini-label {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-mini-value {
                    margin-top: 3px;
                    font-size: 11px;
                    font-weight: 650;
                }

                .vm-form {
                    display: grid;
                    grid-template-columns:
                        minmax(0, 1fr)
                        auto
                        auto;
                    gap: 7px;
                    align-items: end;
                }

                .vm-field {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 0;
                }

                .vm-field-label {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-input {
                    width: 100%;
                    min-height: 30px;
                    padding: 6px 8px;
                    border: 1px solid
                        rgba(255,255,255,0.1);
                    border-radius: 6px;
                    outline: none;
                    background:
                        rgba(0,0,0,0.12);
                    color:
                        var(
                            --text-primary,
                            #f5f5f5
                        );
                    font-size: 10px;
                }

                .vm-input:focus {
                    border-color:
                        var(
                            --accent-color,
                            #4f8cff
                        );
                }

                .vm-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    min-height: 30px;
                    padding: 0 5px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 9px;
                    white-space: nowrap;
                }

                .vm-checkbox input {
                    accent-color:
                        var(
                            --accent-color,
                            #4f8cff
                        );
                }

                .vm-selected-info {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            5,
                            minmax(90px, 1fr)
                        );
                    gap: 6px;
                    margin-bottom: 9px;
                }

                .vm-info-item {
                    padding: 7px;
                    border-radius: 6px;
                    background:
                        rgba(255,255,255,0.025);
                }

                .vm-info-label {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-info-value {
                    margin-top: 3px;
                    font-size: 10px;
                    font-weight: 650;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .vm-table-wrap {
                    width: 100%;
                    overflow-x: auto;
                }

                .vm-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 9px;
                }

                .vm-table th {
                    padding: 7px 6px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    border-bottom: 1px solid
                        rgba(255,255,255,0.08);
                    text-align: left;
                    font-size: 8px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .vm-table td {
                    padding: 7px 6px;
                    border-bottom: 1px solid
                        rgba(255,255,255,0.045);
                    white-space: nowrap;
                }

                .vm-table tbody tr:hover {
                    background:
                        rgba(255,255,255,0.025);
                }

                .vm-page-number {
                    font-weight: 650;
                }

                .vm-actions-cell {
                    display: flex;
                    gap: 4px;
                }

                .vm-small-button {
                    padding: 4px 6px;
                    border: 1px solid
                        rgba(255,255,255,0.09);
                    border-radius: 5px;
                    background:
                        rgba(255,255,255,0.025);
                    color:
                        var(
                            --text-primary,
                            #f5f5f5
                        );
                    font-size: 8px;
                    cursor: pointer;
                }

                .vm-small-button:hover:not(:disabled) {
                    background:
                        rgba(255,255,255,0.06);
                }

                .vm-small-button:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .vm-result {
                    padding: 9px;
                    border: 1px solid
                        rgba(255,255,255,0.08);
                    border-radius: 7px;
                    background:
                        rgba(255,255,255,0.025);
                }

                .vm-result-main {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .vm-result-type {
                    font-size: 10px;
                    font-weight: 700;
                }

                .vm-result-type.fault {
                    color: #ffb0b0;
                }

                .vm-result-type.hit {
                    color: #9ed5a9;
                }

                .vm-result-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            6,
                            minmax(75px, 1fr)
                        );
                    gap: 5px;
                }

                .vm-result-item {
                    min-width: 0;
                    padding: 6px;
                    border-radius: 5px;
                    background:
                        rgba(255,255,255,0.03);
                }

                .vm-result-label {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 7px;
                }

                .vm-result-value {
                    margin-top: 3px;
                    font-size: 9px;
                    font-weight: 650;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .vm-result-extra {
                    margin-top: 7px;
                    padding-top: 7px;
                    border-top: 1px solid
                        rgba(255,255,255,0.06);
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-map {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            auto-fill,
                            minmax(65px, 1fr)
                        );
                    gap: 5px;
                }

                .vm-frame {
                    min-width: 0;
                    min-height: 45px;
                    padding: 6px;
                    border: 1px solid
                        rgba(255,255,255,0.08);
                    border-radius: 6px;
                    background:
                        rgba(255,255,255,0.025);
                }

                .vm-frame.used {
                    border-color:
                        rgba(79,140,255,0.22);
                    background:
                        rgba(79,140,255,0.07);
                }

                .vm-frame-number {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 7px;
                }

                .vm-frame-content {
                    margin-top: 3px;
                    font-size: 8px;
                    font-weight: 600;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .vm-frame-sub {
                    margin-top: 2px;
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 7px;
                }

                .vm-stat-list {
                    display: grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap: 5px;
                }

                .vm-stat-list-item {
                    display: flex;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 6px 0;
                    border-bottom: 1px solid
                        rgba(255,255,255,0.045);
                }

                .vm-stat-list-item span {
                    color:
                        var(
                            --text-secondary,
                            #a9a9b2
                        );
                    font-size: 8px;
                }

                .vm-stat-list-item strong {
                    font-size: 9px;
                    font-weight: 650;
                }

                @media (max-width: 1050px) {
                    .vm-metrics {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(110px, 1fr)
                            );
                    }

                    .vm-grid {
                        grid-template-columns: 1fr;
                    }

                    .vm-selected-info {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(90px, 1fr)
                            );
                    }
                }

                @media (max-width: 700px) {
                    .vm-header {
                        flex-direction: column;
                    }

                    .vm-header-right {
                        justify-content: flex-start;
                    }

                    .vm-metrics {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(110px, 1fr)
                            );
                    }

                    .vm-form {
                        grid-template-columns: 1fr;
                    }

                    .vm-checkbox {
                        padding: 0;
                    }

                    .vm-selected-info {
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(90px, 1fr)
                            );
                    }

                    .vm-result-grid {
                        grid-template-columns:
                            repeat(
                                3,
                                minmax(75px, 1fr)
                            );
                    }

                    .vm-stat-list {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>


            {/* =====================================================
                HEADER
            ====================================================== */}

            <div className="vm-header">

                <div>

                    <div className="vm-eyebrow">
                        NOVAOS MEMORY SUBSYSTEM
                    </div>

                    <h1 className="vm-title">
                        Virtual Memory
                    </h1>

                    <div className="vm-subtitle">
                        Demand paging, page faults,
                        resident pages, page replacement
                        and virtual-to-physical address
                        translation.
                    </div>

                </div>


                <div className="vm-header-right">

                    <StatusBadge
                        type={
                            loading
                                ? "neutral"
                                : error
                                    ? "danger"
                                    : "success"
                        }
                    >
                        {loading
                            ? "Loading"
                            : error
                                ? "API Error"
                                : "Virtual Memory Online"}
                    </StatusBadge>

                    <div className="vm-actions">

                        <button
                            type="button"
                            className="vm-button"
                            onClick={
                                handleRefresh
                            }
                            disabled={
                                loading ||
                                actionLoading
                            }
                        >
                            Refresh
                        </button>

                        <button
                            type="button"
                            className="vm-button danger"
                            onClick={
                                handleReset
                            }
                            disabled={
                                actionLoading
                            }
                        >
                            Reset
                        </button>

                    </div>

                </div>

            </div>


            {/* =====================================================
                ALERTS
            ====================================================== */}

            {error && (
                <div
                    className="vm-alert error"
                >
                    <strong>
                        Error
                    </strong>

                    <span>
                        {error}
                    </span>
                </div>
            )}


            {notice && !error && (
                <div
                    className="vm-alert notice"
                >
                    <strong>
                        VM
                    </strong>

                    <span>
                        {notice}
                    </span>
                </div>
            )}


            {/* =====================================================
                METRICS
            ====================================================== */}

            <div className="vm-metrics">

                <Metric
                    label="Physical Memory"
                    value={
                        formatNumber(
                            statistics.physicalMemorySize
                        )
                    }
                    detail={
                        `${formatNumber(
                            statistics.usedFrames
                        )} used / ${formatNumber(
                            statistics.freeFrames
                        )} free frames`
                    }
                />

                <Metric
                    label="Virtual Memory"
                    value={
                        formatNumber(
                            statistics.virtualMemorySize
                        )
                    }
                    detail={
                        `${formatNumber(
                            statistics.processCount
                        )} address spaces`
                    }
                />

                <Metric
                    label="Resident Pages"
                    value={
                        formatNumber(
                            statistics.residentPages
                        )
                    }
                    detail={
                        `${formatNumber(
                            statistics.nonResidentPages
                        )} non-resident`
                    }
                />

                <Metric
                    label="Page Faults"
                    value={
                        formatNumber(
                            statistics.pageFaults
                        )
                    }
                    detail={
                        `Fault rate ${formatRatio(
                            statistics.faultRatio
                        )}`
                    }
                />

                <Metric
                    label="Page Hits"
                    value={
                        formatNumber(
                            statistics.pageHits
                        )
                    }
                    detail={
                        `Hit rate ${formatRatio(
                            statistics.hitRatio
                        )}`
                    }
                />

                <Metric
                    label="Evictions"
                    value={
                        formatNumber(
                            statistics.pagesEvicted
                        )
                    }
                    detail={
                        `Policy ${String(
                            statistics.evictionPolicy ||
                            "fifo"
                        ).toUpperCase()}`
                    }
                />

            </div>


            {/* =====================================================
                MAIN GRID
            ====================================================== */}

            <div className="vm-grid">


                {/* =================================================
                    LEFT COLUMN
                ================================================== */}

                <div className="vm-column">


                    {/* ---------------------------------------------
                        PHYSICAL MEMORY PRESSURE
                    ---------------------------------------------- */}

                    <Panel
                        title="Physical Memory Pressure"
                        subtitle={
                            `${formatNumber(
                                statistics.usedFrames
                            )} of ${formatNumber(
                                frameCount
                            )} frames currently used`
                        }
                    >

                        <div className="vm-pressure-head">

                            <div>
                                <div className="vm-pressure-title">
                                    Frame utilization
                                </div>

                                <div className="vm-pressure-detail">
                                    {
                                        formatRatio(
                                            utilization
                                        )
                                    } occupied
                                </div>
                            </div>

                            <span
                                className={`vm-badge ${
                                    statistics.freeFrames === 0
                                        ? "modified"
                                        : "resident"
                                }`}
                            >
                                {statistics.freeFrames === 0
                                    ? "FULL"
                                    : "AVAILABLE"}
                            </span>

                        </div>

                        <div className="vm-progress">
                            <div className="vm-progress-bar" />
                        </div>

                        <div className="vm-two-stat">

                            <div className="vm-mini-stat">
                                <div className="vm-mini-label">
                                    Used Frames
                                </div>

                                <div className="vm-mini-value">
                                    {
                                        formatNumber(
                                            statistics.usedFrames
                                        )
                                    }
                                </div>
                            </div>

                            <div className="vm-mini-stat">
                                <div className="vm-mini-label">
                                    Free Frames
                                </div>

                                <div className="vm-mini-value">
                                    {
                                        formatNumber(
                                            statistics.freeFrames
                                        )
                                    }
                                </div>
                            </div>

                        </div>

                    </Panel>


                    {/* ---------------------------------------------
                        SYSTEM STATISTICS
                    ---------------------------------------------- */}

                    <Panel
                        title="VM Statistics"
                        subtitle="Live demand-paging subsystem counters"
                    >

                        <div className="vm-stat-list">

                            <div className="vm-stat-list-item">
                                <span>
                                    Accesses
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.accesses
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Translations
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.translations
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Successful
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.successfulTranslations
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Pages Loaded
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.pagesLoaded
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Swap Ins
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.swapIns
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Swap Outs
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.swapOuts
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Modified Pages
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.modifiedPages
                                        )
                                    }
                                </strong>
                            </div>

                            <div className="vm-stat-list-item">
                                <span>
                                    Pressure Events
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            statistics.memoryPressureEvents
                                        )
                                    }
                                </strong>
                            </div>

                        </div>

                    </Panel>


                    {/* ---------------------------------------------
                        PROCESS LIST
                    ---------------------------------------------- */}

                    <Panel
                        title="VM Processes"
                        subtitle={
                            `${processes.length} virtual-memory address ${
                                processes.length === 1
                                    ? "space"
                                    : "spaces"
                            }`
                        }
                    >

                        {processes.length === 0 ? (

                            <div className="vm-empty">
                                No real NovaOS process currently
                                has a virtual-memory address
                                space.
                            </div>

                        ) : (

                            <div className="vm-process-list">

                                {processes.map(
                                    (process) => {

                                        const isSelected =
                                            String(
                                                process.pid
                                            ) ===
                                            String(
                                                selectedPid
                                            );

                                        const resident =
                                            Number(
                                                process.residentPageCount ??
                                                process.residentPages ??
                                                0
                                            );

                                        const total =
                                            Number(
                                                process.pageCount ??
                                                0
                                            );

                                        return (
                                            <button
                                                key={
                                                    process.pid
                                                }
                                                type="button"
                                                className={`vm-process ${
                                                    isSelected
                                                        ? "selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    handleSelectProcess(
                                                        process.pid
                                                    )
                                                }
                                            >

                                                <div className="vm-process-top">

                                                    <div className="vm-process-pid">
                                                        PID{" "}
                                                        {process.pid}
                                                    </div>

                                                    <div className="vm-process-pages">
                                                        {
                                                            resident
                                                        }
                                                        /
                                                        {
                                                            total
                                                        }{" "}
                                                        resident
                                                    </div>

                                                </div>

                                                <div className="vm-process-bottom">

                                                    <span className="vm-badge">
                                                        VM{" "}
                                                        {
                                                            formatNumber(
                                                                process.virtualMemorySize
                                                            )
                                                        }
                                                    </span>

                                                    <span className="vm-badge">
                                                        Page{" "}
                                                        {
                                                            formatNumber(
                                                                process.pageSize
                                                            )
                                                        }
                                                    </span>

                                                    <span className="vm-badge fault">
                                                        Faults{" "}
                                                        {
                                                            formatNumber(
                                                                process.pageFaults
                                                            )
                                                        }
                                                    </span>

                                                </div>

                                            </button>
                                        );
                                    }
                                )}

                            </div>

                        )}

                    </Panel>

                </div>


                {/* =================================================
                    RIGHT COLUMN
                ================================================== */}

                <div className="vm-column">


                    {/* ---------------------------------------------
                        SELECTED PROCESS
                    ---------------------------------------------- */}

                    <Panel
                        title="Selected Process"
                        subtitle={
                            selectedProcess
                                ? `Live virtual-memory state for PID ${selectedProcess.pid}`
                                : "Select a NovaOS process above."
                        }
                    >

                        {selectedProcess ? (

                            <div className="vm-selected-info">

                                <div className="vm-info-item">
                                    <div className="vm-info-label">
                                        Process ID
                                    </div>

                                    <div className="vm-info-value">
                                        {
                                            selectedProcess.pid
                                        }
                                    </div>
                                </div>

                                <div className="vm-info-item">
                                    <div className="vm-info-label">
                                        State
                                    </div>

                                    <div className="vm-info-value">
                                        {
                                            selectedProcess.state ||
                                            "Active"
                                        }
                                    </div>
                                </div>

                                <div className="vm-info-item">
                                    <div className="vm-info-label">
                                        Virtual Memory
                                    </div>

                                    <div className="vm-info-value">
                                        {
                                            formatNumber(
                                                selectedProcess.virtualMemorySize
                                            )
                                        }
                                    </div>
                                </div>

                                <div className="vm-info-item">
                                    <div className="vm-info-label">
                                        Pages
                                    </div>

                                    <div className="vm-info-value">
                                        {
                                            formatNumber(
                                                selectedProcess.pageCount
                                            )
                                        }
                                    </div>
                                </div>

                                <div className="vm-info-item">
                                    <div className="vm-info-label">
                                        Resident
                                    </div>

                                    <div className="vm-info-value">
                                        {
                                            formatNumber(
                                                selectedProcess.residentPageCount
                                            )
                                        }
                                    </div>
                                </div>

                            </div>

                        ) : (

                            <div className="vm-empty">
                                No process selected.
                            </div>

                        )}

                    </Panel>


                    {/* ---------------------------------------------
                        ACCESS VIRTUAL ADDRESS
                    ---------------------------------------------- */}

                    <Panel
                        title="Access Virtual Address"
                        subtitle={
                            selectedPid
                                ? `PID ${truncate(
                                    selectedPid,
                                    24
                                )}`
                                : "Select a process first."
                        }
                    >

                        <form
                            className="vm-form"
                            onSubmit={
                                handleAccess
                            }
                        >

                            <label className="vm-field">

                                <span className="vm-field-label">
                                    Logical Address
                                </span>

                                <input
                                    className="vm-input"
                                    type="number"
                                    min="0"
                                    value={
                                        form.logicalAddress
                                    }
                                    onChange={
                                        (event) =>
                                            updateForm(
                                                "logicalAddress",
                                                event.target.value
                                            )
                                    }
                                    placeholder={
                                        selectedProcess
                                            ? `0 – ${
                                                Number(
                                                    selectedProcess.virtualMemorySize
                                                ) - 1
                                            }`
                                            : "Enter address"
                                    }
                                    disabled={
                                        !selectedPid ||
                                        actionLoading
                                    }
                                />

                            </label>


                            <label className="vm-checkbox">

                                <input
                                    type="checkbox"
                                    checked={
                                        form.write
                                    }
                                    onChange={
                                        (event) =>
                                            updateForm(
                                                "write",
                                                event.target.checked
                                            )
                                    }
                                    disabled={
                                        !selectedPid ||
                                        actionLoading
                                    }
                                />

                                Write

                            </label>


                            <button
                                type="submit"
                                className="vm-button primary"
                                disabled={
                                    !selectedPid ||
                                    actionLoading
                                }
                            >
                                {actionLoading
                                    ? "Working…"
                                    : "Access Address"}
                            </button>

                        </form>

                    </Panel>


                    {/* ---------------------------------------------
                        LAST ACCESS RESULT
                    ---------------------------------------------- */}

                    <Panel
                        title="Last Access Result"
                        subtitle="Most recent demand-paging event"
                    >

                        {!lastResult ? (

                            <div className="vm-empty">
                                Access a virtual address to
                                see the page translation
                                result.
                            </div>

                        ) : (

                            <div className="vm-result">

                                <div className="vm-result-main">

                                    <div
                                        className={`vm-result-type ${
                                            lastResult.pageFault
                                                ? "fault"
                                                : "hit"
                                        }`}
                                    >
                                        {lastResult.pageFault
                                            ? "PAGE FAULT"
                                            : "PAGE HIT"}
                                    </div>

                                    <span
                                        className={`vm-badge ${
                                            lastResult.loaded
                                                ? "resident"
                                                : ""
                                        }`}
                                    >
                                        {lastResult.loaded
                                            ? "Page loaded"
                                            : "Already resident"}
                                    </span>

                                </div>


                                <div className="vm-result-grid">

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            PID
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.pid ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            Logical
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.logicalAddress ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            Page
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.pageNumber ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            Offset
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.offset ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            Frame
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.frameNumber ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                    <div className="vm-result-item">
                                        <div className="vm-result-label">
                                            Physical
                                        </div>

                                        <div className="vm-result-value">
                                            {
                                                lastResult.physicalAddress ??
                                                "—"
                                            }
                                        </div>
                                    </div>

                                </div>


                                {lastResult.evictedPage && (
                                    <div className="vm-result-extra">
                                        Evicted page:{" "}
                                        <strong>
                                            {
                                                lastResult
                                                    .evictedPage
                                                    .pageNumber ??
                                                "—"
                                            }
                                        </strong>

                                        {" · "}

                                        Frame:{" "}
                                        <strong>
                                            {
                                                lastResult
                                                    .evictedPage
                                                    .frameNumber ??
                                                "—"
                                            }
                                        </strong>
                                    </div>
                                )}

                            </div>

                        )}

                    </Panel>


                    {/* ---------------------------------------------
                        PAGE TABLE
                    ---------------------------------------------- */}

                    <Panel
                        title="Virtual Page Table"
                        subtitle={
                            selectedProcess
                                ? `Pages for PID ${selectedProcess.pid}`
                                : "Select a process to inspect its pages."
                        }
                    >

                        {selectedPages.length === 0 ? (

                            <div className="vm-empty">
                                No page table is currently
                                available.
                            </div>

                        ) : (

                            <div className="vm-table-wrap">

                                <table className="vm-table">

                                    <thead>
                                        <tr>
                                            <th>
                                                Page
                                            </th>

                                            <th>
                                                Frame
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Referenced
                                            </th>

                                            <th>
                                                Modified
                                            </th>

                                            <th>
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {selectedPages.map(
                                            (page) => {

                                                const pageNumber =
                                                    Number(
                                                        page.pageNumber
                                                    );

                                                const resident =
                                                    Boolean(
                                                        page.resident
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            pageNumber
                                                        }
                                                    >

                                                        <td className="vm-page-number">
                                                            {
                                                                pageNumber
                                                            }
                                                        </td>

                                                        <td>
                                                            {resident
                                                                ? (
                                                                    page.frameNumber ??
                                                                    "—"
                                                                )
                                                                : "—"}
                                                        </td>

                                                        <td>

                                                            <span
                                                                className={`vm-badge ${
                                                                    resident
                                                                        ? "resident"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {resident
                                                                    ? "Resident"
                                                                    : "Non-resident"}
                                                            </span>

                                                        </td>

                                                        <td>
                                                            {
                                                                page.referenced
                                                                    ? "Yes"
                                                                    : "No"
                                                            }
                                                        </td>

                                                        <td>

                                                            {page.modified ? (

                                                                <span className="vm-badge modified">
                                                                    Yes
                                                                </span>

                                                            ) : (
                                                                "No"
                                                            )}

                                                        </td>

                                                        <td>

                                                            <div className="vm-actions-cell">

                                                                {resident ? (

                                                                    <button
                                                                        type="button"
                                                                        className="vm-small-button"
                                                                        onClick={() =>
                                                                            handlePageOut(
                                                                                pageNumber
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            actionLoading
                                                                        }
                                                                    >
                                                                        Page Out
                                                                    </button>

                                                                ) : (

                                                                    <button
                                                                        type="button"
                                                                        className="vm-small-button"
                                                                        onClick={() =>
                                                                            handlePageIn(
                                                                                pageNumber
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            actionLoading
                                                                        }
                                                                    >
                                                                        Page In
                                                                    </button>

                                                                )}

                                                            </div>

                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </Panel>


                    {/* ---------------------------------------------
                        PHYSICAL MEMORY MAP
                    ---------------------------------------------- */}

                    <Panel
                        title="Physical Memory Map"
                        subtitle={
                            `${formatNumber(
                                memoryMap.length
                            )} resident frame mappings`
                        }
                    >

                        {frameCount === 0 ? (

                            <div className="vm-empty">
                                Physical memory information
                                is not available.
                            </div>

                        ) : (

                            <div className="vm-map">

                                {Array.from(
                                    {
                                        length:
                                            frameCount
                                    },
                                    (
                                        _,
                                        frameNumber
                                    ) => {

                                        const entry =
                                            memoryMapByFrame.get(
                                                frameNumber
                                            );

                                        return (
                                            <div
                                                key={
                                                    frameNumber
                                                }
                                                className={`vm-frame ${
                                                    entry
                                                        ? "used"
                                                        : ""
                                                }`}
                                            >

                                                <div className="vm-frame-number">
                                                    Frame{" "}
                                                    {
                                                        frameNumber
                                                    }
                                                </div>

                                                <div className="vm-frame-content">
                                                    {entry
                                                        ? `PID ${entry.pid}`
                                                        : "Free"}
                                                </div>

                                                <div className="vm-frame-sub">
                                                    {entry
                                                        ? `Page ${
                                                            entry.pageNumber ??
                                                            "—"
                                                        }`
                                                        : "Available"}
                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        )}

                    </Panel>


                </div>

            </div>

        </div>
    );
}