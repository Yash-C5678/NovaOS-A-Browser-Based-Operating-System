import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api/page-replacement";

const ALGORITHMS = [
    {
        id: "fifo",
        name: "FIFO",
        description: "Replaces the page that entered memory first."
    },
    {
        id: "lru",
        name: "LRU",
        description:
            "Replaces the page that has not been used for the longest time."
    },
    {
        id: "optimal",
        name: "Optimal",
        description:
            "Replaces the page whose next use is farthest in the future."
    },
    {
        id: "second-chance",
        name: "Second Chance",
        description:
            "FIFO with a reference bit that gives recently used pages another chance."
    },
    {
        id: "clock",
        name: "Clock",
        description:
            "Circular second-chance replacement using a clock pointer."
    }
];

const DEFAULT_REFERENCE_STRING =
    "1 2 3 1 4 2 5 1 2 3 4 5";


function formatRatio(value) {
    if (
        typeof value !== "number" ||
        Number.isNaN(value)
    ) {
        return "0.00";
    }

    return value.toFixed(2);
}


function algorithmName(id) {
    const normalized =
        String(id || "")
            .toLowerCase()
            .replaceAll("_", "-");

    const algorithm =
        ALGORITHMS.find(
            (item) =>
                item.id === normalized
        );

    if (algorithm) {
        return algorithm.name;
    }

    return String(id || "Unknown")
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}


function normalizeFrames(frames) {
    if (!Array.isArray(frames)) {
        return [];
    }

    return frames.map((frame) => {
        if (
            frame === null ||
            frame === undefined
        ) {
            return null;
        }

        if (
            typeof frame === "object"
        ) {
            if (
                frame.page !== undefined
            ) {
                return frame.page;
            }

            if (
                frame.value !== undefined
            ) {
                return frame.value;
            }

            if (
                frame.id !== undefined
            ) {
                return frame.id;
            }
        }

        return frame;
    });
}


function getStepPage(step) {
    if (!step) {
        return null;
    }

    if (
        step.referencedPage !== undefined
    ) {
        return step.referencedPage;
    }

    if (
        step.page !== undefined
    ) {
        return step.page;
    }

    if (
        step.reference !== undefined
    ) {
        return step.reference;
    }

    if (
        step.currentPage !== undefined
    ) {
        return step.currentPage;
    }

    return null;
}


function getStepFrames(step) {
    if (!step) {
        return [];
    }

    if (
        Array.isArray(step.frames)
    ) {
        return step.frames;
    }

    if (
        Array.isArray(step.pages)
    ) {
        return step.pages;
    }

    return [];
}


function getStepFault(step) {
    if (!step) {
        return false;
    }

    if (
        typeof step.pageFault ===
        "boolean"
    ) {
        return step.pageFault;
    }

    if (
        typeof step.fault ===
        "boolean"
    ) {
        return step.fault;
    }

    if (
        typeof step.isFault ===
        "boolean"
    ) {
        return step.isFault;
    }

    return false;
}


function getStepReplacement(step) {
    if (!step) {
        return null;
    }

    if (
        step.replacedPage !== undefined &&
        step.replacedPage !== null
    ) {
        return step.replacedPage;
    }

    if (
        step.evictedPage !== undefined &&
        step.evictedPage !== null
    ) {
        return step.evictedPage;
    }

    if (
        step.victim !== undefined &&
        step.victim !== null
    ) {
        return step.victim;
    }

    return null;
}


/*
 * ============================================================
 * COMPARISON EXTRACTION
 * ============================================================
 *
 * The backend currently returns:
 *
 * {
 *     referenceString: [...],
 *     frameCount: 3,
 *     algorithms: {
 *         fifo: {...},
 *         lru: {...},
 *         optimal: {...},
 *         secondChance: {...},
 *         clock: {...}
 *     },
 *     summary: [
 *         {...},
 *         {...},
 *         {...},
 *         {...},
 *         {...}
 *     ]
 * }
 *
 * This function intentionally searches recursively so that
 * Express response wrappers cannot break the UI.
 */

function extractComparisonRows(value) {
    if (!value) {
        return [];
    }


    if (
        Array.isArray(value)
    ) {
        const rows =
            value.filter(
                (item) =>
                    item &&
                    typeof item ===
                    "object" &&
                    (
                        item.pageFaults !==
                        undefined ||
                        item.pageHits !==
                        undefined ||
                        item.replacements !==
                        undefined
                    )
            );

        if (
            rows.length > 0
        ) {
            return rows;
        }

        for (
            const item of value
        ) {
            const nested =
                extractComparisonRows(
                    item
                );

            if (
                nested.length > 0
            ) {
                return nested;
            }
        }

        return [];
    }


    if (
        typeof value !== "object"
    ) {
        return [];
    }


    /*
     * PRIMARY TARGET:
     *
     * comparison.summary
     */
    if (
        Array.isArray(
            value.summary
        )
    ) {
        const rows =
            value.summary.filter(
                (item) =>
                    item &&
                    typeof item ===
                    "object"
            );

        if (
            rows.length > 0
        ) {
            return rows;
        }
    }


    /*
     * Some wrappers may expose:
     *
     * data.summary
     * result.summary
     * comparison.summary
     */
    for (
        const key of [
            "data",
            "result",
            "comparison",
            "results"
        ]
    ) {
        if (
            value[key] !==
            undefined
        ) {
            const nested =
                extractComparisonRows(
                    value[key]
                );

            if (
                nested.length > 0
            ) {
                return nested;
            }
        }
    }


    /*
     * FALLBACK:
     *
     * Read the algorithms object.
     */
    if (
        value.algorithms &&
        typeof value.algorithms ===
        "object"
    ) {
        const rows =
            Object.entries(
                value.algorithms
            )
                .filter(
                    ([, item]) =>
                        item &&
                        typeof item ===
                        "object"
                )
                .map(
                    ([key, item]) => ({
                        ...item,
                        algorithm:
                            item.algorithm ||
                            item.name ||
                            key
                    })
                )
                .filter(
                    (item) =>
                        item.pageFaults !==
                        undefined ||
                        item.pageHits !==
                        undefined ||
                        item.replacements !==
                        undefined
                );

        if (
            rows.length > 0
        ) {
            return rows;
        }
    }


    /*
     * FINAL FALLBACK:
     *
     * Search every nested object.
     */
    for (
        const valueItem of Object.values(
            value
        )
    ) {
        if (
            valueItem &&
            typeof valueItem ===
            "object"
        ) {
            const nested =
                extractComparisonRows(
                    valueItem
                );

            if (
                nested.length > 0
            ) {
                return nested;
            }
        }
    }


    return [];
}


function StatCard({
    label,
    value
}) {
    return (
        <div
            style={{
                padding: "12px",
                borderRadius: "9px",
                border:
                    "1px solid rgba(255,255,255,0.07)",
                background:
                    "rgba(255,255,255,0.025)"
            }}
        >
            <div
                style={{
                    fontSize: "9px",
                    color: "#68758a",
                    textTransform:
                        "uppercase",
                    letterSpacing:
                        "0.07em",
                    marginBottom: "5px"
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#dfe7f6"
                }}
            >
                {value}
            </div>
        </div>
    );
}


export default function PageReplacement() {
    const [
        algorithm,
        setAlgorithm
    ] = useState("fifo");

    const [
        referenceInput,
        setReferenceInput
    ] = useState(
        DEFAULT_REFERENCE_STRING
    );

    const [
        frameCount,
        setFrameCount
    ] = useState(3);

    const [
        result,
        setResult
    ] = useState(null);

    /*
     * Store the actual rows directly.
     * This eliminates another layer of parsing
     * during rendering.
     */
    const [
        comparisonRows,
        setComparisonRows
    ] = useState([]);

    const [
        supportedAlgorithms,
        setSupportedAlgorithms
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        loadingComparison,
        setLoadingComparison
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        comparisonError,
        setComparisonError
    ] = useState("");

    const [
        activeStep,
        setActiveStep
    ] = useState(0);


    const selectedAlgorithm =
        useMemo(
            () =>
                ALGORITHMS.find(
                    (item) =>
                        item.id ===
                        algorithm
                ),
            [algorithm]
        );


    useEffect(() => {
        let mounted = true;

        async function loadAlgorithms() {
            try {
                const response =
                    await fetch(
                        `${API_BASE}/algorithms`
                    );

                const payload =
                    await response.json();

                if (
                    !response.ok ||
                    payload.success === false
                ) {
                    throw new Error(
                        payload.error ||
                        "Unable to load page replacement algorithms."
                    );
                }

                if (!mounted) {
                    return;
                }

                const data =
                    payload.data ??
                    payload.algorithms ??
                    [];

                if (
                    Array.isArray(data)
                ) {
                    setSupportedAlgorithms(
                        data
                    );
                }
            } catch {
                if (mounted) {
                    setSupportedAlgorithms(
                        []
                    );
                }
            }
        }

        loadAlgorithms();

        return () => {
            mounted = false;
        };
    }, []);


    const parseReferenceString =
        () => {
            const values =
                referenceInput
                    .trim()
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .map(
                        (value) =>
                            Number(value)
                    );

            if (
                !values.length
            ) {
                throw new Error(
                    "Enter at least one page reference."
                );
            }

            if (
                values.some(
                    (value) =>
                        !Number.isFinite(
                            value
                        ) ||
                        !Number.isInteger(
                            value
                        ) ||
                        value < 0
                )
            ) {
                throw new Error(
                    "Reference string must contain non-negative integer page numbers."
                );
            }

            if (
                !Number.isInteger(
                    frameCount
                ) ||
                frameCount < 1
            ) {
                throw new Error(
                    "Frame count must be a positive integer."
                );
            }

            return values;
        };


    const runSimulation =
        async () => {
            setLoading(true);
            setError("");
            setComparisonRows([]);
            setComparisonError("");
            setActiveStep(0);

            try {
                const referenceString =
                    parseReferenceString();

                const response =
                    await fetch(
                        `${API_BASE}/simulate`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    algorithm,
                                    referenceString,
                                    frameCount
                                })
                        }
                    );

                const payload =
                    await response.json();

                if (
                    !response.ok ||
                    payload.success === false
                ) {
                    throw new Error(
                        payload.error ||
                        "Page replacement simulation failed."
                    );
                }

                const simulationResult =
                    payload.data ??
                    payload.result ??
                    payload;

                setResult(
                    simulationResult
                );
            } catch (
            requestError
            ) {
                setResult(null);

                setError(
                    requestError.message ||
                    "Unable to run the page replacement simulation."
                );
            } finally {
                setLoading(false);
            }
        };


    const runComparison =
        async () => {
            setLoadingComparison(true);
            setComparisonError("");
            setComparisonRows([]);

            try {
                const referenceString =
                    parseReferenceString();

                const response =
                    await fetch(
                        `${API_BASE}/compare`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    referenceString,
                                    frameCount
                                })
                        }
                    );

                const payload =
                    await response.json();

                if (
                    !response.ok ||
                    payload.success === false
                ) {
                    throw new Error(
                        payload.error ||
                        "Page replacement comparison failed."
                    );
                }


                /*
                 * Extract the rows immediately.
                 */
                const rows =
                    extractComparisonRows(
                        payload
                    );


                if (
                    rows.length === 0
                ) {
                    throw new Error(
                        "The backend responded successfully, but no algorithm comparison rows were found."
                    );
                }


                setComparisonRows(
                    rows
                );

            } catch (
            requestError
            ) {
                setComparisonRows([]);

                setComparisonError(
                    requestError.message ||
                    "Unable to compare page replacement algorithms."
                );
            } finally {
                setLoadingComparison(false);
            }
        };


    const clearSimulation =
        () => {
            setResult(null);
            setComparisonRows([]);
            setError("");
            setComparisonError("");
            setActiveStep(0);
        };


    const steps =
        Array.isArray(
            result?.steps
        )
            ? result.steps
            : [];


    const currentStep =
        steps.length > 0
            ? steps[
            Math.min(
                activeStep,
                steps.length - 1
            )
            ]
            : null;


    const pageFaults =
        typeof result?.pageFaults ===
            "number"
            ? result.pageFaults
            : steps.filter(
                getStepFault
            ).length;


    const pageHits =
        typeof result?.pageHits ===
            "number"
            ? result.pageHits
            : Math.max(
                0,
                (
                    result?.totalReferences ??
                    steps.length
                ) -
                pageFaults
            );


    const replacements =
        typeof result?.replacements ===
            "number"
            ? result.replacements
            : 0;


    const totalReferences =
        typeof result?.totalReferences ===
            "number"
            ? result.totalReferences
            : steps.length;


    const currentFrames =
        normalizeFrames(
            getStepFrames(
                currentStep
            )
        );


    const finalFrames =
        normalizeFrames(
            result?.frames
        );


    const displayFrames =
        currentFrames.length > 0
            ? currentFrames
            : finalFrames;


    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                overflow: "auto",
                boxSizing: "border-box",
                padding: "20px",
                color: "#e8edf7",
                background:
                    "linear-gradient(180deg, rgba(12,18,30,0.98), rgba(8,13,23,0.98))",
                fontFamily:
                    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
            }}
        >

            <div
                style={{
                    maxWidth: "1280px",
                    margin: "0 auto"
                }}
            >

                {/* HEADER */}

                <div
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "flex-start",
                        gap: "20px",
                        marginBottom:
                            "18px"
                    }}
                >

                    <div>

                        <div
                            style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing:
                                    "0.16em",
                                textTransform:
                                    "uppercase",
                                color: "#6f8cff",
                                marginBottom:
                                    "5px"
                            }}
                        >
                            NOVAOS MEMORY SUBSYSTEM
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                fontSize: "22px",
                                lineHeight: 1.2,
                                fontWeight: 700
                            }}
                        >
                            Page Replacement
                        </h1>

                        <p
                            style={{
                                margin:
                                    "6px 0 0",
                                color: "#8d99ad",
                                fontSize:
                                    "12px"
                            }}
                        >
                            Simulate and compare
                            virtual-memory page
                            replacement algorithms
                            using the NovaOS runtime.
                        </p>

                    </div>


                    <div
                        style={{
                            padding:
                                "8px 11px",
                            borderRadius:
                                "8px",
                            border:
                                "1px solid rgba(111,140,255,0.2)",
                            background:
                                "rgba(111,140,255,0.07)",
                            color: "#9eb2ff",
                            fontSize:
                                "11px",
                            whiteSpace:
                                "nowrap"
                        }}
                    >
                        {
                            supportedAlgorithms.length ||
                            5
                        } algorithms
                    </div>

                </div>


                {/* CONTROLS */}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "minmax(150px, 0.8fr) minmax(260px, 1.6fr) 110px auto",
                        gap: "10px",
                        alignItems:
                            "end",
                        padding: "14px",
                        marginBottom:
                            "16px",
                        border:
                            "1px solid rgba(255,255,255,0.08)",
                        borderRadius:
                            "10px",
                        background:
                            "rgba(255,255,255,0.025)"
                    }}
                >

                    <label
                        style={{
                            display: "flex",
                            flexDirection:
                                "column",
                            gap: "6px"
                        }}
                    >

                        <span
                            style={{
                                fontSize:
                                    "10px",
                                color:
                                    "#7e8ba0",
                                textTransform:
                                    "uppercase",
                                letterSpacing:
                                    "0.08em"
                            }}
                        >
                            Algorithm
                        </span>

                        <select
                            value={
                                algorithm
                            }
                            onChange={(
                                event
                            ) =>
                                setAlgorithm(
                                    event
                                        .target
                                        .value
                                )
                            }
                            style={
                                inputStyle
                            }
                        >

                            {ALGORITHMS.map(
                                (
                                    item
                                ) => (
                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.name
                                        }
                                    </option>
                                )
                            )}

                        </select>

                    </label>


                    <label
                        style={{
                            display: "flex",
                            flexDirection:
                                "column",
                            gap: "6px"
                        }}
                    >

                        <span
                            style={{
                                fontSize:
                                    "10px",
                                color:
                                    "#7e8ba0",
                                textTransform:
                                    "uppercase",
                                letterSpacing:
                                    "0.08em"
                            }}
                        >
                            Reference String
                        </span>

                        <input
                            value={
                                referenceInput
                            }
                            onChange={(
                                event
                            ) =>
                                setReferenceInput(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="1 2 3 1 4 2 5..."
                            style={
                                inputStyle
                            }
                        />

                    </label>


                    <label
                        style={{
                            display: "flex",
                            flexDirection:
                                "column",
                            gap: "6px"
                        }}
                    >

                        <span
                            style={{
                                fontSize:
                                    "10px",
                                color:
                                    "#7e8ba0",
                                textTransform:
                                    "uppercase",
                                letterSpacing:
                                    "0.08em"
                            }}
                        >
                            Frames
                        </span>

                        <input
                            type="number"
                            min="1"
                            max="32"
                            value={
                                frameCount
                            }
                            onChange={(
                                event
                            ) =>
                                setFrameCount(
                                    Number(
                                        event
                                            .target
                                            .value
                                    )
                                )
                            }
                            style={
                                inputStyle
                            }
                        />

                    </label>


                    <div
                        style={{
                            display:
                                "flex",
                            gap: "8px",
                            flexWrap:
                                "wrap"
                        }}
                    >

                        <button
                            onClick={
                                runSimulation
                            }
                            disabled={
                                loading
                            }
                            style={
                                primaryButtonStyle
                            }
                        >
                            {
                                loading
                                    ? "Running..."
                                    : "Simulate"
                            }
                        </button>


                        <button
                            onClick={
                                runComparison
                            }
                            disabled={
                                loadingComparison
                            }
                            style={
                                secondaryButtonStyle
                            }
                        >
                            {
                                loadingComparison
                                    ? "Comparing..."
                                    : "Compare"
                            }
                        </button>


                        <button
                            onClick={
                                clearSimulation
                            }
                            style={
                                ghostButtonStyle
                            }
                        >
                            Clear
                        </button>

                    </div>

                </div>


                {selectedAlgorithm && (
                    <div
                        style={{
                            marginBottom:
                                "14px",
                            color:
                                "#7f8ca1",
                            fontSize:
                                "11px"
                        }}
                    >
                        <strong
                            style={{
                                color:
                                    "#aab6ca"
                            }}
                        >
                            {
                                selectedAlgorithm.name
                            }:
                        </strong>{" "}
                        {
                            selectedAlgorithm.description
                        }
                    </div>
                )}


                {/* ERRORS */}

                {error && (
                    <div
                        style={
                            errorStyle
                        }
                    >
                        {error}
                    </div>
                )}


                {comparisonError && (
                    <div
                        style={
                            errorStyle
                        }
                    >
                        {
                            comparisonError
                        }
                    </div>
                )}


                {/* STATISTICS */}

                {result && (
                    <div
                        style={{
                            display:
                                "grid",
                            gridTemplateColumns:
                                "repeat(6, minmax(100px, 1fr))",
                            gap: "9px",
                            marginBottom:
                                "16px"
                        }}
                    >

                        <StatCard
                            label="Page Faults"
                            value={
                                pageFaults
                            }
                        />

                        <StatCard
                            label="Page Hits"
                            value={
                                pageHits
                            }
                        />

                        <StatCard
                            label="Replacements"
                            value={
                                replacements
                            }
                        />

                        <StatCard
                            label="References"
                            value={
                                totalReferences
                            }
                        />

                        <StatCard
                            label="Fault Ratio"
                            value={
                                formatRatio(
                                    result.faultRatio
                                )
                            }
                        />

                        <StatCard
                            label="Hit Ratio"
                            value={
                                formatRatio(
                                    result.hitRatio
                                )
                            }
                        />

                    </div>
                )}


                {/* SIMULATION TRACE */}

                {result && (
                    <section
                        style={
                            panelStyle
                        }
                    >

                        <div
                            style={
                                panelHeaderStyle
                            }
                        >

                            <div>

                                <div
                                    style={
                                        panelTitleStyle
                                    }
                                >
                                    Simulation Trace
                                </div>

                                <div
                                    style={
                                        panelSubtitleStyle
                                    }
                                >
                                    {
                                        algorithmName(
                                            result.algorithm ||
                                            algorithm
                                        )
                                    }{" "}
                                    ·{" "}
                                    {
                                        result.frameCount ||
                                        frameCount
                                    }{" "}
                                    frames
                                </div>

                            </div>


                            {steps.length >
                                0 && (
                                    <div
                                        style={{
                                            color:
                                                "#7e8ba0",
                                            fontSize:
                                                "11px"
                                        }}
                                    >
                                        Step{" "}
                                        {Math.min(
                                            activeStep +
                                            1,
                                            steps.length
                                        )}{" "}
                                        /{" "}
                                        {
                                            steps.length
                                        }
                                    </div>
                                )}

                        </div>


                        {steps.length >
                            0 ? (
                            <>

                                <div
                                    style={{
                                        overflowX:
                                            "auto"
                                    }}
                                >

                                    <table
                                        style={{
                                            width:
                                                "100%",
                                            borderCollapse:
                                                "collapse",
                                            fontSize:
                                                "11px"
                                        }}
                                    >

                                        <thead>

                                            <tr>

                                                <th
                                                    style={
                                                        thStyle
                                                    }
                                                >
                                                    #
                                                </th>

                                                <th
                                                    style={
                                                        thStyle
                                                    }
                                                >
                                                    Page
                                                </th>

                                                {Array.from(
                                                    {
                                                        length:
                                                            result.frameCount ||
                                                            frameCount
                                                    },
                                                    (
                                                        _,
                                                        index
                                                    ) => (
                                                        <th
                                                            key={
                                                                index
                                                            }
                                                            style={
                                                                thStyle
                                                            }
                                                        >
                                                            Frame{" "}
                                                            {
                                                                index +
                                                                1
                                                            }
                                                        </th>
                                                    )
                                                )}

                                                <th
                                                    style={
                                                        thStyle
                                                    }
                                                >
                                                    Result
                                                </th>

                                                <th
                                                    style={
                                                        thStyle
                                                    }
                                                >
                                                    Replacement
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {steps.map(
                                                (
                                                    step,
                                                    index
                                                ) => {

                                                    const frames =
                                                        normalizeFrames(
                                                            getStepFrames(
                                                                step
                                                            )
                                                        );

                                                    const page =
                                                        getStepPage(
                                                            step
                                                        );

                                                    const fault =
                                                        getStepFault(
                                                            step
                                                        );

                                                    const replacement =
                                                        getStepReplacement(
                                                            step
                                                        );

                                                    return (
                                                        <tr
                                                            key={`step-${index}`}
                                                            onClick={() =>
                                                                setActiveStep(
                                                                    index
                                                                )
                                                            }
                                                            style={{
                                                                cursor:
                                                                    "pointer",
                                                                background:
                                                                    index ===
                                                                        activeStep
                                                                        ? "rgba(111,140,255,0.09)"
                                                                        : "transparent"
                                                            }}
                                                        >

                                                            <td
                                                                style={{
                                                                    ...tdStyle,
                                                                    color:
                                                                        "#7d8ba2"
                                                                }}
                                                            >
                                                                {
                                                                    index +
                                                                    1
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    ...tdStyle,
                                                                    fontWeight:
                                                                        700,
                                                                    color:
                                                                        "#dce5f5"
                                                                }}
                                                            >
                                                                {
                                                                    page ??
                                                                    "—"
                                                                }
                                                            </td>


                                                            {Array.from(
                                                                {
                                                                    length:
                                                                        result.frameCount ||
                                                                        frameCount
                                                                },
                                                                (
                                                                    _,
                                                                    frameIndex
                                                                ) => {

                                                                    const value =
                                                                        frames[
                                                                        frameIndex
                                                                        ];

                                                                    return (
                                                                        <td
                                                                            key={
                                                                                frameIndex
                                                                            }
                                                                            style={
                                                                                tdStyle
                                                                            }
                                                                        >
                                                                            <span
                                                                                style={{
                                                                                    display:
                                                                                        "inline-flex",
                                                                                    minWidth:
                                                                                        "25px",
                                                                                    height:
                                                                                        "25px",
                                                                                    alignItems:
                                                                                        "center",
                                                                                    justifyContent:
                                                                                        "center",
                                                                                    borderRadius:
                                                                                        "6px",
                                                                                    background:
                                                                                        value ===
                                                                                            null ||
                                                                                            value ===
                                                                                            undefined
                                                                                            ? "rgba(255,255,255,0.035)"
                                                                                            : "rgba(111,140,255,0.12)",
                                                                                    color:
                                                                                        value ===
                                                                                            null ||
                                                                                            value ===
                                                                                            undefined
                                                                                            ? "#4e5a6d"
                                                                                            : "#d7e0f4"
                                                                                }}
                                                                            >
                                                                                {
                                                                                    value ??
                                                                                    "—"
                                                                                }
                                                                            </span>
                                                                        </td>
                                                                    );
                                                                }
                                                            )}


                                                            <td
                                                                style={{
                                                                    ...tdStyle,
                                                                    fontWeight:
                                                                        700,
                                                                    color:
                                                                        fault
                                                                            ? "#ff9b9b"
                                                                            : "#86d8a4"
                                                                }}
                                                            >
                                                                {
                                                                    fault
                                                                        ? "FAULT"
                                                                        : "HIT"
                                                                }
                                                            </td>


                                                            <td
                                                                style={{
                                                                    ...tdStyle,
                                                                    color:
                                                                        "#aab6ca"
                                                                }}
                                                            >
                                                                {
                                                                    replacement ??
                                                                    "—"
                                                                }
                                                            </td>

                                                        </tr>
                                                    );
                                                }
                                            )}

                                        </tbody>

                                    </table>

                                </div>


                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "center",
                                        gap:
                                            "10px",
                                        padding:
                                            "10px 0 10px",
                                        margin:
                                            "0 10px"
                                    }}
                                >

                                    <button
                                        onClick={() =>
                                            setActiveStep(
                                                (
                                                    current
                                                ) =>
                                                    Math.max(
                                                        0,
                                                        current -
                                                        1
                                                    )
                                            )
                                        }
                                        disabled={
                                            activeStep <=
                                            0
                                        }
                                        style={
                                            ghostButtonStyle
                                        }
                                    >
                                        ← Previous
                                    </button>


                                    <span
                                        style={{
                                            color:
                                                "#68758a",
                                            fontSize:
                                                "10px"
                                        }}
                                    >
                                        Click a row to
                                        inspect that
                                        reference
                                    </span>


                                    <button
                                        onClick={() =>
                                            setActiveStep(
                                                (
                                                    current
                                                ) =>
                                                    Math.min(
                                                        steps.length -
                                                        1,
                                                        current +
                                                        1
                                                    )
                                            )
                                        }
                                        disabled={
                                            activeStep >=
                                            steps.length -
                                            1
                                        }
                                        style={
                                            ghostButtonStyle
                                        }
                                    >
                                        Next →
                                    </button>

                                </div>

                            </>
                        ) : (
                            <div
                                style={
                                    emptyStyle
                                }
                            >
                                The backend returned
                                no simulation steps.
                            </div>
                        )}

                    </section>
                )}


                {/* =====================================================
                    ALGORITHM COMPARISON
                   ===================================================== */}

                <section
                    style={{
                        ...panelStyle,
                        marginTop:
                            "16px"
                    }}
                >

                    <div
                        style={
                            panelHeaderStyle
                        }
                    >

                        <div>

                            <div
                                style={
                                    panelTitleStyle
                                }
                            >
                                Algorithm Comparison
                            </div>

                            <div
                                style={
                                    panelSubtitleStyle
                                }
                            >
                                Same reference string
                                and frame count
                                evaluated by every
                                algorithm.
                            </div>

                        </div>


                        {comparisonRows.length >
                            0 && (
                                <div
                                    style={{
                                        fontSize:
                                            "10px",
                                        color:
                                            "#86d8a4"
                                    }}
                                >
                                    {
                                        comparisonRows.length
                                    }{" "}
                                    algorithms
                                </div>
                            )}

                    </div>


                    {comparisonRows.length >
                        0 ? (
                        <div
                            style={{
                                overflowX:
                                    "auto"
                            }}
                        >

                            <table
                                style={{
                                    width:
                                        "100%",
                                    borderCollapse:
                                        "collapse",
                                    fontSize:
                                        "11px"
                                }}
                            >

                                <thead>

                                    <tr>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Algorithm
                                        </th>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Faults
                                        </th>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Hits
                                        </th>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Replacements
                                        </th>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Fault Ratio
                                        </th>

                                        <th
                                            style={
                                                thStyle
                                            }
                                        >
                                            Hit Ratio
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {comparisonRows.map(
                                        (
                                            row,
                                            index
                                        ) => {

                                            const name =
                                                row.algorithm ||
                                                row.name ||
                                                row.id ||
                                                `Algorithm ${index + 1}`;

                                            return (
                                                <tr
                                                    key={`${name}-${index}`}
                                                >

                                                    <td
                                                        style={{
                                                            ...tdStyle,
                                                            fontWeight:
                                                                700,
                                                            color:
                                                                "#dce5f5"
                                                        }}
                                                    >
                                                        {
                                                            algorithmName(
                                                                name
                                                            )
                                                        }
                                                    </td>


                                                    <td
                                                        style={
                                                            tdStyle
                                                        }
                                                    >
                                                        {
                                                            row.pageFaults ??
                                                            0
                                                        }
                                                    </td>


                                                    <td
                                                        style={
                                                            tdStyle
                                                        }
                                                    >
                                                        {
                                                            row.pageHits ??
                                                            0
                                                        }
                                                    </td>


                                                    <td
                                                        style={
                                                            tdStyle
                                                        }
                                                    >
                                                        {
                                                            row.replacements ??
                                                            0
                                                        }
                                                    </td>


                                                    <td
                                                        style={
                                                            tdStyle
                                                        }
                                                    >
                                                        {formatRatio(
                                                            Number(
                                                                row.faultRatio
                                                            )
                                                        )}
                                                    </td>


                                                    <td
                                                        style={
                                                            tdStyle
                                                        }
                                                    >
                                                        {formatRatio(
                                                            Number(
                                                                row.hitRatio
                                                            )
                                                        )}
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    ) : (
                        <div
                            style={{
                                padding:
                                    "30px 20px",
                                textAlign:
                                    "center",
                                color:
                                    "#68758a",
                                fontSize:
                                    "11px"
                            }}
                        >
                            Click{" "}
                            <strong
                                style={{
                                    color:
                                        "#9ba8bb"
                                }}
                            >
                                Compare
                            </strong>{" "}
                            to evaluate FIFO, LRU,
                            Optimal, Second Chance
                            and Clock using the same
                            reference string.
                        </div>
                    )}

                </section>


                {/* EMPTY STATE */}

                {!result &&
                    comparisonRows.length ===
                    0 &&
                    !error &&
                    !comparisonError && (
                        <div
                            style={{
                                ...panelStyle,
                                minHeight:
                                    "180px",
                                marginTop:
                                    "16px",
                                display:
                                    "flex",
                                flexDirection:
                                    "column",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "center",
                                textAlign:
                                    "center"
                            }}
                        >

                            <div
                                style={{
                                    width:
                                        "46px",
                                    height:
                                        "46px",
                                    borderRadius:
                                        "12px",
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    marginBottom:
                                        "12px",
                                    background:
                                        "rgba(111,140,255,0.08)",
                                    border:
                                        "1px solid rgba(111,140,255,0.14)",
                                    color:
                                        "#8da4ff",
                                    fontSize:
                                        "20px"
                                }}
                            >
                                ▦
                            </div>


                            <div
                                style={{
                                    fontSize:
                                        "14px",
                                    fontWeight:
                                        700,
                                    marginBottom:
                                        "5px"
                                }}
                            >
                                Ready for simulation
                            </div>


                            <div
                                style={{
                                    maxWidth:
                                        "500px",
                                    color:
                                        "#78859a",
                                    fontSize:
                                        "11px",
                                    lineHeight:
                                        1.6
                                }}
                            >
                                Enter a page reference
                                string, choose the
                                number of frames, and
                                run a simulation or
                                comparison.
                            </div>

                        </div>
                    )}

            </div>

        </div>
    );
}


const inputStyle = {
    width: "100%",
    height: "34px",
    boxSizing: "border-box",
    borderRadius: "7px",
    border:
        "1px solid rgba(255,255,255,0.09)",
    outline: "none",
    background:
        "rgba(0,0,0,0.18)",
    color: "#e7edf8",
    padding: "0 10px",
    fontSize: "11px"
};


const primaryButtonStyle = {
    height: "34px",
    border: "none",
    borderRadius: "7px",
    padding: "0 14px",
    background: "#6f8cff",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer"
};


const secondaryButtonStyle = {
    height: "34px",
    border:
        "1px solid rgba(111,140,255,0.28)",
    borderRadius: "7px",
    padding: "0 14px",
    background:
        "rgba(111,140,255,0.08)",
    color: "#a9b9ff",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer"
};


const ghostButtonStyle = {
    height: "34px",
    border:
        "1px solid rgba(255,255,255,0.09)",
    borderRadius: "7px",
    padding: "0 12px",
    background:
        "rgba(255,255,255,0.025)",
    color: "#a5b0c2",
    fontSize: "11px",
    cursor: "pointer"
};


const panelStyle = {
    border:
        "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    background:
        "rgba(255,255,255,0.025)",
    overflow: "hidden"
};


const panelHeaderStyle = {
    minHeight: "54px",
    padding: "10px 14px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent:
        "space-between",
    gap: "15px",
    borderBottom:
        "1px solid rgba(255,255,255,0.06)"
};


const panelTitleStyle = {
    fontSize: "12px",
    fontWeight: 700,
    color: "#dce5f4"
};


const panelSubtitleStyle = {
    marginTop: "3px",
    fontSize: "10px",
    color: "#707d91"
};


const thStyle = {
    padding: "9px 10px",
    textAlign: "left",
    color: "#69768a",
    fontSize: "9px",
    fontWeight: 700,
    textTransform:
        "uppercase",
    letterSpacing:
        "0.06em",
    borderBottom:
        "1px solid rgba(255,255,255,0.06)"
};


const tdStyle = {
    padding: "8px 10px",
    borderBottom:
        "1px solid rgba(255,255,255,0.045)",
    color: "#9ba8bb"
};


const errorStyle = {
    padding: "10px 12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border:
        "1px solid rgba(255,100,100,0.2)",
    background:
        "rgba(255,80,80,0.07)",
    color: "#ffaaaa",
    fontSize: "11px"
};


const emptyStyle = {
    padding: "35px 20px",
    textAlign: "center",
    color: "#68758a",
    fontSize: "11px"
};