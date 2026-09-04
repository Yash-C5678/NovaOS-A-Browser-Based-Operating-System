import { useCallback, useEffect, useMemo, useState } from "react";
import NovaIcon from "../ui/NovaIcon";

const API_BASE = "http://localhost:5000/api/deadlock";

async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
        throw new Error(
            payload?.error?.message ||
            payload?.message ||
            `Request failed (${response.status})`
        );
    }

    return payload;
}

function arrayValue(value) {
    return Array.isArray(value) ? value : [];
}

function dataValue(payload) {
    return payload?.data ?? payload ?? {};
}

function Deadlock() {
    const [table, setTable] = useState({
        resources: [],
        available: [],
        processes: []
    });

    const [stats, setStats] = useState({
        resourceCount: 0,
        processCount: 0,
        available: [],
        safe: null,
        safeSequence: [],
        deadlockDetected: null,
        deadlockedProcesses: []
    });

    const [resourceId, setResourceId] = useState("");
    const [resourceTotal, setResourceTotal] = useState("1");

    const [processId, setProcessId] = useState("");
    const [maximum, setMaximum] = useState([]);

    const [selectedProcess, setSelectedProcess] = useState("");

    const [allocation, setAllocation] = useState([]);
    const [release, setRelease] = useState([]);
    const [request, setRequest] = useState([]);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastAction, setLastAction] = useState("");

    const resources = useMemo(
        () => arrayValue(table.resources),
        [table.resources]
    );

    const processes = useMemo(
        () => arrayValue(table.processes),
        [table.processes]
    );

    const resourceCount = resources.length;

    /*
     * ---------------------------------------------------------
     * LOAD CURRENT BACKEND STATE
     * ---------------------------------------------------------
     */

    const loadData = useCallback(async () => {
        try {
            const [tableResponse, statsResponse] = await Promise.all([
                api("/table"),
                api("/")
            ]);

            const tableData = dataValue(tableResponse);
            const statsData = dataValue(statsResponse);

            setTable({
                resources: arrayValue(tableData.resources),
                available: arrayValue(tableData.available),
                processes: arrayValue(tableData.processes)
            });

            setStats((current) => ({
                ...current,
                resourceCount: statsData.resourceCount ?? 0,
                processCount: statsData.processCount ?? 0,
                available: arrayValue(statsData.available),

                /*
                 * Keep the last analysis result if the backend
                 * has not produced a new one yet.
                 */
                safe:
                    statsData.safe !== undefined
                        ? statsData.safe
                        : current.safe,

                safeSequence:
                    statsData.safeSequence !== undefined
                        ? arrayValue(statsData.safeSequence)
                        : current.safeSequence,

                deadlockDetected:
                    statsData.deadlockDetected !== undefined
                        ? statsData.deadlockDetected
                        : current.deadlockDetected,

                deadlockedProcesses:
                    statsData.deadlockedProcesses !== undefined
                        ? arrayValue(statsData.deadlockedProcesses)
                        : current.deadlockedProcesses
            }));
        } catch {
            /*
             * Background polling errors are intentionally ignored.
             * Explicit button actions display errors.
             */
        }
    }, []);

    useEffect(() => {
        loadData();

        const timer = setInterval(loadData, 1000);

        return () => clearInterval(timer);
    }, [loadData]);

    /*
     * ---------------------------------------------------------
     * KEEP INPUT VECTORS SYNCHRONIZED WITH RESOURCE COUNT
     * ---------------------------------------------------------
     */

    useEffect(() => {
        setMaximum((current) =>
            Array.from(
                { length: resourceCount },
                (_, index) =>
                    current[index] !== undefined
                        ? current[index]
                        : "0"
            )
        );

        setAllocation((current) =>
            Array.from(
                { length: resourceCount },
                (_, index) =>
                    current[index] !== undefined
                        ? current[index]
                        : "0"
            )
        );

        setRelease((current) =>
            Array.from(
                { length: resourceCount },
                (_, index) =>
                    current[index] !== undefined
                        ? current[index]
                        : "0"
            )
        );

        setRequest((current) =>
            Array.from(
                { length: resourceCount },
                (_, index) =>
                    current[index] !== undefined
                        ? current[index]
                        : "0"
            )
        );
    }, [resourceCount]);

    /*
     * ---------------------------------------------------------
     * SELECT PROCESS
     * ---------------------------------------------------------
     */

    useEffect(() => {
        if (!selectedProcess) {
            setAllocation(
                Array.from(
                    { length: resourceCount },
                    () => "0"
                )
            );
            return;
        }

        const process = processes.find(
            (item) => item.pid === selectedProcess
        );

        if (!process) {
            return;
        }

        const currentAllocation = arrayValue(
            process.allocation
        );

        setAllocation(
            Array.from(
                { length: resourceCount },
                (_, index) =>
                    currentAllocation[index] !== undefined
                        ? String(currentAllocation[index])
                        : "0"
            )
        );
    }, [selectedProcess, resourceCount]);

    /*
     * ---------------------------------------------------------
     * FEEDBACK
     * ---------------------------------------------------------
     */

    const clearFeedback = () => {
        setMessage("");
        setError("");
    };

    /*
     * Every state-changing operation invalidates the previous
     * safety/deadlock analysis.
     */

    const invalidateAnalysis = () => {
        setStats((current) => ({
            ...current,
            safe: null,
            safeSequence: [],
            deadlockDetected: null,
            deadlockedProcesses: []
        }));
    };

    const perform = async (action, callback) => {
        clearFeedback();
        setLoading(true);
        setLastAction(action);

        try {
            await callback();

            setMessage(`${action} completed successfully.`);

            await loadData();
        } catch (err) {
            setError(err?.message || "Operation failed.");
        } finally {
            setLoading(false);
        }
    };

    /*
     * ---------------------------------------------------------
     * RESOURCE
     * ---------------------------------------------------------
     */

    const createResource = () => {
        const id = resourceId.trim();
        const total = Number(resourceTotal);

        if (!id) {
            setError("Enter a resource ID.");
            return;
        }

        if (!Number.isInteger(total) || total < 0) {
            setError("Resource total must be a non-negative integer.");
            return;
        }

        perform("Create resource", async () => {
            invalidateAnalysis();

            await api("/resources", {
                method: "POST",
                body: JSON.stringify({
                    id,
                    total
                })
            });

            setResourceId("");
            setResourceTotal("1");
        });
    };

    /*
     * ---------------------------------------------------------
     * PROCESS
     * ---------------------------------------------------------
     */

    const createProcess = () => {
        const pid = processId.trim();

        if (!pid) {
            setError("Enter a process ID.");
            return;
        }

        if (resourceCount === 0) {
            setError("Create at least one resource first.");
            return;
        }

        if (maximum.length !== resourceCount) {
            setError(
                `Maximum must contain exactly ${resourceCount} values.`
            );
            return;
        }

        const values = maximum.map((value) => Number(value));

        if (
            values.some(
                (value) =>
                    !Number.isInteger(value) ||
                    value < 0
            )
        ) {
            setError(
                "Maximum resource values must be non-negative integers."
            );
            return;
        }

        perform("Create process", async () => {
            invalidateAnalysis();

            await api("/processes", {
                method: "POST",
                body: JSON.stringify({
                    pid,
                    maximum: values
                })
            });

            setProcessId("");
            setMaximum(values.map(() => "0"));
        });
    };

    /*
     * ---------------------------------------------------------
     * VECTOR INPUT HANDLER
     *
     * IMPORTANT:
     * Keep the input as a STRING while typing.
     *
     * This prevents:
     *     1 -> 0
     *
     * type="number" inputs can temporarily produce an empty
     * string while editing, so converting immediately with
     * Number() causes the visible value to jump back to 0.
     * ---------------------------------------------------------
     */

    const updateVector = (setter, index, value) => {
        if (value === "") {
            setter((current) => {
                const next = [...current];
                next[index] = "";
                return next;
            });

            return;
        }

        if (!/^\d+$/.test(value)) {
            return;
        }

        setter((current) => {
            const next = [...current];
            next[index] = value;
            return next;
        });
    };

    /*
     * ---------------------------------------------------------
     * ALLOCATION
     * ---------------------------------------------------------
     */

    const allocateResources = () => {
        if (!selectedProcess) {
            setError("Select a process first.");
            return;
        }

        const values = allocation.map((value) => Number(value || 0));

        if (
            values.length !== resourceCount ||
            values.some(
                (value) =>
                    !Number.isInteger(value) ||
                    value < 0
            )
        ) {
            setError("Enter valid allocation values.");
            return;
        }

        perform("Allocate resources", async () => {
            invalidateAnalysis();

            await api(
                `/processes/${encodeURIComponent(
                    selectedProcess
                )}/allocate`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        allocation: values
                    })
                }
            );
        });
    };

    /*
     * ---------------------------------------------------------
     * RELEASE
     * ---------------------------------------------------------
     */

    const releaseResources = () => {
        if (!selectedProcess) {
            setError("Select a process first.");
            return;
        }

        const values = release.map((value) => Number(value || 0));

        if (
            values.length !== resourceCount ||
            values.some(
                (value) =>
                    !Number.isInteger(value) ||
                    value < 0
            )
        ) {
            setError("Enter valid release values.");
            return;
        }

        perform("Release resources", async () => {
            invalidateAnalysis();

            await api(
                `/processes/${encodeURIComponent(
                    selectedProcess
                )}/release`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        release: values
                    })
                }
            );
        });
    };

    /*
     * ---------------------------------------------------------
     * REQUEST
     * ---------------------------------------------------------
     */

    const requestResources = () => {
        if (!selectedProcess) {
            setError("Select a process first.");
            return;
        }

        const values = request.map((value) => Number(value || 0));

        if (
            values.length !== resourceCount ||
            values.some(
                (value) =>
                    !Number.isInteger(value) ||
                    value < 0
            )
        ) {
            setError("Enter valid request values.");
            return;
        }

        perform("Resource request", async () => {
            invalidateAnalysis();

            await api(
                `/processes/${encodeURIComponent(
                    selectedProcess
                )}/request`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        request: values
                    })
                }
            );
        });
    };

    /*
     * ---------------------------------------------------------
     * BANKER'S SAFETY CHECK
     *
     * Explicitly POST /api/deadlock/safety
     * ---------------------------------------------------------
     */

    const runSafetyCheck = async () => {
        clearFeedback();
        setLoading(true);
        setLastAction("Banker's safety check");

        try {
            const response = await api("/safety", {
                method: "POST",
                body: JSON.stringify({})
            });

            const result = dataValue(response);

            setStats((current) => ({
                ...current,

                safe:
                    result.safe !== undefined
                        ? Boolean(result.safe)
                        : current.safe,

                safeSequence:
                    result.safeSequence !== undefined
                        ? arrayValue(result.safeSequence)
                        : current.safeSequence,

                available:
                    result.available !== undefined
                        ? arrayValue(result.available)
                        : current.available
            }));

            setMessage(
                "Banker's safety check completed successfully."
            );

            await loadData();
        } catch (err) {
            setError(err?.message || "Safety check failed.");
        } finally {
            setLoading(false);
        }
    };

    /*
     * ---------------------------------------------------------
     * DEADLOCK DETECTION
     * ---------------------------------------------------------
     */

    const detectDeadlock = async () => {
        clearFeedback();
        setLoading(true);
        setLastAction("Deadlock detection");

        try {
            const response = await api("/detect", {
                method: "POST",
                body: JSON.stringify({})
            });

            const result = dataValue(response);

            setStats((current) => ({
                ...current,

                deadlockDetected:
                    result.deadlockDetected !== undefined
                        ? Boolean(result.deadlockDetected)
                        : current.deadlockDetected,

                deadlockedProcesses:
                    result.deadlockedProcesses !== undefined
                        ? arrayValue(result.deadlockedProcesses)
                        : current.deadlockedProcesses,

                safe:
                    result.safe !== undefined
                        ? Boolean(result.safe)
                        : current.safe
            }));

            setMessage(
                "Deadlock detection completed successfully."
            );

            await loadData();
        } catch (err) {
            setError(err?.message || "Deadlock detection failed.");
        } finally {
            setLoading(false);
        }
    };

    /*
     * ---------------------------------------------------------
     * RESET
     * ---------------------------------------------------------
     */

    const resetSystem = async () => {
        clearFeedback();
        setLoading(true);
        setLastAction("Reset deadlock manager");

        try {
            await api("/reset", {
                method: "POST",
                body: JSON.stringify({})
            });

            setSelectedProcess("");

            setTable({
                resources: [],
                available: [],
                processes: []
            });

            setStats({
                resourceCount: 0,
                processCount: 0,
                available: [],
                safe: null,
                safeSequence: [],
                deadlockDetected: null,
                deadlockedProcesses: []
            });

            setMaximum([]);
            setAllocation([]);
            setRelease([]);
            setRequest([]);

            setMessage(
                "Deadlock manager reset successfully."
            );

            await loadData();
        } catch (err) {
            setError(err?.message || "Reset failed.");
        } finally {
            setLoading(false);
        }
    };

    /*
     * ---------------------------------------------------------
     * HELPERS
     * ---------------------------------------------------------
     */

    const isDeadlocked = (pid) =>
        stats.deadlockedProcesses.includes(pid);

    const vectorText = (values) =>
        arrayValue(values).join(", ");

    /*
     * ---------------------------------------------------------
     * RENDER
     * ---------------------------------------------------------
     */

    return (
        <div className="nova-deadlock-manager">

            {/* HEADER */}

            <div className="nova-deadlock-header">
                <div>
                    <div className="nova-deadlock-title">
                        <NovaIcon name="deadlock" size={22} />
                        <span>Deadlock Manager</span>
                    </div>

                    <div className="nova-deadlock-subtitle">
                        Banker's Algorithm &amp; Deadlock Detection
                    </div>
                </div>

                <div className="nova-deadlock-live">
                    <span className="nova-live-dot" />
                    LIVE
                </div>
            </div>

            {/* ALERT */}

            {(message || error) && (
                <div
                    className={`nova-deadlock-alert ${error
                        ? "nova-deadlock-alert-error"
                        : "nova-deadlock-alert-success"
                        }`}
                >
                    <NovaIcon
                        name={error ? "overview" : "application"}
                        size={16}
                    />

                    <span>{error || message}</span>
                </div>
            )}

            {/* STATISTICS */}

            <div className="nova-deadlock-stats">

                <div className="nova-deadlock-stat">
                    <span>Resources</span>
                    <strong>{stats.resourceCount}</strong>
                </div>

                <div className="nova-deadlock-stat">
                    <span>Processes</span>
                    <strong>{stats.processCount}</strong>
                </div>

                <div className="nova-deadlock-stat">
                    <span>System Safe</span>

                    <strong
                        className={
                            stats.safe === true
                                ? "nova-safe"
                                : stats.safe === false
                                    ? "nova-unsafe"
                                    : ""
                        }
                    >
                        {stats.safe === true
                            ? "YES"
                            : stats.safe === false
                                ? "NO"
                                : "—"}
                    </strong>
                </div>

                <div className="nova-deadlock-stat">
                    <span>Deadlock</span>

                    <strong
                        className={
                            stats.deadlockDetected === true
                                ? "nova-unsafe"
                                : stats.deadlockDetected === false
                                    ? "nova-safe"
                                    : ""
                        }
                    >
                        {stats.deadlockDetected === true
                            ? "DETECTED"
                            : stats.deadlockDetected === false
                                ? "NONE"
                                : "—"}
                    </strong>
                </div>

            </div>

            {/* RESOURCE + PROCESS CREATION */}

            <div className="nova-deadlock-grid">

                {/* RESOURCES */}

                <section className="nova-deadlock-panel">

                    <div className="nova-deadlock-panel-title">
                        <NovaIcon name="memory" size={18} />
                        <span>Resources</span>
                    </div>

                    <div className="nova-deadlock-form">

                        <input
                            value={resourceId}
                            onChange={(event) =>
                                setResourceId(event.target.value)
                            }
                            placeholder="Resource ID"
                        />

                        <input
                            type="number"
                            min="0"
                            value={resourceTotal}
                            onChange={(event) =>
                                setResourceTotal(
                                    event.target.value
                                )
                            }
                            placeholder="Total"
                        />

                        <button
                            type="button"
                            onClick={createResource}
                            disabled={loading}
                        >
                            Add Resource
                        </button>

                    </div>

                    <div className="nova-deadlock-resource-list">

                        {resources.length === 0 ? (
                            <div className="nova-empty-state">
                                No resources registered.
                            </div>
                        ) : (
                            resources.map((resource) => (
                                <div
                                    className="nova-deadlock-resource"
                                    key={resource.id}
                                >
                                    <span>{resource.id}</span>
                                    <strong>
                                        {resource.total}
                                    </strong>
                                </div>
                            ))
                        )}

                    </div>

                </section>

                {/* CREATE PROCESS */}

                <section className="nova-deadlock-panel">

                    <div className="nova-deadlock-panel-title">
                        <NovaIcon name="processes" size={18} />
                        <span>Create Process</span>
                    </div>

                    <div className="nova-deadlock-form">

                        <input
                            value={processId}
                            onChange={(event) =>
                                setProcessId(event.target.value)
                            }
                            placeholder="Process ID"
                        />

                        <button
                            type="button"
                            onClick={createProcess}
                            disabled={
                                loading ||
                                resourceCount === 0
                            }
                        >
                            Add Process
                        </button>

                    </div>

                    <div className="nova-deadlock-vector-label">
                        Maximum claim
                    </div>

                    <div className="nova-deadlock-vector">

                        {resources.map(
                            (resource, index) => (
                                <label
                                    key={resource.id}
                                >
                                    <span>
                                        {resource.id}
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            maximum[index] ??
                                            "0"
                                        }
                                        onChange={(event) =>
                                            updateVector(
                                                setMaximum,
                                                index,
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            )
                        )}

                    </div>

                </section>

            </div>

            {/* ALLOCATION TABLE */}

            <section className="nova-deadlock-panel nova-deadlock-wide">

                <div className="nova-deadlock-panel-title">
                    <NovaIcon
                        name="processes"
                        size={18}
                    />

                    <span>
                        Resource Allocation Table
                    </span>
                </div>

                <div className="nova-deadlock-table-wrap">

                    <table className="nova-deadlock-table">

                        <thead>

                            <tr>
                                <th>Process</th>

                                <th
                                    colSpan={
                                        resourceCount || 1
                                    }
                                >
                                    Allocation
                                </th>

                                <th
                                    colSpan={
                                        resourceCount || 1
                                    }
                                >
                                    Maximum
                                </th>

                                <th
                                    colSpan={
                                        resourceCount || 1
                                    }
                                >
                                    Need
                                </th>
                            </tr>

                            <tr>

                                <th />

                                {resources.map(
                                    (resource) => (
                                        <th
                                            key={`a-${resource.id}`}
                                        >
                                            {resource.id}
                                        </th>
                                    )
                                )}

                                {resources.map(
                                    (resource) => (
                                        <th
                                            key={`m-${resource.id}`}
                                        >
                                            {resource.id}
                                        </th>
                                    )
                                )}

                                {resources.map(
                                    (resource) => (
                                        <th
                                            key={`n-${resource.id}`}
                                        >
                                            {resource.id}
                                        </th>
                                    )
                                )}

                            </tr>

                        </thead>

                        <tbody>

                            {processes.length === 0 ? (
                                <tr>

                                    <td
                                        colSpan={
                                            1 +
                                            Math.max(
                                                resourceCount,
                                                1
                                            ) *
                                            3
                                        }
                                        className="nova-table-empty"
                                    >
                                        No processes registered.
                                    </td>

                                </tr>
                            ) : (
                                processes.map(
                                    (process) => (
                                        <tr
                                            key={process.pid}
                                            className={
                                                isDeadlocked(
                                                    process.pid
                                                )
                                                    ? "nova-deadlocked-row"
                                                    : ""
                                            }
                                        >

                                            <td>

                                                <button
                                                    type="button"
                                                    className={`nova-process-select ${selectedProcess ===
                                                        process.pid
                                                        ? "active"
                                                        : ""
                                                        }`}
                                                    onClick={() =>
                                                        setSelectedProcess(
                                                            process.pid
                                                        )
                                                    }
                                                >
                                                    {process.pid}
                                                </button>

                                            </td>

                                            {arrayValue(
                                                process.allocation
                                            ).map(
                                                (
                                                    value,
                                                    index
                                                ) => (
                                                    <td
                                                        key={`a-${process.pid}-${index}`}
                                                    >
                                                        {value}
                                                    </td>
                                                )
                                            )}

                                            {arrayValue(
                                                process.maximum
                                            ).map(
                                                (
                                                    value,
                                                    index
                                                ) => (
                                                    <td
                                                        key={`m-${process.pid}-${index}`}
                                                    >
                                                        {value}
                                                    </td>
                                                )
                                            )}

                                            {arrayValue(
                                                process.need
                                            ).map(
                                                (
                                                    value,
                                                    index
                                                ) => (
                                                    <td
                                                        key={`n-${process.pid}-${index}`}
                                                    >
                                                        {value}
                                                    </td>
                                                )
                                            )}

                                        </tr>
                                    )
                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </section>

            {/* AVAILABLE + OPERATIONS */}

            <div className="nova-deadlock-grid">

                {/* AVAILABLE */}

                <section className="nova-deadlock-panel">

                    <div className="nova-deadlock-panel-title">
                        <NovaIcon
                            name="memory"
                            size={18}
                        />

                        <span>
                            Available Resources
                        </span>
                    </div>

                    <div className="nova-deadlock-available">

                        {resources.length === 0 ? (
                            <span>
                                No resources
                            </span>
                        ) : (
                            resources.map(
                                (
                                    resource,
                                    index
                                ) => (
                                    <div
                                        key={
                                            resource.id
                                        }
                                    >
                                        <span>
                                            {
                                                resource.id
                                            }
                                        </span>

                                        <strong>
                                            {
                                                table
                                                    .available[
                                                index
                                                ] ?? 0
                                            }
                                        </strong>
                                    </div>
                                )
                            )
                        )}

                    </div>

                </section>

                {/* PROCESS OPERATIONS */}

                <section className="nova-deadlock-panel">

                    <div className="nova-deadlock-panel-title">
                        <NovaIcon
                            name="processes"
                            size={18}
                        />

                        <span>
                            Process Operations
                        </span>
                    </div>

                    <select
                        value={selectedProcess}
                        onChange={(event) =>
                            setSelectedProcess(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select process
                        </option>

                        {processes.map(
                            (process) => (
                                <option
                                    key={process.pid}
                                    value={process.pid}
                                >
                                    {process.pid}
                                </option>
                            )
                        )}
                    </select>

                    {/* ALLOCATE */}

                    <div className="nova-deadlock-operation">

                        <div className="nova-deadlock-vector-label">
                            Allocate
                        </div>

                        <div className="nova-deadlock-vector">

                            {resources.map(
                                (
                                    resource,
                                    index
                                ) => (
                                    <label
                                        key={
                                            resource.id
                                        }
                                    >
                                        <span>
                                            {
                                                resource.id
                                            }
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            value={
                                                allocation[
                                                index
                                                ] ?? "0"
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateVector(
                                                    setAllocation,
                                                    index,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>
                                )
                            )}

                        </div>

                        <button
                            type="button"
                            onClick={
                                allocateResources
                            }
                            disabled={loading}
                        >
                            Allocate
                        </button>

                    </div>

                    {/* RELEASE */}

                    <div className="nova-deadlock-operation">

                        <div className="nova-deadlock-vector-label">
                            Release
                        </div>

                        <div className="nova-deadlock-vector">

                            {resources.map(
                                (
                                    resource,
                                    index
                                ) => (
                                    <label
                                        key={
                                            resource.id
                                        }
                                    >
                                        <span>
                                            {
                                                resource.id
                                            }
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            value={
                                                release[
                                                index
                                                ] ?? "0"
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateVector(
                                                    setRelease,
                                                    index,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>
                                )
                            )}

                        </div>

                        <button
                            type="button"
                            onClick={
                                releaseResources
                            }
                            disabled={loading}
                        >
                            Release
                        </button>

                    </div>

                    {/* REQUEST */}

                    <div className="nova-deadlock-operation">

                        <div className="nova-deadlock-vector-label">
                            Request
                        </div>

                        <div className="nova-deadlock-vector">

                            {resources.map(
                                (
                                    resource,
                                    index
                                ) => (
                                    <label
                                        key={
                                            resource.id
                                        }
                                    >
                                        <span>
                                            {
                                                resource.id
                                            }
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            value={
                                                request[
                                                index
                                                ] ?? "0"
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateVector(
                                                    setRequest,
                                                    index,
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>
                                )
                            )}

                        </div>

                        <button
                            type="button"
                            onClick={
                                requestResources
                            }
                            disabled={loading}
                        >
                            Request
                        </button>

                    </div>

                </section>

            </div>

            {/* ANALYSIS */}

            <section className="nova-deadlock-panel nova-deadlock-actions-panel">

                <div className="nova-deadlock-panel-title">

                    <NovaIcon
                        name="deadlock"
                        size={18}
                    />

                    <span>Analysis</span>

                </div>

                <div className="nova-deadlock-actions">

                    <button
                        type="button"
                        onClick={
                            runSafetyCheck
                        }
                        disabled={loading}
                    >
                        <NovaIcon
                            name="overview"
                            size={16}
                        />

                        Safety Check
                    </button>

                    <button
                        type="button"
                        onClick={
                            detectDeadlock
                        }
                        disabled={loading}
                    >
                        <NovaIcon
                            name="deadlock"
                            size={16}
                        />

                        Detect Deadlock
                    </button>

                    <button
                        type="button"
                        onClick={
                            resetSystem
                        }
                        disabled={loading}
                    >
                        <NovaIcon
                            name="application"
                            size={16}
                        />

                        Reset
                    </button>

                </div>

                <div className="nova-deadlock-results">

                    <div>

                        <span>
                            Safe sequence
                        </span>

                        <strong>

                            {stats.safeSequence
                                .length > 0
                                ? stats.safeSequence.join(
                                    " → "
                                )
                                : "—"}

                        </strong>

                    </div>

                    <div>

                        <span>
                            Deadlocked processes
                        </span>

                        <strong>

                            {stats
                                .deadlockedProcesses
                                .length > 0
                                ? stats.deadlockedProcesses.join(
                                    ", "
                                )
                                : "None"}

                        </strong>

                    </div>

                </div>

            </section>

            {/* FOOTER */}

            <div className="nova-deadlock-footer">

                <span>
                    {lastAction
                        ? `Last action: ${lastAction}`
                        : "Waiting for operation"}
                </span>

                <span>
                    Available: [
                    {vectorText(stats.available)}
                    ]
                </span>

            </div>

        </div>
    );
}

export default Deadlock;