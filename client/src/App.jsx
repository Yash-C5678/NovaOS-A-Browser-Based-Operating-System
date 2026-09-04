import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import "./App.css";
import "./NovaTheme.css";
import "./NovaVisualOverhaul.css";

import DesktopShell from "./components/desktop/DesktopShell";
import WindowManager from "./components/desktop/WindowManager";
import AppLauncher from "./components/desktop/AppLauncher";

import Terminal from "./components/apps/Terminal";
import Scheduler from "./components/apps/Scheduler";
import ProcessManager from "./components/apps/ProcessManager";
import MemoryManager from "./components/apps/MemoryManager";
import IOManager from "./components/apps/IOManager";
import Synchronization from "./components/apps/Synchronization";
import Deadlock from "./components/apps/Deadlock";
import FileExplorer from "./components/apps/FileExplorer";
import Notepad from "./components/apps/Notepad";
import Calculator from "./components/apps/Calculator";
import ResourceMonitor from "./components/apps/ResourceMonitor";
import Paging from "./components/apps/Paging";
import Segmentation from "./components/apps/Segmentation";
import VirtualMemory from "./components/apps/VirtualMemory";
import PageReplacement from "./components/apps/PageReplacement";
import Camera from "./components/apps/Camera";
import Gallery from "./components/apps/Gallery";
import Settings from "./components/apps/Settings";
import SystemLogs from "./components/apps/SystemLogs";
import Browser from "./components/apps/Browser";

import NovaIcon from "./components/ui/NovaIcon";


/*
 * =========================================================
 * GLOBAL NOVAOS THEME INITIALIZATION
 * =========================================================
 */

const NOVA_SETTINGS_KEY = "novaos-settings";

const NOVA_DEFAULT_SETTINGS = {
    appearance: "dark",
    accent: "#7c5cff",
    density: "comfortable",
    desktopIcons: true,
    taskbarAlwaysVisible: true,
    windowAnimations: true
};


function initializeNovaTheme() {
    if (typeof document === "undefined") {
        return;
    }

    let savedSettings = {};

    try {
        const stored =
            window.localStorage.getItem(
                NOVA_SETTINGS_KEY
            );

        if (stored) {
            const parsed = JSON.parse(stored);

            if (
                parsed &&
                typeof parsed === "object"
            ) {
                savedSettings = parsed;
            }
        }
    } catch {
        savedSettings = {};
    }

    const settings = {
        ...NOVA_DEFAULT_SETTINGS,
        ...savedSettings
    };

    const root = document.documentElement;

    const appearance =
        settings.appearance === "light"
            ? "light"
            : "dark";

    const accent =
        typeof settings.accent === "string" &&
        settings.accent.trim()
            ? settings.accent.trim()
            : NOVA_DEFAULT_SETTINGS.accent;

    const density =
        typeof settings.density === "string" &&
        settings.density.trim()
            ? settings.density.trim()
            : NOVA_DEFAULT_SETTINGS.density;

    root.dataset.novaAppearance =
        appearance;

    root.dataset.novaDensity =
        density;

    root.style.setProperty(
        "--nova-accent",
        accent
    );

    root.style.setProperty(
        "--nova-accent-soft",
        `color-mix(in srgb, ${accent} 14%, transparent)`
    );

    root.style.setProperty(
        "--nova-accent-border",
        `color-mix(in srgb, ${accent} 45%, transparent)`
    );

    root.style.setProperty(
        "--nova-window-animation",
        settings.windowAnimations
            ? "220ms"
            : "0ms"
    );

    document.body?.setAttribute(
        "data-nova-appearance",
        appearance
    );

    document.body?.setAttribute(
        "data-nova-density",
        density
    );

    document.body?.setAttribute(
        "data-nova-desktop-icons",
        settings.desktopIcons
            ? "true"
            : "false"
    );

    document.body?.setAttribute(
        "data-nova-taskbar",
        settings.taskbarAlwaysVisible
            ? "always"
            : "auto"
    );
}


initializeNovaTheme();


const REFRESH_INTERVAL = 1500;


function formatNumber(value) {
    if (typeof value !== "number") {
        return "0";
    }

    return value.toLocaleString();
}


function formatPercent(value) {
    if (typeof value !== "number") {
        return "0%";
    }

    return `${Math.round(value * 100)}%`;
}


function StatCard({
    label,
    value,
    detail,
    icon,
    tone = ""
}) {
    return (
        <div
            className={`stat-card ${tone}`}
        >
            <div className="stat-card-top">
                <span className="stat-icon">
                    {icon}
                </span>

                <span className="stat-label">
                    {label}
                </span>
            </div>

            <div className="stat-value">
                {value}
            </div>

            {detail && (
                <div className="stat-detail">
                    {detail}
                </div>
            )}
        </div>
    );
}


function SectionHeader({
    icon,
    title,
    subtitle
}) {
    return (
        <div className="section-header">
            <div className="section-title-row">
                <span className="section-icon">
                    {icon}
                </span>

                <div>
                    <h2>{title}</h2>

                    {subtitle && (
                        <p>{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
}


function ProgressBar({ value }) {
    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                Number(value) || 0
            )
        );

    return (
        <div className="progress-track">
            <div
                className="progress-fill"
                style={{
                    width: `${percentage}%`
                }}
            />
        </div>
    );
}


function StatusBadge({
    active,
    children
}) {
    return (
        <span
            className={`status-badge ${
                active
                    ? "active"
                    : "inactive"
            }`}
        >
            <span className="status-dot" />
            {children}
        </span>
    );
}


function App() {
    const [
        systemState,
        setSystemState
    ] = useState(null);

    const [
        applications,
        setApplications
    ] = useState([]);

    const [
        launcherOpen,
        setLauncherOpen
    ] = useState(false);

    const [
        apiOnline,
        setApiOnline
    ] = useState(false);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        actionLoading,
        setActionLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        lastUpdated,
        setLastUpdated
    ] = useState(null);

    const [
        activePanel,
        setActivePanel
    ] = useState("overview");


    /*
     * =========================================================
     * AUTHENTICATION
     * =========================================================
     */

    const [
        authReady,
        setAuthReady
    ] = useState(false);

    const [
        authenticatedUser,
        setAuthenticatedUser
    ] = useState(null);

    const [
        authMode,
        setAuthMode
    ] = useState("login");

    const [
        loginUsername,
        setLoginUsername
    ] = useState("");

    const [
        loginPassword,
        setLoginPassword
    ] = useState("");

    const [
        registerDisplayName,
        setRegisterDisplayName
    ] = useState("");

    const [
        registerUsername,
        setRegisterUsername
    ] = useState("");

    const [
        registerPassword,
        setRegisterPassword
    ] = useState("");

    const [
        registerConfirmPassword,
        setRegisterConfirmPassword
    ] = useState("");

    const [
        loginLoading,
        setLoginLoading
    ] = useState(false);

    const [
        registerLoading,
        setRegisterLoading
    ] = useState(false);

    const [
        loginError,
        setLoginError
    ] = useState("");


    const fetchCurrentUser =
        useCallback(
            async () => {
                try {
                    const response =
                        await fetch(
                            "/api/auth/current"
                        );

                    if (!response.ok) {
                        throw new Error(
                            `Authentication request failed: ${response.status}`
                        );
                    }

                    const result =
                        await response.json();

                    if (!result.success) {
                        throw new Error(
                            result.error ||
                            "Unable to retrieve authentication state."
                        );
                    }

                    setAuthenticatedUser(
                        result.authenticated
                            ? result.user
                            : null
                    );

                    setLoginError("");
                } catch (
                    authRequestError
                ) {
                    setAuthenticatedUser(null);

                    setLoginError(
                        authRequestError.message ||
                        "Unable to connect to the authentication service."
                    );
                } finally {
                    setAuthReady(true);
                }
            },
            []
        );


    useEffect(() => {
        fetchCurrentUser();
    }, [
        fetchCurrentUser
    ]);


    const switchAuthMode =
        (mode) => {
            setAuthMode(mode);
            setLoginError("");

            if (mode === "login") {
                setRegisterDisplayName("");
                setRegisterUsername("");
                setRegisterPassword("");
                setRegisterConfirmPassword("");
            } else {
                setLoginUsername("");
                setLoginPassword("");
            }
        };


    const handleLogin =
        async (event) => {
            event.preventDefault();

            if (loginLoading) {
                return;
            }

            setLoginLoading(true);
            setLoginError("");

            try {
                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                username:
                                    loginUsername.trim(),
                                password:
                                    loginPassword
                            })
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Login failed."
                    );
                }

                setAuthenticatedUser(
                    result.user
                );

                setLoginPassword("");
                setLoginError("");
                setError("");
            } catch (
                loginRequestError
            ) {
                setAuthenticatedUser(null);

                setLoginError(
                    loginRequestError.message ||
                    "Unable to sign in."
                );
            } finally {
                setLoginLoading(false);
            }
        };


    const handleRegister =
        async (event) => {
            event.preventDefault();

            if (registerLoading) {
                return;
            }

            setLoginError("");

            const username =
                registerUsername
                    .trim()
                    .toLowerCase();

            const displayName =
                registerDisplayName.trim();

            if (
                username.length < 3 ||
                username.length > 32
            ) {
                setLoginError(
                    "Username must contain between 3 and 32 characters."
                );
                return;
            }

            if (
                !/^[a-z0-9._-]+$/.test(
                    username
                )
            ) {
                setLoginError(
                    "Username may contain only letters, numbers, dots, underscores, and hyphens."
                );
                return;
            }

            if (
                !registerPassword ||
                registerPassword.length < 4
            ) {
                setLoginError(
                    "Password must contain at least 4 characters."
                );
                return;
            }

            if (
                registerPassword !==
                registerConfirmPassword
            ) {
                setLoginError(
                    "Passwords do not match."
                );
                return;
            }

            setRegisterLoading(true);

            try {
                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                username,
                                displayName:
                                    displayName ||
                                    username,
                                password:
                                    registerPassword
                            })
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Unable to create account."
                    );
                }

                setLoginUsername(
                    username
                );

                setLoginPassword("");

                setRegisterDisplayName("");
                setRegisterUsername("");
                setRegisterPassword("");
                setRegisterConfirmPassword("");

                setAuthMode("login");

                setLoginError(
                    "Account created successfully. You can now sign in."
                );
            } catch (
                registerRequestError
            ) {
                setLoginError(
                    registerRequestError.message ||
                    "Unable to create account."
                );
            } finally {
                setRegisterLoading(false);
            }
        };


    const handleLogout =
        async () => {
            if (loginLoading) {
                return;
            }

            setLoginLoading(true);
            setLoginError("");

            try {
                const response =
                    await fetch(
                        "/api/auth/logout",
                        {
                            method: "POST"
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Logout failed."
                    );
                }

                setAuthenticatedUser(null);
                setLoginUsername("");
                setLoginPassword("");
                setSystemState(null);
                setApplications([]);
                setLauncherOpen(false);
                setAuthMode("login");
            } catch (
                logoutError
            ) {
                setLoginError(
                    logoutError.message ||
                    "Unable to sign out."
                );
            } finally {
                setLoginLoading(false);
            }
        };


    /*
     * =========================================================
     * SYSTEM DATA
     * =========================================================
     */

    const fetchSystemState =
        useCallback(
            async () => {
                try {
                    const response =
                        await fetch(
                            "/api/system/state"
                        );

                    if (!response.ok) {
                        throw new Error(
                            `System state request failed: ${response.status}`
                        );
                    }

                    const result =
                        await response.json();

                    if (!result.success) {
                        throw new Error(
                            result.error ||
                            "Unable to retrieve system state."
                        );
                    }

                    setSystemState(
                        result.data
                    );

                    setApiOnline(true);
                    setError("");

                    setLastUpdated(
                        new Date()
                    );
                } catch (
                    requestError
                ) {
                    setApiOnline(false);

                    setError(
                        requestError.message ||
                        "NovaOS API is unavailable."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    const fetchApplications =
        useCallback(
            async () => {
                try {
                    const response =
                        await fetch(
                            "/api/applications"
                        );

                    if (!response.ok) {
                        throw new Error(
                            `Application request failed: ${response.status}`
                        );
                    }

                    const result =
                        await response.json();

                    if (!result.success) {
                        throw new Error(
                            result.error ||
                            "Unable to retrieve applications."
                        );
                    }

                    setApplications(
                        result.data ?? []
                    );
                } catch {
                    setApplications([]);
                }
            },
            []
        );


    useEffect(() => {
        if (
            !authReady ||
            !authenticatedUser
        ) {
            return undefined;
        }

        fetchSystemState();
        fetchApplications();

        const interval =
            setInterval(
                fetchSystemState,
                REFRESH_INTERVAL
            );

        return () =>
            clearInterval(
                interval
            );
    }, [
        authReady,
        authenticatedUser,
        fetchSystemState,
        fetchApplications
    ]);


    const performSystemAction =
        async (action) => {
            setActionLoading(true);
            setError("");

            try {
                const response =
                    await fetch(
                        `/api/system/${action}`,
                        {
                            method: "POST"
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        `Unable to ${action} NovaOS.`
                    );
                }

                await fetchSystemState();
            } catch (
                actionError
            ) {
                setError(
                    actionError.message ||
                    "System action failed."
                );
            } finally {
                setActionLoading(false);
            }
        };


    const handleLaunchApplication =
        useCallback(
            async (application) => {
                try {
                    const response =
                        await fetch(
                            `/api/applications/${application.id}/launch`,
                            {
                                method: "POST"
                            }
                        );

                    const result =
                        await response.json();

                    if (
                        !response.ok ||
                        !result.success
                    ) {
                        throw new Error(
                            result.error ||
                            `Unable to launch ${application.name}.`
                        );
                    }

                    setLauncherOpen(false);

                    await fetchSystemState();
                } catch (
                    launchError
                ) {
                    setError(
                        launchError.message ||
                        "Application launch failed."
                    );
                }
            },
            [fetchSystemState]
        );


    const booted =
        Boolean(
            systemState?.booted
        );

    const processes =
        systemState?.processes ?? [];

    const windows =
        systemState?.windows ?? [];

    const minimizedWindows =
        windows.filter(
            (windowData) =>
                windowData.state ===
                "minimized"
        );

    const memory =
        systemState?.memory ?? {};

    const devices =
        systemState?.devices ?? {};

    const io =
        systemState?.io ?? {};

    const processIO =
        systemState?.processIO ?? {};

    const synchronization =
        systemState?.synchronization ?? {};

    const deadlock =
        systemState?.deadlock ?? {};


    const processCounts =
        useMemo(
            () => {
                const counts = {
                    new: 0,
                    ready: 0,
                    running: 0,
                    waiting: 0,
                    terminated: 0
                };

                for (
                    const process
                    of processes
                ) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            counts,
                            process.state
                        )
                    ) {
                        counts[
                            process.state
                        ]++;
                    }
                }

                return counts;
            },
            [processes]
        );


    const memoryUtilization =
        typeof memory.utilization ===
            "number"
            ? memory.utilization * 100
            : 0;


    const navigationItems = [
        {
            id: "overview",
            icon: "overview",
            label: "Overview"
        },
        {
            id: "processes",
            icon: "processes",
            label: "Processes"
        },
        {
            id: "memory",
            icon: "memory",
            label: "Memory"
        },
        {
            id: "io",
            icon: "io",
            label: "I/O"
        },
        {
            id: "synchronization",
            icon: "synchronization",
            label: "Synchronization"
        },
        {
            id: "deadlock",
            icon: "deadlock",
            label: "Deadlock"
        }
    ];


    /*
     * =========================================================
     * WINDOW MANAGEMENT
     * =========================================================
     */

    const handleWindowFocus =
        useCallback(
            async (windowId) => {
                try {
                    await fetch(
                        `/api/applications/windows/${windowId}/focus`,
                        {
                            method: "POST"
                        }
                    );

                    await fetchSystemState();
                } catch {
                    // Safe no-op.
                }
            },
            [fetchSystemState]
        );


    const handleWindowMinimize =
        useCallback(
            async (windowId) => {
                try {
                    await fetch(
                        `/api/applications/windows/${windowId}/minimize`,
                        {
                            method: "POST"
                        }
                    );

                    await fetchSystemState();
                } catch {
                    // Safe no-op.
                }
            },
            [fetchSystemState]
        );


    const handleWindowMaximize =
        useCallback(
            async (windowId) => {
                try {
                    await fetch(
                        `/api/applications/windows/${windowId}/maximize`,
                        {
                            method: "POST"
                        }
                    );

                    await fetchSystemState();
                } catch {
                    // Safe no-op.
                }
            },
            [fetchSystemState]
        );


    const handleWindowRestore =
        useCallback(
            async (windowId) => {
                try {
                    const response =
                        await fetch(
                            `/api/applications/windows/${windowId}/restore`,
                            {
                                method: "POST"
                            }
                        );

                    const result =
                        await response.json();

                    if (
                        !response.ok ||
                        !result.success
                    ) {
                        throw new Error(
                            result.error ||
                            "Unable to restore window."
                        );
                    }

                    await fetch(
                        `/api/applications/windows/${windowId}/focus`,
                        {
                            method: "POST"
                        }
                    );

                    await fetchSystemState();
                } catch (
                    restoreError
                ) {
                    setError(
                        restoreError.message ||
                        "Unable to restore window."
                    );
                }
            },
            [fetchSystemState]
        );


    const handleWindowClose =
        useCallback(
            async (windowId) => {
                try {
                    await fetch(
                        `/api/applications/windows/${windowId}/close`,
                        {
                            method: "POST"
                        }
                    );

                    await fetchSystemState();
                } catch {
                    // Safe no-op.
                }
            },
            [fetchSystemState]
        );


    /*
     * =========================================================
     * WINDOW APPLICATION ROUTING
     * =========================================================
     */

    const renderWindow =
        useCallback(
            (windowData) => {
                const title =
                    windowData.title
                        ?.toLowerCase() ?? "";


                if (
                    title === "terminal"
                ) {
                    return <Terminal />;
                }


                if (
                    title === "scheduler" ||
                    title === "cpu scheduler" ||
                    title.includes("scheduler")
                ) {
                    return <Scheduler />;
                }


                if (
                    title === "process manager" ||
                    title === "processes" ||
                    title.includes("process manager")
                ) {
                    return <ProcessManager />;
                }


                if (
                    title === "memory manager" ||
                    title === "memory" ||
                    title.includes("memory manager")
                ) {
                    return <MemoryManager />;
                }


                if (
                    title === "io manager" ||
                    title === "i/o manager" ||
                    title === "io" ||
                    title.includes("io manager") ||
                    title.includes("i/o manager")
                ) {
                    return <IOManager />;
                }


                if (
                    title === "synchronization" ||
                    title === "sync" ||
                    title.includes("synchronization")
                ) {
                    return <Synchronization />;
                }


                if (
                    title === "deadlock" ||
                    title.includes("deadlock")
                ) {
                    return <Deadlock />;
                }


                if (
                    title === "file explorer" ||
                    title === "files" ||
                    title === "file manager" ||
                    title.includes("file explorer") ||
                    title.includes("file manager")
                ) {
                    return <FileExplorer />;
                }


                if (
                    title === "notepad" ||
                    title.includes("notepad")
                ) {
                    return <Notepad />;
                }


                if (
                    title === "calculator" ||
                    title.includes("calculator")
                ) {
                    return <Calculator />;
                }


                if (
                    title === "resource monitor" ||
                    title === "resource-monitor" ||
                    title.includes("resource monitor")
                ) {
                    return <ResourceMonitor />;
                }


                if (
                    title === "paging" ||
                    title.includes("paging")
                ) {
                    return <Paging />;
                }


                if (
                    title === "segmentation" ||
                    title === "memory segmentation" ||
                    title.includes("segmentation")
                ) {
                    return <Segmentation />;
                }


                if (
                    title === "virtual memory" ||
                    title === "virtual-memory" ||
                    title.includes("virtual memory") ||
                    title.includes("virtual-memory")
                ) {
                    return <VirtualMemory />;
                }


                if (
                    title === "page replacement" ||
                    title === "page-replacement" ||
                    title.includes("page replacement") ||
                    title.includes("page-replacement")
                ) {
                    return <PageReplacement />;
                }


                if (
                    title === "camera" ||
                    title === "novaos camera" ||
                    title.includes("camera")
                ) {
                    return <Camera />;
                }


                if (
                    title === "gallery" ||
                    title === "novaos gallery" ||
                    title.includes("gallery")
                ) {
                    return <Gallery />;
                }


                if (
                    title === "settings" ||
                    title === "novaos settings" ||
                    title.includes("settings")
                ) {
                    return <Settings />;
                }


                /*
                 * =================================================
                 * BROWSER
                 * =================================================
                 */

                if (
                    title === "browser" ||
                    title === "novaos browser" ||
                    title.includes("browser")
                ) {
                    return <Browser />;
                }


                /*
                 * =================================================
                 * SYSTEM LOGS
                 * =================================================
                 *
                 * This was the missing routing that caused the
                 * generic "NovaOS application window" placeholder
                 * to appear.
                 */

                if (
                    title === "system logs" ||
                    title === "system-logs" ||
                    title === "system log" ||
                    title === "logs" ||
                    title.includes("system logs") ||
                    title.includes("system-logs")
                ) {
                    return <SystemLogs />;
                }


                return (
                    <div className="nova-window-placeholder">
                        <div className="nova-placeholder-logo">
                            N
                        </div>

                        <h3>
                            {windowData.title}
                        </h3>

                        <p>
                            NovaOS application window
                        </p>

                        <span>
                            PID:{" "}
                            {windowData.processId}
                        </span>
                    </div>
                );
            },
            []
        );


    /*
     * =========================================================
     * AUTH LOADING SCREEN
     * =========================================================
     */

    if (!authReady) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    background:
                        "var(--nova-bg, #09090f)",
                    color:
                        "var(--nova-text, #f5f5f7)",
                    fontFamily:
                        "Inter, system-ui, sans-serif"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "14px",
                        opacity: 0.8
                    }}
                >
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "9px",
                            display: "grid",
                            placeItems: "center",
                            background:
                                "var(--nova-accent, #7c5cff)",
                            color: "#fff",
                            fontWeight: 800
                        }}
                    >
                        N
                    </div>

                    Connecting to NovaOS authentication...
                </div>
            </div>
        );
    }


    /*
     * =========================================================
     * LOGIN / CREATE ACCOUNT SCREEN
     * =========================================================
     */

    if (!authenticatedUser) {
        const isLogin =
            authMode === "login";

        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "24px",
                    boxSizing: "border-box",
                    background:
                        "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--nova-accent, #7c5cff) 16%, transparent), transparent 42%), var(--nova-bg, #09090f)",
                    color:
                        "var(--nova-text, #f5f5f7)",
                    fontFamily:
                        "Inter, system-ui, sans-serif"
                }}
            >
                <form
                    onSubmit={
                        isLogin
                            ? handleLogin
                            : handleRegister
                    }
                    style={{
                        width:
                            "min(420px, 100%)",
                        boxSizing:
                            "border-box",
                        padding: "32px",
                        borderRadius: "20px",
                        border:
                            "1px solid var(--nova-border, rgba(255,255,255,.1))",
                        background:
                            "var(--nova-panel, rgba(20,20,30,.9))",
                        boxShadow:
                            "0 24px 80px rgba(0,0,0,.35)",
                        backdropFilter:
                            "blur(20px)"
                    }}
                >
                    <div
                        style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "15px",
                            display: "grid",
                            placeItems: "center",
                            marginBottom: "20px",
                            background:
                                "var(--nova-accent, #7c5cff)",
                            color: "#fff",
                            fontSize: "22px",
                            fontWeight: 900
                        }}
                    >
                        N
                    </div>

                    <div
                        style={{
                            fontSize: "11px",
                            letterSpacing: "0.16em",
                            fontWeight: 700,
                            opacity: 0.55,
                            marginBottom: "8px"
                        }}
                    >
                        NOVAOS
                    </div>

                    <h1
                        style={{
                            margin: "0 0 8px",
                            fontSize: "28px",
                            letterSpacing:
                                "-0.03em"
                        }}
                    >
                        {isLogin
                            ? "Sign in"
                            : "Create account"}
                    </h1>

                    <p
                        style={{
                            margin:
                                "0 0 26px",
                            opacity: 0.65,
                            lineHeight: 1.5,
                            fontSize: "14px"
                        }}
                    >
                        {isLogin
                            ? "Authenticate to access the NovaOS desktop."
                            : "Create a new user account for NovaOS."}
                    </p>

                    {!isLogin && (
                        <>
                            <label
                                style={{
                                    display:
                                        "block",
                                    fontSize:
                                        "12px",
                                    fontWeight:
                                        700,
                                    marginBottom:
                                        "8px"
                                }}
                            >
                                Display name
                            </label>

                            <input
                                type="text"
                                value={
                                    registerDisplayName
                                }
                                onChange={(
                                    event
                                ) =>
                                    setRegisterDisplayName(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                autoComplete="name"
                                disabled={
                                    registerLoading
                                }
                                placeholder="Enter your name"
                                style={{
                                    width:
                                        "100%",
                                    boxSizing:
                                        "border-box",
                                    padding:
                                        "12px 13px",
                                    marginBottom:
                                        "16px",
                                    borderRadius:
                                        "10px",
                                    border:
                                        "1px solid var(--nova-border, rgba(255,255,255,.12))",
                                    outline:
                                        "none",
                                    background:
                                        "rgba(255,255,255,.045)",
                                    color:
                                        "inherit",
                                    font:
                                        "inherit"
                                }}
                            />
                        </>
                    )}

                    <label
                        style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 700,
                            marginBottom: "8px"
                        }}
                    >
                        Username
                    </label>

                    <input
                        type="text"
                        value={
                            isLogin
                                ? loginUsername
                                : registerUsername
                        }
                        onChange={(
                            event
                        ) => {
                            if (isLogin) {
                                setLoginUsername(
                                    event
                                        .target
                                        .value
                                );
                            } else {
                                setRegisterUsername(
                                    event
                                        .target
                                        .value
                                );
                            }
                        }}
                        autoComplete="username"
                        autoFocus
                        disabled={
                            loginLoading ||
                            registerLoading
                        }
                        placeholder="Enter username"
                        style={{
                            width: "100%",
                            boxSizing:
                                "border-box",
                            padding:
                                "12px 13px",
                            marginBottom:
                                "16px",
                            borderRadius:
                                "10px",
                            border:
                                "1px solid var(--nova-border, rgba(255,255,255,.12))",
                            outline: "none",
                            background:
                                "rgba(255,255,255,.045)",
                            color: "inherit",
                            font: "inherit"
                        }}
                    />

                    <label
                        style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 700,
                            marginBottom: "8px"
                        }}
                    >
                        Password
                    </label>

                    <input
                        type="password"
                        value={
                            isLogin
                                ? loginPassword
                                : registerPassword
                        }
                        onChange={(
                            event
                        ) => {
                            if (isLogin) {
                                setLoginPassword(
                                    event
                                        .target
                                        .value
                                );
                            } else {
                                setRegisterPassword(
                                    event
                                        .target
                                        .value
                                );
                            }
                        }}
                        autoComplete={
                            isLogin
                                ? "current-password"
                                : "new-password"
                        }
                        disabled={
                            loginLoading ||
                            registerLoading
                        }
                        placeholder="Enter password"
                        style={{
                            width: "100%",
                            boxSizing:
                                "border-box",
                            padding:
                                "12px 13px",
                            marginBottom:
                                "16px",
                            borderRadius:
                                "10px",
                            border:
                                "1px solid var(--nova-border, rgba(255,255,255,.12))",
                            outline: "none",
                            background:
                                "rgba(255,255,255,.045)",
                            color: "inherit",
                            font: "inherit"
                        }}
                    />

                    {!isLogin && (
                        <>
                            <label
                                style={{
                                    display:
                                        "block",
                                    fontSize:
                                        "12px",
                                    fontWeight:
                                        700,
                                    marginBottom:
                                        "8px"
                                }}
                            >
                                Confirm password
                            </label>

                            <input
                                type="password"
                                value={
                                    registerConfirmPassword
                                }
                                onChange={(
                                    event
                                ) =>
                                    setRegisterConfirmPassword(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                autoComplete="new-password"
                                disabled={
                                    registerLoading
                                }
                                placeholder="Re-enter password"
                                style={{
                                    width:
                                        "100%",
                                    boxSizing:
                                        "border-box",
                                    padding:
                                        "12px 13px",
                                    marginBottom:
                                        "16px",
                                    borderRadius:
                                        "10px",
                                    border:
                                        "1px solid var(--nova-border, rgba(255,255,255,.12))",
                                    outline:
                                        "none",
                                    background:
                                        "rgba(255,255,255,.045)",
                                    color:
                                        "inherit",
                                    font:
                                        "inherit"
                                }}
                            />
                        </>
                    )}

                    {loginError && (
                        <div
                            role="alert"
                            style={{
                                marginBottom:
                                    "16px",
                                padding:
                                    "11px 12px",
                                borderRadius:
                                    "10px",
                                border:
                                    loginError.includes(
                                        "successfully"
                                    )
                                        ? "1px solid rgba(16,185,129,.25)"
                                        : "1px solid rgba(255,90,90,.25)",
                                background:
                                    loginError.includes(
                                        "successfully"
                                    )
                                        ? "rgba(16,185,129,.08)"
                                        : "rgba(255,90,90,.08)",
                                color:
                                    loginError.includes(
                                        "successfully"
                                    )
                                        ? "#9ff0c9"
                                        : "#ffb4b4",
                                fontSize:
                                    "13px",
                                lineHeight:
                                    1.45
                            }}
                        >
                            {loginError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={
                            loginLoading ||
                            registerLoading ||
                            (isLogin
                                ? !loginUsername.trim() ||
                                  !loginPassword
                                : !registerUsername.trim() ||
                                  !registerPassword ||
                                  !registerConfirmPassword)
                        }
                        style={{
                            width: "100%",
                            border: "0",
                            borderRadius:
                                "10px",
                            padding:
                                "12px 14px",
                            background:
                                "var(--nova-accent, #7c5cff)",
                            color: "#fff",
                            font: "inherit",
                            fontWeight: 800,
                            cursor:
                                loginLoading ||
                                registerLoading
                                    ? "not-allowed"
                                    : "pointer",
                            opacity:
                                loginLoading ||
                                registerLoading
                                    ? 0.55
                                    : 1
                        }}
                    >
                        {isLogin
                            ? loginLoading
                                ? "Signing in..."
                                : "Sign in to NovaOS"
                            : registerLoading
                                ? "Creating account..."
                                : "Create NovaOS account"}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            switchAuthMode(
                                isLogin
                                    ? "register"
                                    : "login"
                            )
                        }
                        disabled={
                            loginLoading ||
                            registerLoading
                        }
                        style={{
                            width: "100%",
                            marginTop:
                                "10px",
                            border:
                                "1px solid var(--nova-border, rgba(255,255,255,.12))",
                            borderRadius:
                                "10px",
                            padding:
                                "11px 14px",
                            background:
                                "rgba(255,255,255,.025)",
                            color: "inherit",
                            font: "inherit",
                            fontWeight: 700,
                            cursor:
                                loginLoading ||
                                registerLoading
                                    ? "not-allowed"
                                    : "pointer",
                            opacity:
                                loginLoading ||
                                registerLoading
                                    ? 0.55
                                    : 0.85
                        }}
                    >
                        {isLogin
                            ? "Create a new account"
                            : "Already have an account? Sign in"}
                    </button>

                    <div
                        style={{
                            marginTop:
                                "18px",
                            textAlign:
                                "center",
                            fontSize:
                                "11px",
                            opacity:
                                0.45,
                            lineHeight:
                                1.5
                        }}
                    >
                        Authentication is provided by the NovaOS kernel.
                    </div>
                </form>
            </div>
        );
    }


    /*
     * =========================================================
     * NOVAOS DESKTOP
     * =========================================================
     */

    return (
        <DesktopShell
            onStartClick={() =>
                setLauncherOpen(
                    (open) => !open
                )
            }
            minimizedWindows={
                minimizedWindows
            }
            onRestoreWindow={
                handleWindowRestore
            }
        >
            <WindowManager
                windows={windows}
                onFocus={
                    handleWindowFocus
                }
                onMinimize={
                    handleWindowMinimize
                }
                onMaximize={
                    handleWindowMaximize
                }
                onRestore={
                    handleWindowRestore
                }
                onClose={
                    handleWindowClose
                }
                renderWindow={
                    renderWindow
                }
            />

            {launcherOpen && (
                <AppLauncher
                    applications={
                        applications
                    }
                    onLaunch={
                        handleLaunchApplication
                    }
                    onClose={() =>
                        setLauncherOpen(
                            false
                        )
                    }
                />
            )}

            <div className="nova-control-center">
                <header className="topbar">
                    <div className="brand">
                        <div className="brand-mark">
                            N
                        </div>

                        <div>
                            <div className="brand-name">
                                NovaOS
                            </div>

                            <div className="brand-version">
                                Operating System Simulator
                            </div>
                        </div>
                    </div>

                    <div className="topbar-right">
                        <StatusBadge
                            active={
                                apiOnline
                            }
                        >
                            {apiOnline
                                ? "API ONLINE"
                                : "API OFFLINE"}
                        </StatusBadge>

                        <StatusBadge
                            active={
                                booted
                            }
                        >
                            {booted
                                ? "KERNEL RUNNING"
                                : "KERNEL STOPPED"}
                        </StatusBadge>

                        <div
                            style={{
                                display:
                                    "flex",
                                alignItems:
                                    "center",
                                gap: "10px",
                                marginLeft:
                                    "8px",
                                paddingLeft:
                                    "12px",
                                borderLeft:
                                    "1px solid var(--nova-border, rgba(255,255,255,.1))"
                            }}
                        >
                            <div
                                title={`${authenticatedUser.username} (${authenticatedUser.role})`}
                                style={{
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    gap: "8px",
                                    minWidth:
                                        0
                                }}
                            >
                                <div
                                    style={{
                                        width:
                                            "28px",
                                        height:
                                            "28px",
                                        borderRadius:
                                            "50%",
                                        display:
                                            "grid",
                                        placeItems:
                                            "center",
                                        flexShrink:
                                            0,
                                        background:
                                            "var(--nova-accent, #7c5cff)",
                                        color:
                                            "#fff",
                                        fontSize:
                                            "11px",
                                        fontWeight:
                                            800
                                    }}
                                >
                                    {(
                                        authenticatedUser.displayName ||
                                        authenticatedUser.username ||
                                        "N"
                                    )
                                        .charAt(
                                            0
                                        )
                                        .toUpperCase()}
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        flexDirection:
                                            "column",
                                        minWidth:
                                            0
                                    }}
                                >
                                    <strong
                                        style={{
                                            fontSize:
                                                "12px",
                                            lineHeight:
                                                1.2,
                                            whiteSpace:
                                                "nowrap",
                                            overflow:
                                                "hidden",
                                            textOverflow:
                                                "ellipsis",
                                            maxWidth:
                                                "150px"
                                        }}
                                    >
                                        {authenticatedUser.displayName ||
                                            authenticatedUser.username}
                                    </strong>

                                    <span
                                        style={{
                                            fontSize:
                                                "10px",
                                            opacity:
                                                0.55,
                                            textTransform:
                                                "uppercase"
                                        }}
                                    >
                                        {
                                            authenticatedUser.role
                                        }
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                disabled={
                                    loginLoading
                                }
                                title="Sign out of NovaOS"
                                style={{
                                    border:
                                        "1px solid var(--nova-border, rgba(255,255,255,.1))",
                                    borderRadius:
                                        "8px",
                                    padding:
                                        "7px 10px",
                                    background:
                                        "rgba(255,255,255,.04)",
                                    color:
                                        "inherit",
                                    font:
                                        "inherit",
                                    fontSize:
                                        "11px",
                                    fontWeight:
                                        700,
                                    cursor:
                                        loginLoading
                                            ? "not-allowed"
                                            : "pointer",
                                    opacity:
                                        loginLoading
                                            ? 0.5
                                            : 0.8
                                }}
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </header>


                <div className="app-layout">
                    <aside className="sidebar">
                        <div className="sidebar-heading">
                            SYSTEM
                        </div>

                        <nav className="navigation">
                            {navigationItems.map(
                                (item) => (
                                    <button
                                        key={
                                            item.id
                                        }
                                        type="button"
                                        className={
                                            activePanel ===
                                                item.id
                                                ? "nav-item active"
                                                : "nav-item"
                                        }
                                        onClick={() =>
                                            setActivePanel(
                                                item.id
                                            )
                                        }
                                    >
                                        <span className="nav-icon">
                                            <NovaIcon
                                                name={
                                                    item.icon
                                                }
                                                size={
                                                    17
                                                }
                                            />
                                        </span>

                                        <span>
                                            {
                                                item.label
                                            }
                                        </span>
                                    </button>
                                )
                            )}
                        </nav>


                        <div className="sidebar-bottom">
                            <div className="sidebar-heading">
                                KERNEL CONTROL
                            </div>

                            <button
                                type="button"
                                className="control-button boot"
                                disabled={
                                    actionLoading ||
                                    booted
                                }
                                onClick={() =>
                                    performSystemAction(
                                        "boot"
                                    )
                                }
                            >
                                <span className="control-icon">
                                    <NovaIcon
                                        name="overview"
                                        size={15}
                                    />
                                </span>

                                Boot Kernel
                            </button>

                            <button
                                type="button"
                                className="control-button shutdown"
                                disabled={
                                    actionLoading ||
                                    !booted
                                }
                                onClick={() =>
                                    performSystemAction(
                                        "shutdown"
                                    )
                                }
                            >
                                <span>!</span>

                                Shutdown
                            </button>

                            <button
                                type="button"
                                className="control-button reset"
                                disabled={
                                    actionLoading
                                }
                                onClick={() =>
                                    performSystemAction(
                                        "reset"
                                    )
                                }
                            >
                                <span className="control-icon">
                                    <NovaIcon
                                        name="application"
                                        size={15}
                                    />
                                </span>

                                Reset System
                            </button>
                        </div>
                    </aside>


                    <main className="main-content">
                        <div className="page-heading">
                            <div>
                                <div className="eyebrow">
                                    NOVAOS CONTROL CENTER
                                </div>

                                <h1>
                                    {
                                        navigationItems.find(
                                            (
                                                item
                                            ) =>
                                                item.id ===
                                                activePanel
                                        )?.label ||
                                        "Overview"
                                    }
                                </h1>

                                <p>
                                    Real-time operating
                                    system subsystem
                                    monitoring.
                                </p>
                            </div>

                            <div className="refresh-info">
                                <span className="refresh-indicator" />

                                {loading
                                    ? "Connecting..."
                                    : lastUpdated
                                        ? `Updated ${lastUpdated.toLocaleTimeString()}`
                                        : "Waiting for data"}
                            </div>
                        </div>


                        {error && (
                            <div className="error-banner">
                                <span>?</span>

                                <div>
                                    <strong>
                                        System communication
                                        error
                                    </strong>

                                    <div>
                                        {error}
                                    </div>
                                </div>
                            </div>
                        )}


                        {activePanel ===
                            "overview" && (
                            <>
                                <section className="stats-grid">
                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="processes"
                                                size={17}
                                            />
                                        }
                                        label="Processes"
                                        value={formatNumber(
                                            processes.length
                                        )}
                                        detail={`${processCounts.running} running · ${processCounts.ready} ready`}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="memory"
                                                size={17}
                                            />
                                        }
                                        label="Memory"
                                        value={formatPercent(
                                            memory.utilization
                                        )}
                                        detail={`${formatNumber(
                                            memory.allocatedMemory
                                        )} / ${formatNumber(
                                            memory.totalMemory
                                        )} units`}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="io"
                                                size={17}
                                            />
                                        }
                                        label="I/O Requests"
                                        value={formatNumber(
                                            io.activeRequests
                                        )}
                                        detail={`${formatNumber(
                                            io.queuedRequests
                                        )} queued · ${formatNumber(
                                            io.completedRequests
                                        )} completed`}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="deadlock"
                                                size={17}
                                            />
                                        }
                                        label="Deadlock"
                                        value={
                                            deadlock.deadlockDetected
                                                ? "DETECTED"
                                                : "SAFE"
                                        }
                                        detail={
                                            deadlock.deadlockDetected
                                                ? `${formatNumber(
                                                    deadlock
                                                        .deadlockedProcesses
                                                        ?.length
                                                )} processes affected`
                                                : "No deadlock detected"
                                        }
                                        tone={
                                            deadlock.deadlockDetected
                                                ? "danger"
                                                : "safe"
                                        }
                                    />
                                </section>


                                <div className="dashboard-grid">
                                    <section className="panel large-panel">
                                        <SectionHeader
                                            icon={
                                                <NovaIcon
                                                    name="processes"
                                                    size={17}
                                                />
                                            }
                                            title="Process State"
                                            subtitle="Current process distribution"
                                        />

                                        <div className="process-state-list">
                                            {[
                                                [
                                                    "New",
                                                    processCounts.new
                                                ],
                                                [
                                                    "Ready",
                                                    processCounts.ready
                                                ],
                                                [
                                                    "Running",
                                                    processCounts.running
                                                ],
                                                [
                                                    "Waiting",
                                                    processCounts.waiting
                                                ],
                                                [
                                                    "Terminated",
                                                    processCounts.terminated
                                                ]
                                            ].map(
                                                ([
                                                    label,
                                                    value
                                                ]) => (
                                                    <div
                                                        key={
                                                            label
                                                        }
                                                        className={`state-row ${
                                                            label ===
                                                            "Running"
                                                                ? "running-row"
                                                                : ""
                                                        }`}
                                                    >
                                                        <div>
                                                            <span className="state-name">
                                                                {
                                                                    label
                                                                }
                                                            </span>
                                                        </div>

                                                        <span>
                                                            {
                                                                value
                                                            }
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </section>


                                    <section className="panel">
                                        <SectionHeader
                                            icon={
                                                <NovaIcon
                                                    name="memory"
                                                    size={17}
                                                />
                                            }
                                            title="Memory"
                                            subtitle="Physical memory allocation"
                                        />

                                        <div className="memory-meter">
                                            <div className="memory-meter-value">
                                                {formatPercent(
                                                    memory.utilization
                                                )}
                                            </div>

                                            <ProgressBar
                                                value={
                                                    memoryUtilization
                                                }
                                            />
                                        </div>

                                        <div className="metric-grid">
                                            <div>
                                                <span>
                                                    Total
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        memory.totalMemory
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Allocated
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        memory.allocatedMemory
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Free
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        memory.freeMemory
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Algorithm
                                                </span>

                                                <strong>
                                                    {memory.algorithm ||
                                                        "—"}
                                                </strong>
                                            </div>
                                        </div>
                                    </section>


                                    <section className="panel">
                                        <SectionHeader
                                            icon={
                                                <NovaIcon
                                                    name="io"
                                                    size={17}
                                                />
                                            }
                                            title="I/O Subsystem"
                                            subtitle="Device and request activity"
                                        />

                                        <div className="metric-grid four">
                                            <div>
                                                <span>
                                                    Active
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        io.activeRequests
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Queued
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        io.queuedRequests
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Completed
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        io.completedRequests
                                                    )}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Devices
                                                </span>

                                                <strong>
                                                    {formatNumber(
                                                        devices.deviceCount ??
                                                        devices.totalDevices
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    </section>


                                    <section className="panel">
                                        <SectionHeader
                                            icon={
                                                <NovaIcon
                                                    name="synchronization"
                                                    size={17}
                                                />
                                            }
                                            title="Synchronization"
                                            subtitle="Concurrency primitives"
                                        />

                                        <div className="sync-summary">
                                            <div className="sync-item">
                                                <span className="sync-value">
                                                    {formatNumber(
                                                        synchronization.mutexCount
                                                    )}
                                                </span>

                                                <span className="sync-label">
                                                    Mutexes
                                                </span>
                                            </div>

                                            <div className="sync-item">
                                                <span className="sync-value">
                                                    {formatNumber(
                                                        synchronization.semaphoreCount
                                                    )}
                                                </span>

                                                <span className="sync-label">
                                                    Semaphores
                                                </span>
                                            </div>

                                            <div className="sync-item">
                                                <span className="sync-value">
                                                    {formatNumber(
                                                        synchronization.lockedMutexes
                                                    )}
                                                </span>

                                                <span className="sync-label">
                                                    Locked
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </>
                        )}


                        {activePanel ===
                            "processes" && (
                            <section className="panel full-panel">
                                <SectionHeader
                                    icon={
                                        <NovaIcon
                                            name="processes"
                                            size={17}
                                        />
                                    }
                                    title="Process Manager"
                                    subtitle={`${processes.length} process${
                                        processes.length ===
                                        1
                                            ? ""
                                            : "es"
                                    } currently tracked by NovaOS`}
                                />

                                {processes.length ===
                                0 ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">
                                            ?
                                        </div>

                                        <h3>
                                            No processes
                                        </h3>

                                        <p>
                                            Launch an
                                            application
                                            through the
                                            NovaOS API
                                            to create a
                                            process.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>
                                                        PID
                                                    </th>

                                                    <th>
                                                        Application
                                                    </th>

                                                    <th>
                                                        State
                                                    </th>

                                                    <th>
                                                        Priority
                                                    </th>

                                                    <th>
                                                        CPU Time
                                                    </th>

                                                    <th>
                                                        Remaining
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {processes.map(
                                                    (
                                                        process
                                                    ) => (
                                                        <tr
                                                            key={
                                                                process.pid
                                                            }
                                                        >
                                                            <td className="mono">
                                                                {
                                                                    process.pid
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    process.applicationId
                                                                }
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`process-badge ${process.state}`}
                                                                >
                                                                    {
                                                                        process.state
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {
                                                                    process.priority
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    process.cpuTime ??
                                                                    0
                                                                }
                                                            </td>

                                                            <td>
                                                                {
                                                                    process.remainingBurstTime ??
                                                                    "—"
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}


                        {activePanel ===
                            "memory" && (
                            <section className="panel full-panel">
                                <SectionHeader
                                    icon={
                                        <NovaIcon
                                            name="memory"
                                            size={17}
                                        />
                                    }
                                    title="Memory Manager"
                                    subtitle="Dynamic memory allocation and fragmentation"
                                />

                                <div className="memory-overview">
                                    <div className="big-memory-stat">
                                        <span>
                                            Memory utilization
                                        </span>

                                        <strong>
                                            {formatPercent(
                                                memory.utilization
                                            )}
                                        </strong>

                                        <ProgressBar
                                            value={
                                                memoryUtilization
                                            }
                                        />
                                    </div>

                                    <div className="metric-grid">
                                        <div>
                                            <span>
                                                Total Memory
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.totalMemory
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Allocated
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.allocatedMemory
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Free Memory
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.freeMemory
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Largest Free Block
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.largestFreeBlock
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Blocks
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.numberOfBlocks
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Free Blocks
                                            </span>

                                            <strong>
                                                {formatNumber(
                                                    memory.freeBlocks
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Fragmentation
                                            </span>

                                            <strong>
                                                {formatPercent(
                                                    memory.externalFragmentation
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Algorithm
                                            </span>

                                            <strong>
                                                {memory.algorithm ||
                                                    "—"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}


                        {activePanel ===
                            "io" && (
                            <section className="panel full-panel">
                                <SectionHeader
                                    icon={
                                        <NovaIcon
                                            name="io"
                                            size={17}
                                        />
                                    }
                                    title="I/O Manager"
                                    subtitle="Input/output request processing"
                                />

                                <div className="stats-grid compact">
                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="io"
                                                size={17}
                                            />
                                        }
                                        label="Active"
                                        value={formatNumber(
                                            io.activeRequests
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="scheduler"
                                                size={17}
                                            />
                                        }
                                        label="Queued"
                                        value={formatNumber(
                                            io.queuedRequests
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="overview"
                                                size={17}
                                            />
                                        }
                                        label="Completed"
                                        value={formatNumber(
                                            io.completedRequests
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="close"
                                                size={17}
                                            />
                                        }
                                        label="Cancelled"
                                        value={formatNumber(
                                            io.cancelledRequests
                                        )}
                                    />
                                </div>

                                <div className="subsystem-grid">
                                    <div className="info-box">
                                        <span>
                                            Controller Time
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                io.currentTime
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Waiting Processes
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                processIO.waitingProcesses
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Tracked Requests
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                processIO.trackedRequests
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Active Process I/O
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                processIO.activeRequests
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        )}


                        {activePanel ===
                            "synchronization" && (
                            <section className="panel full-panel">
                                <SectionHeader
                                    icon={
                                        <NovaIcon
                                            name="synchronization"
                                            size={17}
                                        />
                                    }
                                    title="Synchronization Manager"
                                    subtitle="Mutex and semaphore state"
                                />

                                <div className="stats-grid compact">
                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="synchronization"
                                                size={17}
                                            />
                                        }
                                        label="Mutexes"
                                        value={formatNumber(
                                            synchronization.mutexCount
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="deadlock"
                                                size={17}
                                            />
                                        }
                                        label="Locked Mutexes"
                                        value={formatNumber(
                                            synchronization.lockedMutexes
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="scheduler"
                                                size={17}
                                            />
                                        }
                                        label="Mutex Waiters"
                                        value={formatNumber(
                                            synchronization.mutexWaitingProcesses
                                        )}
                                    />

                                    <StatCard
                                        icon={
                                            <NovaIcon
                                                name="synchronization"
                                                size={17}
                                            />
                                        }
                                        label="Semaphores"
                                        value={formatNumber(
                                            synchronization.semaphoreCount
                                        )}
                                    />
                                </div>

                                <div className="subsystem-grid">
                                    <div className="info-box">
                                        <span>
                                            Semaphore Waiters
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                synchronization.semaphoreWaitingProcesses
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Process Waiting
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                processIO.waitingProcesses
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        )}


                        {activePanel ===
                            "deadlock" && (
                            <section className="panel full-panel">
                                <SectionHeader
                                    icon={
                                        <NovaIcon
                                            name="deadlock"
                                            size={17}
                                        />
                                    }
                                    title="Deadlock Manager"
                                    subtitle="Banker's algorithm and deadlock detection"
                                />

                                <div
                                    className={`deadlock-banner ${
                                        deadlock.deadlockDetected
                                            ? "danger"
                                            : "safe"
                                    }`}
                                >
                                    <div className="deadlock-symbol">
                                        {deadlock.deadlockDetected ? (
                                            <NovaIcon
                                                name="deadlock"
                                                size={20}
                                            />
                                        ) : (
                                            <NovaIcon
                                                name="overview"
                                                size={20}
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <strong>
                                            {deadlock.deadlockDetected
                                                ? "Deadlock detected"
                                                : "System is in a safe state"}
                                        </strong>

                                        <p>
                                            {deadlock.deadlockDetected
                                                ? `${formatNumber(
                                                    deadlock
                                                        .deadlockedProcesses
                                                        ?.length
                                                )} process(es) are involved in the detected deadlock.`
                                                : "No deadlocked processes are currently reported by the kernel."}
                                        </p>
                                    </div>
                                </div>

                                <div className="subsystem-grid">
                                    <div className="info-box">
                                        <span>
                                            Resources
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                deadlock.resourceCount
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Processes
                                        </span>

                                        <strong>
                                            {formatNumber(
                                                deadlock.processCount
                                            )}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Safe
                                        </span>

                                        <strong>
                                            {deadlock.safe ===
                                            true
                                                ? "YES"
                                                : deadlock.safe ===
                                                    false
                                                    ? "NO"
                                                    : "—"}
                                        </strong>
                                    </div>

                                    <div className="info-box">
                                        <span>
                                            Safe Sequence
                                        </span>

                                        <strong className="sequence">
                                            {Array.isArray(
                                                deadlock.safeSequence
                                            ) &&
                                            deadlock
                                                .safeSequence
                                                .length >
                                                0
                                                ? deadlock.safeSequence.join(
                                                    " -> "
                                                )
                                                : "—"}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        )}


                        <section className="bottom-system-bar">
                            <div>
                                <span className="system-label">
                                    KERNEL
                                </span>

                                <span
                                    className={
                                        booted
                                            ? "system-value online"
                                            : "system-value"
                                    }
                                >
                                    {booted
                                        ? "RUNNING"
                                        : "STOPPED"}
                                </span>
                            </div>

                            <div>
                                <span className="system-label">
                                    PROCESSES
                                </span>

                                <span className="system-value">
                                    {
                                        processes.length
                                    }
                                </span>
                            </div>

                            <div>
                                <span className="system-label">
                                    WINDOWS
                                </span>

                                <span className="system-value">
                                    {
                                        windows.length
                                    }
                                </span>
                            </div>

                            <div>
                                <span className="system-label">
                                    MEMORY
                                </span>

                                <span className="system-value">
                                    {formatPercent(
                                        memory.utilization
                                    )}
                                </span>
                            </div>

                            <div>
                                <span className="system-label">
                                    I/O
                                </span>

                                <span className="system-value">
                                    {formatNumber(
                                        io.activeRequests
                                    )}
                                </span>
                            </div>

                            <div className="nova-clock">
                                {new Date().toLocaleTimeString()}
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </DesktopShell>
    );
}


export default App;