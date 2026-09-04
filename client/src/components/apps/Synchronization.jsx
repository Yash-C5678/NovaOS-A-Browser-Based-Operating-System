import { useCallback, useEffect, useState } from "react";
import NovaIcon from "../ui/NovaIcon";

const API_BASE = "http://localhost:5000/api/synchronization";

function Synchronization() {
    const [data, setData] = useState({
        mutexes: [],
        semaphores: []
    });

    const [stats, setStats] = useState({
        mutexCount: 0,
        lockedMutexes: 0,
        mutexWaitingProcesses: 0,
        semaphoreCount: 0,
        semaphoreWaitingProcesses: 0
    });

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const [showMutexForm, setShowMutexForm] = useState(false);
    const [showSemaphoreForm, setShowSemaphoreForm] = useState(false);

    const [mutexId, setMutexId] = useState("");
    const [semaphoreId, setSemaphoreId] = useState("");
    const [semaphoreCount, setSemaphoreCount] = useState(1);
    const [pid, setPid] = useState("nova-1000");

    /*
     * =========================================================
     * LOAD DATA
     * =========================================================
     */

    const loadData = useCallback(async () => {
        try {
            setError("");

            const [tableResponse, statsResponse] =
                await Promise.all([
                    fetch(API_BASE),
                    fetch(`${API_BASE}/statistics`)
                ]);

            if (!tableResponse.ok) {
                throw new Error(
                    `Synchronization API returned ${tableResponse.status}`
                );
            }

            if (!statsResponse.ok) {
                throw new Error(
                    `Statistics API returned ${statsResponse.status}`
                );
            }

            const tableResult =
                await tableResponse.json();

            const statsResult =
                await statsResponse.json();

            setData(
                tableResult?.data ?? {
                    mutexes: [],
                    semaphores: []
                }
            );

            setStats(
                statsResult?.data ?? {}
            );

            setLastUpdated(new Date());
        } catch (err) {
            setError(
                err.message ||
                "Unable to load synchronization state."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();

        const interval = setInterval(
            loadData,
            1000
        );

        return () =>
            clearInterval(interval);
    }, [loadData]);

    /*
     * =========================================================
     * API ACTION
     * =========================================================
     */

    const request = async (
        key,
        url,
        options = {}
    ) => {
        try {
            setActionLoading(key);
            setError("");

            const response = await fetch(
                `${API_BASE}${url}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    ...options
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
                    "Synchronization operation failed."
                );
            }

            await loadData();

            return result;
        } catch (err) {
            setError(
                err.message ||
                "Synchronization operation failed."
            );
            return null;
        } finally {
            setActionLoading(null);
        }
    };

    /*
     * =========================================================
     * CREATE MUTEX
     * =========================================================
     */

    const createMutex = async (event) => {
        event.preventDefault();

        if (!mutexId.trim()) {
            setError("Mutex ID is required.");
            return;
        }

        const result = await request(
            "create-mutex",
            "/mutex",
            {
                body: JSON.stringify({
                    id: mutexId.trim()
                })
            }
        );

        if (result) {
            setMutexId("");
            setShowMutexForm(false);
        }
    };

    /*
     * =========================================================
     * CREATE SEMAPHORE
     * =========================================================
     */

    const createSemaphore = async (event) => {
        event.preventDefault();

        if (!semaphoreId.trim()) {
            setError(
                "Semaphore ID is required."
            );
            return;
        }

        const count = Number(
            semaphoreCount
        );

        if (!Number.isInteger(count) || count < 0) {
            setError(
                "Semaphore count must be a non-negative integer."
            );
            return;
        }

        const result = await request(
            "create-semaphore",
            "/semaphore",
            {
                body: JSON.stringify({
                    id: semaphoreId.trim(),
                    initialCount: count
                })
            }
        );

        if (result) {
            setSemaphoreId("");
            setSemaphoreCount(1);
            setShowSemaphoreForm(false);
        }
    };

    /*
     * =========================================================
     * HELPERS
     * =========================================================
     */

    const getMutexId = (mutex) =>
        mutex.id ?? "—";

    const getMutexOwner = (mutex) =>
        mutex.ownerPid ??
        mutex.owner ??
        "—";

    const getMutexLocked = (mutex) =>
        mutex.locked ??
        mutex.isLocked ??
        false;

    const getMutexWaiting = (mutex) =>
        mutex.waitingCount ??
        mutex.waitQueue?.length ??
        mutex.waiting?.length ??
        0;

    const getSemaphoreId = (semaphore) =>
        semaphore.id ?? "—";

    const getSemaphoreCount = (semaphore) =>
        semaphore.count ??
        semaphore.value ??
        semaphore.available ??
        0;

    const getSemaphoreWaiting = (semaphore) =>
        semaphore.waitingCount ??
        semaphore.waitQueue?.length ??
        semaphore.waiting?.length ??
        0;

    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <div className="nova-sync-manager">
            <div className="nova-sync-header">
                <div>
                    <div className="nova-sync-eyebrow">
                        SYNCHRONIZATION SUBSYSTEM
                    </div>

                    <h1>
                        Synchronization
                    </h1>

                    <p>
                        Monitor mutexes and semaphores
                        coordinating processes inside
                        the NovaOS kernel.
                    </p>
                </div>

                <div className="nova-sync-header-actions">
                    <div className="nova-sync-live">
                        <span />
                        LIVE
                    </div>

                    <button
                        type="button"
                        className="nova-sync-refresh"
                        onClick={loadData}
                        disabled={loading}
                    >
                        {loading
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>

                    <button
                        type="button"
                        className="nova-sync-create"
                        onClick={() =>
                            setShowMutexForm(
                                (value) => !value
                            )
                        }
                    >
                        <NovaIcon
                            name="synchronization"
                            size={16}
                        />
                        Create Mutex
                    </button>

                    <button
                        type="button"
                        className="nova-sync-create"
                        onClick={() =>
                            setShowSemaphoreForm(
                                (value) => !value
                            )
                        }
                    >
                        Create Semaphore
                    </button>
                </div>
            </div>

            {error && (
                <div className="nova-sync-error">
                    <strong>
                        Synchronization Error
                    </strong>

                    <span>
                        {error}
                    </span>
                </div>
            )}

            {showMutexForm && (
                <form
                    className="nova-sync-create-panel"
                    onSubmit={createMutex}
                >
                    <div>
                        <div className="nova-sync-eyebrow">
                            MUTEX CREATION
                        </div>

                        <h2>
                            Create Mutex
                        </h2>
                    </div>

                    <div className="nova-sync-form-row">
                        <label>
                            MUTEX ID

                            <input
                                value={mutexId}
                                onChange={(event) =>
                                    setMutexId(
                                        event.target.value
                                    )
                                }
                                placeholder="mutex-1"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={
                                actionLoading ===
                                "create-mutex"
                            }
                        >
                            {actionLoading ===
                                "create-mutex"
                                ? "Creating..."
                                : "Create"}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setShowMutexForm(false)
                            }
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {showSemaphoreForm && (
                <form
                    className="nova-sync-create-panel"
                    onSubmit={createSemaphore}
                >
                    <div>
                        <div className="nova-sync-eyebrow">
                            SEMAPHORE CREATION
                        </div>

                        <h2>
                            Create Semaphore
                        </h2>
                    </div>

                    <div className="nova-sync-form-row">
                        <label>
                            SEMAPHORE ID

                            <input
                                value={semaphoreId}
                                onChange={(event) =>
                                    setSemaphoreId(
                                        event.target.value
                                    )
                                }
                                placeholder="sem-1"
                                required
                            />
                        </label>

                        <label>
                            INITIAL COUNT

                            <input
                                type="number"
                                min="0"
                                value={semaphoreCount}
                                onChange={(event) =>
                                    setSemaphoreCount(
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={
                                actionLoading ===
                                "create-semaphore"
                            }
                        >
                            {actionLoading ===
                                "create-semaphore"
                                ? "Creating..."
                                : "Create"}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setShowSemaphoreForm(
                                    false
                                )
                            }
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="nova-sync-stats">
                <div className="nova-sync-stat">
                    <span>
                        MUTEXES
                    </span>

                    <strong>
                        {stats.mutexCount ?? 0}
                    </strong>
                </div>

                <div className="nova-sync-stat">
                    <span>
                        LOCKED
                    </span>

                    <strong>
                        {stats.lockedMutexes ?? 0}
                    </strong>
                </div>

                <div className="nova-sync-stat">
                    <span>
                        MUTEX WAITING
                    </span>

                    <strong>
                        {stats.mutexWaitingProcesses ??
                            0}
                    </strong>
                </div>

                <div className="nova-sync-stat">
                    <span>
                        SEMAPHORES
                    </span>

                    <strong>
                        {stats.semaphoreCount ?? 0}
                    </strong>
                </div>

                <div className="nova-sync-stat">
                    <span>
                        SEMAPHORE WAITING
                    </span>

                    <strong>
                        {stats.semaphoreWaitingProcesses ??
                            0}
                    </strong>
                </div>
            </div>

            <div className="nova-sync-control-panel">
                <div>
                    <div className="nova-sync-eyebrow">
                        PROCESS CONTROL
                    </div>

                    <h2>
                        Synchronization Actor
                    </h2>

                    <p>
                        Specify the PID used when
                        acquiring or waiting on a
                        synchronization primitive.
                    </p>
                </div>

                <label>
                    PROCESS ID

                    <input
                        value={pid}
                        onChange={(event) =>
                            setPid(
                                event.target.value
                            )
                        }
                        placeholder="nova-1000"
                    />
                </label>
            </div>

            <div className="nova-sync-panel">
                <div className="nova-sync-panel-header">
                    <div>
                        <h2>
                            Mutexes
                        </h2>

                        <p>
                            Mutual exclusion locks
                            protecting critical sections.
                        </p>
                    </div>

                    <span>
                        {data.mutexes?.length ?? 0} total
                    </span>
                </div>

                {data.mutexes?.length ? (
                    <div className="nova-sync-table-wrap">
                        <table className="nova-sync-table">
                            <thead>
                                <tr>
                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        STATUS
                                    </th>

                                    <th>
                                        OWNER
                                    </th>

                                    <th>
                                        WAITING
                                    </th>

                                    <th>
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.mutexes.map(
                                    (mutex) => {
                                        const id =
                                            getMutexId(
                                                mutex
                                            );

                                        const locked =
                                            getMutexLocked(
                                                mutex
                                            );

                                        return (
                                            <tr
                                                key={id}
                                            >
                                                <td className="nova-sync-mono">
                                                    {id}
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            `nova-sync-state ${locked
                                                                ? "locked"
                                                                : "available"
                                                            }`
                                                        }
                                                    >
                                                        <i />
                                                        {locked
                                                            ? "LOCKED"
                                                            : "AVAILABLE"}
                                                    </span>
                                                </td>

                                                <td className="nova-sync-mono">
                                                    {getMutexOwner(
                                                        mutex
                                                    )}
                                                </td>

                                                <td className="nova-sync-mono">
                                                    {getMutexWaiting(
                                                        mutex
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="nova-sync-actions">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                actionLoading !==
                                                                null
                                                            }
                                                            onClick={() =>
                                                                request(
                                                                    `acquire-${id}`,
                                                                    `/mutex/${encodeURIComponent(
                                                                        id
                                                                    )}/acquire`,
                                                                    {
                                                                        body: JSON.stringify(
                                                                            {
                                                                                pid
                                                                            }
                                                                        )
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            {actionLoading ===
                                                                `acquire-${id}`
                                                                ? "..."
                                                                : "Acquire"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                actionLoading !==
                                                                null
                                                            }
                                                            onClick={() =>
                                                                request(
                                                                    `release-${id}`,
                                                                    `/mutex/${encodeURIComponent(
                                                                        id
                                                                    )}/release`,
                                                                    {
                                                                        body: JSON.stringify(
                                                                            {
                                                                                pid
                                                                            }
                                                                        )
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            {actionLoading ===
                                                                `release-${id}`
                                                                ? "..."
                                                                : "Release"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="nova-sync-empty">
                        No mutexes created.
                    </div>
                )}
            </div>

            <div className="nova-sync-panel">
                <div className="nova-sync-panel-header">
                    <div>
                        <h2>
                            Semaphores
                        </h2>

                        <p>
                            Counting synchronization
                            primitives controlling resource
                            availability.
                        </p>
                    </div>

                    <span>
                        {data.semaphores?.length ?? 0} total
                    </span>
                </div>

                {data.semaphores?.length ? (
                    <div className="nova-sync-table-wrap">
                        <table className="nova-sync-table">
                            <thead>
                                <tr>
                                    <th>
                                        ID
                                    </th>

                                    <th>
                                        COUNT
                                    </th>

                                    <th>
                                        WAITING
                                    </th>

                                    <th>
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.semaphores.map(
                                    (semaphore) => {
                                        const id =
                                            getSemaphoreId(
                                                semaphore
                                            );

                                        return (
                                            <tr
                                                key={id}
                                            >
                                                <td className="nova-sync-mono">
                                                    {id}
                                                </td>

                                                <td>
                                                    <span className="nova-sync-count">
                                                        {getSemaphoreCount(
                                                            semaphore
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="nova-sync-mono">
                                                    {getSemaphoreWaiting(
                                                        semaphore
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="nova-sync-actions">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                actionLoading !==
                                                                null
                                                            }
                                                            onClick={() =>
                                                                request(
                                                                    `wait-${id}`,
                                                                    `/semaphore/${encodeURIComponent(
                                                                        id
                                                                    )}/wait`,
                                                                    {
                                                                        body: JSON.stringify(
                                                                            {
                                                                                pid
                                                                            }
                                                                        )
                                                                    }
                                                                )
                                                            }
                                                        >
                                                            {actionLoading ===
                                                                `wait-${id}`
                                                                ? "..."
                                                                : "Wait (P)"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                actionLoading !==
                                                                null
                                                            }
                                                            onClick={() =>
                                                                request(
                                                                    `signal-${id}`,
                                                                    `/semaphore/${encodeURIComponent(
                                                                        id
                                                                    )}/signal`
                                                                )
                                                            }
                                                        >
                                                            {actionLoading ===
                                                                `signal-${id}`
                                                                ? "..."
                                                                : "Signal (V)"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="nova-sync-empty">
                        No semaphores created.
                    </div>
                )}
            </div>

            <div className="nova-sync-footer">
                <span>
                    {lastUpdated
                        ? `Updated ${lastUpdated.toLocaleTimeString(
                            [],
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                            }
                        )}`
                        : "Waiting for data"}
                </span>

                <span className="nova-sync-live">
                    <span />
                    KERNEL SYNCHRONIZATION
                </span>
            </div>
        </div>
    );
}

export default Synchronization;