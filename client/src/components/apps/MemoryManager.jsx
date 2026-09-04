import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "/api/memory";

const ALGORITHMS = [
    {
        id: "first-fit",
        name: "First Fit"
    },
    {
        id: "best-fit",
        name: "Best Fit"
    },
    {
        id: "worst-fit",
        name: "Worst Fit"
    }
];

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString();
}

function MemoryManager() {
    const [statistics, setStatistics] = useState({});
    const [blocks, setBlocks] = useState([]);
    const [memoryMap, setMemoryMap] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const [pid, setPid] = useState("");
    const [size, setSize] = useState("");
    const [algorithm, setAlgorithm] =
        useState("first-fit");

    const loadMemory = useCallback(async () => {
        try {
            setError("");

            const [
                statisticsResponse,
                blocksResponse,
                mapResponse
            ] = await Promise.all([
                fetch(API_BASE),
                fetch(`${API_BASE}/blocks`),
                fetch(`${API_BASE}/map`)
            ]);

            if (
                !statisticsResponse.ok ||
                !blocksResponse.ok ||
                !mapResponse.ok
            ) {
                throw new Error(
                    "Unable to retrieve memory subsystem data."
                );
            }

            const statisticsResult =
                await statisticsResponse.json();

            const blocksResult =
                await blocksResponse.json();

            const mapResult =
                await mapResponse.json();

            setStatistics(
                statisticsResult?.data ?? {}
            );

            setBlocks(
                Array.isArray(blocksResult?.data)
                    ? blocksResult.data
                    : []
            );

            setMemoryMap(
                Array.isArray(mapResult?.data)
                    ? mapResult.data
                    : []
            );

            const currentAlgorithm =
                statisticsResult?.data?.algorithm;

            if (currentAlgorithm) {
                setAlgorithm(
                    String(currentAlgorithm)
                );
            }

            setLastUpdated(new Date());
        } catch (err) {
            setError(
                err.message ||
                "Unable to load memory information."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMemory();

        const interval = setInterval(
            loadMemory,
            2000
        );

        return () =>
            clearInterval(interval);
    }, [loadMemory]);

    const allocateMemory = async (event) => {
        event.preventDefault();

        if (!pid.trim()) {
            setError(
                "Process ID is required."
            );
            return;
        }

        const requestedSize =
            Number(size);

        if (
            !Number.isFinite(requestedSize) ||
            requestedSize <= 0
        ) {
            setError(
                "Memory size must be greater than zero."
            );
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response =
                await fetch(
                    `${API_BASE}/allocate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            pid: pid.trim(),
                            size: requestedSize
                        })
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
                    "Memory allocation failed."
                );
            }

            setPid("");
            setSize("");

            await loadMemory();
        } catch (err) {
            setError(
                err.message ||
                "Memory allocation failed."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const deallocateMemory = async (
        processId
    ) => {
        if (!processId) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response =
                await fetch(
                    `${API_BASE}/deallocate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            pid: processId
                        })
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
                    "Unable to release memory."
                );
            }

            await loadMemory();
        } catch (err) {
            setError(
                err.message ||
                "Unable to release memory."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const changeAlgorithm = async (
        nextAlgorithm
    ) => {
        try {
            setActionLoading(true);
            setError("");

            const response =
                await fetch(
                    `${API_BASE}/algorithm`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            algorithm:
                                nextAlgorithm
                        })
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
                    "Unable to change allocation algorithm."
                );
            }

            setAlgorithm(
                result.algorithm ||
                nextAlgorithm
            );

            await loadMemory();
        } catch (err) {
            setError(
                err.message ||
                "Unable to change allocation algorithm."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const totalMemory =
        Number(
            statistics.totalMemory ??
            statistics.total ??
            0
        );

    const allocatedMemory =
        Number(
            statistics.allocatedMemory ??
            statistics.allocated ??
            0
        );

    const freeMemory =
        Number(
            statistics.freeMemory ??
            statistics.free ??
            Math.max(
                0,
                totalMemory -
                allocatedMemory
            )
        );

    const utilization =
        totalMemory > 0
            ? (
                allocatedMemory /
                totalMemory
            ) * 100
            : Number(
                statistics.utilization ?? 0
            ) * 100;

    const largestFreeBlock =
        Number(
            statistics.largestFreeBlock ??
            statistics.largestFree ??
            0
        );

    const allocationCount =
        blocks.filter(
            (block) =>
                block.allocated === true ||
                block.free === false ||
                block.status === "allocated"
        ).length;

    const freeBlockCount =
        blocks.length -
        allocationCount;

    const normalizedBlocks =
        useMemo(
            () =>
                blocks.map(
                    (block, index) => {
                        const free =
                            block.free === true ||
                            block.allocated === false ||
                            block.status === "free";

                        const blockStart =
                            block.start ??
                            block.address ??
                            index;

                        const blockSize =
                            Number(
                                block.size ??
                                block.length ??
                                0
                            );

                        return {
                            ...block,
                            free,
                            blockStart,
                            blockSize
                        };
                    }
                ),
            [blocks]
        );

    return (
        <div className="nova-memory-manager">

            <div className="nova-mm-header">

                <div>
                    <div className="nova-mm-eyebrow">
                        MEMORY SUBSYSTEM
                    </div>

                    <h1>
                        Memory Manager
                    </h1>

                    <p>
                        Monitor physical memory,
                        allocations and memory
                        placement algorithms.
                    </p>
                </div>

                <div className="nova-mm-header-actions">

                    <div className="nova-mm-live">
                        <span />
                        LIVE
                    </div>

                    <button
                        type="button"
                        className="nova-mm-refresh"
                        onClick={loadMemory}
                        disabled={loading}
                    >
                        {loading
                            ? "Refreshing..."
                            : "Refresh"}
                    </button>

                </div>

            </div>

            {error && (
                <div className="nova-mm-error">
                    <strong>
                        Memory Manager Error
                    </strong>

                    <span>
                        {error}
                    </span>
                </div>
            )}

            <div className="nova-mm-stats">

                <div className="nova-mm-stat">
                    <span>
                        TOTAL MEMORY
                    </span>

                    <strong>
                        {formatNumber(
                            totalMemory
                        )}
                    </strong>

                    <small>
                        memory units
                    </small>
                </div>

                <div className="nova-mm-stat">
                    <span>
                        ALLOCATED
                    </span>

                    <strong>
                        {formatNumber(
                            allocatedMemory
                        )}
                    </strong>

                    <small>
                        {utilization.toFixed(1)}% used
                    </small>
                </div>

                <div className="nova-mm-stat">
                    <span>
                        FREE
                    </span>

                    <strong>
                        {formatNumber(
                            freeMemory
                        )}
                    </strong>

                    <small>
                        available memory
                    </small>
                </div>

                <div className="nova-mm-stat">
                    <span>
                        LARGEST FREE
                    </span>

                    <strong>
                        {formatNumber(
                            largestFreeBlock
                        )}
                    </strong>

                    <small>
                        largest available block
                    </small>
                </div>

            </div>

            <div className="nova-mm-grid">

                <section className="nova-mm-panel">

                    <div className="nova-mm-panel-header">

                        <div>
                            <h2>
                                Memory Allocation
                            </h2>

                            <p>
                                Allocate memory to a
                                process using the current
                                placement algorithm.
                            </p>
                        </div>

                    </div>

                    <form
                        className="nova-mm-form"
                        onSubmit={
                            allocateMemory
                        }
                    >

                        <label>
                            <span>
                                PROCESS ID
                            </span>

                            <input
                                value={pid}
                                onChange={(event) =>
                                    setPid(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="e.g. P1"
                                disabled={
                                    actionLoading
                                }
                            />
                        </label>

                        <label>
                            <span>
                                SIZE
                            </span>

                            <input
                                type="number"
                                min="1"
                                value={size}
                                onChange={(event) =>
                                    setSize(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="e.g. 128"
                                disabled={
                                    actionLoading
                                }
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={
                                actionLoading
                            }
                        >
                            {actionLoading
                                ? "Working..."
                                : "Allocate Memory"}
                        </button>

                    </form>

                </section>

                <section className="nova-mm-panel">

                    <div className="nova-mm-panel-header">

                        <div>
                            <h2>
                                Allocation Algorithm
                            </h2>

                            <p>
                                Select the strategy used
                                for new memory requests.
                            </p>
                        </div>

                    </div>

                    <div className="nova-mm-algorithms">

                        {ALGORITHMS.map(
                            (item) => (
                                <button
                                    type="button"
                                    key={
                                        item.id
                                    }
                                    className={
                                        String(
                                            algorithm
                                        ).toLowerCase() ===
                                        item.id
                                            ? "active"
                                            : ""
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                    onClick={() =>
                                        changeAlgorithm(
                                            item.id
                                        )
                                    }
                                >
                                    <strong>
                                        {item.name}
                                    </strong>

                                    <span>
                                        {item.id}
                                    </span>
                                </button>
                            )
                        )}

                    </div>

                </section>

            </div>

            <section className="nova-mm-panel">

                <div className="nova-mm-panel-header">

                    <div>
                        <h2>
                            Memory Utilization
                        </h2>

                        <p>
                            Current physical memory
                            consumption.
                        </p>
                    </div>

                    <strong className="nova-mm-percentage">
                        {utilization.toFixed(1)}%
                    </strong>

                </div>

                <div className="nova-mm-progress">

                    <div
                        style={{
                            width: `${Math.max(
                                0,
                                Math.min(
                                    100,
                                    utilization
                                )
                            )}%`
                        }}
                    />

                </div>

                <div className="nova-mm-progress-labels">

                    <span>
                        0
                    </span>

                    <span>
                        {formatNumber(
                            totalMemory
                        )}
                    </span>

                </div>

            </section>

            <section className="nova-mm-panel">

                <div className="nova-mm-panel-header">

                    <div>
                        <h2>
                            Memory Blocks
                        </h2>

                        <p>
                            Physical memory block
                            allocation map.
                        </p>
                    </div>

                    <div className="nova-mm-count">
                        {formatNumber(
                            blocks.length
                        )} blocks
                    </div>

                </div>

                {loading &&
                blocks.length === 0 ? (
                    <div className="nova-mm-empty">
                        <div className="nova-mm-spinner" />

                        <strong>
                            Loading memory map...
                        </strong>

                        <span>
                            Reading memory blocks
                            from the NovaOS kernel.
                        </span>
                    </div>
                ) : normalizedBlocks.length === 0 ? (
                    <div className="nova-mm-empty">

                        <div className="nova-mm-empty-icon">
                            ?
                        </div>

                        <strong>
                            No memory blocks
                        </strong>

                        <span>
                            The memory subsystem has
                            not returned any blocks.
                        </span>

                    </div>
                ) : (
                    <div className="nova-mm-map">

                        {normalizedBlocks.map(
                            (
                                block,
                                index
                            ) => (
                                <div
                                    key={
                                        block.id ??
                                        block.start ??
                                        index
                                    }
                                    className={
                                        block.free
                                            ? "nova-mm-block free"
                                            : "nova-mm-block allocated"
                                    }
                                    title={
                                        block.free
                                            ? `Free block: ${block.blockSize} units`
                                            : `Allocated block: ${block.blockSize} units`
                                    }
                                    style={{
                                        flexGrow:
                                            Math.max(
                                                1,
                                                block.blockSize
                                            )
                                    }}
                                >
                                    {block.blockSize >=
                                        40 && (
                                        <span>
                                            {block.free
                                                ? "FREE"
                                                : block.pid ??
                                                  block.processId ??
                                                  "ALLOCATED"}
                                        </span>
                                    )}
                                </div>
                            )
                        )}

                    </div>
                )}

            </section>

            <section className="nova-mm-panel">

                <div className="nova-mm-panel-header">

                    <div>
                        <h2>
                            Allocation Table
                        </h2>

                        <p>
                            Processes currently holding
                            memory allocations.
                        </p>
                    </div>

                    <div className="nova-mm-count">
                        {formatNumber(
                            allocationCount
                        )} allocated
                    </div>

                </div>

                {normalizedBlocks.length ===
                    0 ? (
                    <div className="nova-mm-empty compact">
                        No allocations available.
                    </div>
                ) : (
                    <div className="nova-mm-table-wrap">

                        <table className="nova-mm-table">

                            <thead>
                                <tr>
                                    <th>
                                        PROCESS
                                    </th>

                                    <th>
                                        START
                                    </th>

                                    <th>
                                        SIZE
                                    </th>

                                    <th>
                                        STATUS
                                    </th>

                                    <th>
                                        ACTION
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {normalizedBlocks.map(
                                    (
                                        block,
                                        index
                                    ) => {

                                        const processId =
                                            block.pid ??
                                            block.processId ??
                                            block.owner ??
                                            "—";

                                        return (
                                            <tr
                                                key={
                                                    block.id ??
                                                    `${processId}-${index}`
                                                }
                                            >

                                                <td className="nova-mm-mono">
                                                    {
                                                        processId
                                                    }
                                                </td>

                                                <td className="nova-mm-mono">
                                                    {
                                                        block.blockStart
                                                    }
                                                </td>

                                                <td className="nova-mm-mono">
                                                    {
                                                        formatNumber(
                                                            block.blockSize
                                                        )
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            block.free
                                                                ? "nova-mm-status free"
                                                                : "nova-mm-status allocated"
                                                        }
                                                    >
                                                        <i />
                                                        {block.free
                                                            ? "FREE"
                                                            : "ALLOCATED"}
                                                    </span>
                                                </td>

                                                <td>

                                                    {!block.free &&
                                                    processId !==
                                                        "—" ? (
                                                        <button
                                                            type="button"
                                                            className="nova-mm-release"
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            onClick={() =>
                                                                deallocateMemory(
                                                                    processId
                                                                )
                                                            }
                                                        >
                                                            Release
                                                        </button>
                                                    ) : (
                                                        <span className="nova-mm-muted">
                                                            —
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

            </section>

            <section className="nova-mm-panel">

                <div className="nova-mm-panel-header">

                    <div>
                        <h2>
                            Memory Map
                        </h2>

                        <p>
                            Raw memory map returned by
                            the NovaOS memory manager.
                        </p>
                    </div>

                    <div className="nova-mm-count">
                        {formatNumber(
                            memoryMap.length
                        )} entries
                    </div>

                </div>

                {memoryMap.length === 0 ? (
                    <div className="nova-mm-empty compact">
                        No memory map entries
                        available.
                    </div>
                ) : (
                    <pre className="nova-mm-map-data">
                        {JSON.stringify(
                            memoryMap,
                            null,
                            2
                        )}
                    </pre>
                )}

            </section>

            <div className="nova-mm-footer">

                <span>
                    Allocation strategy:
                </span>

                <strong>
                    {String(
                        algorithm
                    )}
                </strong>

                <span>
                    ·
                </span>

                <span>
                    {formatNumber(
                        allocationCount
                    )} allocated blocks
                </span>

                <span>
                    ·
                </span>

                <span>
                    {formatNumber(
                        freeBlockCount
                    )} free blocks
                </span>

                <span className="nova-mm-updated">
                    {lastUpdated
                        ? `Updated ${lastUpdated.toLocaleTimeString()}`
                        : "Waiting for data"}
                </span>

            </div>

        </div>
    );
}

export default MemoryManager;
