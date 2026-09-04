import { useEffect, useRef, useState } from "react";

const MIN_WIDTH = 360;
const MIN_HEIGHT = 240;

function WindowManager({
    windows = [],
    onFocus,
    onMinimize,
    onMaximize,
    onRestore,
    onClose,
    renderWindow
}) {
    const [positions, setPositions] = useState({});
    const [sizes, setSizes] = useState({});
    const [dragging, setDragging] = useState(null);
    const [resizing, setResizing] = useState(null);

    const dragOffset = useRef({ x: 0, y: 0 });

    const resizeStart = useRef({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        left: 0,
        top: 0
    });

    /*
     * =====================================================
     * INITIALIZE WINDOW POSITIONS AND SIZES
     * =====================================================
     */

    useEffect(() => {
        setPositions((current) => {
            const next = { ...current };

            windows.forEach((windowData) => {
                if (!next[windowData.id]) {
                    next[windowData.id] = {
                        x: windowData.x ?? 80,
                        y: windowData.y ?? 80
                    };
                }
            });

            return next;
        });

        setSizes((current) => {
            const next = { ...current };

            windows.forEach((windowData) => {
                if (!next[windowData.id]) {
                    next[windowData.id] = {
                        width: windowData.width ?? 900,
                        height: windowData.height ?? 600
                    };
                }
            });

            return next;
        });
    }, [windows]);

    /*
     * =====================================================
     * DRAGGING
     * =====================================================
     */

    useEffect(() => {
        if (!dragging) {
            return undefined;
        }

        const handleMove = (event) => {
            setPositions((current) => ({
                ...current,
                [dragging.id]: {
                    x:
                        event.clientX -
                        dragOffset.current.x,

                    y:
                        event.clientY -
                        dragOffset.current.y
                }
            }));
        };

        const handleUp = () => {
            setDragging(null);
        };

        window.addEventListener(
            "mousemove",
            handleMove
        );

        window.addEventListener(
            "mouseup",
            handleUp
        );

        return () => {
            window.removeEventListener(
                "mousemove",
                handleMove
            );

            window.removeEventListener(
                "mouseup",
                handleUp
            );
        };
    }, [dragging]);

    /*
     * =====================================================
     * RESIZING
     * =====================================================
     */

    useEffect(() => {
        if (!resizing) {
            return undefined;
        }

        const handleMove = (event) => {
            const {
                direction,
                id
            } = resizing;

            const start =
                resizeStart.current;

            const deltaX =
                event.clientX - start.x;

            const deltaY =
                event.clientY - start.y;

            let width = start.width;
            let height = start.height;
            let x = start.left;
            let y = start.top;

            /*
             * RIGHT
             */

            if (
                direction.includes("right")
            ) {
                width = Math.max(
                    MIN_WIDTH,
                    start.width + deltaX
                );
            }

            /*
             * LEFT
             */

            if (
                direction.includes("left")
            ) {
                width = Math.max(
                    MIN_WIDTH,
                    start.width - deltaX
                );

                if (
                    width !== MIN_WIDTH ||
                    start.width - deltaX >=
                        MIN_WIDTH
                ) {
                    x =
                        start.left +
                        deltaX;
                }

                if (
                    width === MIN_WIDTH &&
                    start.width - deltaX <
                        MIN_WIDTH
                ) {
                    x =
                        start.left +
                        start.width -
                        MIN_WIDTH;
                }
            }

            /*
             * BOTTOM
             */

            if (
                direction.includes("bottom")
            ) {
                height = Math.max(
                    MIN_HEIGHT,
                    start.height + deltaY
                );
            }

            /*
             * TOP
             */

            if (
                direction.includes("top")
            ) {
                height = Math.max(
                    MIN_HEIGHT,
                    start.height - deltaY
                );

                if (
                    height !== MIN_HEIGHT ||
                    start.height - deltaY >=
                        MIN_HEIGHT
                ) {
                    y =
                        start.top +
                        deltaY;
                }

                if (
                    height === MIN_HEIGHT &&
                    start.height - deltaY <
                        MIN_HEIGHT
                ) {
                    y =
                        start.top +
                        start.height -
                        MIN_HEIGHT;
                }
            }

            setSizes((current) => ({
                ...current,
                [id]: {
                    width,
                    height
                }
            }));

            setPositions((current) => ({
                ...current,
                [id]: {
                    x,
                    y
                }
            }));
        };

        const handleUp = () => {
            setResizing(null);
        };

        window.addEventListener(
            "mousemove",
            handleMove
        );

        window.addEventListener(
            "mouseup",
            handleUp
        );

        return () => {
            window.removeEventListener(
                "mousemove",
                handleMove
            );

            window.removeEventListener(
                "mouseup",
                handleUp
            );
        };
    }, [resizing]);

    /*
     * =====================================================
     * START DRAG
     * =====================================================
     */

    const startDrag = (
        event,
        windowData
    ) => {
        if (
            windowData.state ===
                "maximized" ||
            windowData.state ===
                "minimized" ||
            windowData.state ===
                "closed"
        ) {
            return;
        }

        if (
            event.button !== 0
        ) {
            return;
        }

        onFocus?.(
            windowData.id
        );

        const position =
            positions[windowData.id] ??
            {
                x:
                    windowData.x ??
                    80,

                y:
                    windowData.y ??
                    80
            };

        dragOffset.current = {
            x:
                event.clientX -
                position.x,

            y:
                event.clientY -
                position.y
        };

        setDragging(
            windowData
        );
    };

    /*
     * =====================================================
     * START RESIZE
     * =====================================================
     */

    const startResize = (
        event,
        windowData,
        direction
    ) => {
        if (
            windowData.state ===
                "maximized" ||
            windowData.state ===
                "minimized" ||
            windowData.state ===
                "closed"
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        onFocus?.(
            windowData.id
        );

        const position =
            positions[windowData.id] ??
            {
                x:
                    windowData.x ??
                    80,

                y:
                    windowData.y ??
                    80
            };

        const size =
            sizes[windowData.id] ??
            {
                width:
                    windowData.width ??
                    900,

                height:
                    windowData.height ??
                    600
            };

        resizeStart.current = {
            x:
                event.clientX,

            y:
                event.clientY,

            width:
                size.width,

            height:
                size.height,

            left:
                position.x,

            top:
                position.y
        };

        setResizing({
            id:
                windowData.id,

            direction
        });
    };

    /*
     * =====================================================
     * VISIBLE WINDOWS
     * =====================================================
     */

    const visibleWindows =
        windows.filter(
            (windowData) =>
                windowData.state !==
                    "closed" &&
                windowData.state !==
                    "minimized"
        );

    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (
        <div className="nova-window-layer">
            {visibleWindows.map(
                (windowData) => {
                    const position =
                        positions[
                            windowData.id
                        ] ?? {
                            x:
                                windowData.x ??
                                80,

                            y:
                                windowData.y ??
                                80
                        };

                    const size =
                        sizes[
                            windowData.id
                        ] ?? {
                            width:
                                windowData.width ??
                                900,

                            height:
                                windowData.height ??
                                600
                        };

                    const maximized =
                        windowData.state ===
                        "maximized";

                    return (
                        <div
                            key={
                                windowData.id
                            }
                            className={`nova-window ${
                                windowData.focused
                                    ? "focused"
                                    : ""
                            } ${
                                maximized
                                    ? "maximized"
                                    : ""
                            }`}
                            style={
                                maximized
                                    ? {
                                          zIndex:
                                              windowData.zIndex ??
                                              1
                                      }
                                    : {
                                          left: `${position.x}px`,

                                          top: `${position.y}px`,

                                          width: `${size.width}px`,

                                          height: `${size.height}px`,

                                          zIndex:
                                              windowData.zIndex ??
                                              1
                                      }
                            }
                            onMouseDown={() =>
                                onFocus?.(
                                    windowData.id
                                )
                            }
                        >
                            {/* =================================================
                               TITLE BAR
                               ================================================= */}

                            <div
                                className="nova-window-titlebar"
                                onMouseDown={(
                                    event
                                ) =>
                                    startDrag(
                                        event,
                                        windowData
                                    )
                                }
                            >
                                <div className="nova-window-title">
                                    <span className="nova-window-icon">
                                        N
                                    </span>

                                    <span>
                                        {
                                            windowData.title
                                        }
                                    </span>
                                </div>

                                <div className="nova-window-controls">
                                    <button
                                        type="button"
                                        title="Minimize"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            event.stopPropagation()
                                        }
                                        onClick={() =>
                                            onMinimize?.(
                                                windowData.id
                                            )
                                        }
                                    >
                                        −
                                    </button>

                                    <button
                                        type="button"
                                        title={
                                            maximized
                                                ? "Restore"
                                                : "Maximize"
                                        }
                                        onMouseDown={(
                                            event
                                        ) =>
                                            event.stopPropagation()
                                        }
                                        onClick={() =>
                                            maximized
                                                ? onRestore?.(
                                                      windowData.id
                                                  )
                                                : onMaximize?.(
                                                      windowData.id
                                                  )
                                        }
                                    >
                                        {maximized
                                            ? "❐"
                                            : "□"}
                                    </button>

                                    <button
                                        type="button"
                                        title="Close"
                                        className="close"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            event.stopPropagation()
                                        }
                                        onClick={() =>
                                            onClose?.(
                                                windowData.id
                                            )
                                        }
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {/* =================================================
                               WINDOW CONTENT
                               ================================================= */}

                            <div className="nova-window-content">
                                {renderWindow
                                    ? renderWindow(
                                          windowData
                                      )
                                    : (
                                          <div className="nova-window-placeholder">
                                              <div className="nova-placeholder-logo">
                                                  N
                                              </div>

                                              <h3>
                                                  {
                                                      windowData.title
                                                  }
                                              </h3>

                                              <p>
                                                  NovaOS
                                                  application
                                                  window
                                              </p>

                                              <span>
                                                  PID:{" "}
                                                  {
                                                      windowData.processId
                                                  }
                                              </span>
                                          </div>
                                      )}
                            </div>

                            {/* =================================================
                               RESIZE HANDLES
                               ================================================= */}

                            {!maximized && (
                                <>
                                    {/* TOP */}

                                    <div
                                        className="nova-resize-handle nova-resize-top"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "top"
                                            )
                                        }
                                    />

                                    {/* RIGHT */}

                                    <div
                                        className="nova-resize-handle nova-resize-right"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "right"
                                            )
                                        }
                                    />

                                    {/* BOTTOM */}

                                    <div
                                        className="nova-resize-handle nova-resize-bottom"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "bottom"
                                            )
                                        }
                                    />

                                    {/* LEFT */}

                                    <div
                                        className="nova-resize-handle nova-resize-left"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "left"
                                            )
                                        }
                                    />

                                    {/* TOP LEFT */}

                                    <div
                                        className="nova-resize-handle nova-resize-top-left"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "top-left"
                                            )
                                        }
                                    />

                                    {/* TOP RIGHT */}

                                    <div
                                        className="nova-resize-handle nova-resize-top-right"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "top-right"
                                            )
                                        }
                                    />

                                    {/* BOTTOM LEFT */}

                                    <div
                                        className="nova-resize-handle nova-resize-bottom-left"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "bottom-left"
                                            )
                                        }
                                    />

                                    {/* BOTTOM RIGHT */}

                                    <div
                                        className="nova-resize-handle nova-resize-bottom-right"
                                        onMouseDown={(
                                            event
                                        ) =>
                                            startResize(
                                                event,
                                                windowData,
                                                "bottom-right"
                                            )
                                        }
                                    />
                                </>
                            )}
                        </div>
                    );
                }
            )}
        </div>
    );
}

export default WindowManager;