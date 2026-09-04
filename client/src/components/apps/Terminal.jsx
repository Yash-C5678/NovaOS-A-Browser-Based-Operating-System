import { useEffect, useRef, useState } from "react";

function Terminal() {
    const [history, setHistory] = useState([
        "NovaOS Terminal v1.0.0",
        "Kernel interface initialized.",
        'Type "help" to see available commands.'
    ]);

    const [command, setCommand] = useState("");
    const [busy, setBusy] = useState(false);
    const [cwd, setCwd] = useState("/home/nova");
    const [previousCwd, setPreviousCwd] =
        useState("/home/nova");

    const [commandHistory, setCommandHistory] =
        useState([]);

    const [historyIndex, setHistoryIndex] =
        useState(-1);

    const inputRef = useRef(null);
    const terminalRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop =
                terminalRef.current.scrollHeight;
        }
    }, [history]);

    const addOutput = (lines) => {
        setHistory((current) => [
            ...current,
            ...(Array.isArray(lines)
                ? lines
                : [lines])
        ]);
    };

    const api = async (
        url,
        options = {}
    ) => {
        const response = await fetch(
            url,
            options
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "NovaOS API returned an invalid response."
            );
        }

        if (
            !response.ok ||
            data.success === false
        ) {
            throw new Error(
                data.error ||
                "NovaOS API request failed."
            );
        }

        return data;
    };

    const filesystemApi = async (
        url,
        options = {}
    ) => {
        return api(
            `/api/filesystem${url}`,
            options
        );
    };

    const parseCommand = (raw) => {
        const parts =
            raw.match(
                /"[^"]*"|'[^']*'|\S+/g
            ) || [];

        return parts.map((part) => {
            if (
                part.startsWith('"') &&
                part.endsWith('"')
            ) {
                return part.slice(1, -1);
            }

            if (
                part.startsWith("'") &&
                part.endsWith("'")
            ) {
                return part.slice(1, -1);
            }

            return part;
        });
    };

    const jsonBody = (value) => ({
        method: "POST",
        headers: {
            "Content-Type":
                "application/json"
        },
        body: JSON.stringify(value)
    });

    const formatObject = (value) => {
        if (
            value === null ||
            value === undefined
        ) {
            return "null";
        }

        if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            return String(value);
        }

        return JSON.stringify(
            value,
            null,
            2
        );
    };

    const executeCommand = async (
        inputCommand = command
    ) => {
        const raw =
            inputCommand.trim();

        if (!raw || busy) {
            return;
        }

        setCommand("");
        setHistoryIndex(-1);

        setCommandHistory(
            (current) => [
                ...current,
                raw
            ]
        );

        addOutput(
            `nova@os:${cwd}$ ${raw}`
        );

        const parts =
            parseCommand(raw);

        const name =
            parts[0]?.toLowerCase();

        try {
            setBusy(true);

            switch (name) {
                case "help":
                    addOutput([
                        "",
                        "NovaOS Shell",
                        "",
                        "System:",
                        "  help                         Show this help message",
                        "  clear                        Clear terminal",
                        "  about                        Show NovaOS information",
                        "  status                       Show system status",
                        "  boot                         Boot NovaOS kernel",
                        "  shutdown                     Shutdown NovaOS kernel",
                        "",
                        "Process:",
                        "  ps                           List processes",
                        "  run PID                      Run a process",
                        "  preempt PID                  Preempt a process",
                        "  wait PID                     Put process into waiting state",
                        "  resume PID                   Resume a waiting process",
                        "  kill PID                     Terminate a process",
                        "",
                        "Applications:",
                        "  apps                         List applications",
                        "  open APP                     Launch an application",
                        "  windows                      List windows",
                        "",
                        "Filesystem:",
                        "  pwd                          Show current directory",
                        "  ls [PATH]                    List directory contents",
                        "  cd PATH                      Change directory",
                        "  cd ~                         Go to home directory",
                        "  cd -                         Go to previous directory",
                        "  mkdir PATH                   Create directory",
                        "  touch PATH                   Create file",
                        "  cat PATH                     Read file",
                        "  write PATH TEXT              Write text to file",
                        "  rm PATH                      Remove file/directory",
                        "  rmdir PATH                   Remove an empty directory",
                        "",
                        "Memory:",
                        "  mem                          Show memory statistics",
                        "  mem map                      Show memory map",
                        "  mem blocks                   Show memory blocks",
                        "  mem allocation PID           Show process allocation",
                        "  mem allocate PID SIZE        Allocate memory",
                        "  mem free PID                Release process memory",
                        "  mem algorithm ALGORITHM      Set First/Best/Worst Fit",
                        "",
                        "I/O:",
                        "  io                           Show I/O statistics",
                        "  io active                    Show active requests",
                        "  io queued                    Show queued requests",
                        "  io completed                 Show completed requests",
                        "  io cancelled                 Show cancelled requests",
                        "  io devices                   Show device statistics",
                        "  io request JSON              Create I/O request",
                        "  io execute REQUEST_ID        Execute request unit",
                        "  io cancel REQUEST_ID         Cancel request",
                        "",
                        "Synchronization:",
                        "  sync                         Show synchronization table",
                        "  sync stats                   Show synchronization statistics",
                        "  mutex create ID              Create mutex",
                        "  mutex acquire ID PID        Acquire mutex",
                        "  mutex release ID PID        Release mutex",
                        "  semaphore create JSON        Create semaphore",
                        "  semaphore wait ID PID        Wait on semaphore",
                        "  semaphore signal ID          Signal semaphore",
                        "",
                        "Deadlock:",
                        "  deadlock                     Show deadlock statistics",
                        "  deadlock table               Show deadlock table",
                        "",
                        "Utilities:",
                        "  history                      Show command history",
                        "  whoami                       Show current user",
                        "  uname                        Show system information",
                        "  date                         Show current date/time",
                        "  echo TEXT                    Print text",
                        ""
                    ]);
                    break;

                case "clear":
                    setHistory([]);
                    break;

                case "about":
                    addOutput([
                        "",
                        "NovaOS",
                        "A web-based operating system simulator.",
                        "",
                        "Phase 3 Integrated Terminal",
                        "",
                        "Kernel: NovaOS Kernel",
                        "Memory: 1024 MB simulated",
                        "Filesystem: Simulated",
                        "Architecture: Browser + Node.js",
                        ""
                    ]);
                    break;

                case "status": {
                    const result =
                        await api(
                            "/api/system/state"
                        );

                    const state =
                        result.data;

                    addOutput([
                        "",
                        `Kernel: ${state.booted
                            ? "ONLINE"
                            : "OFFLINE"
                        }`,
                        `Applications: ${state.applications}`,
                        `Processes: ${state.processes.length}`,
                        `Windows: ${state.windows.length}`,
                        `Memory: ${state.memory.utilization}% used`,
                        `I/O Requests: ${state.io?.total ??
                        state.io?.requests ??
                        0
                        }`,
                        `Current directory: ${cwd}`,
                        ""
                    ]);

                    break;
                }

                case "ps": {
                    const result =
                        await api(
                            "/api/processes"
                        );

                    const processes =
                        result.data;

                    if (!processes.length) {
                        addOutput([
                            "",
                            "No processes currently exist.",
                            ""
                        ]);
                        break;
                    }

                    const lines = [
                        "",
                        "PID          APPLICATION       STATE"
                    ];

                    processes.forEach(
                        (process) => {
                            lines.push(
                                `${String(
                                    process.pid
                                ).padEnd(
                                    13
                                )}${String(
                                    process.applicationId
                                ).padEnd(
                                    18
                                )}${process.state
                                }`
                            );
                        }
                    );

                    lines.push("");

                    addOutput(lines);

                    break;
                }

                case "run":
                case "preempt":
                case "wait":
                case "resume": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            `Usage: ${name} <PID>`,
                            ""
                        ]);
                        break;
                    }

                    const pid =
                        parts[1];

                    const result =
                        await api(
                            `/api/processes/${encodeURIComponent(
                                pid
                            )}/${name}`,
                            {
                                method: "POST"
                            }
                        );

                    addOutput([
                        "",
                        `Process ${pid}: ${name}`,
                        formatObject(
                            result.data
                        ),
                        ""
                    ]);

                    break;
                }

                case "kill": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: kill <PID>",
                            ""
                        ]);
                        break;
                    }

                    const pid =
                        parts[1];

                    await api(
                        `/api/processes/${encodeURIComponent(
                            pid
                        )}/terminate`,
                        {
                            method: "POST"
                        }
                    );

                    addOutput([
                        "",
                        `Process ${pid} terminated.`,
                        ""
                    ]);

                    break;
                }

                case "windows": {
                    const result =
                        await api(
                            "/api/system/state"
                        );

                    const windows =
                        result.data.windows;

                    if (!windows.length) {
                        addOutput([
                            "",
                            "No windows currently exist.",
                            ""
                        ]);
                        break;
                    }

                    const lines = [
                        "",
                        "ID           TITLE             STATE"
                    ];

                    windows.forEach(
                        (windowData) => {
                            lines.push(
                                `${String(
                                    windowData.id
                                ).padEnd(
                                    13
                                )}${String(
                                    windowData.title
                                ).padEnd(
                                    18
                                )}${windowData.state
                                }`
                            );
                        }
                    );

                    lines.push("");

                    addOutput(lines);

                    break;
                }

                case "apps": {
                    const result =
                        await api(
                            "/api/applications"
                        );

                    const applications =
                        result.data;

                    if (!applications.length) {
                        addOutput([
                            "",
                            "No applications registered.",
                            ""
                        ]);
                        break;
                    }

                    const lines = [
                        "",
                        "ID             NAME"
                    ];

                    applications.forEach(
                        (application) => {
                            lines.push(
                                `${String(
                                    application.id
                                ).padEnd(
                                    15
                                )}${application.name
                                }`
                            );
                        }
                    );

                    lines.push("");

                    addOutput(lines);

                    break;
                }

                case "open": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: open <application>",
                            ""
                        ]);
                        break;
                    }

                    const application =
                        parts[1];

                    const result =
                        await api(
                            `/api/applications/${encodeURIComponent(
                                application
                            )}/launch`,
                            {
                                method: "POST"
                            }
                        );

                    addOutput([
                        "",
                        `Launched ${result.data.application.name}.`,
                        `PID: ${result.data.process.pid}`,
                        `Window: ${result.data.window.id}`,
                        ""
                    ]);

                    break;
                }

                case "boot": {
                    const result =
                        await api(
                            "/api/system/boot",
                            {
                                method: "POST"
                            }
                        );

                    addOutput([
                        "",
                        result.booted
                            ? "NovaOS kernel booted successfully."
                            : "NovaOS kernel is already booted.",
                        ""
                    ]);

                    break;
                }

                case "shutdown": {
                    const result =
                        await api(
                            "/api/system/shutdown",
                            {
                                method: "POST"
                            }
                        );

                    addOutput([
                        "",
                        result.shutdown
                            ? "NovaOS kernel shut down."
                            : "NovaOS kernel is already offline.",
                        ""
                    ]);

                    break;
                }

                case "mem": {
                    const subcommand =
                        parts[1]?.toLowerCase();

                    if (!subcommand) {
                        const result =
                            await api(
                                "/api/memory"
                            );

                        const memory =
                            result.data;

                        addOutput([
                            "",
                            "Memory Manager",
                            "",
                            `Total Memory:       ${memory.totalMemory}`,
                            `Allocated Memory:   ${memory.allocatedMemory}`,
                            `Free Memory:        ${memory.freeMemory}`,
                            `Utilization:        ${memory.utilization}%`,
                            `Memory Blocks:      ${memory.numberOfBlocks}`,
                            `Allocated Blocks:   ${memory.allocatedBlocks}`,
                            `Free Blocks:        ${memory.freeBlocks}`,
                            `Largest Free Block: ${memory.largestFreeBlock}`,
                            `Fragmentation:      ${memory.externalFragmentation}%`,
                            `Algorithm:          ${memory.algorithm}`,
                            ""
                        ]);

                        break;
                    }

                    if (subcommand === "map") {
                        const result =
                            await api(
                                "/api/memory/map"
                            );

                        addOutput([
                            "",
                            "Memory Map:",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "blocks"
                    ) {
                        const result =
                            await api(
                                "/api/memory/blocks"
                            );

                        addOutput([
                            "",
                            "Memory Blocks:",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "allocation"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: mem allocation <PID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/memory/allocation/${encodeURIComponent(
                                    parts[2]
                                )}`
                            );

                        addOutput([
                            "",
                            `Allocation for ${parts[2]}:`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "allocate"
                    ) {
                        if (
                            !parts[2] ||
                            !parts[3]
                        ) {
                            addOutput([
                                "",
                                "Usage: mem allocate <PID> <SIZE>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                "/api/memory/allocate",
                                jsonBody({
                                    pid: parts[2],
                                    size: Number(
                                        parts[3]
                                    )
                                })
                            );

                        addOutput([
                            "",
                            `Allocated ${parts[3]} units to ${parts[2]}.`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "free"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: mem free <PID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                "/api/memory/deallocate",
                                jsonBody({
                                    pid: parts[2]
                                })
                            );

                        addOutput([
                            "",
                            result.message ||
                            `Memory released from ${parts[2]}.`,
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "algorithm"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: mem algorithm <first-fit|best-fit|worst-fit>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                "/api/memory/algorithm",
                                jsonBody({
                                    algorithm:
                                        parts[2]
                                })
                            );

                        addOutput([
                            "",
                            `Memory allocation algorithm: ${result.algorithm}`,
                            ""
                        ]);

                        break;
                    }

                    addOutput([
                        "",
                        `Unknown mem command: ${subcommand}`,
                        'Type "help" for memory commands.',
                        ""
                    ]);

                    break;
                }

                case "io": {
                    const subcommand =
                        parts[1]?.toLowerCase();

                    if (!subcommand) {
                        const result =
                            await api(
                                "/api/io"
                            );

                        addOutput([
                            "",
                            "I/O Controller",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    const ioEndpoints = {
                        active:
                            "/api/io/active",
                        queued:
                            "/api/io/queued",
                        completed:
                            "/api/io/completed",
                        cancelled:
                            "/api/io/cancelled",
                        devices:
                            "/api/io/devices"
                    };

                    if (
                        ioEndpoints[
                        subcommand
                        ]
                    ) {
                        const result =
                            await api(
                                ioEndpoints[
                                subcommand
                                ]
                            );

                        addOutput([
                            "",
                            `I/O ${subcommand}:`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "request"
                    ) {
                        const jsonText =
                            parts
                                .slice(2)
                                .join(" ");

                        if (!jsonText) {
                            addOutput([
                                "",
                                'Usage: io request {"pid":"nova-1000",...}',
                                ""
                            ]);
                            break;
                        }

                        let body;

                        try {
                            body =
                                JSON.parse(
                                    jsonText
                                );
                        } catch {
                            throw new Error(
                                "Invalid JSON. Use: io request {\"pid\":\"...\",...}"
                            );
                        }

                        const result =
                            await api(
                                "/api/io/request",
                                jsonBody(body)
                            );

                        addOutput([
                            "",
                            "I/O request created.",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "execute"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: io execute <REQUEST_ID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/io/execute/${encodeURIComponent(
                                    parts[2]
                                )}`,
                                {
                                    method: "POST"
                                }
                            );

                        addOutput([
                            "",
                            `I/O request ${parts[2]} executed.`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "cancel"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: io cancel <REQUEST_ID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/io/cancel/${encodeURIComponent(
                                    parts[2]
                                )}`,
                                {
                                    method: "POST"
                                }
                            );

                        addOutput([
                            "",
                            `I/O request ${parts[2]} cancelled.`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    addOutput([
                        "",
                        `Unknown io command: ${subcommand}`,
                        'Type "help" for I/O commands.',
                        ""
                    ]);

                    break;
                }

                case "sync": {
                    const subcommand =
                        parts[1]?.toLowerCase();

                    if (!subcommand) {
                        const result =
                            await api(
                                "/api/synchronization"
                            );

                        addOutput([
                            "",
                            "Synchronization Table:",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        subcommand ===
                        "stats"
                    ) {
                        const result =
                            await api(
                                "/api/synchronization/statistics"
                            );

                        addOutput([
                            "",
                            "Synchronization Statistics:",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    addOutput([
                        "",
                        "Usage:",
                        "  sync",
                        "  sync stats",
                        ""
                    ]);

                    break;
                }

                case "mutex": {
                    const action =
                        parts[1]?.toLowerCase();

                    if (
                        action ===
                        "create"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: mutex create <ID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                "/api/synchronization/mutex",
                                jsonBody({
                                    id: parts[2]
                                })
                            );

                        addOutput([
                            "",
                            `Mutex '${parts[2]}' created.`,
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        action ===
                        "acquire"
                    ) {
                        if (
                            !parts[2] ||
                            !parts[3]
                        ) {
                            addOutput([
                                "",
                                "Usage: mutex acquire <ID> <PID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/synchronization/mutex/${encodeURIComponent(
                                    parts[2]
                                )}/acquire`,
                                jsonBody({
                                    pid: parts[3]
                                })
                            );

                        addOutput([
                            "",
                            `Mutex '${parts[2]}' acquired: ${result.acquired}`,
                            ""
                        ]);

                        break;
                    }

                    if (
                        action ===
                        "release"
                    ) {
                        if (
                            !parts[2] ||
                            !parts[3]
                        ) {
                            addOutput([
                                "",
                                "Usage: mutex release <ID> <PID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/synchronization/mutex/${encodeURIComponent(
                                    parts[2]
                                )}/release`,
                                jsonBody({
                                    pid: parts[3]
                                })
                            );

                        addOutput([
                            "",
                            `Mutex '${parts[2]}' released.`,
                            `Next PID: ${result.nextPid ??
                            "none"
                            }`,
                            ""
                        ]);

                        break;
                    }

                    addOutput([
                        "",
                        "Usage:",
                        "  mutex create <ID>",
                        "  mutex acquire <ID> <PID>",
                        "  mutex release <ID> <PID>",
                        ""
                    ]);

                    break;
                }

                case "semaphore": {
                    const action =
                        parts[1]?.toLowerCase();

                    if (
                        action ===
                        "create"
                    ) {
                        const jsonText =
                            parts
                                .slice(2)
                                .join(" ");

                        if (!jsonText) {
                            addOutput([
                                "",
                                'Usage: semaphore create {"id":"sem1",...}',
                                ""
                            ]);
                            break;
                        }

                        let body;

                        try {
                            body =
                                JSON.parse(
                                    jsonText
                                );
                        } catch {
                            throw new Error(
                                "Invalid JSON for semaphore."
                            );
                        }

                        const result =
                            await api(
                                "/api/synchronization/semaphore",
                                jsonBody(body)
                            );

                        addOutput([
                            "",
                            "Semaphore created.",
                            formatObject(
                                result.data
                            ),
                            ""
                        ]);

                        break;
                    }

                    if (
                        action ===
                        "wait"
                    ) {
                        if (
                            !parts[2] ||
                            !parts[3]
                        ) {
                            addOutput([
                                "",
                                "Usage: semaphore wait <ID> <PID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/synchronization/semaphore/${encodeURIComponent(
                                    parts[2]
                                )}/wait`,
                                jsonBody({
                                    pid: parts[3]
                                })
                            );

                        addOutput([
                            "",
                            `Semaphore '${parts[2]}' acquired: ${result.acquired}`,
                            ""
                        ]);

                        break;
                    }

                    if (
                        action ===
                        "signal"
                    ) {
                        if (!parts[2]) {
                            addOutput([
                                "",
                                "Usage: semaphore signal <ID>",
                                ""
                            ]);
                            break;
                        }

                        const result =
                            await api(
                                `/api/synchronization/semaphore/${encodeURIComponent(
                                    parts[2]
                                )}/signal`,
                                {
                                    method: "POST"
                                }
                            );

                        addOutput([
                            "",
                            `Semaphore '${parts[2]}' signalled.`,
                            `Next PID: ${result.nextPid ??
                            "none"
                            }`,
                            ""
                        ]);

                        break;
                    }

                    addOutput([
                        "",
                        "Usage:",
                        '  semaphore create {"id":"sem1",...}',
                        "  semaphore wait <ID> <PID>",
                        "  semaphore signal <ID>",
                        ""
                    ]);

                    break;
                }

                case "deadlock": {
                    const subcommand =
                        parts[1]?.toLowerCase();

                    const endpoint =
                        subcommand ===
                            "table"
                            ? "/api/deadlock/table"
                            : "/api/deadlock";

                    const result =
                        await api(
                            endpoint
                        );

                    addOutput([
                        "",
                        subcommand ===
                            "table"
                            ? "Deadlock Table:"
                            : "Deadlock Statistics:",
                        formatObject(
                            result.data
                        ),
                        ""
                    ]);

                    break;
                }

                case "pwd":
                    addOutput([
                        "",
                        cwd,
                        ""
                    ]);
                    break;

                case "ls": {
                    const target =
                        parts[1] || cwd;

                    const result =
                        await filesystemApi(
                            `/list?path=${encodeURIComponent(
                                target
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`
                        );

                    const entries =
                        result.data.entries;

                    if (!entries.length) {
                        addOutput([
                            "",
                            "Directory is empty.",
                            ""
                        ]);
                        break;
                    }

                    const lines = [
                        "",
                        "TYPE         NAME             SIZE"
                    ];

                    entries.forEach(
                        (entry) => {
                            lines.push(
                                `${String(
                                    entry.type
                                ).padEnd(
                                    13
                                )}${String(
                                    entry.name
                                ).padEnd(
                                    17
                                )}${entry.size
                                }`
                            );
                        }
                    );

                    lines.push("");

                    addOutput(lines);

                    break;
                }

                case "cd": {
                    let target =
                        parts[1];

                    if (!target) {
                        target =
                            "/home/nova";
                    }

                    if (target === "~") {
                        target =
                            "/home/nova";
                    }

                    if (target === "-") {
                        target =
                            previousCwd;
                    }

                    const result =
                        await filesystemApi(
                            `/snapshot?path=${encodeURIComponent(
                                target
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`
                        );

                    if (
                        result.data.type !==
                        "directory"
                    ) {
                        throw new Error(
                            `'${target}' is not a directory.`
                        );
                    }

                    const pathResult =
                        await filesystemApi(
                            `/list?path=${encodeURIComponent(
                                target
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`
                        );

                    const newCwd =
                        pathResult.data.path;

                    if (
                        newCwd !== cwd
                    ) {
                        setPreviousCwd(cwd);
                        setCwd(newCwd);
                    }

                    break;
                }

                case "mkdir": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: mkdir <PATH>",
                            ""
                        ]);
                        break;
                    }

                    const result =
                        await filesystemApi(
                            "/mkdir",
                            jsonBody({
                                path: parts[1],
                                cwd
                            })
                        );

                    addOutput([
                        "",
                        `Directory created: ${result.data.path}`,
                        ""
                    ]);

                    break;
                }

                case "touch": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: touch <PATH>",
                            ""
                        ]);
                        break;
                    }

                    const result =
                        await filesystemApi(
                            "/touch",
                            jsonBody({
                                path: parts[1],
                                cwd
                            })
                        );

                    addOutput([
                        "",
                        result.data.created
                            ? `File created: ${result.data.path}`
                            : `File timestamp updated: ${result.data.path}`,
                        ""
                    ]);

                    break;
                }

                case "cat": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: cat <PATH>",
                            ""
                        ]);
                        break;
                    }

                    const result =
                        await filesystemApi(
                            `/read?path=${encodeURIComponent(
                                parts[1]
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`
                        );

                    addOutput([
                        "",
                        ...(result.data.content
                            ? result.data.content.split(
                                "\n"
                            )
                            : [""]),
                        ""
                    ]);

                    break;
                }

                case "write": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            "Usage: write <PATH> <TEXT>",
                            ""
                        ]);
                        break;
                    }

                    const content =
                        parts
                            .slice(2)
                            .join(" ");

                    const result =
                        await filesystemApi(
                            "/write",
                            jsonBody({
                                path: parts[1],
                                content,
                                cwd
                            })
                        );

                    addOutput([
                        "",
                        result.data.created
                            ? `File created: ${result.data.path}`
                            : `File updated: ${result.data.path}`,
                        `Size: ${result.data.size} bytes`,
                        ""
                    ]);

                    break;
                }

                case "rm":
                case "rmdir": {
                    if (!parts[1]) {
                        addOutput([
                            "",
                            `Usage: ${name} <PATH>`,
                            ""
                        ]);
                        break;
                    }

                    const target =
                        parts[1];

                    const snapshot =
                        await filesystemApi(
                            `/snapshot?path=${encodeURIComponent(
                                target
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`
                        );

                    if (
                        name === "rmdir" &&
                        snapshot.data.type !==
                        "directory"
                    ) {
                        throw new Error(
                            `'${target}' is not a directory.`
                        );
                    }

                    if (
                        name === "rmdir" &&
                        snapshot.data.type ===
                        "directory" &&
                        Array.isArray(
                            snapshot.data.children
                        ) &&
                        snapshot.data.children.length >
                        0
                    ) {
                        throw new Error(
                            `Directory '${target}' is not empty.`
                        );
                    }

                    const result =
                        await filesystemApi(
                            `/remove?path=${encodeURIComponent(
                                target
                            )}&cwd=${encodeURIComponent(
                                cwd
                            )}`,
                            {
                                method: "DELETE"
                            }
                        );

                    addOutput([
                        "",
                        `Removed ${result.data.type}: ${result.data.path}`,
                        ""
                    ]);

                    break;
                }

                case "history":
                    addOutput([
                        "",
                        ...commandHistory.map(
                            (
                                item,
                                index
                            ) =>
                                `${String(
                                    index + 1
                                ).padStart(
                                    4,
                                    " "
                                )}  ${item}`
                        ),
                        ""
                    ]);
                    break;

                case "whoami":
                    addOutput([
                        "",
                        "nova",
                        ""
                    ]);
                    break;

                case "uname":
                    addOutput([
                        "",
                        "NovaOS nova-kernel 1.0.0 x86_64",
                        ""
                    ]);
                    break;

                case "date":
                    addOutput([
                        "",
                        new Date().toString(),
                        ""
                    ]);
                    break;

                case "echo":
                    addOutput([
                        "",
                        parts
                            .slice(1)
                            .join(" "),
                        ""
                    ]);
                    break;

                default:
                    addOutput([
                        "",
                        `Command not found: ${name}`,
                        'Type "help" for available commands.',
                        ""
                    ]);
            }
        } catch (error) {
            addOutput([
                "",
                `Error: ${error.message}`,
                ""
            ]);
        } finally {
            setBusy(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    };

    const handleKeyDown = (
        event
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();
            executeCommand();
            return;
        }

        if (
            event.key ===
            "ArrowUp"
        ) {
            event.preventDefault();

            if (
                !commandHistory.length
            ) {
                return;
            }

            const nextIndex =
                historyIndex === -1
                    ? commandHistory.length - 1
                    : Math.max(
                        0,
                        historyIndex - 1
                    );

            setHistoryIndex(
                nextIndex
            );

            setCommand(
                commandHistory[
                nextIndex
                ] || ""
            );

            return;
        }

        if (
            event.key ===
            "ArrowDown"
        ) {
            event.preventDefault();

            if (
                historyIndex === -1
            ) {
                return;
            }

            if (
                historyIndex >=
                commandHistory.length - 1
            ) {
                setHistoryIndex(-1);
                setCommand("");
                return;
            }

            const nextIndex =
                historyIndex + 1;

            setHistoryIndex(
                nextIndex
            );

            setCommand(
                commandHistory[
                nextIndex
                ] || ""
            );
        }
    };

    return (
        <>
            <style>{`
                .nova-terminal {
                    --terminal-green: #4ade80;
                    --terminal-green-bright: #86efac;
                    --terminal-cyan: #22d3ee;
                    --terminal-purple: #a78bfa;
                    --terminal-yellow: #facc15;
                    --terminal-red: #fb7185;

                    position: relative;

                    display: flex;
                    flex-direction: column;

                    width: 100%;
                    height: 100%;

                    min-height: 0;

                    overflow: hidden;

                    background:
                        radial-gradient(
                            circle at 80% 0%,
                            rgba(34, 211, 238, 0.075),
                            transparent 30%
                        ),
                        radial-gradient(
                            circle at 10% 100%,
                            rgba(74, 222, 128, 0.055),
                            transparent 32%
                        ),
                        linear-gradient(
                            145deg,
                            #03070b,
                            #06100e 55%,
                            #03080a
                        );

                    color:
                        var(--terminal-green);

                    font-family:
                        "Cascadia Code",
                        "JetBrains Mono",
                        "Fira Code",
                        Consolas,
                        monospace;

                    font-size: 13px;
                }

                .nova-terminal::before {
                    content: "";

                    position: absolute;

                    inset: 0;

                    pointer-events: none;

                    background:
                        repeating-linear-gradient(
                            0deg,
                            rgba(
                                255,
                                255,
                                255,
                                0.012
                            )
                            0px,
                            rgba(
                                255,
                                255,
                                255,
                                0.012
                            )
                            1px,
                            transparent
                            1px,
                            transparent
                            4px
                        );

                    opacity: 0.35;

                    z-index: 0;
                }

                .nova-terminal-output {
                    position: relative;

                    z-index: 1;

                    flex: 1;

                    min-height: 0;

                    overflow-y: auto;

                    padding: 22px 24px 14px;

                    line-height: 1.65;

                    white-space: pre-wrap;

                    word-break: break-word;

                    scrollbar-width: thin;

                    scrollbar-color:
                        rgba(74, 222, 128, 0.30)
                        transparent;
                }

                .nova-terminal-output::-webkit-scrollbar {
                    width: 7px;
                }

                .nova-terminal-output::-webkit-scrollbar-track {
                    background: transparent;
                }

                .nova-terminal-output::-webkit-scrollbar-thumb {
                    background:
                        rgba(
                            74,
                            222,
                            128,
                            0.28
                        );

                    border-radius: 20px;
                }

                .nova-terminal-output > div {
                    min-height: 1.65em;
                }

                .nova-terminal-output
                > div:first-child {
                    color:
                        var(--terminal-cyan);

                    font-weight: 700;

                    text-shadow:
                        0 0 14px
                        rgba(
                            34,
                            211,
                            238,
                            0.20
                        );
                }

                .nova-terminal-output
                > div:nth-child(2) {
                    color:
                        #8ba3a0;
                }

                .nova-terminal-output
                > div:nth-child(3) {
                    color:
                        var(--terminal-purple);
                }

                .nova-terminal-command {
                    margin:
                        7px -8px;

                    padding:
                        5px 8px;

                    border-left:
                        2px solid
                        rgba(
                            74,
                            222,
                            128,
                            0.55
                        );

                    background:
                        linear-gradient(
                            90deg,
                            rgba(
                                74,
                                222,
                                128,
                                0.075
                            ),
                            transparent
                        );

                    color:
                        var(--terminal-green-bright);

                    text-shadow:
                        0 0 10px
                        rgba(
                            74,
                            222,
                            128,
                            0.22
                        );
                }

                .nova-terminal-input-row {
                    position: relative;

                    z-index: 2;

                    display: flex;

                    align-items: center;

                    gap: 9px;

                    min-height: 54px;

                    padding:
                        9px 18px;

                    background:
                        linear-gradient(
                            90deg,
                            rgba(
                                3,
                                12,
                                10,
                                0.98
                            ),
                            rgba(
                                5,
                                18,
                                15,
                                0.98
                            )
                        );

                    border-top:
                        1px solid
                        rgba(
                            74,
                            222,
                            128,
                            0.14
                        );

                    box-shadow:
                        0 -12px 30px
                        rgba(
                            0,
                            0,
                            0,
                            0.22
                        );
                }

                .nova-terminal-prompt {
                    flex-shrink: 0;

                    color:
                        var(--terminal-cyan);

                    font-weight: 700;

                    text-shadow:
                        0 0 12px
                        rgba(
                            34,
                            211,
                            238,
                            0.25
                        );
                }

                .nova-terminal-input-row input {
                    flex: 1;

                    min-width: 0;

                    border: 0;

                    outline: none;

                    background:
                        transparent;

                    color:
                        var(--terminal-green-bright);

                    font: inherit;

                    caret-color:
                        var(--terminal-green-bright);

                    text-shadow:
                        0 0 9px
                        rgba(
                            74,
                            222,
                            128,
                            0.16
                        );
                }

                .nova-terminal-input-row input::selection {
                    background:
                        rgba(
                            74,
                            222,
                            128,
                            0.25
                        );
                }

                .nova-terminal-input-row input:disabled {
                    opacity: 0.55;
                }

                .nova-terminal-busy {
                    color:
                        var(--terminal-yellow);

                    letter-spacing: 2px;

                    animation:
                        nova-terminal-pulse
                        1s ease-in-out infinite;
                }

                @keyframes nova-terminal-pulse {
                    0%,
                    100% {
                        opacity: 0.35;
                    }

                    50% {
                        opacity: 1;
                    }
                }

                @media (max-width: 700px) {
                    .nova-terminal-output {
                        padding:
                            16px 14px 12px;
                    }

                    .nova-terminal-input-row {
                        padding:
                            8px 12px;
                    }

                    .nova-terminal {
                        font-size: 12px;
                    }
                }
            `}</style>

            <div
                className="nova-terminal"
                onClick={() =>
                    inputRef.current?.focus()
                }
            >
                <div
                    ref={terminalRef}
                    className="nova-terminal-output"
                >
                    {history.map(
                        (
                            line,
                            index
                        ) => (
                            <div
                                key={`${index}-${line}`}
                                className={
                                    line.startsWith(
                                        "nova@os:"
                                    )
                                        ? "nova-terminal-command"
                                        : ""
                                }
                            >
                                {line ||
                                    "\u00A0"}
                            </div>
                        )
                    )}
                </div>

                <div className="nova-terminal-input-row">
                    <span className="nova-terminal-prompt">
                        {`nova@os:${cwd}$`}
                    </span>

                    <input
                        ref={inputRef}
                        value={command}
                        onChange={(
                            event
                        ) => {
                            setCommand(
                                event.target.value
                            );

                            setHistoryIndex(
                                -1
                            );
                        }}
                        onKeyDown={
                            handleKeyDown
                        }
                        disabled={busy}
                        autoComplete="off"
                        spellCheck="false"
                        aria-label="NovaOS terminal input"
                    />

                    {busy && (
                        <span className="nova-terminal-busy">
                            ...
                        </span>
                    )}
                </div>
            </div>
        </>
    );
}

export default Terminal;