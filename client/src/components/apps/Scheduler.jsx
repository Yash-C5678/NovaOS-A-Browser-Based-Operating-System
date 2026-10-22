import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000/api";

const DEFAULT_PROCESSES = [
    { pid: "P1", arrivalTime: 0, burstTime: 5, priority: 2 },
    { pid: "P2", arrivalTime: 1, burstTime: 3, priority: 1 },
    { pid: "P3", arrivalTime: 2, burstTime: 2, priority: 3 }
];

const ALGORITHM_INFO = {
    fcfs: {
        name: "FCFS",
        fullName: "First Come First Served",
        type: "Non-preemptive",
        description:
            "Processes are executed in the order in which they arrive. Once a process gets the CPU, it keeps the CPU until its burst completes.",
        rule:
            "Choose the ready process with the earliest arrival time.",
        advantage:
            "Simple and fair according to arrival order.",
        drawback:
            "Can produce large waiting times when a long process arrives before shorter processes."
    },
    sjf: {
        name: "SJF",
        fullName: "Shortest Job First",
        type: "Non-preemptive",
        description:
            "Among the processes that have arrived, the process with the smallest CPU burst is selected.",
        rule:
            "Choose the ready process with the shortest burst time.",
        advantage:
            "Can minimize average waiting time when burst times are known.",
        drawback:
            "Long processes may experience starvation."
    },
    srtf: {
        name: "SRTF",
        fullName: "Shortest Remaining Time First",
        type: "Preemptive",
        description:
            "The currently running process can be preempted when another ready process has a shorter remaining CPU time.",
        rule:
            "Run the ready process with the smallest remaining burst time.",
        advantage:
            "Usually gives low average waiting and response times.",
        drawback:
            "Frequent context switches add overhead."
    },
    "round-robin": {
        name: "Round Robin",
        fullName: "Round Robin",
        type: "Preemptive",
        description:
            "Each ready process receives the CPU for a fixed time quantum. Processes that are not finished return to the ready queue.",
        rule:
            "Run the next ready process for at most one time quantum.",
        advantage:
            "Good responsiveness and fairness for interactive workloads.",
        drawback:
            "Performance depends heavily on the selected time quantum."
    },
    priority: {
        name: "Priority",
        fullName: "Priority Scheduling",
        type: "Non-preemptive",
        description:
            "The ready process with the highest scheduling priority is selected. In this simulator, a lower numerical priority value represents a higher priority.",
        rule:
            "Choose the ready process with the highest priority.",
        advantage:
            "Important processes can receive CPU service earlier.",
        drawback:
            "Low-priority processes may starve."
    },
    "preemptive-priority": {
        name: "Preemptive Priority",
        fullName: "Preemptive Priority Scheduling",
        type: "Preemptive",
        description:
            "A newly arrived higher-priority process can preempt the process currently using the CPU.",
        rule:
            "Run the ready process with the highest priority and preempt when necessary.",
        advantage:
            "High-priority work can respond immediately.",
        drawback:
            "Can cause starvation and additional context switches."
    }
};

function normalizeAlgorithmId(value) {
    const valueString = String(value ?? "").toLowerCase().trim();

    if (valueString === "rr" || valueString === "round robin") {
        return "round-robin";
    }

    if (
        valueString === "preemptive priority" ||
        valueString === "preemptive-priority"
    ) {
        return "preemptive-priority";
    }

    return valueString;
}

function getAlgorithmInfo(algorithm) {
    return (
        ALGORITHM_INFO[normalizeAlgorithmId(algorithm)] ??
        ALGORITHM_INFO.fcfs
    );
}

function getProcessLabel(process, index) {
    return (
        process?.displayPid ??
        process?.pid ??
        process?.processId ??
        `P${index + 1}`
    );
}

function getNumber(...values) {
    for (const value of values) {
        const number = Number(value);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return 0;
}

function normalizeTimeline(timeline = [], processes = []) {
    if (!Array.isArray(timeline)) {
        return [];
    }

    const processMap = new Map();

    processes.forEach((process, index) => {
        const internalPid =
            process?.pid ??
            process?.processId ??
            process?.id;

        const displayPid = getProcessLabel(process, index);

        if (internalPid !== undefined) {
            processMap.set(String(internalPid), displayPid);
        }

        if (process?.displayPid !== undefined) {
            processMap.set(
                String(process.displayPid),
                displayPid
            );
        }
    });

    return timeline
        .map((entry, index) => {
            if (!entry) {
                return null;
            }

            const rawPid =
                entry.pid ??
                entry.processId ??
                entry.id ??
                entry.name ??
                entry.process;

            let label =
                processMap.get(String(rawPid)) ??
                rawPid ??
                `P${index + 1}`;

            if (
                String(label).toLowerCase().startsWith("nova-") &&
                processes[index]
            ) {
                label = getProcessLabel(processes[index], index);
            }

            const start = getNumber(
                entry.start,
                entry.startTime,
                entry.from,
                entry.begin
            );

            const end = getNumber(
                entry.end,
                entry.endTime,
                entry.to,
                entry.finish
            );

            const duration = getNumber(
                entry.duration,
                end - start
            );

            return {
                ...entry,
                label: String(label),
                start,
                end: end >= start ? end : start + duration,
                duration:
                    duration > 0
                        ? duration
                        : Math.max(0, end - start)
            };
        })
        .filter(Boolean);
}

function buildFallbackTimeline(processes = []) {
    let current = 0;

    return processes.map((process, index) => {
        const arrival = getNumber(
            process.arrivalTime,
            process.arrival,
            process.at
        );

        const burst = getNumber(
            process.burstTime,
            process.burst
        );

        if (arrival > current) {
            current = arrival;
        }

        const start = current;
        const end = start + burst;

        current = end;

        return {
            label: getProcessLabel(process, index),
            start,
            end,
            duration: burst
        };
    });
}

function buildGanttSegments(timeline, processes) {
    const normalized =
        timeline.length > 0
            ? timeline
            : buildFallbackTimeline(processes);

    const segments = [];
    let previousEnd = 0;

    normalized.forEach((segment) => {
        const start = getNumber(segment.start);
        const end = getNumber(segment.end);

        if (start > previousEnd) {
            segments.push({
                label: "IDLE",
                start: previousEnd,
                end: start,
                duration: start - previousEnd,
                idle: true
            });
        }

        segments.push({
            ...segment,
            start,
            end,
            duration: Math.max(0, end - start),
            idle:
                String(segment.label).toUpperCase() === "IDLE"
        });

        previousEnd = Math.max(previousEnd, end);
    });

    return segments;
}

function getMetric(process, keys, fallback = 0) {
    for (const key of keys) {
        if (
            process &&
            process[key] !== undefined &&
            process[key] !== null
        ) {
            const value = Number(process[key]);

            if (Number.isFinite(value)) {
                return value;
            }
        }
    }

    return fallback;
}

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return Number.isInteger(number)
        ? String(number)
        : number.toFixed(2);
}

function Scheduler() {
    const [algorithms, setAlgorithms] = useState([]);
    const [algorithm, setAlgorithm] = useState("fcfs");
    const [timeQuantum, setTimeQuantum] = useState(2);
    const [processes, setProcesses] =
        useState(DEFAULT_PROCESSES);

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingAlgorithms, setLoadingAlgorithms] =
        useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadAlgorithms() {
            try {
                setLoadingAlgorithms(true);

                const response = await fetch(
                    `${API_BASE}/scheduler/algorithms`
                );

                if (!response.ok) {
                    throw new Error(
                        `Server returned ${response.status}.`
                    );
                }

                const payload = await response.json();

                if (
                    active &&
                    payload.success &&
                    Array.isArray(payload.data)
                ) {
                    setAlgorithms(payload.data);
                }
            } catch (requestError) {
                if (active) {
                    setError(
                        `Unable to load scheduling algorithms: ${requestError.message}`
                    );
                }
            } finally {
                if (active) {
                    setLoadingAlgorithms(false);
                }
            }
        }

        loadAlgorithms();

        return () => {
            active = false;
        };
    }, []);

    const selectedInfo = useMemo(
        () => getAlgorithmInfo(algorithm),
        [algorithm]
    );

    const updateProcess = (index, field, value) => {
        setProcesses((current) =>
            current.map((process, processIndex) =>
                processIndex === index
                    ? {
                          ...process,
                          [field]:
                              field === "pid"
                                  ? value
                                  : Number(value)
                      }
                    : process
            )
        );
    };

    const addProcess = () => {
        setProcesses((current) => [
            ...current,
            {
                pid: `P${current.length + 1}`,
                arrivalTime:
                    current.length > 0
                        ? Math.max(
                              ...current.map((process) =>
                                  Number(
                                      process.arrivalTime
                                  )
                              )
                          ) + 1
                        : 0,
                burstTime: 3,
                priority: current.length + 1
            }
        ]);
    };

    const removeProcess = (index) => {
        setProcesses((current) =>
            current.filter(
                (_, processIndex) =>
                    processIndex !== index
            )
        );
    };

    const clearAll = () => {
        setProcesses([]);
        setResult(null);
        setError("");
    };

    const reset = () => {
        setProcesses(DEFAULT_PROCESSES);
        setAlgorithm("fcfs");
        setTimeQuantum(2);
        setResult(null);
        setError("");
    };

    const runSimulation = async () => {
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const cleanProcesses = processes.map(
                (process, index) => ({
                    pid:
                        String(process.pid || "").trim() ||
                        `P${index + 1}`,
                    arrivalTime: Number(
                        process.arrivalTime
                    ),
                    burstTime: Number(
                        process.burstTime
                    ),
                    priority: Number(process.priority)
                })
            );

            const pidSet = new Set();
            for (const process of cleanProcesses) {
                const lowerPid = process.pid.toLowerCase();
                if (pidSet.has(lowerPid)) {
                    throw new Error(
                        `Process ID '${process.pid}' must be unique.`
                    );
                }
                pidSet.add(lowerPid);

                if (
                    !Number.isInteger(
                        process.arrivalTime
                    ) ||
                    process.arrivalTime < 0
                ) {
                    throw new Error(
                        `${process.pid}: arrival time must be a non-negative integer.`
                    );
                }

                if (
                    !Number.isInteger(
                        process.burstTime
                    ) ||
                    process.burstTime <= 0
                ) {
                    throw new Error(
                        `${process.pid}: burst time must be a positive integer.`
                    );
                }

                if (
                    !Number.isFinite(
                        process.priority
                    )
                ) {
                    throw new Error(
                        `${process.pid}: priority must be a valid number.`
                    );
                }
            }

            if (
                normalizeAlgorithmId(algorithm) ===
                    "round-robin" &&
                (!Number.isInteger(
                    Number(timeQuantum)
                ) ||
                    Number(timeQuantum) <= 0)
            ) {
                throw new Error(
                    "Time quantum must be a positive integer."
                );
            }

            const response = await fetch(
                `${API_BASE}/scheduler/simulate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        algorithm,
                        timeQuantum: Number(
                            timeQuantum
                        ),
                        processes: cleanProcesses
                    })
                }
            );

            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.error ||
                        "Simulation failed."
                );
            }

            setResult(payload.data);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    const resultProcesses = Array.isArray(
        result?.processes
    )
        ? result.processes
        : [];

    const timeline = normalizeTimeline(
        result?.timeline,
        resultProcesses.length > 0
            ? resultProcesses
            : processes
    );

    const ganttSegments = buildGanttSegments(
        timeline,
        resultProcesses.length > 0
            ? resultProcesses
            : processes
    );

    const averages = result?.averages ?? {};
    const statistics = result?.statistics ?? {};

    const averageWaiting = getNumber(
        averages.averageWaitingTime,
        averages.avgWaitingTime,
        averages.waitingTime,
        statistics.averageWaitingTime,
        statistics.avgWaitingTime
    );

    const averageTurnaround = getNumber(
        averages.averageTurnaroundTime,
        averages.avgTurnaroundTime,
        averages.turnaroundTime,
        statistics.averageTurnaroundTime,
        statistics.avgTurnaroundTime
    );

    const averageResponse = getNumber(
        averages.averageResponseTime,
        averages.avgResponseTime,
        averages.responseTime,
        statistics.averageResponseTime,
        statistics.avgResponseTime
    );

    const completionTime = getNumber(
        result?.currentTime,
        result?.completionTime
    );

    const ganttEnd = ganttSegments.length
        ? ganttSegments[ganttSegments.length - 1].end
        : completionTime;

    const preemptionCount = useMemo(() => {
        let count = 0;

        for (
            let index = 1;
            index < ganttSegments.length;
            index += 1
        ) {
            const previous =
                ganttSegments[index - 1];
            const current =
                ganttSegments[index];

            if (
                !previous.idle &&
                !current.idle &&
                previous.label !== current.label
            ) {
                const sameProcessLater = ganttSegments
                    .slice(index + 1)
                    .some(
                        (segment) =>
                            !segment.idle &&
                            segment.label ===
                                previous.label
                    );

                if (sameProcessLater) {
                    count += 1;
                }
            }
        }

        return count;
    }, [ganttSegments]);

    return (
        <div className="nova-scheduler">
            <style>{`
                .nova-scheduler {
                    --scheduler-bg: #07111f;
                    --scheduler-panel: #0b1728;
                    --scheduler-panel-2: #0e1d31;
                    --scheduler-border: rgba(76, 180, 255, 0.18);
                    --scheduler-border-strong: rgba(76, 180, 255, 0.34);
                    --scheduler-blue: #38bdf8;
                    --scheduler-blue-strong: #0ea5e9;
                    --scheduler-cyan: #22d3ee;
                    --scheduler-purple: #8b5cf6;
                    --scheduler-green: #34d399;
                    --scheduler-yellow: #fbbf24;
                    --scheduler-red: #fb7185;
                    --scheduler-text: #e7f3ff;
                    --scheduler-muted: #8ea7bd;
                    --scheduler-dim: #60788f;

                    min-height: 100%;
                    padding: 24px;
                    box-sizing: border-box;
                    color: var(--scheduler-text);
                    background:
                        radial-gradient(
                            circle at 85% 0%,
                            rgba(14, 165, 233, 0.13),
                            transparent 30%
                        ),
                        radial-gradient(
                            circle at 10% 20%,
                            rgba(34, 211, 238, 0.07),
                            transparent 28%
                        ),
                        linear-gradient(
                            135deg,
                            #06101d 0%,
                            #081526 50%,
                            #07111f 100%
                        );
                    font-family:
                        Inter,
                        ui-sans-serif,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                    overflow-y: auto;
                }

                .nova-scheduler *,
                .nova-scheduler *::before,
                .nova-scheduler *::after {
                    box-sizing: border-box;
                }

                .scheduler-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 22px;
                    padding: 22px 24px;
                    border: 1px solid var(--scheduler-border);
                    border-radius: 18px;
                    background:
                        linear-gradient(
                            135deg,
                            rgba(14, 165, 233, 0.12),
                            rgba(11, 23, 40, 0.92)
                        );
                    box-shadow:
                        0 18px 45px rgba(0, 0, 0, 0.24),
                        inset 0 1px 0 rgba(255,255,255,0.035);
                    position: relative;
                    overflow: hidden;
                }

                .scheduler-header::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 2px;
                    background:
                        linear-gradient(
                            90deg,
                            transparent,
                            var(--scheduler-cyan),
                            var(--scheduler-blue),
                            transparent
                        );
                    opacity: 0.8;
                }

                .scheduler-eyebrow {
                    color: var(--scheduler-cyan);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }

                .scheduler-header h1 {
                    margin: 0;
                    font-size: 28px;
                    line-height: 1.1;
                    letter-spacing: -0.035em;
                }

                .scheduler-header p {
                    margin: 8px 0 0;
                    color: var(--scheduler-muted);
                    font-size: 13px;
                }

                .scheduler-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 12px;
                    border-radius: 999px;
                    border: 1px solid var(--scheduler-border);
                    background: rgba(5, 15, 27, 0.72);
                    color: var(--scheduler-muted);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    white-space: nowrap;
                }

                .scheduler-status span {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: var(--scheduler-blue);
                    box-shadow:
                        0 0 12px
                        rgba(56, 189, 248, 0.8);
                }

                .scheduler-status.complete {
                    color: #b9ffe2;
                    border-color:
                        rgba(52, 211, 153, 0.28);
                }

                .scheduler-status.complete span {
                    background: var(--scheduler-green);
                    box-shadow:
                        0 0 12px
                        rgba(52, 211, 153, 0.8);
                }

                .scheduler-error {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    margin-bottom: 18px;
                    padding: 13px 15px;
                    border: 1px solid rgba(251, 113, 133, 0.3);
                    border-left: 3px solid var(--scheduler-red);
                    border-radius: 12px;
                    background: rgba(127, 29, 55, 0.16);
                    color: #ffd6df;
                }

                .scheduler-error strong {
                    font-size: 12px;
                }

                .scheduler-error span {
                    font-size: 12px;
                    color: #f9a8b8;
                }

                .scheduler-panel {
                    margin-bottom: 18px;
                    padding: 20px;
                    border: 1px solid var(--scheduler-border);
                    border-radius: 17px;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(14, 29, 49, 0.94),
                            rgba(8, 18, 32, 0.96)
                        );
                    box-shadow:
                        0 14px 35px rgba(0, 0, 0, 0.18),
                        inset 0 1px 0 rgba(255,255,255,0.025);
                }

                .scheduler-section-heading {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    margin-bottom: 17px;
                }

                .scheduler-section-heading h2 {
                    margin: 0;
                    font-size: 17px;
                    letter-spacing: -0.02em;
                }

                .scheduler-section-heading p {
                    margin: 5px 0 0;
                    color: var(--scheduler-muted);
                    font-size: 12px;
                }

                .scheduler-algorithm-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            auto-fit,
                            minmax(150px, 1fr)
                        );
                    gap: 10px;
                }

                .scheduler-algorithm-card {
                    position: relative;
                    min-height: 112px;
                    padding: 15px;
                    border: 1px solid rgba(91, 150, 191, 0.17);
                    border-radius: 13px;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(15, 31, 51, 0.9),
                            rgba(8, 19, 33, 0.9)
                        );
                    color: var(--scheduler-text);
                    text-align: left;
                    cursor: pointer;
                    transition:
                        transform 0.16s ease,
                        border-color 0.16s ease,
                        box-shadow 0.16s ease,
                        background 0.16s ease;
                }

                .scheduler-algorithm-card:hover {
                    transform: translateY(-2px);
                    border-color:
                        rgba(56, 189, 248, 0.38);
                    box-shadow:
                        0 10px 24px rgba(0,0,0,0.2);
                }

                .scheduler-algorithm-card.selected {
                    border-color:
                        rgba(34, 211, 238, 0.65);
                    background:
                        linear-gradient(
                            145deg,
                            rgba(8, 82, 113, 0.42),
                            rgba(13, 37, 62, 0.94)
                        );
                    box-shadow:
                        0 0 0 1px
                            rgba(34, 211, 238, 0.12),
                        0 12px 28px
                            rgba(14, 165, 233, 0.12);
                }

                .scheduler-algorithm-card.selected::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: 15px;
                    right: 15px;
                    height: 2px;
                    border-radius: 0 0 4px 4px;
                    background:
                        linear-gradient(
                            90deg,
                            var(--scheduler-cyan),
                            var(--scheduler-blue)
                        );
                }

                .scheduler-algorithm-card strong {
                    display: block;
                    font-size: 16px;
                    color: #ffffff;
                    margin-bottom: 5px;
                }

                .scheduler-algorithm-card span {
                    display: block;
                    color: #9db5ca;
                    font-size: 11px;
                    line-height: 1.45;
                }

                .scheduler-algorithm-card small {
                    display: inline-block;
                    margin-top: 10px;
                    padding: 4px 7px;
                    border-radius: 5px;
                    color: #7dd3fc;
                    background: rgba(14, 165, 233, 0.1);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                }

                .scheduler-selected-info {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 14px;
                    padding: 11px 13px;
                    border: 1px solid rgba(56, 189, 248, 0.14);
                    border-radius: 10px;
                    background: rgba(2, 12, 23, 0.55);
                    font-size: 11px;
                    color: var(--scheduler-muted);
                }

                .scheduler-selected-info span:first-child {
                    color: var(--scheduler-cyan);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                }

                .scheduler-selected-info strong {
                    color: #f0f9ff;
                    font-size: 12px;
                }

                .scheduler-quantum {
                    margin-top: 13px;
                    display: flex;
                    justify-content: flex-start;
                }

                .scheduler-quantum label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--scheduler-muted);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                }

                .scheduler-quantum input {
                    width: 85px;
                    padding: 8px 9px;
                    border: 1px solid
                        rgba(56, 189, 248, 0.28);
                    border-radius: 8px;
                    outline: none;
                    background: #071522;
                    color: white;
                    font-weight: 700;
                }

                .scheduler-quantum input:focus {
                    border-color: var(--scheduler-cyan);
                    box-shadow:
                        0 0 0 3px
                        rgba(34, 211, 238, 0.09);
                }

                .scheduler-process-heading {
                    margin-bottom: 14px;
                }

                .scheduler-actions {
                    display: flex;
                    gap: 8px;
                }

                .scheduler-actions button {
                    border: 1px solid
                        rgba(101, 142, 174, 0.25);
                    border-radius: 8px;
                    padding: 8px 11px;
                    background: rgba(10, 24, 40, 0.9);
                    color: #c8d9e8;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    transition:
                        border-color 0.15s ease,
                        background 0.15s ease;
                }

                .scheduler-actions button:hover {
                    border-color:
                        rgba(56, 189, 248, 0.45);
                    background:
                        rgba(14, 165, 233, 0.1);
                    color: #e0f6ff;
                }

                .scheduler-table-wrap {
                    overflow-x: auto;
                    border: 1px solid
                        rgba(83, 132, 165, 0.16);
                    border-radius: 11px;
                }

                .scheduler-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 650px;
                }

                .scheduler-table th {
                    padding: 10px 12px;
                    border-bottom: 1px solid
                        rgba(83, 132, 165, 0.17);
                    background: rgba(2, 12, 22, 0.72);
                    color: #7290a8;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    text-align: left;
                }

                .scheduler-table td {
                    padding: 9px 12px;
                    border-bottom: 1px solid
                        rgba(83, 132, 165, 0.1);
                    color: #c9d9e7;
                    font-size: 11px;
                }

                .scheduler-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .scheduler-table tbody tr:hover {
                    background:
                        rgba(56, 189, 248, 0.035);
                }

                .scheduler-table input {
                    width: 100%;
                    min-width: 70px;
                    padding: 7px 8px;
                    border: 1px solid
                        rgba(83, 132, 165, 0.22);
                    border-radius: 7px;
                    outline: none;
                    background: #081724;
                    color: #e8f5ff;
                    font-size: 11px;
                }

                .scheduler-table input:focus {
                    border-color:
                        rgba(34, 211, 238, 0.58);
                    box-shadow:
                        0 0 0 3px
                        rgba(34, 211, 238, 0.07);
                }

                .scheduler-table .scheduler-pid {
                    color: #7dd3fc;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                }

                .scheduler-delete {
                    width: 28px;
                    height: 28px;
                    border: 1px solid
                        rgba(251, 113, 133, 0.2);
                    border-radius: 7px;
                    background: rgba(127, 29, 55, 0.1);
                    color: #fb7185;
                    font-size: 16px;
                    line-height: 1;
                    cursor: pointer;
                }

                .scheduler-delete:hover:not(:disabled) {
                    background:
                        rgba(251, 113, 133, 0.14);
                    border-color:
                        rgba(251, 113, 133, 0.45);
                }

                .scheduler-delete:disabled {
                    opacity: 0.25;
                    cursor: not-allowed;
                }

                .scheduler-run-row {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 14px;
                }

                .scheduler-run-button {
                    min-width: 155px;
                    padding: 11px 17px;
                    border: 1px solid
                        rgba(34, 211, 238, 0.5);
                    border-radius: 9px;
                    background:
                        linear-gradient(
                            135deg,
                            #0891b2,
                            #0284c7
                        );
                    color: white;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 0.03em;
                    cursor: pointer;
                    box-shadow:
                        0 8px 22px
                        rgba(14, 165, 233, 0.18);
                    transition:
                        transform 0.15s ease,
                        box-shadow 0.15s ease,
                        opacity 0.15s ease;
                }

                .scheduler-run-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow:
                        0 11px 28px
                        rgba(14, 165, 233, 0.27);
                }

                .scheduler-run-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }

                .scheduler-result-badge {
                    padding: 8px 11px;
                    border: 1px solid
                        rgba(52, 211, 153, 0.25);
                    border-radius: 999px;
                    background:
                        rgba(52, 211, 153, 0.08);
                    color: #6ee7b7;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                }

                .scheduler-metric-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            4,
                            minmax(0, 1fr)
                        );
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .scheduler-metric-grid > div {
                    position: relative;
                    min-height: 91px;
                    padding: 14px;
                    border: 1px solid
                        rgba(83, 132, 165, 0.18);
                    border-radius: 12px;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(14, 33, 53, 0.86),
                            rgba(7, 18, 31, 0.88)
                        );
                    overflow: hidden;
                }

                .scheduler-metric-grid > div::after {
                    content: "";
                    position: absolute;
                    width: 70px;
                    height: 70px;
                    right: -32px;
                    bottom: -40px;
                    border-radius: 50%;
                    background:
                        rgba(34, 211, 238, 0.08);
                    filter: blur(5px);
                }

                .scheduler-metric-grid span {
                    display: block;
                    color: #7190a8;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.09em;
                }

                .scheduler-metric-grid strong {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                    margin-top: 10px;
                    color: #f2f9ff;
                    font-size: 20px;
                    line-height: 1;
                }

                .scheduler-metric-grid > div:first-child strong {
                    color: #67e8f9;
                    font-size: 17px;
                }

                .scheduler-metric-grid small {
                    color: #6f8ba1;
                    font-size: 9px;
                    font-weight: 500;
                }

                .scheduler-gantt-section {
                    margin-bottom: 22px;
                }

                .scheduler-subheading {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .scheduler-subheading h3 {
                    margin: 0;
                    font-size: 13px;
                    color: #d9ebf8;
                }

                .scheduler-subheading span {
                    color: #69839a;
                    font-size: 10px;
                }

                .scheduler-gantt {
                    display: flex;
                    min-height: 76px;
                    width: 100%;
                    overflow: hidden;
                    border: 1px solid
                        rgba(83, 132, 165, 0.2);
                    border-radius: 10px;
                    background: #06101b;
                }

                .scheduler-gantt-block {
                    min-width: 4%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                    padding: 8px 5px;
                    border-right: 1px solid
                        rgba(255,255,255,0.13);
                    background:
                        linear-gradient(
                            180deg,
                            rgba(14, 165, 233, 0.82),
                            rgba(8, 90, 130, 0.85)
                        );
                    color: white;
                    overflow: hidden;
                    position: relative;
                }

                .scheduler-gantt-block:nth-child(3n + 2) {
                    background:
                        linear-gradient(
                            180deg,
                            rgba(34, 211, 238, 0.78),
                            rgba(12, 110, 139, 0.84)
                        );
                }

                .scheduler-gantt-block:nth-child(3n + 3) {
                    background:
                        linear-gradient(
                            180deg,
                            rgba(99, 102, 241, 0.78),
                            rgba(67, 56, 142, 0.84)
                        );
                }

                .scheduler-gantt-block.idle {
                    background:
                        repeating-linear-gradient(
                            135deg,
                            #172637 0,
                            #172637 7px,
                            #1c2d40 7px,
                            #1c2d40 14px
                        );
                    color: #7f95a8;
                }

                .scheduler-gantt-block strong {
                    font-size: 11px;
                    white-space: nowrap;
                }

                .scheduler-gantt-block span {
                    font-size: 9px;
                    opacity: 0.8;
                    white-space: nowrap;
                }

                .scheduler-time-axis {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 6px;
                    color: #637c91;
                    font-size: 9px;
                    padding: 0 2px;
                }

                .scheduler-empty {
                    padding: 20px;
                    border: 1px dashed
                        rgba(83, 132, 165, 0.2);
                    border-radius: 10px;
                    color: #728ba0;
                    text-align: center;
                    font-size: 11px;
                }

                .scheduler-results-table {
                    min-width: 800px;
                }

                .scheduler-results-table td {
                    font-variant-numeric: tabular-nums;
                }

                .scheduler-results-table td:nth-child(n + 5) {
                    color: #b8e8ff;
                    font-weight: 700;
                }

                .scheduler-bottom-metrics {
                    display: grid;
                    grid-template-columns:
                        repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-top: 14px;
                }

                .scheduler-bottom-metrics > div {
                    padding: 13px;
                    border: 1px solid
                        rgba(83, 132, 165, 0.15);
                    border-radius: 10px;
                    background: rgba(2, 12, 22, 0.46);
                }

                .scheduler-bottom-metrics span {
                    display: block;
                    margin-bottom: 7px;
                    color: #688399;
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                }

                .scheduler-bottom-metrics strong {
                    color: #dff6ff;
                    font-size: 17px;
                }

                .scheduler-analysis-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .scheduler-analysis-card {
                    padding: 14px;
                    border: 1px solid
                        rgba(83, 132, 165, 0.15);
                    border-radius: 11px;
                    background:
                        linear-gradient(
                            145deg,
                            rgba(12, 28, 46, 0.75),
                            rgba(5, 15, 26, 0.68)
                        );
                }

                .scheduler-analysis-card span {
                    display: block;
                    margin-bottom: 8px;
                    color: var(--scheduler-cyan);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 0.09em;
                }

                .scheduler-analysis-card p {
                    margin: 0;
                    color: #9cb3c6;
                    font-size: 11px;
                    line-height: 1.6;
                }

                .scheduler-observations {
                    display: grid;
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr));
                    gap: 10px;
                    margin-top: 12px;
                }

                .scheduler-observations > div {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 13px;
                    border-left: 2px solid
                        rgba(56, 189, 248, 0.5);
                    border-radius: 0 9px 9px 0;
                    background:
                        rgba(7, 20, 34, 0.68);
                }

                .scheduler-observations strong {
                    color: #d8ecf8;
                    font-size: 11px;
                }

                .scheduler-observations span {
                    color: #7892a7;
                    font-size: 10px;
                    line-height: 1.55;
                }

                .scheduler-observations b {
                    color: #67e8f9;
                }

                @media (max-width: 900px) {
                    .scheduler-metric-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .scheduler-bottom-metrics {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .scheduler-observations {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 680px) {
                    .nova-scheduler {
                        padding: 13px;
                    }

                    .scheduler-header {
                        flex-direction: column;
                        padding: 17px;
                    }

                    .scheduler-section-heading {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .scheduler-actions {
                        width: 100%;
                    }

                    .scheduler-actions button {
                        flex: 1;
                    }

                    .scheduler-panel {
                        padding: 14px;
                    }

                    .scheduler-metric-grid,
                    .scheduler-bottom-metrics,
                    .scheduler-analysis-grid {
                        grid-template-columns: 1fr;
                    }

                    .scheduler-run-row {
                        justify-content: stretch;
                    }

                    .scheduler-run-button {
                        width: 100%;
                    }

                    .scheduler-gantt {
                        min-height: 68px;
                    }
                }
            `}</style>

            <div className="scheduler-header">
                <div>
                    <div className="scheduler-eyebrow">
                        NOVAOS / CPU SUBSYSTEM
                    </div>

                    <h1>CPU Scheduler</h1>

                    <p>
                        Process scheduling and performance
                        simulator
                    </p>
                </div>

                <div
                    className={`scheduler-status ${
                        result ? "complete" : "ready"
                    }`}
                >
                    <span />
                    {result
                        ? "SIMULATION COMPLETE"
                        : "READY"}
                </div>
            </div>

            {error && (
                <div className="scheduler-error">
                    <strong>Simulation Error</strong>
                    <span>{error}</span>
                </div>
            )}

            <section className="scheduler-panel">
                <div className="scheduler-section-heading">
                    <div>
                        <h2>Scheduling Algorithm</h2>
                        <p>
                            Select the CPU scheduling
                            strategy
                        </p>
                    </div>
                </div>

                <div className="scheduler-algorithm-grid">
                    {(
                        algorithms.length > 0
                            ? algorithms
                            : Object.entries(
                                  ALGORITHM_INFO
                              ).map(
                                  ([id, info]) => ({
                                      id,
                                      name: info.name,
                                      preemptive:
                                          info.type ===
                                          "Preemptive"
                                  })
                              )
                    ).map((item) => {
                        const id =
                            normalizeAlgorithmId(
                                item.id
                            );

                        const info =
                            getAlgorithmInfo(id);

                        return (
                            <button
                                key={id}
                                type="button"
                                className={`scheduler-algorithm-card ${
                                    algorithm === id
                                        ? "selected"
                                        : ""
                                }`}
                                onClick={() =>
                                    setAlgorithm(id)
                                }
                            >
                                <strong>
                                    {info.name}
                                </strong>

                                <span>
                                    {info.fullName}
                                </span>

                                <small>
                                    {info.type}
                                </small>
                            </button>
                        );
                    })}
                </div>

                <div className="scheduler-selected-info">
                    <span>SELECTED POLICY</span>

                    <strong>
                        {selectedInfo.name}
                    </strong>

                    <span>
                        {selectedInfo.fullName}
                    </span>

                    <span>•</span>

                    <span>
                        {selectedInfo.type}
                    </span>
                </div>

                {normalizeAlgorithmId(
                    algorithm
                ) === "round-robin" && (
                    <div className="scheduler-quantum">
                        <label>
                            <span>
                                TIME QUANTUM
                            </span>

                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={timeQuantum}
                                onChange={(event) =>
                                    setTimeQuantum(
                                        Number(
                                            event.target
                                                .value
                                        )
                                    )
                                }
                            />
                        </label>
                    </div>
                )}
            </section>

            <section className="scheduler-panel">
                <div className="scheduler-section-heading scheduler-process-heading">
                    <div>
                        <h2>Process Table</h2>
                        <p>
                            Configure process arrival,
                            burst and priority
                        </p>
                    </div>

                    <div className="scheduler-actions">
                        <button
                            type="button"
                            onClick={clearAll}
                        >
                            Clear All
                        </button>

                        <button
                            type="button"
                            onClick={reset}
                        >
                            Reset Defaults
                        </button>

                        <button
                            type="button"
                            onClick={addProcess}
                        >
                            + Add Process
                        </button>
                    </div>
                </div>

                <div className="scheduler-table-wrap">
                    <table className="scheduler-table">
                        <thead>
                            <tr>
                                <th>PID</th>
                                <th>ARRIVAL</th>
                                <th>BURST</th>
                                <th>PRIORITY</th>
                                <th />
                            </tr>
                        </thead>

                        <tbody>
                            {processes.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "var(--scheduler-muted)" }}>
                                        No processes in table. Click <strong>+ Add Process</strong> to add a process.
                                    </td>
                                </tr>
                            ) : (
                                processes.map(
                                    (process, index) => (
                                        <tr
                                            key={`${index}-${process.pid}`}
                                        >
                                            <td>
                                                <input
                                                    value={
                                                        process.pid
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateProcess(
                                                            index,
                                                            "pid",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={
                                                        process.arrivalTime
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateProcess(
                                                            index,
                                                            "arrivalTime",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={
                                                        process.burstTime
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateProcess(
                                                            index,
                                                            "burstTime",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    value={
                                                        process.priority
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateProcess(
                                                            index,
                                                            "priority",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="scheduler-delete"
                                                    disabled={
                                                        processes.length === 0
                                                    }
                                                    onClick={() =>
                                                        removeProcess(
                                                            index
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="scheduler-run-row">
                    <button
                        type="button"
                        className="scheduler-run-button"
                        disabled={
                            loading ||
                            loadingAlgorithms
                        }
                        onClick={
                            runSimulation
                        }
                    >
                        {loading
                            ? "Running..."
                            : `Run ${selectedInfo.name}`}
                    </button>
                </div>
            </section>

            {result && (
                <>
                    <section className="scheduler-panel scheduler-results">
                        <div className="scheduler-section-heading">
                            <div>
                                <div className="scheduler-eyebrow">
                                    SIMULATION OUTPUT
                                </div>

                                <h2>
                                    Scheduling Results
                                </h2>

                                <p>
                                    Execution timeline
                                    and process
                                    performance
                                </p>
                            </div>

                            <div className="scheduler-result-badge">
                                ● COMPLETE
                            </div>
                        </div>

                        <div className="scheduler-metric-grid">
                            <div>
                                <span>ALGORITHM</span>

                                <strong>
                                    {result.algorithm ??
                                        selectedInfo.name}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    COMPLETION
                                </span>

                                <strong>
                                    {formatNumber(
                                        completionTime
                                    )}

                                    <small>
                                        time units
                                    </small>
                                </strong>
                            </div>

                            <div>
                                <span>
                                    AVG WAITING
                                </span>

                                <strong>
                                    {formatNumber(
                                        averageWaiting
                                    )}

                                    <small>
                                        time units
                                    </small>
                                </strong>
                            </div>

                            <div>
                                <span>
                                    AVG TURNAROUND
                                </span>

                                <strong>
                                    {formatNumber(
                                        averageTurnaround
                                    )}

                                    <small>
                                        time units
                                    </small>
                                </strong>
                            </div>
                        </div>

                        <div className="scheduler-gantt-section">
                            <div className="scheduler-subheading">
                                <h3>Gantt Chart</h3>

                                <span>
                                    CPU execution
                                    timeline
                                </span>
                            </div>

                            {ganttSegments.length ===
                            0 ? (
                                <div className="scheduler-empty">
                                    No execution timeline
                                    returned by the
                                    simulator.
                                </div>
                            ) : (
                                <>
                                    <div className="scheduler-gantt">
                                        {ganttSegments.map(
                                            (
                                                segment,
                                                index
                                            ) => {
                                                const total =
                                                    Math.max(
                                                        ganttEnd,
                                                        1
                                                    );

                                                const width =
                                                    (segment.duration /
                                                        total) *
                                                    100;

                                                return (
                                                    <div
                                                        key={`${segment.label}-${segment.start}-${index}`}
                                                        className={`scheduler-gantt-block ${
                                                            segment.idle
                                                                ? "idle"
                                                                : ""
                                                        }`}
                                                        style={{
                                                            width: `${Math.max(
                                                                width,
                                                                4
                                                            )}%`
                                                        }}
                                                        title={`${segment.label}: ${segment.start} → ${segment.end}`}
                                                    >
                                                        <strong>
                                                            {
                                                                segment.label
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                segment.start
                                                            }{" "}
                                                            →
                                                            {
                                                                segment.end
                                                            }
                                                        </span>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>

                                    <div className="scheduler-time-axis">
                                        <span>0</span>

                                        {ganttSegments.map(
                                            (
                                                segment,
                                                index
                                            ) => (
                                                <span
                                                    key={`time-${index}`}
                                                >
                                                    {
                                                        segment.end
                                                    }
                                                </span>
                                            )
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="scheduler-subheading">
                            <h3>
                                Process Performance
                            </h3>

                            <span>
                                Per-process scheduling
                                metrics
                            </span>
                        </div>

                        <div className="scheduler-table-wrap">
                            <table className="scheduler-table scheduler-results-table">
                                <thead>
                                    <tr>
                                        <th>PID</th>
                                        <th>ARRIVAL</th>
                                        <th>BURST</th>
                                        <th>PRIORITY</th>
                                        <th>COMPLETION</th>
                                        <th>TURNAROUND</th>
                                        <th>WAITING</th>
                                        <th>RESPONSE</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {resultProcesses.map(
                                        (
                                            process,
                                            index
                                        ) => {
                                            const original =
                                                processes.find(
                                                    (
                                                        candidate
                                                    ) =>
                                                        String(
                                                            candidate.pid
                                                        ) ===
                                                        String(
                                                            process.displayPid ??
                                                                process.pid
                                                        )
                                                ) ??
                                                processes[
                                                    index
                                                ];

                                            const arrival =
                                                getMetric(
                                                    process,
                                                    [
                                                        "arrivalTime",
                                                        "arrival"
                                                    ],
                                                    getMetric(
                                                        original,
                                                        [
                                                            "arrivalTime"
                                                        ]
                                                    )
                                                );

                                            const burst =
                                                getMetric(
                                                    process,
                                                    [
                                                        "burstTime",
                                                        "burst"
                                                    ],
                                                    getMetric(
                                                        original,
                                                        [
                                                            "burstTime"
                                                        ]
                                                    )
                                                );

                                            const priority =
                                                getMetric(
                                                    process,
                                                    [
                                                        "priority"
                                                    ],
                                                    getMetric(
                                                        original,
                                                        [
                                                            "priority"
                                                        ]
                                                    )
                                                );

                                            const completion =
                                                getMetric(
                                                    process,
                                                    [
                                                        "completionTime",
                                                        "completion"
                                                    ]
                                                );

                                            const turnaround =
                                                getMetric(
                                                    process,
                                                    [
                                                        "turnaroundTime",
                                                        "turnaround"
                                                    ],
                                                    Math.max(
                                                        0,
                                                        completion -
                                                            arrival
                                                    )
                                                );

                                            const waiting =
                                                getMetric(
                                                    process,
                                                    [
                                                        "waitingTime",
                                                        "waiting"
                                                    ],
                                                    Math.max(
                                                        0,
                                                        turnaround -
                                                            burst
                                                    )
                                                );

                                            const response =
                                                getMetric(
                                                    process,
                                                    [
                                                        "responseTime",
                                                        "response"
                                                    ],
                                                    waiting
                                                );

                                            return (
                                                <tr
                                                    key={`${getProcessLabel(
                                                        process,
                                                        index
                                                    )}-${index}`}
                                                >
                                                    <td className="scheduler-pid">
                                                        {getProcessLabel(
                                                            process,
                                                            index
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            arrival
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            burst
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            priority
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            completion
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            turnaround
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            waiting
                                                        )}
                                                    </td>

                                                    <td>
                                                        {formatNumber(
                                                            response
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="scheduler-bottom-metrics">
                            <div>
                                <span>
                                    AVG WAITING TIME
                                </span>

                                <strong>
                                    {formatNumber(
                                        averageWaiting
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    AVG TURNAROUND TIME
                                </span>

                                <strong>
                                    {formatNumber(
                                        averageTurnaround
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    AVG RESPONSE TIME
                                </span>

                                <strong>
                                    {formatNumber(
                                        averageResponse
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>PROCESSES</span>

                                <strong>
                                    {resultProcesses.length ||
                                        processes.length}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="scheduler-panel">
                        <div className="scheduler-section-heading">
                            <div>
                                <h2>
                                    Scheduling Analysis
                                </h2>

                                <p>
                                    Interpretation of the
                                    selected scheduling
                                    policy
                                </p>
                            </div>
                        </div>

                        <div className="scheduler-analysis-grid">
                            <div className="scheduler-analysis-card">
                                <span>
                                    HOW IT WORKS
                                </span>

                                <p>
                                    {
                                        selectedInfo.description
                                    }
                                </p>
                            </div>

                            <div className="scheduler-analysis-card">
                                <span>
                                    SELECTION RULE
                                </span>

                                <p>
                                    {
                                        selectedInfo.rule
                                    }
                                </p>
                            </div>

                            <div className="scheduler-analysis-card">
                                <span>
                                    ADVANTAGE
                                </span>

                                <p>
                                    {
                                        selectedInfo.advantage
                                    }
                                </p>
                            </div>

                            <div className="scheduler-analysis-card">
                                <span>
                                    TRADE-OFF
                                </span>

                                <p>
                                    {
                                        selectedInfo.drawback
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="scheduler-observations">
                            <div>
                                <strong>
                                    CPU Completion
                                </strong>

                                <span>
                                    The simulated CPU
                                    completed all
                                    processes at time{" "}
                                    <b>
                                        {formatNumber(
                                            completionTime
                                        )}
                                    </b>
                                    .
                                </span>
                            </div>

                            <div>
                                <strong>
                                    CPU Idle
                                </strong>

                                <span>
                                    {ganttSegments.some(
                                        (segment) =>
                                            segment.idle
                                    )
                                        ? "The CPU contains one or more idle intervals because no process was ready."
                                        : "The CPU remained continuously occupied after execution began."}
                                </span>
                            </div>

                            <div>
                                <strong>
                                    Preemption
                                </strong>

                                <span>
                                    {selectedInfo.type ===
                                    "Preemptive"
                                        ? preemptionCount >
                                          0
                                            ? `${preemptionCount} scheduling transition${
                                                  preemptionCount ===
                                                  1
                                                      ? ""
                                                      : "s"
                                              } indicate that a previously running process was later resumed.`
                                            : "No clear preemption event was detected in this workload."
                                        : "This algorithm is non-preemptive, so a running process normally keeps the CPU until its burst completes."}
                                </span>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default Scheduler;