import { useEffect, useRef, useState } from "react";

const NOTIFICATION_API = "/api/notifications";
const AUTH_API = "/api/auth";

function DesktopShell({
    children,
    onStartClick,
    minimizedWindows = [],
    onRestoreWindow
}) {
    const [time, setTime] = useState(new Date());

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationOpen, setNotificationOpen] =
        useState(false);
    const [notificationLoading, setNotificationLoading] =
        useState(false);

    const [currentUser, setCurrentUser] = useState(null);
    const [accountOpen, setAccountOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    const notificationPanelRef = useRef(null);
    const accountPanelRef = useRef(null);

    /*
     * =====================================================
     * CLOCK
     * =====================================================
     */

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    /*
     * =====================================================
     * AUTHENTICATED USER
     * =====================================================
     *
     * The authenticated user is retrieved from the real
     * NovaOS authentication API.
     *
     * No username or role is hardcoded here.
     */

    const fetchCurrentUser = async () => {
        try {
            const response = await fetch(
                `${AUTH_API}/current`
            );

            if (!response.ok) {
                throw new Error(
                    `Authentication request failed: ${response.status}`
                );
            }

            const result = await response.json();

            if (
                !result?.success ||
                !result?.authenticated ||
                !result?.user
            ) {
                setCurrentUser(null);
                return;
            }

            setCurrentUser(result.user);
        } catch (error) {
            console.warn(
                "NovaOS authentication service unavailable:",
                error.message
            );
        }
    };

    useEffect(() => {
        let mounted = true;

        const loadCurrentUser = async () => {
            if (!mounted) {
                return;
            }

            await fetchCurrentUser();
        };

        loadCurrentUser();

        /*
         * Keep the desktop synchronized with the real
         * authentication state maintained by the backend.
         */
        const authenticationTimer = setInterval(
            loadCurrentUser,
            5000
        );

        return () => {
            mounted = false;
            clearInterval(authenticationTimer);
        };
    }, []);

    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     */

    const handleLogout = async () => {
        if (logoutLoading) {
            return;
        }

        try {
            setLogoutLoading(true);

            const response = await fetch(
                `${AUTH_API}/logout`,
                {
                    method: "POST"
                }
            );

            const result = await response.json();

            if (
                !response.ok ||
                !result?.success
            ) {
                throw new Error(
                    result?.error ||
                    "Unable to log out of NovaOS."
                );
            }

            setCurrentUser(null);
            setAccountOpen(false);

            /*
             * App.jsx performs the authentication gate.
             * Reloading allows it to query /api/auth/current
             * again and return to the login screen.
             */
            window.location.reload();
        } catch (error) {
            console.warn(
                "NovaOS logout failed:",
                error.message
            );
        } finally {
            setLogoutLoading(false);
        }
    };

    /*
     * =====================================================
     * NOTIFICATIONS
     * =====================================================
     */

    const fetchNotifications = async () => {
        try {
            setNotificationLoading(true);

            const response = await fetch(
                `${NOTIFICATION_API}/snapshot`
            );

            if (!response.ok) {
                throw new Error(
                    `Notification request failed: ${response.status}`
                );
            }

            const result = await response.json();

            if (
                !result?.success ||
                !result?.data
            ) {
                throw new Error(
                    "Invalid notification response."
                );
            }

            setNotifications(
                Array.isArray(
                    result.data.notifications
                )
                    ? result.data.notifications
                    : []
            );

            setUnreadCount(
                Number(
                    result.data.unreadCount
                ) || 0
            );
        } catch (error) {
            /*
             * Notification failure should never prevent
             * the NovaOS desktop from rendering.
             */
            console.warn(
                "NovaOS notification service unavailable:",
                error.message
            );
        } finally {
            setNotificationLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!mounted) {
                return;
            }

            await fetchNotifications();
        };

        load();

        /*
         * NovaOS currently exposes notifications through
         * HTTP APIs rather than WebSockets.
         *
         * Polling keeps the Notification Center synchronized
         * with real backend runtime events.
         */
        const notificationTimer = setInterval(
            load,
            2500
        );

        return () => {
            mounted = false;
            clearInterval(notificationTimer);
        };
    }, []);

    /*
     * =====================================================
     * CLOSE PANELS WHEN CLICKING OUTSIDE
     * =====================================================
     */

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (
                notificationOpen &&
                notificationPanelRef.current &&
                !notificationPanelRef.current.contains(
                    event.target
                )
            ) {
                setNotificationOpen(false);
            }

            if (
                accountOpen &&
                accountPanelRef.current &&
                !accountPanelRef.current.contains(
                    event.target
                )
            ) {
                setAccountOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handlePointerDown
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handlePointerDown
            );
        };
    }, [
        notificationOpen,
        accountOpen
    ]);

    /*
     * =====================================================
     * NOTIFICATION ACTIONS
     * =====================================================
     */

    const markNotificationRead = async (
        notificationId
    ) => {
        try {
            const response = await fetch(
                `${NOTIFICATION_API}/${encodeURIComponent(
                    notificationId
                )}/read`,
                {
                    method: "POST"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to mark notification as read: ${response.status}`
                );
            }

            await fetchNotifications();
        } catch (error) {
            console.warn(
                "Unable to mark notification as read:",
                error.message
            );
        }
    };

    const markAllNotificationsRead = async () => {
        if (unreadCount === 0) {
            return;
        }

        try {
            const response = await fetch(
                `${NOTIFICATION_API}/read-all`,
                {
                    method: "POST"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to mark notifications as read: ${response.status}`
                );
            }

            await fetchNotifications();
        } catch (error) {
            console.warn(
                "Unable to mark all notifications as read:",
                error.message
            );
        }
    };

    const removeNotification = async (
        notificationId
    ) => {
        try {
            const response = await fetch(
                `${NOTIFICATION_API}/${encodeURIComponent(
                    notificationId
                )}`,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to remove notification: ${response.status}`
                );
            }

            await fetchNotifications();
        } catch (error) {
            console.warn(
                "Unable to remove notification:",
                error.message
            );
        }
    };

    const clearAllNotifications = async () => {
        if (notifications.length === 0) {
            return;
        }

        try {
            const response = await fetch(
                NOTIFICATION_API,
                {
                    method: "DELETE"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to clear notifications: ${response.status}`
                );
            }

            await fetchNotifications();
        } catch (error) {
            console.warn(
                "Unable to clear notifications:",
                error.message
            );
        }
    };

    /*
     * =====================================================
     * NOTIFICATION HELPERS
     * =====================================================
     */

    const getNotificationTypeClass = (
        notification
    ) => {
        const type =
            notification?.type?.toLowerCase();

        if (type === "success") {
            return "success";
        }

        if (type === "warning") {
            return "warning";
        }

        if (type === "error") {
            return "error";
        }

        return "info";
    };

    const getNotificationTypeSymbol = (
        notification
    ) => {
        const type =
            notification?.type?.toLowerCase();

        if (type === "success") {
            return "✓";
        }

        if (type === "warning") {
            return "!";
        }

        if (type === "error") {
            return "×";
        }

        return "i";
    };

    const formatNotificationTime = (
        timestamp
    ) => {
        if (!timestamp) {
            return "";
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatNotificationSource = (
        source
    ) => {
        if (!source) {
            return "System";
        }

        return source
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (character) =>
                character.toUpperCase()
            );
    };

    /*
     * =====================================================
     * USER HELPERS
     * =====================================================
     */

    const userInitial =
        currentUser?.displayName
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase() ||
        currentUser?.username
            ?.charAt(0)
            ?.toUpperCase() ||
        "N";

    const userRole =
        currentUser?.role === "admin"
            ? "ADMIN"
            : "USER";

    /*
     * =====================================================
     * RENDER
     * =====================================================
     */

    return (
        <div className="nova-desktop">

            <div className="nova-desktop-background">
                <div className="nova-grid" />
                <div className="nova-glow nova-glow-one" />
                <div className="nova-glow nova-glow-two" />
            </div>

            <div className="nova-desktop-content">
                {children}
            </div>

            {/* =================================================
                NOTIFICATION CENTER
               ================================================= */}

            {notificationOpen && (
                <div
                    ref={notificationPanelRef}
                    style={{
                        position: "fixed",
                        right: "18px",
                        bottom: "76px",
                        width: "390px",
                        maxWidth:
                            "calc(100vw - 36px)",
                        maxHeight:
                            "min(620px, 75vh)",
                        display: "flex",
                        flexDirection: "column",
                        zIndex: 10000,
                        overflow: "hidden",
                        border:
                            "1px solid var(--nova-ui-border)",
                        borderRadius: "16px",
                        background:
                            "var(--nova-ui-surface)",
                        color:
                            "var(--nova-ui-text)",
                        boxShadow:
                            "0 20px 60px rgba(0, 0, 0, 0.35)",
                        backdropFilter:
                            "blur(18px)"
                    }}
                >

                    {/* Header */}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                                "space-between",
                            gap: "12px",
                            padding: "16px",
                            borderBottom:
                                "1px solid var(--nova-ui-border)",
                            flex: "0 0 auto"
                        }}
                    >

                        <div>

                            <div
                                style={{
                                    fontSize:
                                        "15px",
                                    fontWeight:
                                        700,
                                    color:
                                        "var(--nova-ui-text-strong)"
                                }}
                            >
                                Notifications
                            </div>

                            <div
                                style={{
                                    marginTop:
                                        "3px",
                                    fontSize:
                                        "12px",
                                    color:
                                        "var(--nova-ui-text-muted)"
                                }}
                            >
                                {unreadCount > 0
                                    ? `${unreadCount} unread`
                                    : "You're all caught up"}
                            </div>

                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: "6px"
                            }}
                        >

                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={
                                        markAllNotificationsRead
                                    }
                                    style={{
                                        border: "0",
                                        background:
                                            "transparent",
                                        color:
                                            "var(--nova-accent)",
                                        cursor:
                                            "pointer",
                                        fontSize:
                                            "11px",
                                        fontWeight:
                                            600,
                                        padding:
                                            "6px 7px",
                                        borderRadius:
                                            "7px"
                                    }}
                                >
                                    Mark all read
                                </button>
                            )}

                            {notifications.length >
                                0 && (
                                <button
                                    type="button"
                                    onClick={
                                        clearAllNotifications
                                    }
                                    style={{
                                        border: "0",
                                        background:
                                            "transparent",
                                        color:
                                            "var(--nova-ui-text-muted)",
                                        cursor:
                                            "pointer",
                                        fontSize:
                                            "11px",
                                        fontWeight:
                                            600,
                                        padding:
                                            "6px 7px",
                                        borderRadius:
                                            "7px"
                                    }}
                                >
                                    Clear
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    setNotificationOpen(
                                        false
                                    )
                                }
                                aria-label="Close notifications"
                                style={{
                                    width:
                                        "28px",
                                    height:
                                        "28px",
                                    border:
                                        "1px solid var(--nova-ui-border)",
                                    borderRadius:
                                        "8px",
                                    background:
                                        "var(--nova-ui-surface-2)",
                                    color:
                                        "var(--nova-ui-text)",
                                    cursor:
                                        "pointer",
                                    fontSize:
                                        "15px",
                                    lineHeight:
                                        1
                                }}
                            >
                                ×
                            </button>

                        </div>

                    </div>

                    {/* Notification list */}

                    <div
                        style={{
                            flex: "1 1 auto",
                            minHeight: 0,
                            overflowY: "auto",
                            padding: "8px"
                        }}
                    >

                        {notificationLoading &&
                            notifications.length ===
                                0 && (
                                <div
                                    style={{
                                        padding:
                                            "35px 18px",
                                        textAlign:
                                            "center",
                                        color:
                                            "var(--nova-ui-text-muted)",
                                        fontSize:
                                            "12px"
                                    }}
                                >
                                    Loading notifications...
                                </div>
                            )}

                        {!notificationLoading &&
                            notifications.length ===
                                0 && (
                                <div
                                    style={{
                                        padding:
                                            "45px 20px",
                                        textAlign:
                                            "center"
                                    }}
                                >

                                    <div
                                        style={{
                                            width:
                                                "52px",
                                            height:
                                                "52px",
                                            margin:
                                                "0 auto 14px",
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "center",
                                            borderRadius:
                                                "50%",
                                            background:
                                                "var(--nova-accent-soft)",
                                            color:
                                                "var(--nova-accent)",
                                            fontSize:
                                                "23px"
                                        }}
                                    >
                                        ✓
                                    </div>

                                    <div
                                        style={{
                                            fontSize:
                                                "14px",
                                            fontWeight:
                                                700,
                                            color:
                                                "var(--nova-ui-text-strong)"
                                        }}
                                    >
                                        No notifications
                                    </div>

                                    <div
                                        style={{
                                            marginTop:
                                                "5px",
                                            fontSize:
                                                "12px",
                                            lineHeight:
                                                1.5,
                                            color:
                                                "var(--nova-ui-text-muted)"
                                        }}
                                    >
                                        System events and
                                        application activity
                                        will appear here.
                                    </div>

                                </div>
                            )}

                        {notifications.map(
                            (notification) => {
                                const typeClass =
                                    getNotificationTypeClass(
                                        notification
                                    );

                                const typeSymbol =
                                    getNotificationTypeSymbol(
                                        notification
                                    );

                                return (
                                    <div
                                        key={
                                            notification.id
                                        }
                                        style={{
                                            position:
                                                "relative",
                                            display:
                                                "flex",
                                            gap:
                                                "11px",
                                            padding:
                                                "12px",
                                            marginBottom:
                                                "6px",
                                            border:
                                                "1px solid var(--nova-ui-border)",
                                            borderRadius:
                                                "11px",
                                            background:
                                                notification.read
                                                    ? "var(--nova-ui-surface-2)"
                                                    : "var(--nova-accent-soft)",
                                            opacity:
                                                notification.read
                                                    ? 0.78
                                                    : 1
                                        }}
                                    >

                                        {/* Type indicator */}

                                        <div
                                            style={{
                                                flex:
                                                    "0 0 auto",
                                                width:
                                                    "30px",
                                                height:
                                                    "30px",
                                                display:
                                                    "flex",
                                                alignItems:
                                                    "center",
                                                justifyContent:
                                                    "center",
                                                borderRadius:
                                                    "9px",
                                                background:
                                                    typeClass ===
                                                    "success"
                                                        ? "rgba(16, 185, 129, 0.14)"
                                                        : typeClass ===
                                                          "warning"
                                                            ? "rgba(245, 158, 11, 0.14)"
                                                            : typeClass ===
                                                              "error"
                                                                ? "rgba(239, 68, 68, 0.14)"
                                                                : "var(--nova-accent-soft)",
                                                color:
                                                    typeClass ===
                                                    "success"
                                                        ? "#10b981"
                                                        : typeClass ===
                                                          "warning"
                                                            ? "#f59e0b"
                                                            : typeClass ===
                                                              "error"
                                                                ? "#ef4444"
                                                                : "var(--nova-accent)",
                                                fontWeight:
                                                    800,
                                                fontSize:
                                                    "13px"
                                            }}
                                        >
                                            {typeSymbol}
                                        </div>

                                        {/* Content */}

                                        <div
                                            style={{
                                                flex:
                                                    "1 1 auto",
                                                minWidth:
                                                    0
                                            }}
                                        >

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "flex-start",
                                                    justifyContent:
                                                        "space-between",
                                                    gap:
                                                        "8px"
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        fontSize:
                                                            "12px",
                                                        fontWeight:
                                                            700,
                                                        lineHeight:
                                                            1.35,
                                                        color:
                                                            "var(--nova-ui-text-strong)"
                                                    }}
                                                >
                                                    {
                                                        notification.title
                                                    }
                                                </div>

                                                {!notification.read && (
                                                    <span
                                                        style={{
                                                            flex:
                                                                "0 0 auto",
                                                            width:
                                                                "7px",
                                                            height:
                                                                "7px",
                                                            marginTop:
                                                                "4px",
                                                            borderRadius:
                                                                "50%",
                                                            background:
                                                                "var(--nova-accent)",
                                                            boxShadow:
                                                                "0 0 10px var(--nova-accent)"
                                                        }}
                                                    />
                                                )}

                                            </div>

                                            <div
                                                style={{
                                                    marginTop:
                                                        "4px",
                                                    fontSize:
                                                        "11px",
                                                    lineHeight:
                                                        1.5,
                                                    color:
                                                        "var(--nova-ui-text)"
                                                }}
                                            >
                                                {
                                                    notification.message
                                                }
                                            </div>

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    flexWrap:
                                                        "wrap",
                                                    alignItems:
                                                        "center",
                                                    gap:
                                                        "6px",
                                                    marginTop:
                                                        "8px",
                                                    fontSize:
                                                        "9px",
                                                    color:
                                                        "var(--nova-ui-text-muted)"
                                                }}
                                            >

                                                <span>
                                                    {formatNotificationSource(
                                                        notification.source
                                                    )}
                                                </span>

                                                {notification.eventType && (
                                                    <>
                                                        <span>
                                                            •
                                                        </span>

                                                        <span>
                                                            {
                                                                notification.eventType
                                                            }
                                                        </span>
                                                    </>
                                                )}

                                                {notification.timestamp && (
                                                    <>
                                                        <span>
                                                            •
                                                        </span>

                                                        <span>
                                                            {formatNotificationTime(
                                                                notification.timestamp
                                                            )}
                                                        </span>
                                                    </>
                                                )}

                                            </div>

                                            {/* Actions */}

                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    gap:
                                                        "6px",
                                                    marginTop:
                                                        "8px"
                                                }}
                                            >

                                                {!notification.read && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            markNotificationRead(
                                                                notification.id
                                                            )
                                                        }
                                                        style={{
                                                            border:
                                                                "1px solid var(--nova-ui-border)",
                                                            borderRadius:
                                                                "6px",
                                                            background:
                                                                "var(--nova-ui-surface)",
                                                            color:
                                                                "var(--nova-ui-text)",
                                                            cursor:
                                                                "pointer",
                                                            padding:
                                                                "4px 7px",
                                                            fontSize:
                                                                "9px",
                                                            fontWeight:
                                                                600
                                                        }}
                                                    >
                                                        Mark read
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeNotification(
                                                            notification.id
                                                        )
                                                    }
                                                    style={{
                                                        border:
                                                            "1px solid var(--nova-ui-border)",
                                                        borderRadius:
                                                            "6px",
                                                        background:
                                                            "transparent",
                                                        color:
                                                            "var(--nova-ui-text-muted)",
                                                        cursor:
                                                            "pointer",
                                                        padding:
                                                            "4px 7px",
                                                        fontSize:
                                                            "9px",
                                                        fontWeight:
                                                            600
                                                    }}
                                                >
                                                    Remove
                                                </button>

                                            </div>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                </div>
            )}

            {/* =================================================
                ACCOUNT MENU
               ================================================= */}

            {accountOpen && (
                <div
                    ref={accountPanelRef}
                    style={{
                        position: "fixed",
                        right: "18px",
                        bottom: "76px",
                        width: "280px",
                        maxWidth:
                            "calc(100vw - 36px)",
                        zIndex: 10001,
                        overflow: "hidden",
                        border:
                            "1px solid var(--nova-ui-border)",
                        borderRadius: "16px",
                        background:
                            "var(--nova-ui-surface)",
                        color:
                            "var(--nova-ui-text)",
                        boxShadow:
                            "0 20px 60px rgba(0, 0, 0, 0.35)",
                        backdropFilter:
                            "blur(18px)"
                    }}
                >

                    <div
                        style={{
                            padding: "16px",
                            borderBottom:
                                "1px solid var(--nova-ui-border)"
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                alignItems:
                                    "center",
                                gap: "11px"
                            }}
                        >

                            <div
                                style={{
                                    width:
                                        "42px",
                                    height:
                                        "42px",
                                    flex:
                                        "0 0 auto",
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    borderRadius:
                                        "12px",
                                    background:
                                        "var(--nova-accent-soft)",
                                    color:
                                        "var(--nova-accent)",
                                    border:
                                        "1px solid var(--nova-accent-border)",
                                    fontSize:
                                        "16px",
                                    fontWeight:
                                        800
                                }}
                            >
                                {userInitial}
                            </div>

                            <div
                                style={{
                                    minWidth:
                                        0
                                }}
                            >

                                <div
                                    style={{
                                        fontSize:
                                            "13px",
                                        fontWeight:
                                            700,
                                        color:
                                            "var(--nova-ui-text-strong)",
                                        overflow:
                                            "hidden",
                                        textOverflow:
                                            "ellipsis",
                                        whiteSpace:
                                            "nowrap"
                                    }}
                                >
                                    {currentUser?.displayName ||
                                        currentUser?.username ||
                                        "NovaOS User"}
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "3px",
                                        fontSize:
                                            "10px",
                                        color:
                                            "var(--nova-ui-text-muted)"
                                    }}
                                >
                                    @{currentUser?.username ||
                                        "user"}
                                </div>

                            </div>

                        </div>

                    </div>

                    <div
                        style={{
                            padding:
                                "12px 16px"
                        }}
                    >

                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "space-between",
                                gap:
                                    "12px",
                                padding:
                                    "9px 10px",
                                borderRadius:
                                    "9px",
                                background:
                                    "var(--nova-ui-surface-2)"
                            }}
                        >

                            <span
                                style={{
                                    fontSize:
                                        "10px",
                                    color:
                                        "var(--nova-ui-text-muted)"
                                }}
                            >
                                Role
                            </span>

                            <span
                                style={{
                                    fontSize:
                                        "10px",
                                    fontWeight:
                                        800,
                                    color:
                                        "var(--nova-accent)"
                                }}
                            >
                                {userRole}
                            </span>

                        </div>

                        <div
                            style={{
                                marginTop:
                                    "8px",
                                fontSize:
                                    "10px",
                                lineHeight:
                                    1.5,
                                color:
                                    "var(--nova-ui-text-muted)"
                            }}
                        >
                            Authentication is managed by
                            the NovaOS kernel.
                        </div>

                    </div>

                    <div
                        style={{
                            padding:
                                "0 12px 12px"
                        }}
                    >

                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={
                                logoutLoading
                            }
                            style={{
                                width:
                                    "100%",
                                minHeight:
                                    "38px",
                                border:
                                    "1px solid var(--nova-ui-border)",
                                borderRadius:
                                    "9px",
                                background:
                                    "var(--nova-ui-surface-2)",
                                color:
                                    "var(--nova-ui-text)",
                                cursor:
                                    logoutLoading
                                        ? "wait"
                                        : "pointer",
                                fontSize:
                                    "11px",
                                fontWeight:
                                    700,
                                opacity:
                                    logoutLoading
                                        ? 0.65
                                        : 1
                            }}
                        >
                            {logoutLoading
                                ? "Signing out..."
                                : "Sign out"}
                        </button>

                    </div>

                </div>
            )}

            {/* =================================================
                TASKBAR
               ================================================= */}

            <div className="nova-taskbar">

                <button
                    type="button"
                    className="nova-start-button"
                    onClick={onStartClick}
                >
                    <span className="nova-logo">
                        N
                    </span>

                    <span>
                        NOVAOS
                    </span>
                </button>

                <div className="nova-taskbar-apps">

                    {minimizedWindows.map(
                        (windowData) => (
                            <button
                                key={
                                    windowData.id
                                }
                                type="button"
                                className="nova-taskbar-window"
                                onClick={() =>
                                    onRestoreWindow?.(
                                        windowData.id
                                    )
                                }
                                title={`Restore ${windowData.title}`}
                            >

                                <span className="nova-taskbar-window-icon">
                                    N
                                </span>

                                <span>
                                    {windowData.title}
                                </span>

                            </button>
                        )
                    )}

                </div>

                <div className="nova-taskbar-center">

                    <span className="nova-system-dot" />

                    <span>
                        Kernel Online
                    </span>

                </div>

                <div
                    className="nova-taskbar-right"
                    style={{
                        position:
                            "relative"
                    }}
                >

                    {/* Account */}

                    <button
                        type="button"
                        onClick={() => {
                            setAccountOpen(
                                (current) =>
                                    !current
                            );
                            setNotificationOpen(
                                false
                            );
                        }}
                        aria-label="Open account menu"
                        title={
                            currentUser
                                ? `${currentUser.displayName} (${userRole})`
                                : "Account"
                        }
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap:
                                "7px",
                            height:
                                "34px",
                            padding:
                                "0 8px",
                            border:
                                accountOpen
                                    ? "1px solid var(--nova-accent)"
                                    : "1px solid transparent",
                            borderRadius:
                                "9px",
                            background:
                                accountOpen
                                    ? "var(--nova-accent-soft)"
                                    : "transparent",
                            color:
                                "var(--nova-ui-text)",
                            cursor:
                                "pointer",
                            transition:
                                "all 0.15s ease"
                        }}
                    >

                        <span
                            style={{
                                width:
                                    "24px",
                                height:
                                    "24px",
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                justifyContent:
                                    "center",
                                borderRadius:
                                    "8px",
                                background:
                                    "var(--nova-accent-soft)",
                                color:
                                    "var(--nova-accent)",
                                border:
                                    "1px solid var(--nova-accent-border)",
                                fontSize:
                                    "10px",
                                fontWeight:
                                    800
                            }}
                        >
                            {userInitial}
                        </span>

                        <span
                            style={{
                                display:
                                    "flex",
                                flexDirection:
                                    "column",
                                alignItems:
                                    "flex-start",
                                maxWidth:
                                    "130px"
                            }}
                        >

                            <span
                                style={{
                                    maxWidth:
                                        "130px",
                                    overflow:
                                        "hidden",
                                    textOverflow:
                                        "ellipsis",
                                    whiteSpace:
                                        "nowrap",
                                    fontSize:
                                        "10px",
                                    fontWeight:
                                        700
                                }}
                            >
                                {currentUser?.displayName ||
                                    currentUser?.username ||
                                    "NovaOS User"}
                            </span>

                            <span
                                style={{
                                    fontSize:
                                        "8px",
                                    color:
                                        "var(--nova-ui-text-muted)",
                                    letterSpacing:
                                        "0.08em"
                                }}
                            >
                                {userRole}
                            </span>

                        </span>

                    </button>

                    {/* Notification button */}

                    <button
                        type="button"
                        onClick={() => {
                            setNotificationOpen(
                                (current) =>
                                    !current
                            );
                            setAccountOpen(
                                false
                            );
                        }}
                        aria-label={
                            notificationOpen
                                ? "Close notifications"
                                : "Open notifications"
                        }
                        title="Notifications"
                        style={{
                            position:
                                "relative",
                            width:
                                "34px",
                            height:
                                "34px",
                            display:
                                "flex",
                            alignItems:
                                "center",
                            justifyContent:
                                "center",
                            border:
                                notificationOpen
                                    ? "1px solid var(--nova-accent)"
                                    : "1px solid transparent",
                            borderRadius:
                                "9px",
                            background:
                                notificationOpen
                                    ? "var(--nova-accent-soft)"
                                    : "transparent",
                            color:
                                "var(--nova-ui-text)",
                            cursor:
                                "pointer",
                            fontSize:
                                "17px",
                            transition:
                                "all 0.15s ease"
                        }}
                    >

                        <span
                            aria-hidden="true"
                            style={{
                                lineHeight:
                                    1
                            }}
                        >
                            ♢
                        </span>

                        {unreadCount > 0 && (
                            <span
                                style={{
                                    position:
                                        "absolute",
                                    top:
                                        "-2px",
                                    right:
                                        "-2px",
                                    minWidth:
                                        "16px",
                                    height:
                                        "16px",
                                    padding:
                                        "0 4px",
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    borderRadius:
                                        "999px",
                                    background:
                                        "var(--nova-accent)",
                                    color:
                                        "#ffffff",
                                    border:
                                        "2px solid var(--nova-ui-surface)",
                                    fontSize:
                                        "8px",
                                    fontWeight:
                                        800,
                                    lineHeight:
                                        1
                                }}
                            >
                                {unreadCount >
                                99
                                    ? "99+"
                                    : unreadCount}
                            </span>
                        )}

                    </button>

                    <span>
                        {time.toLocaleTimeString(
                            [],
                            {
                                hour:
                                    "2-digit",
                                minute:
                                    "2-digit"
                            }
                        )}
                    </span>

                    <span className="nova-status">
                        ●
                    </span>

                </div>

            </div>

        </div>
    );
}

export default DesktopShell;