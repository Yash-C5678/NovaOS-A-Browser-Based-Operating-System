import React, {
    useCallback,
    useEffect,
    useState
} from "react";

const SETTINGS_KEY = "novaos-settings";

const AUTH_API =
    "http://localhost:5000/api/auth";

const DEFAULT_SETTINGS = {
    appearance: "dark",
    accent: "#7c5cff",
    density: "comfortable",
    desktopIcons: true,
    taskbarAlwaysVisible: true,
    windowAnimations: true
};

const ACCENT_COLORS = [
    {
        name: "Nova Purple",
        value: "#7c5cff"
    },
    {
        name: "Ocean Blue",
        value: "#3b82f6"
    },
    {
        name: "Emerald",
        value: "#10b981"
    },
    {
        name: "Rose",
        value: "#f43f5e"
    },
    {
        name: "Amber",
        value: "#f59e0b"
    },
    {
        name: "Cyan",
        value: "#06b6d4"
    }
];

function loadSettings() {
    try {
        const stored =
            window.localStorage.getItem(
                SETTINGS_KEY
            );

        if (!stored) {
            return DEFAULT_SETTINGS;
        }

        const parsed = JSON.parse(stored);

        return {
            ...DEFAULT_SETTINGS,
            ...parsed
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveSettings(settings) {
    try {
        window.localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settings)
        );
    } catch {
        // Ignore localStorage failures.
    }
}

function applySettings(settings) {
    const root =
        document.documentElement;

    const resolvedAppearance =
        settings.appearance === "system"
            ? (
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
                    ? "dark"
                    : "light"
            )
            : settings.appearance;

    root.dataset.novaAppearance =
        resolvedAppearance;

    root.dataset.novaDensity =
        settings.density;

    root.style.setProperty(
        "--nova-accent",
        settings.accent
    );

    root.style.setProperty(
        "--nova-accent-soft",
        `${settings.accent}22`
    );

    root.style.setProperty(
        "--nova-accent-border",
        `${settings.accent}55`
    );

    root.style.setProperty(
        "--nova-window-animation",
        settings.windowAnimations
            ? "0.18s"
            : "0s"
    );

    document.body.dataset.novaAppearance =
        resolvedAppearance;

    document.body.dataset.novaDensity =
        settings.density;

    document.body.dataset.novaDesktopIcons =
        settings.desktopIcons
            ? "visible"
            : "hidden";

    document.body.dataset.novaTaskbar =
        settings.taskbarAlwaysVisible
            ? "visible"
            : "auto";
}

function SettingRow({
    title,
    description,
    children
}) {
    return (
        <div className="settings-row">
            <div className="settings-row-info">
                <div className="settings-row-title">
                    {title}
                </div>

                <div className="settings-row-description">
                    {description}
                </div>
            </div>

            <div className="settings-row-control">
                {children}
            </div>
        </div>
    );
}

function Toggle({
    checked,
    onChange
}) {
    return (
        <button
            type="button"
            className={`settings-toggle ${
                checked ? "active" : ""
            }`}
            onClick={() =>
                onChange(!checked)
            }
            aria-pressed={checked}
        >
            <span className="settings-toggle-track">
                <span className="settings-toggle-thumb" />
            </span>

            <span className="settings-toggle-label">
                {checked
                    ? "On"
                    : "Off"}
            </span>
        </button>
    );
}

function getRoleLabel(role) {
    if (role === "admin") {
        return "Administrator";
    }

    return "User";
}

export default function Settings() {
    const [settings, setSettings] =
        useState(loadSettings);

    const [activeSection, setActiveSection] =
        useState("appearance");

    const [notice, setNotice] =
        useState("");

    const [apiStatus, setApiStatus] =
        useState("Checking...");

    const [apiLatency, setApiLatency] =
        useState(null);

    /*
     * =====================================================
     * AUTHENTICATION / USER MANAGEMENT
     * =====================================================
     */

    const [currentUser, setCurrentUser] =
        useState(null);

    const [authenticated, setAuthenticated] =
        useState(false);

    const [users, setUsers] =
        useState([]);

    const [usersLoading, setUsersLoading] =
        useState(false);

    const [userActionLoading, setUserActionLoading] =
        useState("");

    const [userError, setUserError] =
        useState("");

    const [showCreateUser, setShowCreateUser] =
        useState(false);

    const [newUsername, setNewUsername] =
        useState("");

    const [newDisplayName, setNewDisplayName] =
        useState("");

    const [newPassword, setNewPassword] =
        useState("");

    const [newRole, setNewRole] =
        useState("user");

    const [creatingUser, setCreatingUser] =
        useState(false);

    const notification = useCallback(
        (message) => {
            setNotice(message);
        },
        []
    );

    const updateSetting = useCallback(
        (key, value) => {
            setSettings((current) => ({
                ...current,
                [key]: value
            }));
        },
        []
    );

    useEffect(() => {
        applySettings(settings);
        saveSettings(settings);
    }, [settings]);

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timer =
            window.setTimeout(() => {
                setNotice("");
            }, 2500);

        return () =>
            window.clearTimeout(timer);
    }, [notice]);

    /*
     * =====================================================
     * API HEALTH
     * =====================================================
     */

    const checkApi = useCallback(
        async () => {
            const started =
                performance.now();

            setApiStatus("Checking...");

            try {
                const response =
                    await fetch(
                        "http://localhost:5000/api/health",
                        {
                            cache: "no-store"
                        }
                    );

                const elapsed =
                    Math.round(
                        performance.now() -
                            started
                    );

                const result =
                    await response.json();

                if (
                    response.ok &&
                    result.success
                ) {
                    setApiStatus(
                        "Online"
                    );

                    setApiLatency(
                        elapsed
                    );
                } else {
                    setApiStatus(
                        "Unavailable"
                    );

                    setApiLatency(null);
                }
            } catch {
                setApiStatus(
                    "Offline"
                );

                setApiLatency(null);
            }
        },
        []
    );

    useEffect(() => {
        checkApi();
    }, [checkApi]);

    /*
     * =====================================================
     * CURRENT USER
     * =====================================================
     */

    const fetchCurrentUser =
        useCallback(async () => {
            try {
                const response =
                    await fetch(
                        `${AUTH_API}/current`,
                        {
                            cache:
                                "no-store"
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        `Authentication request failed: ${response.status}`
                    );
                }

                const result =
                    await response.json();

                setAuthenticated(
                    Boolean(
                        result.authenticated
                    )
                );

                setCurrentUser(
                    result.user ?? null
                );

                return result;
            } catch (error) {
                setAuthenticated(false);
                setCurrentUser(null);

                console.warn(
                    "Unable to read NovaOS authentication state:",
                    error.message
                );

                return null;
            }
        }, []);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    /*
     * =====================================================
     * USER DIRECTORY
     * =====================================================
     */

    const fetchUsers =
        useCallback(async () => {
            setUsersLoading(true);
            setUserError("");

            try {
                const response =
                    await fetch(
                        `${AUTH_API}/users`,
                        {
                            cache:
                                "no-store"
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.error ||
                            `Failed to load users: ${response.status}`
                    );
                }

                setUsers(
                    Array.isArray(
                        result.users
                    )
                        ? result.users
                        : []
                );

                return result;
            } catch (error) {
                setUsers([]);
                setUserError(
                    error.message
                );

                return null;
            } finally {
                setUsersLoading(false);
            }
        }, []);

    useEffect(() => {
        if (
            activeSection !== "users" ||
            !authenticated ||
            currentUser?.role !== "admin"
        ) {
            return;
        }

        fetchUsers();
    }, [
        activeSection,
        authenticated,
        currentUser,
        fetchUsers
    ]);

    /*
     * =====================================================
     * CREATE USER
     * =====================================================
     */

    const createUser =
        useCallback(async (event) => {
            event.preventDefault();

            setUserError("");

            const username =
                newUsername.trim();

            const displayName =
                newDisplayName.trim();

            if (!username) {
                setUserError(
                    "Username is required."
                );
                return;
            }

            if (!newPassword) {
                setUserError(
                    "Password is required."
                );
                return;
            }

            if (newPassword.length < 4) {
                setUserError(
                    "Password must contain at least 4 characters."
                );
                return;
            }

            setCreatingUser(true);

            try {
                const response =
                    await fetch(
                        `${AUTH_API}/users`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    username,
                                    displayName:
                                        displayName ||
                                        username,
                                    password:
                                        newPassword,
                                    role:
                                        newRole
                                })
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.error ||
                            `Failed to create user: ${response.status}`
                    );
                }

                setNewUsername("");
                setNewDisplayName("");
                setNewPassword("");
                setNewRole("user");
                setShowCreateUser(false);

                notification(
                    `User '${result.user.username}' created successfully.`
                );

                await fetchUsers();
            } catch (error) {
                setUserError(
                    error.message
                );
            } finally {
                setCreatingUser(false);
            }
        }, [
            newUsername,
            newDisplayName,
            newPassword,
            newRole,
            fetchUsers,
            notification
        ]);

    /*
     * =====================================================
     * ENABLE / DISABLE USER
     * =====================================================
     */

    const changeUserStatus =
        useCallback(
            async (
                userId,
                action
            ) => {
                setUserError("");
                setUserActionLoading(
                    `${action}:${userId}`
                );

                try {
                    const response =
                        await fetch(
                            `${AUTH_API}/users/${encodeURIComponent(
                                userId
                            )}/${action}`,
                            {
                                method:
                                    "PATCH"
                            }
                        );

                    const result =
                        await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result?.error ||
                                `Unable to ${action} user.`
                        );
                    }

                    notification(
                        result.message ||
                            `User ${action}d successfully.`
                    );

                    await fetchUsers();
                } catch (error) {
                    setUserError(
                        error.message
                    );
                } finally {
                    setUserActionLoading(
                        ""
                    );
                }
            },
            [
                fetchUsers,
                notification
            ]
        );

    /*
     * =====================================================
     * DELETE USER
     * =====================================================
     */

    const deleteUser =
        useCallback(
            async (user) => {
                if (!user) {
                    return;
                }

                const confirmed =
                    window.confirm(
                        `Delete the user '${user.username}'? This action cannot be undone.`
                    );

                if (!confirmed) {
                    return;
                }

                setUserError("");
                setUserActionLoading(
                    `delete:${user.id}`
                );

                try {
                    const response =
                        await fetch(
                            `${AUTH_API}/users/${encodeURIComponent(
                                user.id
                            )}`,
                            {
                                method:
                                    "DELETE"
                            }
                        );

                    const result =
                        await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result?.error ||
                                "Unable to delete user."
                        );
                    }

                    notification(
                        result.message ||
                            `User '${user.username}' deleted.`
                    );

                    await fetchUsers();
                } catch (error) {
                    setUserError(
                        error.message
                    );
                } finally {
                    setUserActionLoading(
                        ""
                    );
                }
            },
            [
                fetchUsers,
                notification
            ]
        );

    /*
     * =====================================================
     * RESET SETTINGS
     * =====================================================
     */

    const resetSettings =
        useCallback(() => {
            const confirmed =
                window.confirm(
                    "Reset all NovaOS Settings to their default values?"
                );

            if (!confirmed) {
                return;
            }

            setSettings({
                ...DEFAULT_SETTINGS
            });

            setNotice(
                "Settings reset to defaults."
            );
        }, []);

    const selectSection =
        useCallback((section) => {
            setActiveSection(
                section
            );
        }, []);

    /*
     * =====================================================
     * SETTINGS NAVIGATION
     * =====================================================
     */

    const sections = [
        {
            id: "appearance",
            icon: "🎨",
            title: "Appearance"
        },
        {
            id: "desktop",
            icon: "🖥️",
            title: "Desktop"
        },
        {
            id: "system",
            icon: "⚙️",
            title: "System"
        },
        {
            id: "users",
            icon: "👥",
            title: "Users"
        },
        {
            id: "about",
            icon: "ℹ️",
            title: "About"
        }
    ];

    return (
        <div className="nova-settings">
            <style>{`
                .nova-settings {
                    --settings-accent:
                        var(--nova-ui-accent, var(--nova-accent, #7c5cff));

                    --settings-accent-soft:
                        var(--nova-ui-accent-soft, var(--nova-accent-soft, rgba(124,92,255,0.14)));

                    --settings-accent-border:
                        var(--nova-ui-accent-border, var(--nova-accent-border, rgba(124,92,255,0.45)));

                    --settings-bg:
                        var(--nova-ui-bg, #07111f);

                    --settings-surface:
                        var(--nova-ui-surface, #091a29);

                    --settings-surface-2:
                        var(--nova-ui-surface-2, #0d2131);

                    --settings-surface-3:
                        var(--nova-ui-surface-3, #111b27);

                    --settings-surface-4:
                        var(--nova-ui-surface-4, #16293a);

                    --settings-text:
                        var(--nova-ui-text, #dcecff);

                    --settings-text-strong:
                        var(--nova-ui-text-strong, #edf6ff);

                    --settings-text-soft:
                        var(--nova-ui-text-soft, #b9cce0);

                    --settings-muted:
                        var(--nova-ui-muted, #71829a);

                    --settings-border:
                        var(--nova-ui-border, #20364b);

                    --settings-border-soft:
                        var(--nova-ui-border-soft, #1b3043);

                    --settings-success:
                        var(--nova-ui-success, #42d392);

                    --settings-danger:
                        var(--nova-ui-danger, #df8795);

                    --settings-warning:
                        var(--nova-ui-warning, #d5b76d);

                    width: 100%;
                    height: 100%;
                    min-height: 0;

                    display: flex;

                    background:
                        linear-gradient(
                            180deg,
                            color-mix(
                                in srgb,
                                var(--settings-surface-2) 92%,
                                var(--settings-accent) 8%
                            ),
                            var(--settings-bg)
                        );

                    color:
                        var(--settings-text);

                    overflow: hidden;

                    font-family:
                        Inter,
                        ui-sans-serif,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }

                .settings-sidebar {
                    width: 205px;
                    min-width: 205px;

                    display: flex;
                    flex-direction: column;

                    padding: 18px 12px;

                    border-right:
                        1px solid
                        var(--settings-border-soft);

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-surface)
                            90%,
                            transparent
                        );

                    box-sizing: border-box;
                }

                .settings-sidebar-title {
                    padding:
                        3px 10px
                        16px;

                    color:
                        var(--settings-muted);

                    font-size: 10px;
                    font-weight: 800;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.12em;
                }

                .settings-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .settings-nav-button {
                    width: 100%;

                    display: flex;
                    align-items: center;

                    gap: 10px;

                    min-height: 40px;

                    padding:
                        0 11px;

                    border:
                        1px solid
                        transparent;

                    border-radius: 9px;

                    background:
                        transparent;

                    color:
                        var(--settings-muted);

                    font-size: 12px;
                    font-weight: 650;

                    text-align: left;

                    cursor: pointer;

                    transition:
                        background 0.15s ease,
                        color 0.15s ease,
                        border-color 0.15s ease;
                }

                .settings-nav-button:hover {
                    color:
                        var(--settings-text-strong);

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-text)
                            5%,
                            transparent
                        );
                }

                .settings-nav-button.active {
                    color:
                        var(--settings-text-strong);

                    background:
                        var(--settings-accent-soft);

                    border-color:
                        var(--settings-accent-border);
                }

                .settings-nav-icon {
                    width: 25px;
                    height: 25px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 7px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-text)
                            5%,
                            transparent
                        );

                    font-size: 13px;
                }

                .settings-nav-button.active
                    .settings-nav-icon {
                    background:
                        var(--settings-accent);
                }

                .settings-sidebar-footer {
                    margin-top: auto;

                    padding:
                        13px 10px
                        5px;

                    color:
                        var(--settings-muted);

                    font-size: 9px;

                    line-height: 1.5;
                }

                .settings-main {
                    flex: 1 1 auto;

                    min-width: 0;
                    min-height: 0;

                    overflow: auto;

                    box-sizing: border-box;
                }

                .settings-main-inner {
                    width: min(
                        900px,
                        100%
                    );

                    margin: 0 auto;

                    padding:
                        26px 30px
                        40px;

                    box-sizing: border-box;
                }

                .settings-page-header {
                    margin-bottom: 22px;
                }

                .settings-page-title {
                    margin: 0;

                    font-size: 22px;
                    font-weight: 750;

                    letter-spacing:
                        -0.025em;
                }

                .settings-page-description {
                    margin:
                        6px 0 0;

                    color:
                        var(--settings-muted);

                    font-size: 12px;

                    line-height: 1.5;
                }

                .settings-section {
                    margin-bottom: 24px;
                }

                .settings-section-heading {
                    margin:
                        0 0 9px;

                    color:
                        var(--settings-text-soft);

                    font-size: 12px;
                    font-weight: 750;
                }

                .settings-panel {
                    overflow: hidden;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 12px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-surface)
                            94%,
                            transparent
                        );
                }

                .settings-row {
                    min-height: 65px;

                    display: flex;
                    align-items: center;

                    justify-content:
                        space-between;

                    gap: 20px;

                    padding:
                        13px 16px;

                    border-bottom:
                        1px solid
                        var(--settings-border-soft);

                    box-sizing: border-box;
                }

                .settings-row:last-child {
                    border-bottom: none;
                }

                .settings-row-info {
                    min-width: 0;
                }

                .settings-row-title {
                    color:
                        var(--settings-text-strong);

                    font-size: 12px;
                    font-weight: 650;
                }

                .settings-row-description {
                    margin-top: 4px;

                    color:
                        var(--settings-muted);

                    font-size: 10px;

                    line-height: 1.45;
                }

                .settings-row-control {
                    flex-shrink: 0;
                }

                .settings-select {
                    min-width: 145px;

                    height: 35px;

                    padding:
                        0 10px;

                    border:
                        1px solid
                        rgba(255,255,255,0.09);

                    border-radius: 8px;

                    background:
                        #151e2a;

                    color:
                        var(--settings-text-strong);

                    font-size: 11px;
                    font-weight: 600;

                    outline: none;

                    cursor: pointer;
                }

                .settings-select:focus {
                    border-color:
                        var(--settings-accent);
                }

                .settings-toggle {
                    display: flex;
                    align-items: center;

                    gap: 8px;

                    padding: 0;

                    border: none;

                    background:
                        transparent;

                    color:
                        var(--settings-muted);

                    font-size: 10px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .settings-toggle-track {
                    width: 38px;
                    height: 21px;

                    display: flex;
                    align-items: center;

                    padding: 2px;

                    border-radius: 20px;

                    background:
                        var(--settings-surface-4);

                    border:
                        1px solid
                        var(--settings-border);

                    box-sizing: border-box;

                    transition:
                        background 0.15s ease;
                }

                .settings-toggle-thumb {
                    width: 15px;
                    height: 15px;

                    border-radius: 50%;

                    background:
                        #8490a0;

                    transition:
                        transform 0.15s ease,
                        background 0.15s ease;
                }

                .settings-toggle.active
                    .settings-toggle-track {
                    background:
                        var(--settings-accent);

                    border-color:
                        var(--settings-accent);
                }

                .settings-toggle.active
                    .settings-toggle-thumb {
                    background:
                        var(--settings-text-strong);

                    transform:
                        translateX(17px);
                }

                .settings-toggle.active
                    .settings-toggle-label {
                    color:
                        var(--settings-text-soft);
                }

                .accent-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            6,
                            30px
                        );

                    gap: 8px;
                }

                .accent-button {
                    width: 30px;
                    height: 30px;

                    padding: 0;

                    border-radius: 50%;

                    border:
                        2px solid
                        transparent;

                    cursor: pointer;

                    position: relative;

                    box-sizing: border-box;
                }

                .accent-button.selected {
                    border-color:
                        #ffffff;
                }

                .accent-button.selected::after {
                    content: "✓";

                    position: absolute;

                    inset: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    color:
                        #ffffff;

                    font-size: 11px;
                    font-weight: 800;

                    text-shadow:
                        0 1px 4px
                        rgba(0,0,0,0.6);
                }

                .settings-status-card {
                    display: flex;
                    align-items: center;

                    gap: 11px;

                    padding:
                        13px 15px;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 10px;

                    background:
                        var(--settings-surface-2);
                }

                .settings-status-dot {
                    width: 9px;
                    height: 9px;

                    flex-shrink: 0;

                    border-radius: 50%;

                    background:
                        #697687;
                }

                .settings-status-dot.online {
                    background:
                        #35d69b;

                    box-shadow:
                        0 0 10px
                        rgba(53,214,155,0.35);
                }

                .settings-status-dot.offline {
                    background:
                        #ef6464;
                }

                .settings-status-info {
                    flex: 1;

                    min-width: 0;
                }

                .settings-status-title {
                    color:
                        var(--settings-text-strong);

                    font-size: 11px;
                    font-weight: 700;
                }

                .settings-status-subtitle {
                    margin-top: 3px;

                    color:
                        var(--settings-muted);

                    font-size: 9px;
                }

                .settings-status-value {
                    color:
                        #8d9aab;

                    font-size: 10px;
                    font-weight: 700;
                }

                .settings-action-row {
                    display: flex;
                    align-items: center;

                    gap: 8px;

                    flex-wrap: wrap;
                }

                .settings-button {
                    min-height: 35px;

                    padding:
                        0 13px;

                    border:
                        1px solid
                        rgba(255,255,255,0.09);

                    border-radius: 8px;

                    background:
                        #151e2a;

                    color:
                        #dce4ee;

                    font-size: 11px;
                    font-weight: 650;

                    cursor: pointer;
                }

                .settings-button:hover {
                    background:
                        var(--settings-surface-4);
                }

                .settings-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .settings-button.primary {
                    background:
                        var(--settings-accent);

                    border-color:
                        var(--settings-accent);

                    color:
                        #ffffff;
                }

                .settings-button.danger {
                    color:
                        var(--settings-danger);
                }

                .settings-button.success {
                    color:
                        var(--settings-success);
                }

                .settings-notice {
                    margin-bottom: 18px;

                    padding:
                        10px 12px;

                    border:
                        1px solid
                        color-mix(
                            in srgb,
                            var(--settings-success)
                            28%,
                            transparent
                        );

                    border-radius: 8px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-success)
                            10%,
                            transparent
                        );

                    color:
                        var(--settings-success);

                    font-size: 11px;
                }

                .settings-error {
                    margin-bottom: 14px;

                    padding:
                        10px 12px;

                    border:
                        1px solid
                        color-mix(
                            in srgb,
                            var(--settings-danger)
                            30%,
                            transparent
                        );

                    border-radius: 8px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-danger)
                            10%,
                            transparent
                        );

                    color:
                        var(--settings-danger);

                    font-size: 11px;

                    line-height: 1.45;
                }

                .settings-about {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );

                    gap: 10px;
                }

                .settings-info-card {
                    padding: 14px;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 10px;

                    background:
                        var(--settings-surface-2);
                }

                .settings-info-label {
                    color:
                        var(--settings-muted);

                    font-size: 9px;
                    font-weight: 700;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.08em;
                }

                .settings-info-value {
                    margin-top: 6px;

                    color:
                        var(--settings-text-strong);

                    font-size: 12px;
                    font-weight: 700;
                }

                .settings-preview {
                    height: 100px;

                    display: flex;

                    overflow: hidden;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 10px;

                    background:
                        var(--settings-bg);
                }

                .settings-preview-sidebar {
                    width: 80px;

                    padding: 9px;

                    background:
                        var(--settings-surface);
                }

                .settings-preview-line {
                    height: 7px;

                    margin-bottom: 7px;

                    border-radius: 4px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-text)
                            8%,
                            transparent
                        );
                }

                .settings-preview-line.active {
                    background:
                        var(--settings-accent);
                }

                .settings-preview-main {
                    flex: 1;

                    padding: 12px;
                }

                .settings-preview-card {
                    width: 75%;
                    height: 12px;

                    margin-bottom: 8px;

                    border-radius: 4px;

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-text)
                            9%,
                            transparent
                        );
                }

                .settings-preview-card.small {
                    width: 50%;
                }

                /*
                 * =================================================
                 * USER MANAGEMENT
                 * =================================================
                 */

                .settings-user-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    gap: 15px;

                    padding:
                        14px 16px;

                    border-bottom:
                        1px solid
                        var(--settings-border-soft);
                }

                .settings-user-summary {
                    display: flex;
                    align-items: center;

                    gap: 11px;

                    min-width: 0;
                }

                .settings-user-avatar {
                    width: 38px;
                    height: 38px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 10px;

                    background:
                        var(--settings-accent-soft);

                    border:
                        1px solid
                        var(--settings-accent-border);

                    color:
                        var(--settings-accent);

                    font-size: 13px;
                    font-weight: 800;
                }

                .settings-user-summary-info {
                    min-width: 0;
                }

                .settings-user-summary-name {
                    color:
                        var(--settings-text-strong);

                    font-size: 12px;
                    font-weight: 750;
                }

                .settings-user-summary-meta {
                    margin-top: 3px;

                    color:
                        var(--settings-muted);

                    font-size: 9px;
                }

                .settings-create-form {
                    padding: 16px;

                    border-bottom:
                        1px solid
                        var(--settings-border-soft);

                    background:
                        color-mix(
                            in srgb,
                            var(--settings-surface-2)
                            55%,
                            transparent
                        );
                }

                .settings-form-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            2,
                            minmax(0, 1fr)
                        );

                    gap: 11px;
                }

                .settings-form-field {
                    display: flex;
                    flex-direction: column;

                    gap: 5px;
                }

                .settings-form-field.full {
                    grid-column:
                        1 / -1;
                }

                .settings-form-label {
                    color:
                        var(--settings-text-soft);

                    font-size: 9px;
                    font-weight: 750;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.06em;
                }

                .settings-form-input {
                    width: 100%;
                    height: 36px;

                    padding:
                        0 10px;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 8px;

                    background:
                        var(--settings-surface-3);

                    color:
                        var(--settings-text-strong);

                    font-size: 11px;

                    outline: none;

                    box-sizing: border-box;
                }

                .settings-form-input:focus {
                    border-color:
                        var(--settings-accent);

                    box-shadow:
                        0 0 0 2px
                        var(--settings-accent-soft);
                }

                .settings-form-actions {
                    display: flex;
                    align-items: center;

                    gap: 8px;

                    margin-top: 13px;
                }

                .settings-user-list {
                    display: flex;
                    flex-direction: column;
                }

                .settings-user-item {
                    display: flex;
                    align-items: center;

                    gap: 12px;

                    padding:
                        13px 16px;

                    border-bottom:
                        1px solid
                        var(--settings-border-soft);
                }

                .settings-user-item:last-child {
                    border-bottom: none;
                }

                .settings-user-item-avatar {
                    width: 34px;
                    height: 34px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 9px;

                    background:
                        var(--settings-surface-3);

                    border:
                        1px solid
                        var(--settings-border);

                    color:
                        var(--settings-text-soft);

                    font-size: 11px;
                    font-weight: 800;
                }

                .settings-user-item-info {
                    flex: 1;

                    min-width: 0;
                }

                .settings-user-item-name {
                    display: flex;
                    align-items: center;

                    gap: 7px;

                    color:
                        var(--settings-text-strong);

                    font-size: 11px;
                    font-weight: 700;
                }

                .settings-user-item-username {
                    margin-top: 3px;

                    color:
                        var(--settings-muted);

                    font-size: 9px;
                }

                .settings-user-badge {
                    display: inline-flex;
                    align-items: center;

                    min-height: 18px;

                    padding:
                        0 6px;

                    border-radius: 999px;

                    background:
                        var(--settings-accent-soft);

                    color:
                        var(--settings-accent);

                    font-size: 8px;
                    font-weight: 800;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.04em;
                }

                .settings-user-badge.disabled {
                    background:
                        rgba(239,68,68,0.10);

                    color:
                        #ef7777;
                }

                .settings-user-actions {
                    display: flex;
                    align-items: center;

                    gap: 6px;

                    flex-shrink: 0;
                }

                .settings-user-action {
                    min-height: 28px;

                    padding:
                        0 8px;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 7px;

                    background:
                        var(--settings-surface-3);

                    color:
                        var(--settings-text-soft);

                    font-size: 9px;
                    font-weight: 700;

                    cursor: pointer;
                }

                .settings-user-action:hover {
                    background:
                        var(--settings-surface-4);

                    color:
                        var(--settings-text-strong);
                }

                .settings-user-action:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }

                .settings-user-action.delete {
                    color:
                        var(--settings-danger);
                }

                .settings-users-empty {
                    padding:
                        35px 20px;

                    text-align: center;

                    color:
                        var(--settings-muted);

                    font-size: 11px;
                }

                .settings-loading {
                    padding:
                        28px 20px;

                    text-align: center;

                    color:
                        var(--settings-muted);

                    font-size: 10px;
                }

                .settings-access-note {
                    display: flex;
                    align-items: center;

                    gap: 9px;

                    margin-bottom: 15px;

                    padding:
                        11px 12px;

                    border:
                        1px solid
                        var(--settings-border);

                    border-radius: 9px;

                    background:
                        var(--settings-surface-2);

                    color:
                        var(--settings-text-soft);

                    font-size: 10px;

                    line-height: 1.45;
                }

                .settings-access-icon {
                    width: 24px;
                    height: 24px;

                    flex-shrink: 0;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 7px;

                    background:
                        var(--settings-accent-soft);

                    color:
                        var(--settings-accent);

                    font-size: 11px;
                    font-weight: 800;
                }

                .settings-unauthorized {
                    padding:
                        40px 20px;

                    text-align: center;
                }

                .settings-unauthorized-icon {
                    width: 48px;
                    height: 48px;

                    margin:
                        0 auto 12px;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    background:
                        rgba(239,68,68,0.10);

                    color:
                        #ef7777;

                    font-size: 19px;
                    font-weight: 800;
                }

                .settings-unauthorized-title {
                    color:
                        var(--settings-text-strong);

                    font-size: 13px;
                    font-weight: 750;
                }

                .settings-unauthorized-description {
                    max-width: 400px;

                    margin:
                        6px auto 0;

                    color:
                        var(--settings-muted);

                    font-size: 10px;

                    line-height: 1.5;
                }

                @media (max-width: 720px) {
                    .settings-sidebar {
                        width: 155px;
                        min-width: 155px;
                    }

                    .settings-main-inner {
                        padding:
                            20px 18px
                            30px;
                    }

                    .settings-about {
                        grid-template-columns:
                            1fr;
                    }

                    .accent-grid {
                        grid-template-columns:
                            repeat(
                                6,
                                27px
                            );
                    }

                    .accent-button {
                        width: 27px;
                        height: 27px;
                    }

                    .settings-form-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .settings-form-field.full {
                        grid-column:
                            auto;
                    }

                    .settings-user-item {
                        align-items:
                            flex-start;

                        flex-wrap:
                            wrap;
                    }

                    .settings-user-actions {
                        width: 100%;

                        padding-left: 46px;
                    }
                }
            `}</style>

            <aside className="settings-sidebar">
                <div className="settings-sidebar-title">
                    Settings
                </div>

                <nav className="settings-nav">
                    {sections.map(
                        (section) => (
                            <button
                                key={
                                    section.id
                                }
                                type="button"
                                className={
                                    `settings-nav-button ${
                                        activeSection ===
                                        section.id
                                            ? "active"
                                            : ""
                                    }`
                                }
                                onClick={() =>
                                    selectSection(
                                        section.id
                                    )
                                }
                            >
                                <span className="settings-nav-icon">
                                    {
                                        section.icon
                                    }
                                </span>

                                <span>
                                    {
                                        section.title
                                    }
                                </span>
                            </button>
                        )
                    )}
                </nav>

                <div className="settings-sidebar-footer">
                    NovaOS System Settings
                    <br />
                    Preferences are saved
                    automatically.
                </div>
            </aside>

            <main className="settings-main">
                <div className="settings-main-inner">
                    {notice && (
                        <div className="settings-notice">
                            {notice}
                        </div>
                    )}

                    {/*
                     * =================================================
                     * APPEARANCE
                     * =================================================
                     */}

                    {activeSection ===
                        "appearance" && (
                        <>
                            <div className="settings-page-header">
                                <h1 className="settings-page-title">
                                    Appearance
                                </h1>

                                <p className="settings-page-description">
                                    Customize how NovaOS
                                    looks and feels.
                                </p>
                            </div>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Theme
                                </h2>

                                <div className="settings-panel">
                                    <SettingRow
                                        title="Appearance"
                                        description="Choose the interface appearance."
                                    >
                                        <select
                                            className="settings-select"
                                            value={
                                                settings.appearance
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSetting(
                                                    "appearance",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="dark">
                                                Dark
                                            </option>

                                            <option value="light">
                                                Light
                                            </option>

                                            <option value="system">
                                                System
                                            </option>
                                        </select>
                                    </SettingRow>

                                    <SettingRow
                                        title="Accent color"
                                        description="Choose the primary NovaOS interface accent."
                                    >
                                        <div className="accent-grid">
                                            {ACCENT_COLORS.map(
                                                (
                                                    color
                                                ) => (
                                                    <button
                                                        key={
                                                            color.value
                                                        }
                                                        type="button"
                                                        title={
                                                            color.name
                                                        }
                                                        aria-label={
                                                            color.name
                                                        }
                                                        className={
                                                            `accent-button ${
                                                                settings.accent ===
                                                                color.value
                                                                    ? "selected"
                                                                    : ""
                                                            }`
                                                        }
                                                        style={{
                                                            backgroundColor:
                                                                color.value
                                                        }}
                                                        onClick={() =>
                                                            updateSetting(
                                                                "accent",
                                                                color.value
                                                            )
                                                        }
                                                    />
                                                )
                                            )}
                                        </div>
                                    </SettingRow>

                                    <SettingRow
                                        title="UI density"
                                        description="Control spacing and sizing preferences."
                                    >
                                        <select
                                            className="settings-select"
                                            value={
                                                settings.density
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateSetting(
                                                    "density",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="comfortable">
                                                Comfortable
                                            </option>

                                            <option value="compact">
                                                Compact
                                            </option>
                                        </select>
                                    </SettingRow>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Preview
                                </h2>

                                <div className="settings-panel">
                                    <div
                                        style={{
                                            padding:
                                                16
                                        }}
                                    >
                                        <div className="settings-preview">
                                            <div className="settings-preview-sidebar">
                                                <div className="settings-preview-line active" />
                                                <div className="settings-preview-line" />
                                                <div className="settings-preview-line" />
                                                <div className="settings-preview-line" />
                                            </div>

                                            <div className="settings-preview-main">
                                                <div className="settings-preview-card" />
                                                <div className="settings-preview-card small" />
                                                <div className="settings-preview-card" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/*
                     * =================================================
                     * DESKTOP
                     * =================================================
                     */}

                    {activeSection ===
                        "desktop" && (
                        <>
                            <div className="settings-page-header">
                                <h1 className="settings-page-title">
                                    Desktop
                                </h1>

                                <p className="settings-page-description">
                                    Configure the NovaOS
                                    desktop environment.
                                </p>
                            </div>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Desktop behavior
                                </h2>

                                <div className="settings-panel">
                                    <SettingRow
                                        title="Desktop icons"
                                        description="Show application icons on the NovaOS desktop."
                                    >
                                        <Toggle
                                            checked={
                                                settings.desktopIcons
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                updateSetting(
                                                    "desktopIcons",
                                                    value
                                                )
                                            }
                                        />
                                    </SettingRow>

                                    <SettingRow
                                        title="Taskbar always visible"
                                        description="Keep the NovaOS taskbar visible while applications are open."
                                    >
                                        <Toggle
                                            checked={
                                                settings.taskbarAlwaysVisible
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                updateSetting(
                                                    "taskbarAlwaysVisible",
                                                    value
                                                )
                                            }
                                        />
                                    </SettingRow>

                                    <SettingRow
                                        title="Window animations"
                                        description="Enable transitions when NovaOS windows change state."
                                    >
                                        <Toggle
                                            checked={
                                                settings.windowAnimations
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                updateSetting(
                                                    "windowAnimations",
                                                    value
                                                )
                                            }
                                        />
                                    </SettingRow>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Current configuration
                                </h2>

                                <div className="settings-panel">
                                    <SettingRow
                                        title="Desktop icons"
                                        description="Current visibility setting."
                                    >
                                        <span className="settings-status-value">
                                            {settings.desktopIcons
                                                ? "Visible"
                                                : "Hidden"}
                                        </span>
                                    </SettingRow>

                                    <SettingRow
                                        title="Taskbar"
                                        description="Current taskbar behavior."
                                    >
                                        <span className="settings-status-value">
                                            {settings.taskbarAlwaysVisible
                                                ? "Always visible"
                                                : "Automatic"}
                                        </span>
                                    </SettingRow>

                                    <SettingRow
                                        title="Animations"
                                        description="Current window animation setting."
                                    >
                                        <span className="settings-status-value">
                                            {settings.windowAnimations
                                                ? "Enabled"
                                                : "Disabled"}
                                        </span>
                                    </SettingRow>
                                </div>
                            </section>
                        </>
                    )}

                    {/*
                     * =================================================
                     * SYSTEM
                     * =================================================
                     */}

                    {activeSection ===
                        "system" && (
                        <>
                            <div className="settings-page-header">
                                <h1 className="settings-page-title">
                                    System
                                </h1>

                                <p className="settings-page-description">
                                    Monitor the connection between
                                    the NovaOS interface and its
                                    operating-system backend.
                                </p>
                            </div>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    System services
                                </h2>

                                <div className="settings-panel">
                                    <div className="settings-row">
                                        <div className="settings-row-info">
                                            <div className="settings-row-title">
                                                NovaOS API
                                            </div>

                                            <div className="settings-row-description">
                                                Backend API
                                                connectivity.
                                            </div>
                                        </div>

                                        <div className="settings-status-card">
                                            <span
                                                className={
                                                    `settings-status-dot ${
                                                        apiStatus ===
                                                        "Online"
                                                            ? "online"
                                                            : apiStatus ===
                                                              "Offline"
                                                            ? "offline"
                                                            : ""
                                                    }`
                                                }
                                            />

                                            <div className="settings-status-info">
                                                <div className="settings-status-title">
                                                    {apiStatus}
                                                </div>

                                                <div className="settings-status-subtitle">
                                                    {apiLatency !==
                                                    null
                                                        ? `${apiLatency} ms response`
                                                        : "localhost:5000"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="settings-row">
                                        <div className="settings-row-info">
                                            <div className="settings-row-title">
                                                Kernel
                                            </div>

                                            <div className="settings-row-description">
                                                NovaOS kernel
                                                integration.
                                            </div>
                                        </div>

                                        <span className="settings-status-value">
                                            Running
                                        </span>
                                    </div>

                                    <div className="settings-row">
                                        <div className="settings-row-info">
                                            <div className="settings-row-title">
                                                Runtime
                                            </div>

                                            <div className="settings-row-description">
                                                NovaOS application
                                                runtime.
                                            </div>
                                        </div>

                                        <span className="settings-status-value">
                                            Active
                                        </span>
                                    </div>

                                    <div className="settings-row">
                                        <div className="settings-row-info">
                                            <div className="settings-row-title">
                                                Authentication
                                            </div>

                                            <div className="settings-row-description">
                                                NovaOS kernel
                                                authentication subsystem.
                                            </div>
                                        </div>

                                        <span
                                            className="settings-status-value"
                                            style={{
                                                color:
                                                    authenticated
                                                        ? "var(--settings-success)"
                                                        : "var(--settings-muted)"
                                            }}
                                        >
                                            {authenticated
                                                ? "Authenticated"
                                                : "Not authenticated"}
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Actions
                                </h2>

                                <div className="settings-action-row">
                                    <button
                                        type="button"
                                        className="settings-button primary"
                                        onClick={
                                            checkApi
                                        }
                                    >
                                        Check API
                                    </button>

                                    <button
                                        type="button"
                                        className="settings-button danger"
                                        onClick={
                                            resetSettings
                                        }
                                    >
                                        Reset Settings
                                    </button>
                                </div>
                            </section>
                        </>
                    )}

                    {/*
                     * =================================================
                     * USERS
                     * =================================================
                     */}

                    {activeSection ===
                        "users" && (
                        <>
                            <div className="settings-page-header">
                                <h1 className="settings-page-title">
                                    Users
                                </h1>

                                <p className="settings-page-description">
                                    Manage NovaOS user accounts and
                                    authentication access.
                                </p>
                            </div>

                            {!authenticated ||
                                currentUser?.role !==
                                    "admin" ? (
                                <section className="settings-section">
                                    <div className="settings-panel">
                                        <div className="settings-unauthorized">
                                            <div className="settings-unauthorized-icon">
                                                !
                                            </div>

                                            <div className="settings-unauthorized-title">
                                                Administrator access required
                                            </div>

                                            <div className="settings-unauthorized-description">
                                                Only an authenticated
                                                NovaOS administrator
                                                can view and manage
                                                the user directory.
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <>
                                    <div className="settings-access-note">
                                        <span className="settings-access-icon">
                                            ✓
                                        </span>

                                        <span>
                                            You are signed in as{" "}
                                            <strong>
                                                {
                                                    currentUser.displayName
                                                }
                                            </strong>
                                            . Administrator
                                            privileges are active.
                                        </span>
                                    </div>

                                    <section className="settings-section">
                                        <h2 className="settings-section-heading">
                                            Account management
                                        </h2>

                                        <div className="settings-panel">
                                            <div className="settings-user-header">
                                                <div className="settings-user-summary">
                                                    <div className="settings-user-avatar">
                                                        {(
                                                            currentUser.displayName ||
                                                            currentUser.username ||
                                                            "N"
                                                        )
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()}
                                                    </div>

                                                    <div className="settings-user-summary-info">
                                                        <div className="settings-user-summary-name">
                                                            {
                                                                currentUser.displayName
                                                            }
                                                        </div>

                                                        <div className="settings-user-summary-meta">
                                                            @
                                                            {
                                                                currentUser.username
                                                            }{" "}
                                                            •{" "}
                                                            {
                                                                users.length
                                                            }{" "}
                                                            account
                                                            {users.length ===
                                                            1
                                                                ? ""
                                                                : "s"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="settings-button primary"
                                                    onClick={() => {
                                                        setShowCreateUser(
                                                            (
                                                                current
                                                            ) =>
                                                                !current
                                                        );

                                                        setUserError(
                                                            ""
                                                        );
                                                    }}
                                                >
                                                    {showCreateUser
                                                        ? "Cancel"
                                                        : "Create user"}
                                                </button>
                                            </div>

                                            {showCreateUser && (
                                                <form
                                                    className="settings-create-form"
                                                    onSubmit={
                                                        createUser
                                                    }
                                                >
                                                    <div className="settings-form-grid">
                                                        <div className="settings-form-field">
                                                            <label className="settings-form-label">
                                                                Username
                                                            </label>

                                                            <input
                                                                className="settings-form-input"
                                                                type="text"
                                                                value={
                                                                    newUsername
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setNewUsername(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                placeholder="e.g. student"
                                                                autoComplete="off"
                                                                maxLength={
                                                                    32
                                                                }
                                                            />
                                                        </div>

                                                        <div className="settings-form-field">
                                                            <label className="settings-form-label">
                                                                Display name
                                                            </label>

                                                            <input
                                                                className="settings-form-input"
                                                                type="text"
                                                                value={
                                                                    newDisplayName
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setNewDisplayName(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                placeholder="e.g. NovaOS Student"
                                                                maxLength={
                                                                    60
                                                                }
                                                            />
                                                        </div>

                                                        <div className="settings-form-field">
                                                            <label className="settings-form-label">
                                                                Password
                                                            </label>

                                                            <input
                                                                className="settings-form-input"
                                                                type="password"
                                                                value={
                                                                    newPassword
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setNewPassword(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                                placeholder="Minimum 4 characters"
                                                                autoComplete="new-password"
                                                            />
                                                        </div>

                                                        <div className="settings-form-field">
                                                            <label className="settings-form-label">
                                                                Role
                                                            </label>

                                                            <select
                                                                className="settings-form-input"
                                                                value={
                                                                    newRole
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    setNewRole(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                            >
                                                                <option value="user">
                                                                    User
                                                                </option>

                                                                <option value="admin">
                                                                    Administrator
                                                                </option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="settings-form-actions">
                                                        <button
                                                            type="submit"
                                                            className="settings-button primary"
                                                            disabled={
                                                                creatingUser
                                                            }
                                                        >
                                                            {creatingUser
                                                                ? "Creating..."
                                                                : "Create account"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="settings-button"
                                                            disabled={
                                                                creatingUser
                                                            }
                                                            onClick={() => {
                                                                setShowCreateUser(
                                                                    false
                                                                );

                                                                setNewUsername(
                                                                    ""
                                                                );

                                                                setNewDisplayName(
                                                                    ""
                                                                );

                                                                setNewPassword(
                                                                    ""
                                                                );

                                                                setNewRole(
                                                                    "user"
                                                                );

                                                                setUserError(
                                                                    ""
                                                                );
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            )}

                                            {userError && (
                                                <div
                                                    style={{
                                                        margin:
                                                            "14px 16px 0"
                                                    }}
                                                    className="settings-error"
                                                >
                                                    {userError}
                                                </div>
                                            )}

                                            {usersLoading ? (
                                                <div className="settings-loading">
                                                    Loading NovaOS
                                                    users...
                                                </div>
                                            ) : users.length ===
                                              0 ? (
                                                <div className="settings-users-empty">
                                                    No users found.
                                                </div>
                                            ) : (
                                                <div className="settings-user-list">
                                                    {users.map(
                                                        (
                                                            user
                                                        ) => {
                                                            const isCurrentUser =
                                                                user.id ===
                                                                currentUser.id;

                                                            const actionKey =
                                                                `${user.enabled ? "disable" : "enable"}:${user.id}`;

                                                            const deleteKey =
                                                                `delete:${user.id}`;

                                                            const initials =
                                                                (
                                                                    user.displayName ||
                                                                    user.username ||
                                                                    "N"
                                                                )
                                                                    .charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase();

                                                            return (
                                                                <div
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    className="settings-user-item"
                                                                >
                                                                    <div className="settings-user-item-avatar">
                                                                        {
                                                                            initials
                                                                        }
                                                                    </div>

                                                                    <div className="settings-user-item-info">
                                                                        <div className="settings-user-item-name">
                                                                            <span>
                                                                                {
                                                                                    user.displayName
                                                                                }
                                                                            </span>

                                                                            {isCurrentUser && (
                                                                                <span className="settings-user-badge">
                                                                                    Current
                                                                                </span>
                                                                            )}

                                                                            {user.role ===
                                                                                "admin" && (
                                                                                <span className="settings-user-badge">
                                                                                    Admin
                                                                                </span>
                                                                            )}

                                                                            {!user.enabled && (
                                                                                <span className="settings-user-badge disabled">
                                                                                    Disabled
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="settings-user-item-username">
                                                                            @
                                                                            {
                                                                                user.username
                                                                            }{" "}
                                                                            •{" "}
                                                                            {
                                                                                getRoleLabel(
                                                                                    user.role
                                                                                )
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    <div className="settings-user-actions">
                                                                        <button
                                                                            type="button"
                                                                            className={
                                                                                `settings-user-action ${
                                                                                    user.enabled
                                                                                        ? ""
                                                                                        : "success"
                                                                                }`
                                                                            }
                                                                            disabled={
                                                                                userActionLoading ===
                                                                                    actionKey ||
                                                                                isCurrentUser
                                                                            }
                                                                            title={
                                                                                isCurrentUser
                                                                                    ? "The current administrator cannot be disabled."
                                                                                    : user.enabled
                                                                                    ? "Disable user"
                                                                                    : "Enable user"
                                                                            }
                                                                            onClick={() =>
                                                                                changeUserStatus(
                                                                                    user.id,
                                                                                    user.enabled
                                                                                        ? "disable"
                                                                                        : "enable"
                                                                                )
                                                                            }
                                                                        >
                                                                            {userActionLoading ===
                                                                            actionKey
                                                                                ? "..."
                                                                                : user.enabled
                                                                                ? "Disable"
                                                                                : "Enable"}
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            className="settings-user-action delete"
                                                                            disabled={
                                                                                userActionLoading ===
                                                                                deleteKey ||
                                                                                isCurrentUser
                                                                            }
                                                                            title={
                                                                                isCurrentUser
                                                                                    ? "The current administrator cannot be deleted."
                                                                                    : "Delete user"
                                                                            }
                                                                            onClick={() =>
                                                                                deleteUser(
                                                                                    user
                                                                                )
                                                                            }
                                                                        >
                                                                            {userActionLoading ===
                                                                            deleteKey
                                                                                ? "..."
                                                                                : "Delete"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="settings-section">
                                        <h2 className="settings-section-heading">
                                            Authentication
                                        </h2>

                                        <div className="settings-panel">
                                            <SettingRow
                                                title="Current account"
                                                description="The account currently authenticated with the NovaOS kernel."
                                            >
                                                <span className="settings-status-value">
                                                    @
                                                    {
                                                        currentUser.username
                                                    }
                                                </span>
                                            </SettingRow>

                                            <SettingRow
                                                title="Role"
                                                description="Current authorization level."
                                            >
                                                <span
                                                    className="settings-status-value"
                                                    style={{
                                                        color:
                                                            "var(--settings-accent)"
                                                    }}
                                                >
                                                    {getRoleLabel(
                                                        currentUser.role
                                                    )}
                                                </span>
                                            </SettingRow>

                                            <SettingRow
                                                title="Account status"
                                                description="Current authentication account state."
                                            >
                                                <span
                                                    className="settings-status-value"
                                                    style={{
                                                        color:
                                                            currentUser.enabled
                                                                ? "var(--settings-success)"
                                                                : "var(--settings-danger)"
                                                    }}
                                                >
                                                    {currentUser.enabled
                                                        ? "Enabled"
                                                        : "Disabled"}
                                                </span>
                                            </SettingRow>

                                            <SettingRow
                                                title="User count"
                                                description="Total accounts currently managed by the NovaOS kernel."
                                            >
                                                <span className="settings-status-value">
                                                    {
                                                        users.length
                                                    }
                                                </span>
                                            </SettingRow>
                                        </div>
                                    </section>
                                </>
                            )}
                        </>
                    )}

                    {/*
                     * =================================================
                     * ABOUT
                     * =================================================
                     */}

                    {activeSection ===
                        "about" && (
                        <>
                            <div className="settings-page-header">
                                <h1 className="settings-page-title">
                                    About NovaOS
                                </h1>

                                <p className="settings-page-description">
                                    Information about this
                                    NovaOS operating-system
                                    simulator.
                                </p>
                            </div>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    System information
                                </h2>

                                <div className="settings-about">
                                    <div className="settings-info-card">
                                        <div className="settings-info-label">
                                            Operating system
                                        </div>

                                        <div className="settings-info-value">
                                            NovaOS
                                        </div>
                                    </div>

                                    <div className="settings-info-card">
                                        <div className="settings-info-label">
                                            Version
                                        </div>

                                        <div className="settings-info-value">
                                            1.0.0
                                        </div>
                                    </div>

                                    <div className="settings-info-card">
                                        <div className="settings-info-label">
                                            Environment
                                        </div>

                                        <div className="settings-info-value">
                                            OS Simulator
                                        </div>
                                    </div>

                                    <div className="settings-info-card">
                                        <div className="settings-info-label">
                                            Backend
                                        </div>

                                        <div className="settings-info-value">
                                            Node.js API
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section">
                                <h2 className="settings-section-heading">
                                    Preferences
                                </h2>

                                <div className="settings-panel">
                                    <SettingRow
                                        title="Appearance"
                                        description="Current NovaOS interface theme."
                                    >
                                        <span className="settings-status-value">
                                            {settings.appearance
                                                .charAt(
                                                    0
                                                )
                                                .toUpperCase() +
                                                settings.appearance.slice(
                                                    1
                                                )}
                                        </span>
                                    </SettingRow>

                                    <SettingRow
                                        title="Accent"
                                        description="Current NovaOS accent color."
                                    >
                                        <div
                                            style={{
                                                width:
                                                    22,
                                                height:
                                                    22,
                                                borderRadius:
                                                    "50%",
                                                backgroundColor:
                                                    settings.accent,
                                                border:
                                                    "2px solid rgba(255,255,255,0.65)"
                                            }}
                                        />
                                    </SettingRow>

                                    <SettingRow
                                        title="Storage"
                                        description="Settings are stored locally in this browser."
                                    >
                                        <span className="settings-status-value">
                                            Local
                                        </span>
                                    </SettingRow>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}