import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

const API_BASE = "/api/paging";
const REFRESH_INTERVAL = 1500;

function formatNumber(value) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return "0";
    }

    return value.toLocaleString();
}

function formatPercent(value) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        return "0%";
    }

    return `${Math.round(value * 100)}%`;
}

function Panel({
    title,
    subtitle,
    children,
    className = ""
}) {
    return (
        <section
            className={`paging-panel ${className}`}
        >
            <div className="paging-panel-header">
                <div>
                    <h2>{title}</h2>

                    {subtitle && (
                        <p>{subtitle}</p>
                    )}
                </div>
            </div>

            <div className="paging-panel-body">
                {children}
            </div>
        </section>
    );
}

function Metric({
    label,
    value,
    detail
}) {
    return (
        <div className="paging-metric">
            <span className="paging-metric-label">
                {label}
            </span>

            <strong className="paging-metric-value">
                {value}
            </strong>

            {detail && (
                <span className="paging-metric-detail">
                    {detail}
                </span>
            )}
        </div>
    );
}

function StatusBadge({
    children,
    type = "neutral"
}) {
    return (
        <span
            className={`paging-status ${type}`}
        >
            <span className="paging-status-dot" />
            {children}
        </span>
    );
}

function Paging() {
    const [
        snapshot,
        setSnapshot
    ] = useState(null);

    const [
        statistics,
        setStatistics
    ] = useState(null);

    const [
        selectedPid,
        setSelectedPid
    ] = useState("");

    const [
        selectedPages,
        setSelectedPages
    ] = useState([]);

    const [
        pageNumberInput,
        setPageNumberInput
    ] = useState("0");

    const [
        addressInput,
        setAddressInput
    ] = useState("");

    const [
        result,
        setResult
    ] = useState(null);

    const [
        error,
        setError
    ] = useState("");

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading
    ] = useState(false);

    const [
        pageTableLoading,
        setPageTableLoading
    ] = useState(false);

    const [
        lastUpdated,
        setLastUpdated
    ] = useState(null);

    /*
     * =========================================================
     * API REQUEST HELPER
     * =========================================================
     */

    const request = useCallback(
        async (
            endpoint,
            options = {}
        ) => {
            const response =
                await fetch(
                    `${API_BASE}${endpoint}`,
                    {
                        headers: {
                            "Content-Type":
                                "application/json",
                            ...(options.headers || {})
                        },
                        ...options
                    }
                );

            let data;

            try {
                data =
                    await response.json();
            } catch {
                throw new Error(
                    `Request failed with status ${response.status}.`
                );
            }

            if (
                !response.ok ||
                data.success === false
            ) {
                throw new Error(
                    data.error ||
                    `Request failed with status ${response.status}.`
                );
            }

            return data;
        },
        []
    );

    /*
     * =========================================================
     * FETCH PAGING STATE
     * =========================================================
     */

    const fetchPagingState =
        useCallback(
            async () => {
                try {
                    const [
                        snapshotResponse,
                        statisticsResponse
                    ] = await Promise.all([
                        request(""),
                        request("/statistics")
                    ]);

                    setSnapshot(
                        snapshotResponse.data
                    );

                    setStatistics(
                        statisticsResponse.data
                    );

                    setError("");

                    setLastUpdated(
                        new Date()
                    );
                } catch (fetchError) {
                    setError(
                        fetchError.message ||
                        "Unable to retrieve paging state."
                    );
                } finally {
                    setLoading(false);
                }
            },
            [request]
        );

    /*
     * =========================================================
     * FETCH SELECTED PROCESS PAGE TABLE
     *
     * This is deliberately separate from the normal polling
     * cycle. Polling updates metrics/processes without replacing
     * the visible page table.
     * =========================================================
     */

    const fetchPageTable =
        useCallback(
            async (pid) => {
                if (!pid) {
                    setSelectedPages([]);
                    return;
                }

                setPageTableLoading(true);

                try {
                    const response =
                        await request(
                            `/processes/${encodeURIComponent(
                                String(pid)
                            )}/pages`
                        );

                    const data =
                        response?.data;

                    let pages = [];

                    if (Array.isArray(data)) {
                        pages = data;
                    } else if (
                        Array.isArray(
                            data?.pages
                        )
                    ) {
                        pages = data.pages;
                    } else if (
                        Array.isArray(
                            data?.pageTable
                        )
                    ) {
                        pages = data.pageTable;
                    } else if (
                        Array.isArray(
                            data?.entries
                        )
                    ) {
                        pages = data.entries;
                    } else if (
                        data &&
                        typeof data === "object"
                    ) {
                        const values =
                            Object.values(data);

                        if (
                            values.length > 0 &&
                            values.every(
                                (value) =>
                                    value &&
                                    typeof value === "object"
                            )
                        ) {
                            pages = values;
                        }
                    }

                    pages = pages
                        .map(
                            (page, index) => ({
                                ...page,
                                pageNumber:
                                    Number.isFinite(
                                        Number(
                                            page?.pageNumber
                                        )
                                    )
                                        ? Number(
                                            page.pageNumber
                                        )
                                        : index
                            })
                        )
                        .sort(
                            (a, b) =>
                                a.pageNumber -
                                b.pageNumber
                        );

                    setSelectedPages(
                        pages
                    );
                } catch (pageTableError) {
                    setSelectedPages([]);

                    setError(
                        pageTableError.message ||
                        "Unable to retrieve the page table."
                    );
                } finally {
                    setPageTableLoading(false);
                }
            },
            [request]
        );

    /*
     * =========================================================
     * INITIAL LOAD + NORMAL POLLING
     *
     * IMPORTANT:
     * This only refreshes snapshot/statistics.
     * It does NOT call fetchPageTable().
     *
     * Therefore the page table no longer collapses every
     * 1.5 seconds.
     * =========================================================
     */

    useEffect(() => {
        fetchPagingState();

        const interval =
            setInterval(
                fetchPagingState,
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(interval);
    }, [
        fetchPagingState
    ]);

    /*
     * =========================================================
     * DERIVED RUNTIME STATE
     * =========================================================
     */

    const processes =
        snapshot?.processes ?? [];

    const frames =
        snapshot?.frames ?? [];

    const physicalMemorySize =
        statistics?.physicalMemorySize ??
        snapshot?.physicalMemorySize ??
        0;

    const pageSize =
        statistics?.pageSize ??
        snapshot?.pageSize ??
        0;

    const frameCount =
        statistics?.frameCount ??
        snapshot?.frameCount ??
        0;

    const usedFrames =
        statistics?.usedFrames ??
        0;

    const freeFrames =
        statistics?.freeFrames ??
        0;

    const pageFaults =
        statistics?.pageFaults ??
        0;

    const pageHits =
        statistics?.pageHits ??
        0;

    const translations =
        statistics?.translations ??
        0;

    const pagesLoaded =
        statistics?.pagesLoaded ??
        0;

    const pagesUnloaded =
        statistics?.pagesUnloaded ??
        0;

    const allocations =
        statistics?.allocations ??
        0;

    const releases =
        statistics?.releases ??
        0;

    const utilization =
        frameCount > 0
            ? usedFrames / frameCount
            : 0;

    /*
     * =========================================================
     * SELECTED PROCESS
     * =========================================================
     */

    const selectedProcess =
        useMemo(
            () => {
                if (!selectedPid) {
                    return null;
                }

                return (
                    processes.find(
                        (process) =>
                            String(
                                process.pid
                            ) ===
                            String(
                                selectedPid
                            )
                    ) ?? null
                );
            },
            [
                processes,
                selectedPid
            ]
        );

    /*
     * =========================================================
     * LOAD PAGE TABLE ONLY WHEN SELECTED PID CHANGES
     *
     * This effect intentionally does NOT depend on
     * "processes". Therefore the 1.5-second polling does not
     * trigger a page-table loading state.
     * =========================================================
     */

    useEffect(() => {
        if (!selectedPid) {
            setSelectedPages([]);
            return;
        }

        fetchPageTable(
            selectedPid
        );
    }, [
        selectedPid,
        fetchPageTable
    ]);

    /*
     * =========================================================
     * KEEP PROCESS SELECTION VALID
     *
     * If ProcessManager terminates/removes the selected process,
     * clear the selection and its page table.
     * =========================================================
     */

    useEffect(() => {
        if (
            selectedPid &&
            !processes.some(
                (process) =>
                    String(
                        process.pid
                    ) ===
                    String(
                        selectedPid
                    )
            )
        ) {
            setSelectedPid("");
            setSelectedPages([]);
            setResult(null);
        }
    }, [
        processes,
        selectedPid
    ]);

    /*
     * =========================================================
     * SELECT PROCESS
     * =========================================================
     */

    const handleSelectProcess =
        (pid) => {
            const normalizedPid =
                String(pid);

            setSelectedPid(
                normalizedPid
            );

            setResult(null);
            setError("");
        };

    /*
     * =========================================================
     * ALLOCATE SINGLE PAGE
     * =========================================================
     */

    const handleAllocatePage =
        async () => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            const pageNumber =
                Number(
                    pageNumberInput
                );

            if (
                !Number.isInteger(
                    pageNumber
                ) ||
                pageNumber < 0
            ) {
                setError(
                    "Enter a valid page number."
                );
                return;
            }

            if (
                selectedProcess &&
                pageNumber >=
                selectedProcess.pageCount
            ) {
                setError(
                    `Page number must be between 0 and ${selectedProcess.pageCount - 1}.`
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        `/processes/${encodeURIComponent(
                            selectedPid
                        )}/pages/allocate`,
                        {
                            method: "POST",
                            body: JSON.stringify({
                                pageNumber
                            })
                        }
                    );

                setResult({
                    type: "success",
                    title: "Page allocated",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to allocate page."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * ALLOCATE ALL PAGES
     * =========================================================
     */

    const handleAllocateMany =
        async () => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            if (!selectedProcess) {
                setError(
                    "Selected process could not be found."
                );
                return;
            }

            if (
                selectedProcess.pageCount <= 0
            ) {
                setError(
                    "Selected process has no virtual pages."
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        `/processes/${encodeURIComponent(
                            selectedPid
                        )}/pages/allocate-many`,
                        {
                            method: "POST",
                            body: JSON.stringify({
                                count:
                                    selectedProcess.pageCount
                            })
                        }
                    );

                setResult({
                    type: "success",
                    title: "Pages allocated",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to allocate pages."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * RELEASE PAGE
     * =========================================================
     */

    const handleReleasePage =
        async (pageNumber) => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        `/processes/${encodeURIComponent(
                            selectedPid
                        )}/pages/${pageNumber}`,
                        {
                            method: "DELETE"
                        }
                    );

                setResult({
                    type: "success",
                    title: "Page released",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to release page."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * ADDRESS TRANSLATION
     * =========================================================
     */

    const handleTranslate =
        async () => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            const logicalAddress =
                Number(
                    addressInput
                );

            if (
                !Number.isInteger(
                    logicalAddress
                ) ||
                logicalAddress < 0
            ) {
                setError(
                    "Enter a valid logical address."
                );
                return;
            }

            if (
                selectedProcess &&
                logicalAddress >=
                selectedProcess.virtualMemorySize
            ) {
                setError(
                    `Logical address must be between 0 and ${selectedProcess.virtualMemorySize - 1}.`
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        "/translate",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                pid:
                                    String(
                                        selectedPid
                                    ),
                                logicalAddress
                            })
                        }
                    );

                setResult({
                    type:
                        response.data.pageFault
                            ? "warning"
                            : "success",
                    title:
                        response.data.pageFault
                            ? "Page fault handled"
                            : "Page hit",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Address translation failed."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * REFERENCE PAGE
     * =========================================================
     */

    const handleReference =
        async (pageNumber) => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        "/reference",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                pid:
                                    String(
                                        selectedPid
                                    ),
                                pageNumber:
                                    Number(
                                        pageNumber
                                    )
                            })
                        }
                    );

                setResult({
                    type: "success",
                    title: "Page referenced",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to reference page."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * MODIFY PAGE
     * =========================================================
     */

    const handleModify =
        async (pageNumber) => {
            if (!selectedPid) {
                setError(
                    "Select a process first."
                );
                return;
            }

            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        "/modify",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                pid:
                                    String(
                                        selectedPid
                                    ),
                                pageNumber:
                                    Number(
                                        pageNumber
                                    )
                            })
                        }
                    );

                setResult({
                    type: "success",
                    title: "Page modified",
                    data:
                        response.data
                });

                await Promise.all([
                    fetchPagingState(),
                    fetchPageTable(
                        selectedPid
                    )
                ]);
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to modify page."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * RESET PAGING
     * =========================================================
     */

    const handleReset =
        async () => {
            setActionLoading(true);
            setError("");
            setResult(null);

            try {
                const response =
                    await request(
                        "/reset",
                        {
                            method: "POST"
                        }
                    );

                setResult({
                    type: "success",
                    title: "Paging reset",
                    data:
                        response.data
                });

                setSelectedPid("");
                setSelectedPages([]);

                await fetchPagingState();
            } catch (actionError) {
                setError(
                    actionError.message ||
                    "Unable to reset paging."
                );
            } finally {
                setActionLoading(false);
            }
        };

    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="paging-app">

            <div className="paging-header">

                <div>

                    <div className="paging-eyebrow">
                        NOVAOS MEMORY SUBSYSTEM
                    </div>

                    <h1>
                        Paging
                    </h1>

                    <p>
                        Live virtual-memory paging
                        connected to NovaOS processes,
                        page tables, physical frames
                        and address translation.
                    </p>

                </div>

                <div className="paging-header-status">

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
                                : "Paging Online"}
                    </StatusBadge>

                    {lastUpdated && (
                        <span className="paging-updated">
                            Updated{" "}
                            {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}

                </div>

            </div>

            {error && (
                <div className="paging-error">

                    <strong>
                        Paging error
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>
            )}

            {result && (
                <div
                    className={`paging-result ${result.type}`}
                >

                    <div>

                        <strong>
                            {result.title}
                        </strong>

                        {result.data && (
                            <span>
                                {result.data.pageFault !==
                                    undefined
                                    ? result.data.pageFault
                                        ? "A page fault occurred and the page was loaded into physical memory."
                                        : "The requested page was already resident in physical memory."
                                    : "Operation completed successfully."}
                            </span>
                        )}

                    </div>

                </div>
            )}

            <div className="paging-metrics-grid">

                <Metric
                    label="Physical Memory"
                    value={
                        formatNumber(
                            physicalMemorySize
                        )
                    }
                    detail="memory units"
                />

                <Metric
                    label="Page Size"
                    value={
                        formatNumber(
                            pageSize
                        )
                    }
                    detail="units per page"
                />

                <Metric
                    label="Frames"
                    value={
                        formatNumber(
                            frameCount
                        )
                    }
                    detail={`${formatNumber(
                        freeFrames
                    )} free`}
                />

                <Metric
                    label="Frame Utilization"
                    value={
                        formatPercent(
                            utilization
                        )
                    }
                    detail={`${formatNumber(
                        usedFrames
                    )} used`}
                />

                <Metric
                    label="Page Faults"
                    value={
                        formatNumber(
                            pageFaults
                        )
                    }
                    detail="faults handled"
                />

                <Metric
                    label="Page Hits"
                    value={
                        formatNumber(
                            pageHits
                        )
                    }
                    detail="resident accesses"
                />

                <Metric
                    label="Translations"
                    value={
                        formatNumber(
                            translations
                        )
                    }
                    detail="addresses translated"
                />

                <Metric
                    label="Processes"
                    value={
                        formatNumber(
                            processes.length
                        )
                    }
                    detail="NovaOS processes"
                />

            </div>

            <div className="paging-main-grid">

                <Panel
                    title="NovaOS Processes"
                    subtitle="Processes are managed by the NovaOS Process Manager. Select one to inspect its paging address space."
                    className="wide"
                >

                    {processes.length === 0 ? (

                        <div className="paging-empty">

                            <strong>
                                No eligible processes
                            </strong>

                            <span>
                                Create a process through
                                Process Manager to make
                                it available to Paging.
                            </span>

                        </div>

                    ) : (

                        <div className="paging-process-list">

                            {processes.map(
                                (process) => (
                                    <button
                                        key={
                                            String(
                                                process.pid
                                            )
                                        }
                                        type="button"
                                        className={
                                            String(
                                                selectedPid
                                            ) ===
                                                String(
                                                    process.pid
                                                )
                                                ? "paging-process-item selected"
                                                : "paging-process-item"
                                        }
                                        onClick={() =>
                                            handleSelectProcess(
                                                process.pid
                                            )
                                        }
                                    >

                                        <span className="paging-process-pid">
                                            {process.pid}
                                        </span>

                                        <span>
                                            {formatNumber(
                                                process.virtualMemorySize
                                            )}{" "}
                                            units
                                        </span>

                                        <span>
                                            {formatNumber(
                                                process.pageCount
                                            )}{" "}
                                            pages
                                        </span>

                                        <span>
                                            {formatNumber(
                                                process.allocatedPages
                                            )}{" "}
                                            allocated
                                        </span>

                                    </button>
                                )
                            )}

                        </div>
                    )}

                </Panel>

                <Panel
                    title="Selected Process"
                    subtitle={
                        selectedProcess
                            ? `Live paging information for ${selectedProcess.pid}`
                            : "Select a NovaOS process above."
                    }
                >

                    {selectedProcess ? (

                        <div className="selected-process-info">

                            <div>
                                <span>
                                    Process ID
                                </span>

                                <strong>
                                    {selectedProcess.pid}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    State
                                </span>

                                <strong>
                                    {selectedProcess.state ||
                                        "Active"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Memory
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedProcess.virtualMemorySize
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Pages
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedProcess.pageCount
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Allocated
                                </span>

                                <strong>
                                    {formatNumber(
                                        selectedProcess.allocatedPages
                                    )}
                                </strong>
                            </div>

                        </div>

                    ) : (

                        <div className="paging-empty">
                            No process selected.
                        </div>

                    )}

                </Panel>

                <Panel
                    title="Page Operations"
                    subtitle={
                        selectedProcess
                            ? `PID ${selectedProcess.pid} · ${selectedProcess.pageCount} virtual pages`
                            : "Select a process to enable operations."
                    }
                    className="wide"
                >

                    <div className="paging-operation-grid">

                        <div className="paging-operation-group">

                            <label className="paging-field">

                                <span>
                                    Page Number
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    max={
                                        selectedProcess
                                            ? Math.max(
                                                0,
                                                selectedProcess.pageCount - 1
                                            )
                                            : undefined
                                    }
                                    value={
                                        pageNumberInput
                                    }
                                    onChange={(event) =>
                                        setPageNumberInput(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        !selectedProcess
                                    }
                                />

                            </label>

                            <div className="paging-button-row">

                                <button
                                    type="button"
                                    className="paging-button primary"
                                    disabled={
                                        actionLoading ||
                                        !selectedProcess
                                    }
                                    onClick={
                                        handleAllocatePage
                                    }
                                >
                                    Allocate Page
                                </button>

                                <button
                                    type="button"
                                    className="paging-button secondary"
                                    disabled={
                                        actionLoading ||
                                        !selectedProcess
                                    }
                                    onClick={
                                        handleAllocateMany
                                    }
                                >
                                    Allocate All
                                </button>

                            </div>

                        </div>

                        <div className="paging-operation-group">

                            <label className="paging-field">

                                <span>
                                    Logical Address
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    max={
                                        selectedProcess
                                            ? Math.max(
                                                0,
                                                selectedProcess.virtualMemorySize - 1
                                            )
                                            : undefined
                                    }
                                    value={
                                        addressInput
                                    }
                                    onChange={(event) =>
                                        setAddressInput(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        !selectedProcess
                                    }
                                    placeholder={
                                        selectedProcess
                                            ? `0 – ${Math.max(
                                                0,
                                                selectedProcess.virtualMemorySize - 1
                                            )}`
                                            : "Select a process"
                                    }
                                />

                            </label>

                            <button
                                type="button"
                                className="paging-button primary full"
                                disabled={
                                    actionLoading ||
                                    !selectedProcess ||
                                    addressInput === ""
                                }
                                onClick={
                                    handleTranslate
                                }
                            >
                                Translate Address
                            </button>

                        </div>

                    </div>

                </Panel>

                <Panel
                    title="Page Table"
                    subtitle={
                        selectedProcess
                            ? `Virtual pages for ${selectedProcess.pid}`
                            : "Select a process to view its page table."
                    }
                    className="wide"
                >

                    {pageTableLoading ? (

                        <div className="paging-empty">

                            <strong>
                                Loading page table...
                            </strong>

                            <span>
                                Reading the live page table
                                from PagingManager.
                            </span>

                        </div>

                    ) : selectedPages.length === 0 ? (

                        <div className="paging-empty">

                            <strong>
                                No page table entries
                            </strong>

                            {selectedProcess && (
                                <span>
                                    Allocate a page or allocate
                                    all pages to populate the
                                    page table.
                                </span>
                            )}

                        </div>

                    ) : (

                        <div className="paging-table-wrapper">

                            <table className="paging-table">

                                <thead>

                                    <tr>
                                        <th>Page</th>
                                        <th>Frame</th>
                                        <th>Present</th>
                                        <th>Referenced</th>
                                        <th>Modified</th>
                                        <th>Loaded</th>
                                        <th>Actions</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {selectedPages.map(
                                        (page) => (
                                            <tr
                                                key={
                                                    page.pageNumber
                                                }
                                            >

                                                <td>
                                                    <strong>
                                                        {
                                                            page.pageNumber
                                                        }
                                                    </strong>
                                                </td>

                                                <td className="mono">
                                                    {page.frameNumber ??
                                                        "—"}
                                                </td>

                                                <td>

                                                    <StatusBadge
                                                        type={
                                                            page.present
                                                                ? "success"
                                                                : "neutral"
                                                        }
                                                    >
                                                        {page.present
                                                            ? "Resident"
                                                            : "Not resident"}
                                                    </StatusBadge>

                                                </td>

                                                <td>
                                                    {page.referenced
                                                        ? "Yes"
                                                        : "No"}
                                                </td>

                                                <td>
                                                    {page.modified
                                                        ? "Yes"
                                                        : "No"}
                                                </td>

                                                <td className="paging-date">
                                                    {page.loadedAt
                                                        ? new Date(
                                                            page.loadedAt
                                                        ).toLocaleTimeString()
                                                        : "—"}
                                                </td>

                                                <td>

                                                    <div className="paging-row-actions">

                                                        <button
                                                            type="button"
                                                            className="paging-small-button"
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            onClick={() =>
                                                                handleReference(
                                                                    page.pageNumber
                                                                )
                                                            }
                                                        >
                                                            Reference
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="paging-small-button"
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            onClick={() =>
                                                                handleModify(
                                                                    page.pageNumber
                                                                )
                                                            }
                                                        >
                                                            Modify
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="paging-small-button danger"
                                                            disabled={
                                                                actionLoading ||
                                                                !page.present
                                                            }
                                                            onClick={() =>
                                                                handleReleasePage(
                                                                    page.pageNumber
                                                                )
                                                            }
                                                        >
                                                            Release
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </Panel>

                <Panel
                    title="Physical Frames"
                    subtitle={`${formatNumber(
                        usedFrames
                    )} used · ${formatNumber(
                        freeFrames
                    )} free`}
                    className="wide"
                >

                    {frames.length === 0 ? (

                        <div className="paging-empty">
                            No physical frames available.
                        </div>

                    ) : (

                        <div className="paging-frame-grid">

                            {frames.map(
                                (frame) => (
                                    <div
                                        key={
                                            frame.frameNumber
                                        }
                                        className={
                                            frame.allocated
                                                ? "paging-frame used"
                                                : "paging-frame"
                                        }
                                    >

                                        <div className="paging-frame-number">
                                            Frame{" "}
                                            {frame.frameNumber}
                                        </div>

                                        <div className="paging-frame-status">

                                            {frame.allocated ? (
                                                <>
                                                    <strong>
                                                        PID{" "}
                                                        {frame.pid}
                                                    </strong>

                                                    <span>
                                                        Page{" "}
                                                        {
                                                            frame.pageNumber
                                                        }
                                                    </span>
                                                </>
                                            ) : (
                                                <span>
                                                    Free
                                                </span>
                                            )}

                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                    )}

                </Panel>

                <Panel
                    title="Translation Result"
                    subtitle="Latest logical-address translation."
                >

                    {result?.data?.logicalAddress !==
                        undefined ? (

                        <div className="translation-result">

                            <div>
                                <span>
                                    Logical Address
                                </span>

                                <strong>
                                    {
                                        result.data
                                            .logicalAddress
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Page
                                </span>

                                <strong>
                                    {
                                        result.data
                                            .pageNumber
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Offset
                                </span>

                                <strong>
                                    {
                                        result.data
                                            .offset
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Frame
                                </span>

                                <strong>
                                    {
                                        result.data
                                            .frameNumber
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Physical Address
                                </span>

                                <strong>
                                    {
                                        result.data
                                            .physicalAddress
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Result
                                </span>

                                <strong
                                    className={
                                        result.data.pageFault
                                            ? "fault"
                                            : "hit"
                                    }
                                >
                                    {result.data.pageFault
                                        ? "PAGE FAULT"
                                        : "PAGE HIT"}
                                </strong>
                            </div>

                        </div>

                    ) : (

                        <div className="paging-empty">
                            No address translation performed yet.
                        </div>

                    )}

                </Panel>

                <Panel
                    title="Paging Activity"
                    subtitle="Runtime counters reported by PagingManager."
                >

                    <div className="paging-activity-grid">

                        <Metric
                            label="Pages Loaded"
                            value={
                                formatNumber(
                                    pagesLoaded
                                )
                            }
                        />

                        <Metric
                            label="Pages Unloaded"
                            value={
                                formatNumber(
                                    pagesUnloaded
                                )
                            }
                        />

                        <Metric
                            label="Allocations"
                            value={
                                formatNumber(
                                    allocations
                                )
                            }
                        />

                        <Metric
                            label="Releases"
                            value={
                                formatNumber(
                                    releases
                                )
                            }
                        />

                    </div>

                </Panel>

            </div>

            <div className="paging-footer">

                <div>
                    Page size:{" "}
                    <strong>
                        {formatNumber(
                            pageSize
                        )}
                    </strong>
                </div>

                <div>
                    Physical frames:{" "}
                    <strong>
                        {formatNumber(
                            frameCount
                        )}
                    </strong>
                </div>

                <div>
                    Page-fault rate:{" "}
                    <strong>
                        {formatPercent(
                            statistics?.pageFaultRate ??
                            0
                        )}
                    </strong>
                </div>

                <button
                    type="button"
                    className="paging-button danger"
                    disabled={
                        actionLoading
                    }
                    onClick={
                        handleReset
                    }
                >
                    Reset Paging
                </button>

            </div>

            <style>{`

                .paging-app {
                    box-sizing: border-box;
                    width: 100%;
                    height: 100%;
                    min-height: 100%;
                    overflow-y: auto;
                    padding: 24px;
                    background: #f6f7fb;
                    color: #182033;
                    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .paging-app *,
                .paging-app *::before,
                .paging-app *::after {
                    box-sizing: border-box;
                }

                .paging-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 20px;
                    margin-bottom: 22px;
                }

                .paging-eyebrow {
                    margin-bottom: 6px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.14em;
                    color: #6c7190;
                }

                .paging-header h1 {
                    margin: 0;
                    font-size: 28px;
                    line-height: 1.1;
                    letter-spacing: -0.03em;
                }

                .paging-header p {
                    max-width: 720px;
                    margin: 8px 0 0;
                    color: #6f768d;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .paging-header-status {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 7px;
                }

                .paging-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    width: fit-content;
                    padding: 5px 9px;
                    border-radius: 999px;
                    border: 1px solid #dfe3ed;
                    background: #fff;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                }

                .paging-status-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #98a0b5;
                }

                .paging-status.success {
                    color: #246b48;
                }

                .paging-status.success .paging-status-dot {
                    background: #3c9b69;
                }

                .paging-status.danger {
                    color: #a03a42;
                }

                .paging-status.danger .paging-status-dot {
                    background: #c85a62;
                }

                .paging-status.warning {
                    color: #8a6119;
                }

                .paging-status.warning .paging-status-dot {
                    background: #d29a37;
                }

                .paging-updated {
                    color: #858ba0;
                    font-size: 10px;
                }

                .paging-error,
                .paging-result {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    margin-bottom: 16px;
                    padding: 11px 13px;
                    border: 1px solid #e2e5ee;
                    border-radius: 10px;
                    background: #fff;
                    font-size: 12px;
                }

                .paging-error {
                    border-color: #edcfd2;
                    color: #963d45;
                }

                .paging-error strong,
                .paging-result strong {
                    display: block;
                    margin-bottom: 2px;
                }

                .paging-result span {
                    display: block;
                    color: #70778d;
                    line-height: 1.4;
                }

                .paging-result.success {
                    border-color: #cfe6d9;
                }

                .paging-result.warning {
                    border-color: #eadcbf;
                }

                .paging-metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-bottom: 14px;
                }

                .paging-metric {
                    min-width: 0;
                    padding: 13px;
                    border: 1px solid #e1e4ed;
                    border-radius: 10px;
                    background: #fff;
                }

                .paging-metric-label,
                .paging-metric-detail {
                    display: block;
                    color: #7b8195;
                    font-size: 10px;
                }

                .paging-metric-label {
                    font-weight: 700;
                }

                .paging-metric-value {
                    display: block;
                    margin: 6px 0 2px;
                    font-size: 21px;
                    letter-spacing: -0.02em;
                }

                .paging-main-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 14px;
                }

                .paging-panel {
                    min-width: 0;
                    border: 1px solid #e1e4ed;
                    border-radius: 12px;
                    background: #fff;
                    overflow: hidden;
                }

                .paging-panel.wide {
                    grid-column: 1 / -1;
                }

                .paging-panel-header {
                    padding: 15px 16px 11px;
                    border-bottom: 1px solid #eceef4;
                }

                .paging-panel-header h2 {
                    margin: 0;
                    font-size: 14px;
                    letter-spacing: -0.01em;
                }

                .paging-panel-header p {
                    margin: 4px 0 0;
                    color: #7b8195;
                    font-size: 11px;
                    line-height: 1.4;
                }

                .paging-panel-body {
                    padding: 15px 16px;
                }

                .paging-process-list {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    max-height: 220px;
                    overflow-y: auto;
                }

                .paging-process-item {
                    display: grid;
                    grid-template-columns: 150px 1fr 90px 100px;
                    gap: 10px;
                    align-items: center;
                    width: 100%;
                    padding: 9px 10px;
                    border: 1px solid #e3e6ee;
                    border-radius: 8px;
                    background: #fbfcfe;
                    color: #454c61;
                    text-align: left;
                    cursor: pointer;
                    font: inherit;
                    font-size: 10px;
                }

                .paging-process-item:hover {
                    border-color: #c5cad8;
                }

                .paging-process-item.selected {
                    border-color: #858ca8;
                    background: #f1f2f7;
                }

                .paging-process-pid {
                    overflow: hidden;
                    font-weight: 800;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .selected-process-info {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px;
                }

                .selected-process-info > div {
                    padding: 10px;
                    border: 1px solid #e4e7ee;
                    border-radius: 8px;
                    background: #fafbfc;
                }

                .selected-process-info span {
                    display: block;
                    margin-bottom: 4px;
                    color: #7a8094;
                    font-size: 9px;
                    font-weight: 700;
                }

                .selected-process-info strong {
                    display: block;
                    overflow: hidden;
                    color: #30374a;
                    font-size: 12px;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .paging-operation-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 18px;
                }

                .paging-operation-group {
                    min-width: 0;
                }

                .paging-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .paging-field span {
                    color: #6f768b;
                    font-size: 10px;
                    font-weight: 700;
                }

                .paging-field input {
                    width: 100%;
                    height: 36px;
                    padding: 0 10px;
                    border: 1px solid #dfe3ec;
                    border-radius: 7px;
                    outline: none;
                    background: #fbfcfe;
                    color: #182033;
                    font: inherit;
                    font-size: 12px;
                }

                .paging-field input:focus {
                    border-color: #9299b5;
                    background: #fff;
                }

                .paging-field input:disabled {
                    cursor: not-allowed;
                    opacity: 0.5;
                }

                .paging-button-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 12px;
                }

                .paging-button {
                    min-height: 34px;
                    padding: 0 12px;
                    border: 1px solid #dfe3ec;
                    border-radius: 7px;
                    background: #fff;
                    color: #30374c;
                    cursor: pointer;
                    font: inherit;
                    font-size: 11px;
                    font-weight: 700;
                    transition: transform 0.12s ease, border-color 0.12s ease;
                }

                .paging-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    border-color: #b9bfd0;
                }

                .paging-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.48;
                }

                .paging-button.primary {
                    border-color: #5e6687;
                    background: #59617f;
                    color: #fff;
                }

                .paging-button.secondary {
                    background: #f1f2f7;
                }

                .paging-button.danger {
                    border-color: #e4cfd2;
                    color: #9b4149;
                }

                .paging-button.full {
                    width: 100%;
                    margin-top: 12px;
                }

                .paging-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                }

                .paging-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }

                .paging-table th {
                    padding: 9px 8px;
                    border-bottom: 1px solid #e5e8ef;
                    color: #737a90;
                    text-align: left;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .paging-table td {
                    padding: 9px 8px;
                    border-bottom: 1px solid #eef0f5;
                    vertical-align: middle;
                }

                .paging-table tbody tr:last-child td {
                    border-bottom: 0;
                }

                .paging-row-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                }

                .paging-small-button {
                    padding: 5px 7px;
                    border: 1px solid #dfe3eb;
                    border-radius: 5px;
                    background: #fff;
                    color: #4a5165;
                    cursor: pointer;
                    font: inherit;
                    font-size: 9px;
                    font-weight: 700;
                }

                .paging-small-button:disabled {
                    cursor: not-allowed;
                    opacity: 0.4;
                }

                .paging-small-button.danger {
                    color: #9b4149;
                    border-color: #e5d2d4;
                }

                .paging-frame-grid {
                    display: grid;
                    grid-template-columns: repeat(8, minmax(0, 1fr));
                    gap: 8px;
                }

                .paging-frame {
                    min-height: 76px;
                    padding: 9px;
                    border: 1px solid #e1e4ed;
                    border-radius: 8px;
                    background: #fafbfc;
                }

                .paging-frame.used {
                    border-color: #b8bfd2;
                    background: #f0f2f7;
                }

                .paging-frame-number {
                    margin-bottom: 9px;
                    color: #777e93;
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                }

                .paging-frame-status {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    color: #747b8f;
                    font-size: 9px;
                }

                .paging-frame-status strong {
                    color: #353c50;
                    font-size: 10px;
                }

                .translation-result {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 9px;
                }

                .translation-result > div {
                    padding: 10px;
                    border: 1px solid #e4e7ee;
                    border-radius: 8px;
                    background: #fafbfc;
                }

                .translation-result span {
                    display: block;
                    margin-bottom: 5px;
                    color: #7a8094;
                    font-size: 9px;
                    font-weight: 700;
                }

                .translation-result strong {
                    font-size: 14px;
                }

                .translation-result strong.hit {
                    color: #28704d;
                }

                .translation-result strong.fault {
                    color: #9a5d24;
                }

                .paging-activity-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 8px;
                }

                .paging-activity-grid .paging-metric {
                    background: #fafbfc;
                }

                .paging-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    min-height: 80px;
                    padding: 20px 10px;
                    color: #888fa2;
                    text-align: center;
                    font-size: 11px;
                }

                .paging-empty strong {
                    color: #596078;
                }

                .paging-date,
                .mono {
                    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
                }

                .paging-footer {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 18px;
                    margin-top: 14px;
                    padding: 11px 13px;
                    border: 1px solid #e1e4ed;
                    border-radius: 10px;
                    background: #fff;
                    color: #777e92;
                    font-size: 10px;
                }

                .paging-footer > div {
                    white-space: nowrap;
                }

                .paging-footer strong {
                    color: #333a4e;
                }

                .paging-footer .paging-button {
                    margin-left: auto;
                }

                @media (max-width: 1100px) {

                    .paging-metrics-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .paging-frame-grid {
                        grid-template-columns: repeat(4, minmax(0, 1fr));
                    }

                    .paging-process-item {
                        grid-template-columns: 130px 1fr 80px 90px;
                    }

                }

                @media (max-width: 760px) {

                    .paging-app {
                        padding: 15px;
                    }

                    .paging-header {
                        flex-direction: column;
                    }

                    .paging-header-status {
                        align-items: flex-start;
                    }

                    .paging-main-grid {
                        grid-template-columns: 1fr;
                    }

                    .paging-panel.wide {
                        grid-column: auto;
                    }

                    .paging-operation-grid {
                        grid-template-columns: 1fr;
                    }

                    .paging-process-item {
                        grid-template-columns: 1fr 1fr;
                    }

                    .translation-result {
                        grid-template-columns: 1fr 1fr;
                    }

                }

                @media (max-width: 480px) {

                    .paging-metrics-grid {
                        grid-template-columns: 1fr;
                    }

                    .paging-frame-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }

                    .translation-result {
                        grid-template-columns: 1fr;
                    }

                    .selected-process-info {
                        grid-template-columns: 1fr;
                    }

                    .paging-footer {
                        align-items: flex-start;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .paging-footer .paging-button {
                        margin-left: 0;
                    }

                }

            `}</style>

        </div>
    );
}

export default Paging;