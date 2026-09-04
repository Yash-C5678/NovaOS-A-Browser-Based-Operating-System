import { useCallback, useEffect, useMemo, useState } from "react";
import NovaIcon from "../ui/NovaIcon";

const API_BASE = "http://localhost:5000/api/io";

const EMPTY_STATS = {
    currentTime: 0,
    queuedCount: 0,
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0
};

const EMPTY_DEVICES = {
    totalDevices: 0,
    availableDevices: 0,
    busyDevices: 0,
    offlineDevices: 0,
    devices: []
};

function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "0";
    }

    return value.toLocaleString();
}

function getRequestId(request) {
    return request?.id ?? request?.requestId ?? "—";
}

function getPid(request) {
    return request?.pid ?? request?.processId ?? "—";
}

function getDeviceId(request) {
    return request?.deviceId ?? request?.device ?? "—";
}

function getOperation(request) {
    return String(request?.operation ?? "—").toUpperCase();
}

function getStatus(request, fallback = "UNKNOWN") {
    return String(request?.state ?? request?.status ?? fallback).toUpperCase();
}

function getSize(request) {
    return request?.size ?? request?.dataSize ?? 0;
}

function getDuration(request) {
    return request?.duration ?? request?.totalDuration ?? 0;
}

function getRemaining(request) {
    if (typeof request?.remainingTime === "number") {
        return request.remainingTime;
    }

    if (
        typeof request?.duration === "number" &&
        typeof request?.elapsedTime === "number"
    ) {
        return Math.max(
            0,
            request.duration - request.elapsedTime
        );
    }

    return 0;
}

function statusClass(status) {
    const normalized = String(status).toLowerCase();

    if (normalized.includes("active")) {
        return "active";
    }

    if (normalized.includes("complete")) {
        return "completed";
    }

    if (normalized.includes("cancel")) {
        return "cancelled";
    }

    if (normalized.includes("queue")) {
        return "queued";
    }

    return "unknown";
}

function DeviceCard({ device }) {
    const available =
        device?.available ??
        device?.isAvailable ??
        device?.status === "AVAILABLE";

    const status = String(
        device?.status ??
        (available ? "AVAILABLE" : "BUSY")
    ).toUpperCase();

    const normalizedStatus = status.toLowerCase();

    return (
        <div className="nova-io-device-card">
            <div className="nova-io-device-icon">
                <NovaIcon
                    name="io"
                    size={19}
                />
            </div>

            <div className="nova-io-device-info">
                <strong>
                    {device?.name ??
                        device?.id ??
                        "Unknown Device"}
                </strong>

                <span>
                    {device?.id ??
                        device?.deviceId ??
                        "Device"}
                </span>
            </div>

            <span
                className={`nova-io-device-status ${normalizedStatus}`}
            >
                <i />
                {status}
            </span>
        </div>
    );
}

function RequestRow({
    request,
    fallbackStatus,
    onExecute,
    onCancel,
    actionLoading
}) {
    const status = getStatus(
        request,
        fallbackStatus
    );

    const normalizedStatus =
        statusClass(status);

    const active =
        normalizedStatus === "active";

    const queued =
        normalizedStatus === "queued";

    return (
        <tr>
            <td className="nova-io-mono">
                {getRequestId(request)}
            </td>

            <td className="nova-io-mono">
                {getPid(request)}
            </td>

            <td>
                {getDeviceId(request)}
            </td>

            <td>
                <span
                    className={`nova-io-operation ${getOperation(
                        request
                    ).toLowerCase()}`}
                >
                    {getOperation(request)}
                </span>
            </td>

            <td className="nova-io-mono">
                {formatNumber(getSize(request))}
            </td>

            <td className="nova-io-mono">
                {formatNumber(getDuration(request))}
            </td>

            <td className="nova-io-mono">
                {active
                    ? formatNumber(
                        getRemaining(request)
                    )
                    : "—"}
            </td>

            <td>
                <span
                    className={`nova-io-status ${normalizedStatus}`}
                >
                    <i />
                    {status}
                </span>
            </td>

            <td>
                <div className="nova-io-row-actions">
                    {active && (
                        <button
                            type="button"
                            className="nova-io-action execute"
                            disabled={actionLoading}
                            onClick={() =>
                                onExecute(
                                    getRequestId(request)
                                )
                            }
                        >
                            Execute
                        </button>
                    )}

                    {(queued || active) && (
                        <button
                            type="button"
                            className="nova-io-action cancel"
                            disabled={actionLoading}
                            onClick={() =>
                                onCancel(
                                    getRequestId(request)
                                )
                            }
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function RequestTable({
    title,
    icon,
    requests,
    fallbackStatus,
    emptyText,
    onExecute,
    onCancel,
    actionLoading
}) {
    return (
        <section className="nova-io-panel">
            <div className="nova-io-panel-header">
                <div className="nova-io-panel-heading">
                    <span className="nova-io-section-icon">
                        <NovaIcon
                            name={icon}
                            size={17}
                        />
                    </span>

                    <div>
                        <h2>{title}</h2>
                        <p>
                            {formatNumber(
                                requests.length
                            )} request
                            {requests.length === 1
                                ? ""
                                : "s"}
                        </p>
                    </div>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="nova-io-empty">
                    <NovaIcon
                        name="overview"
                        size={20}
                    />

                    <span>{emptyText}</span>
                </div>
            ) : (
                <div className="nova-io-table-wrap">
                    <table className="nova-io-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>PID</th>
                                <th>DEVICE</th>
                                <th>OPERATION</th>
                                <th>SIZE</th>
                                <th>DURATION</th>
                                <th>REMAINING</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>

                        <tbody>
                            {requests.map(
                                (request, index) => (
                                    <RequestRow
                                        key={
                                            getRequestId(
                                                request
                                            ) !== "—"
                                                ? getRequestId(
                                                    request
                                                )
                                                : index
                                        }
                                        request={request}
                                        fallbackStatus={
                                            fallbackStatus
                                        }
                                        onExecute={
                                            onExecute
                                        }
                                        onCancel={
                                            onCancel
                                        }
                                        actionLoading={
                                            actionLoading
                                        }
                                    />
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export default function IOManager() {
    const [stats, setStats] =
        useState(EMPTY_STATS);

    const [devices, setDevices] =
        useState(EMPTY_DEVICES);

    const [active, setActive] =
        useState([]);

    const [queued, setQueued] =
        useState([]);

    const [completed, setCompleted] =
        useState([]);

    const [cancelled, setCancelled] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [actionLoading, setActionLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [lastUpdated, setLastUpdated] =
        useState(null);

    const fetchJSON = useCallback(
        async (path) => {
            const response =
                await fetch(`${API_BASE}${path}`);

            const payload =
                await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload?.error ??
                    `Request failed: ${response.status}`
                );
            }

            return payload.data;
        },
        []
    );

    const refresh = useCallback(
        async (showLoading = true) => {
            if (showLoading) {
                setLoading(true);
            }

            setError("");

            try {
                const [
                    statistics,
                    deviceStatistics,
                    activeRequests,
                    queuedRequests,
                    completedRequests,
                    cancelledRequests
                ] = await Promise.all([
                    fetchJSON(""),
                    fetchJSON("/devices"),
                    fetchJSON("/active"),
                    fetchJSON("/queued"),
                    fetchJSON("/completed"),
                    fetchJSON("/cancelled")
                ]);

                setStats({
                    ...EMPTY_STATS,
                    ...(statistics ?? {})
                });

                setDevices({
                    ...EMPTY_DEVICES,
                    ...(deviceStatistics ?? {})
                });

                setActive(
                    Array.isArray(activeRequests)
                        ? activeRequests
                        : []
                );

                setQueued(
                    Array.isArray(queuedRequests)
                        ? queuedRequests
                        : []
                );

                setCompleted(
                    Array.isArray(completedRequests)
                        ? completedRequests
                        : []
                );

                setCancelled(
                    Array.isArray(cancelledRequests)
                        ? cancelledRequests
                        : []
                );

                setLastUpdated(
                    new Date()
                );
            } catch (err) {
                setError(
                    err?.message ??
                    "Unable to load I/O state."
                );
            } finally {
                setLoading(false);
            }
        },
        [fetchJSON]
    );

    useEffect(() => {
        refresh();

        const interval =
            window.setInterval(() => {
                refresh(false);
            }, 1000);

        return () =>
            window.clearInterval(
                interval
            );
    }, [refresh]);

    const executeRequest = useCallback(
        async (requestId) => {
            if (!requestId || requestId === "—") {
                return;
            }

            setActionLoading(true);
            setError("");

            try {
                const response =
                    await fetch(
                        `${API_BASE}/execute/${encodeURIComponent(
                            requestId
                        )}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );

                const payload =
                    await response.json();

                if (
                    !response.ok ||
                    !payload.success
                ) {
                    throw new Error(
                        payload?.error ??
                        "Unable to execute I/O request."
                    );
                }

                await refresh(false);
            } catch (err) {
                setError(
                    err?.message ??
                    "Unable to execute I/O request."
                );
            } finally {
                setActionLoading(false);
            }
        },
        [refresh]
    );

    const cancelRequest = useCallback(
        async (requestId) => {
            if (!requestId || requestId === "—") {
                return;
            }

            setActionLoading(true);
            setError("");

            try {
                const response =
                    await fetch(
                        `${API_BASE}/cancel/${encodeURIComponent(
                            requestId
                        )}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );

                const payload =
                    await response.json();

                if (
                    !response.ok ||
                    !payload.success
                ) {
                    throw new Error(
                        payload?.error ??
                        "Unable to cancel I/O request."
                    );
                }

                await refresh(false);
            } catch (err) {
                setError(
                    err?.message ??
                    "Unable to cancel I/O request."
                );
            } finally {
                setActionLoading(false);
            }
        },
        [refresh]
    );

    const deviceList = useMemo(() => {
        if (
            Array.isArray(
                devices.devices
            )
        ) {
            return devices.devices;
        }

        if (
            Array.isArray(
                devices.deviceList
            )
        ) {
            return devices.deviceList;
        }

        return [];
    }, [devices]);

    const totalRequests =
        active.length +
        queued.length +
        completed.length +
        cancelled.length;

    const utilization =
        devices.totalDevices > 0
            ? Math.round(
                (devices.busyDevices /
                    devices.totalDevices) *
                100
            )
            : 0;

    return (
        <div className="nova-io-manager">
            <header className="nova-io-header">
                <div className="nova-io-title-block">
                    <div className="nova-io-eyebrow">
                        NOVAOS / I-O SUBSYSTEM
                    </div>

                    <h1>
                        I/O Manager
                    </h1>

                    <p>
                        Monitor devices, I/O requests,
                        queue state, and execution
                        activity in real time.
                    </p>
                </div>

                <div className="nova-io-header-actions">
                    <div className="nova-io-live">
                        <i />
                        LIVE
                    </div>

                    <button
                        type="button"
                        className="nova-io-refresh"
                        onClick={() =>
                            refresh()
                        }
                        disabled={loading}
                    >
                        <NovaIcon
                            name="overview"
                            size={15}
                        />
                        Refresh
                    </button>
                </div>
            </header>

            {error && (
                <div className="nova-io-error">
                    <NovaIcon
                        name="deadlock"
                        size={17}
                    />

                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() =>
                            refresh()
                        }
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="nova-io-stats">
                <div className="nova-io-stat-card">
                    <div className="nova-io-stat-icon">
                        <NovaIcon
                            name="io"
                            size={18}
                        />
                    </div>

                    <span>SIMULATION TIME</span>

                    <strong>
                        {formatNumber(
                            stats.currentTime
                        )}
                    </strong>
                </div>

                <div className="nova-io-stat-card">
                    <div className="nova-io-stat-icon">
                        <NovaIcon
                            name="processes"
                            size={18}
                        />
                    </div>

                    <span>QUEUED</span>

                    <strong>
                        {formatNumber(
                            queued.length
                        )}
                    </strong>
                </div>

                <div className="nova-io-stat-card">
                    <div className="nova-io-stat-icon">
                        <NovaIcon
                            name="scheduler"
                            size={18}
                        />
                    </div>

                    <span>ACTIVE</span>

                    <strong>
                        {formatNumber(
                            active.length
                        )}
                    </strong>
                </div>

                <div className="nova-io-stat-card">
                    <div className="nova-io-stat-icon">
                        <NovaIcon
                            name="overview"
                            size={18}
                        />
                    </div>

                    <span>COMPLETED</span>

                    <strong>
                        {formatNumber(
                            completed.length
                        )}
                    </strong>
                </div>

                <div className="nova-io-stat-card">
                    <div className="nova-io-stat-icon">
                        <NovaIcon
                            name="close"
                            size={18}
                        />
                    </div>

                    <span>CANCELLED</span>

                    <strong>
                        {formatNumber(
                            cancelled.length
                        )}
                    </strong>
                </div>
            </section>

            <section className="nova-io-panel">
                <div className="nova-io-panel-header">
                    <div className="nova-io-panel-heading">
                        <span className="nova-io-section-icon">
                            <NovaIcon
                                name="io"
                                size={17}
                            />
                        </span>

                        <div>
                            <h2>
                                Device Status
                            </h2>

                            <p>
                                Physical device state
                                reported by the NovaOS
                                device manager.
                            </p>
                        </div>
                    </div>

                    <div className="nova-io-device-summary">
                        <strong>
                            {formatNumber(
                                devices.availableDevices
                            )}
                            /
                            {formatNumber(
                                devices.totalDevices
                            )}
                        </strong>

                        <span>
                            AVAILABLE
                        </span>
                    </div>
                </div>

                <div className="nova-io-device-grid">
                    {deviceList.length ===
                        0 ? (
                        <div className="nova-io-empty">
                            <NovaIcon
                                name="io"
                                size={20}
                            />

                            <span>
                                {loading
                                    ? "Loading devices..."
                                    : "No device data available."}
                            </span>
                        </div>
                    ) : (
                        deviceList.map(
                            (device, index) => (
                                <DeviceCard
                                    key={
                                        device?.id ??
                                        device?.deviceId ??
                                        index
                                    }
                                    device={
                                        device
                                    }
                                />
                            )
                        )
                    )}
                </div>

                <div className="nova-io-device-footer">
                    <span>
                        Device utilization
                    </span>

                    <strong>
                        {utilization}%
                    </strong>

                    <span>
                        {formatNumber(
                            devices.busyDevices
                        )}{" "}
                        busy /{" "}
                        {formatNumber(
                            devices.totalDevices
                        )}{" "}
                        total
                    </span>
                </div>
            </section>

            <RequestTable
                title="Active Requests"
                icon="scheduler"
                requests={active}
                fallbackStatus="ACTIVE"
                emptyText="No I/O requests are currently active."
                onExecute={executeRequest}
                onCancel={cancelRequest}
                actionLoading={actionLoading}
            />

            <RequestTable
                title="Queued Requests"
                icon="processes"
                requests={queued}
                fallbackStatus="QUEUED"
                emptyText="The I/O queue is currently empty."
                onExecute={executeRequest}
                onCancel={cancelRequest}
                actionLoading={actionLoading}
            />

            <RequestTable
                title="Completed Requests"
                icon="overview"
                requests={completed}
                fallbackStatus="COMPLETED"
                emptyText="No I/O requests have completed yet."
                onExecute={executeRequest}
                onCancel={cancelRequest}
                actionLoading={actionLoading}
            />

            <RequestTable
                title="Cancelled Requests"
                icon="close"
                requests={cancelled}
                fallbackStatus="CANCELLED"
                emptyText="No I/O requests have been cancelled."
                onExecute={executeRequest}
                onCancel={cancelRequest}
                actionLoading={actionLoading}
            />

            <footer className="nova-io-footer">
                <span>
                    Total tracked requests
                </span>

                <strong>
                    {formatNumber(
                        totalRequests
                    )}
                </strong>

                <span>
                    ·
                </span>

                <span>
                    Last updated{" "}
                    {lastUpdated
                        ? lastUpdated.toLocaleTimeString()
                        : "—"}
                </span>
            </footer>
        </div>
    );
}