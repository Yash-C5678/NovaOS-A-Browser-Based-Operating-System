import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import NovaIcon from "../ui/NovaIcon";

const API_BASE = "/api/filesystem";


async function apiRequest(
    path,
    options = {}
) {
    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,
            headers: {
                "Content-Type":
                    "application/json",
                ...(options.headers || {})
            }
        }
    );

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (
        !response.ok ||
        payload?.success === false
    ) {
        throw new Error(
            payload?.error ||
            payload?.message ||
            `Filesystem request failed (${response.status})`
        );
    }

    return payload;
}


function encodePath(path) {
    return encodeURIComponent(path);
}


function formatSize(size) {
    const value =
        Number(size) || 0;

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(
            value / 1024
        ).toFixed(1)} KB`;
    }

    if (
        value <
        1024 * 1024 * 1024
    ) {
        return `${(
            value /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    return `${(
        value /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
}


function getParentPath(path) {
    if (
        !path ||
        path === "/"
    ) {
        return "/";
    }

    const normalized =
        path.endsWith("/")
            ? path.slice(0, -1)
            : path;

    const index =
        normalized.lastIndexOf("/");

    if (index <= 0) {
        return "/";
    }

    return normalized.slice(
        0,
        index
    );
}


function joinPath(
    base,
    name
) {
    if (base === "/") {
        return `/${name}`;
    }

    return `${base}/${name}`;
}


function getFileExtension(
    name
) {
    const index =
        name.lastIndexOf(".");

    if (index <= 0) {
        return "";
    }

    return name
        .slice(index + 1)
        .toLowerCase();
}


function getFileKind(name) {
    const extension =
        getFileExtension(name);

    if (
        extension === "txt" ||
        extension === "md" ||
        extension === "log"
    ) {
        return "text";
    }

    if (
        extension === "js" ||
        extension === "jsx" ||
        extension === "ts" ||
        extension === "tsx" ||
        extension === "json" ||
        extension === "xml" ||
        extension === "css" ||
        extension === "html"
    ) {
        return "code";
    }

    if (
        extension === "png" ||
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "gif" ||
        extension === "webp"
    ) {
        return "image";
    }

    return "file";
}


function getFileIcon(name) {
    const kind =
        getFileKind(name);

    if (kind === "text") {
        return "application";
    }

    if (kind === "code") {
        return "application";
    }

    if (kind === "image") {
        return "application";
    }

    return "application";
}


export default function FileExplorer({
    onOpenFile
}) {
    const [
        currentPath,
        setCurrentPath
    ] = useState("/");

    const [
        entries,
        setEntries
    ] = useState([]);

    const [
        history,
        setHistory
    ] = useState(["/"]);

    const [
        historyIndex,
        setHistoryIndex
    ] = useState(0);

    const [
        selectedEntry,
        setSelectedEntry
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const [
        statusMessage,
        setStatusMessage
    ] = useState("");

    const [
        searchQuery,
        setSearchQuery
    ] = useState("");

    const [
        showCreateMenu,
        setShowCreateMenu
    ] = useState(false);

    const [
        dialog,
        setDialog
    ] = useState(null);

    const [
        dialogValue,
        setDialogValue
    ] = useState("");

    const [
        preview,
        setPreview
    ] = useState(null);

    const [
        previewLoading,
        setPreviewLoading
    ] = useState(false);


    const sortedEntries =
        useMemo(() => {
            return [
                ...entries
            ].sort(
                (a, b) => {
                    if (
                        a.type !==
                        b.type
                    ) {
                        return a.type ===
                            "directory"
                            ? -1
                            : 1;
                    }

                    return a.name.localeCompare(
                        b.name
                    );
                }
            );
        }, [entries]);


    const filteredEntries =
        useMemo(() => {
            const query =
                searchQuery
                    .trim()
                    .toLowerCase();

            if (!query) {
                return sortedEntries;
            }

            return sortedEntries.filter(
                (entry) =>
                    entry.name
                        .toLowerCase()
                        .includes(query)
            );
        }, [
            sortedEntries,
            searchQuery
        ]);


    const loadDirectory =
        useCallback(
            async (
                path,
                {
                    addHistory = false
                } = {}
            ) => {
                setLoading(true);
                setError("");
                setStatusMessage("");

                try {
                    const payload =
                        await apiRequest(
                            `/list?path=${encodePath(
                                path
                            )}`
                        );

                    const normalizedPath =
                        payload?.data?.path ||
                        path;

                    const nextEntries =
                        payload?.data?.entries ||
                        [];

                    setCurrentPath(
                        normalizedPath
                    );

                    setEntries(
                        nextEntries
                    );

                    setSelectedEntry(
                        null
                    );

                    setSearchQuery(
                        ""
                    );

                    if (
                        addHistory
                    ) {
                        setHistory(
                            (
                                previous
                            ) => {
                                const current =
                                    previous.slice(
                                        0,
                                        historyIndex +
                                        1
                                    );

                                if (
                                    current[
                                    current.length -
                                    1
                                    ] ===
                                    normalizedPath
                                ) {
                                    return current;
                                }

                                return [
                                    ...current,
                                    normalizedPath
                                ];
                            }
                        );

                        setHistoryIndex(
                            (
                                previous
                            ) =>
                                previous + 1
                        );
                    }
                } catch (
                requestError
                ) {
                    setError(
                        requestError.message ||
                        "Unable to load directory."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [historyIndex]
        );


    useEffect(() => {
        loadDirectory("/");
    }, [loadDirectory]);


    const navigateTo =
        useCallback(
            async (path) => {
                if (
                    path ===
                    currentPath
                ) {
                    return;
                }

                await loadDirectory(
                    path,
                    {
                        addHistory: true
                    }
                );
            },
            [
                currentPath,
                loadDirectory
            ]
        );


    const navigateBack =
        async () => {
            if (
                historyIndex <=
                0
            ) {
                return;
            }

            const nextIndex =
                historyIndex - 1;

            const nextPath =
                history[
                nextIndex
                ];

            setHistoryIndex(
                nextIndex
            );

            await loadDirectory(
                nextPath
            );
        };


    const navigateForward =
        async () => {
            if (
                historyIndex >=
                history.length - 1
            ) {
                return;
            }

            const nextIndex =
                historyIndex + 1;

            const nextPath =
                history[
                nextIndex
                ];

            setHistoryIndex(
                nextIndex
            );

            await loadDirectory(
                nextPath
            );
        };


    const navigateUp =
        async () => {
            if (
                currentPath ===
                "/"
            ) {
                return;
            }

            await navigateTo(
                getParentPath(
                    currentPath
                )
            );
        };


    const refresh =
        async () => {
            await loadDirectory(
                currentPath
            );
        };


    const openFile =
        async (
            path,
            entry
        ) => {
            setPreviewLoading(
                true
            );

            setError("");

            try {
                const payload =
                    await apiRequest(
                        `/read?path=${encodePath(
                            path
                        )}`
                    );

                const content =
                    payload?.data
                        ?.content ?? "";

                const fileData = {
                    path,
                    name:
                        entry?.name ||
                        path
                            .split("/")
                            .pop(),
                    content
                };

                setPreview(
                    fileData
                );

                onOpenFile?.(
                    fileData
                );
            } catch (
            requestError
            ) {
                setError(
                    requestError.message ||
                    "Unable to open file."
                );
            } finally {
                setPreviewLoading(
                    false
                );
            }
        };


    const handleEntryDoubleClick =
        async (
            entry
        ) => {
            const entryPath =
                joinPath(
                    currentPath,
                    entry.name
                );

            if (
                entry.type ===
                "directory"
            ) {
                await navigateTo(
                    entryPath
                );

                return;
            }

            await openFile(
                entryPath,
                entry
            );
        };


    const closeDialog =
        () => {
            setDialog(null);
            setDialogValue("");
        };


    const createDirectory =
        async () => {
            const name =
                dialogValue.trim();

            if (!name) {
                return;
            }

            try {
                await apiRequest(
                    "/mkdir",
                    {
                        method: "POST",
                        body: JSON.stringify(
                            {
                                path: name,
                                cwd: currentPath
                            }
                        )
                    }
                );

                setStatusMessage(
                    `Created folder "${name}".`
                );

                closeDialog();

                await refresh();
            } catch (
            requestError
            ) {
                setError(
                    requestError.message ||
                    "Unable to create folder."
                );
            }
        };


    const createFile =
        async () => {
            const name =
                dialogValue.trim();

            if (!name) {
                return;
            }

            try {
                await apiRequest(
                    "/touch",
                    {
                        method: "POST",
                        body: JSON.stringify(
                            {
                                path: name,
                                cwd: currentPath
                            }
                        )
                    }
                );

                setStatusMessage(
                    `Created file "${name}".`
                );

                closeDialog();

                await refresh();
            } catch (
            requestError
            ) {
                setError(
                    requestError.message ||
                    "Unable to create file."
                );
            }
        };


    const handleCreate =
        (type) => {
            setShowCreateMenu(
                false
            );

            setDialog(
                type
            );

            setDialogValue(
                ""
            );
        };


    const submitDialog =
        async () => {
            if (
                dialog ===
                "folder"
            ) {
                await createDirectory();
                return;
            }

            if (
                dialog ===
                "file"
            ) {
                await createFile();
            }
        };


    const deleteSelected =
        async () => {
            if (
                !selectedEntry
            ) {
                return;
            }

            const targetPath =
                joinPath(
                    currentPath,
                    selectedEntry.name
                );

            const confirmed =
                window.confirm(
                    `Delete "${selectedEntry.name}"?`
                );

            if (!confirmed) {
                return;
            }

            try {
                await apiRequest(
                    `/remove?path=${encodePath(
                        targetPath
                    )}`,
                    {
                        method: "DELETE"
                    }
                );

                setStatusMessage(
                    `Deleted "${selectedEntry.name}".`
                );

                setSelectedEntry(
                    null
                );

                await refresh();
            } catch (
            requestError
            ) {
                setError(
                    requestError.message ||
                    "Unable to delete item."
                );
            }
        };


    const breadcrumbParts =
        useMemo(() => {
            if (
                currentPath ===
                "/"
            ) {
                return [
                    {
                        name: "NovaOS",
                        path: "/"
                    }
                ];
            }

            const parts =
                currentPath
                    .split("/")
                    .filter(Boolean);

            const result = [
                {
                    name: "NovaOS",
                    path: "/"
                }
            ];

            let accumulated =
                "";

            for (
                const part of parts
            ) {
                accumulated +=
                    `/${part}`;

                result.push({
                    name: part,
                    path: accumulated
                });
            }

            return result;
        }, [currentPath]);


    const locationItems = [
        {
            name: "Home",
            path: "/home/nova",
            icon: "overview"
        },
        {
            name: "Root",
            path: "/",
            icon: "application"
        },
        {
            name: "Applications",
            path: "/apps",
            icon: "application"
        },
        {
            name: "Temporary",
            path: "/tmp",
            icon: "application"
        },
        {
            name: "Configuration",
            path: "/etc",
            icon: "application"
        }
    ];


    const folderCount =
        sortedEntries.filter(
            (entry) =>
                entry.type ===
                "directory"
        ).length;


    const fileCount =
        sortedEntries.filter(
            (entry) =>
                entry.type ===
                "file"
        ).length;


    return (
        <div className="nova-file-explorer">

            <style>
                {`
                    .nova-file-explorer {
                        width: 100%;
                        height: 100%;
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        box-sizing: border-box;
                        background:
                            linear-gradient(
                                145deg,
                                #091321 0%,
                                #07101d 100%
                            );
                        color: #dce7f4;
                        font-family:
                            Inter,
                            ui-sans-serif,
                            system-ui,
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            sans-serif;
                    }

                    .nova-file-explorer * {
                        box-sizing: border-box;
                    }

                    .nova-file-explorer-toolbar {
                        min-height: 56px;
                        flex: 0 0 auto;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 9px 12px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.14);
                        background: rgba(12, 24, 40, 0.94);
                    }

                    .nova-file-explorer-navigation {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .nova-file-explorer-icon-button {
                        width: 34px;
                        height: 34px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 1px solid rgba(115, 150, 190, 0.17);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.025);
                        color: #8ea3bb;
                        cursor: pointer;
                        transition:
                            background 0.15s ease,
                            color 0.15s ease,
                            border-color 0.15s ease;
                    }

                    .nova-file-explorer-icon-button:hover:not(:disabled) {
                        color: #e7f0fa;
                        border-color: rgba(80, 155, 230, 0.4);
                        background: rgba(70, 135, 205, 0.12);
                    }

                    .nova-file-explorer-icon-button:disabled {
                        opacity: 0.3;
                        cursor: default;
                    }

                    .nova-file-explorer-breadcrumb {
                        min-width: 0;
                        flex: 1;
                        height: 36px;
                        display: flex;
                        align-items: center;
                        padding: 0 11px;
                        overflow: hidden;
                        border: 1px solid rgba(115, 150, 190, 0.15);
                        border-radius: 8px;
                        background: rgba(3, 9, 17, 0.52);
                    }

                    .nova-file-explorer-breadcrumb-item {
                        min-width: 0;
                        display: flex;
                        align-items: center;
                    }

                    .nova-file-explorer-breadcrumb-item button {
                        max-width: 150px;
                        overflow: hidden;
                        border: 0;
                        background: transparent;
                        color: #8fa3ba;
                        font-size: 11px;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        cursor: pointer;
                    }

                    .nova-file-explorer-breadcrumb-item:last-child button {
                        color: #e2ebf5;
                        font-weight: 600;
                    }

                    .nova-file-explorer-breadcrumb-item button:hover {
                        color: #65a9df;
                    }

                    .nova-file-explorer-breadcrumb-item span {
                        margin: 0 5px;
                        color: #40536b;
                    }

                    .nova-file-explorer-actions {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .nova-file-explorer-create-wrapper {
                        position: relative;
                    }

                    .nova-file-explorer-action-button {
                        height: 34px;
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        padding: 0 11px;
                        border: 1px solid rgba(80, 150, 220, 0.25);
                        border-radius: 8px;
                        background: rgba(55, 125, 205, 0.12);
                        color: #75b5e7;
                        font-size: 11px;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    .nova-file-explorer-action-button:hover:not(:disabled) {
                        background: rgba(55, 125, 205, 0.2);
                        border-color: rgba(80, 160, 230, 0.4);
                    }

                    .nova-file-explorer-action-button.danger {
                        border-color: rgba(200, 85, 95, 0.18);
                        background: rgba(180, 65, 75, 0.07);
                        color: #b97882;
                    }

                    .nova-file-explorer-action-button.danger:hover:not(:disabled) {
                        border-color: rgba(220, 90, 100, 0.35);
                        background: rgba(180, 65, 75, 0.13);
                    }

                    .nova-file-explorer-action-button:disabled {
                        opacity: 0.35;
                        cursor: default;
                    }

                    .nova-file-explorer-create-menu {
                        position: absolute;
                        z-index: 50;
                        top: calc(100% + 6px);
                        right: 0;
                        width: 170px;
                        padding: 5px;
                        border: 1px solid rgba(105, 145, 185, 0.25);
                        border-radius: 9px;
                        background: #0c1828;
                        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
                    }

                    .nova-file-explorer-create-menu button {
                        width: 100%;
                        height: 34px;
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 0 9px;
                        border: 0;
                        border-radius: 6px;
                        background: transparent;
                        color: #a8b8ca;
                        font-size: 11px;
                        text-align: left;
                        cursor: pointer;
                    }

                    .nova-file-explorer-create-menu button:hover {
                        background: rgba(75, 140, 205, 0.12);
                        color: #e7f0f8;
                    }

                    .nova-file-explorer-location {
                        flex: 0 0 auto;
                        min-height: 40px;
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 7px 15px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.1);
                        background: rgba(8, 18, 30, 0.8);
                    }

                    .nova-file-explorer-location-icon {
                        width: 26px;
                        height: 26px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 7px;
                        background: rgba(70, 140, 215, 0.11);
                        color: #63a8df;
                    }

                    .nova-file-explorer-location span {
                        overflow: hidden;
                        color: #879bb2;
                        font-family: "SFMono-Regular", Consolas, monospace;
                        font-size: 10px;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .nova-file-explorer-message {
                        flex: 0 0 auto;
                        min-height: 34px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 12px;
                        font-size: 10px;
                    }

                    .nova-file-explorer-message.error {
                        border-bottom: 1px solid rgba(220, 90, 100, 0.14);
                        background: rgba(180, 65, 75, 0.08);
                        color: #d99198;
                    }

                    .nova-file-explorer-message.success {
                        border-bottom: 1px solid rgba(70, 190, 145, 0.12);
                        background: rgba(60, 175, 135, 0.06);
                        color: #74c9a9;
                    }

                    .nova-file-explorer-message span {
                        flex: 1;
                    }

                    .nova-file-explorer-message button {
                        border: 0;
                        background: transparent;
                        color: inherit;
                        cursor: pointer;
                        font-size: 16px;
                    }

                    .nova-file-explorer-content {
                        flex: 1;
                        min-height: 0;
                        display: flex;
                        overflow: hidden;
                    }

                    .nova-file-explorer-sidebar {
                        width: 175px;
                        flex: 0 0 175px;
                        display: flex;
                        flex-direction: column;
                        border-right: 1px solid rgba(120, 155, 195, 0.12);
                        background: rgba(7, 16, 28, 0.78);
                    }

                    .nova-file-explorer-sidebar-title {
                        height: 42px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 0 14px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.1);
                        color: #667b94;
                        font-size: 9px;
                        font-weight: 700;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                    }

                    .nova-file-explorer-sidebar-section {
                        padding: 11px 8px 5px;
                        color: #435872;
                        font-size: 8px;
                        font-weight: 700;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                    }

                    .nova-file-explorer-location-button {
                        width: calc(100% - 10px);
                        height: 34px;
                        margin: 2px 5px;
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 0 9px;
                        border: 1px solid transparent;
                        border-radius: 7px;
                        background: transparent;
                        color: #8296ad;
                        font-size: 10px;
                        text-align: left;
                        cursor: pointer;
                    }

                    .nova-file-explorer-location-button:hover {
                        background: rgba(255, 255, 255, 0.035);
                        color: #d9e6f3;
                    }

                    .nova-file-explorer-location-button.active {
                        border-color: rgba(70, 145, 220, 0.2);
                        background: rgba(65, 130, 205, 0.11);
                        color: #e1ecf7;
                    }

                    .nova-file-explorer-location-button-icon {
                        width: 22px;
                        height: 22px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 6px;
                        background: rgba(255, 255, 255, 0.035);
                        color: #619ed1;
                    }

                    .nova-file-explorer-main {
                        flex: 1;
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                    }

                    .nova-file-explorer-search {
                        flex: 0 0 auto;
                        height: 46px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 7px 12px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.1);
                    }

                    .nova-file-explorer-search-box {
                        flex: 1;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 0 9px;
                        border: 1px solid rgba(110, 145, 185, 0.15);
                        border-radius: 7px;
                        background: rgba(3, 9, 17, 0.45);
                        color: #61758e;
                    }

                    .nova-file-explorer-search-box:focus-within {
                        border-color: rgba(75, 150, 225, 0.4);
                    }

                    .nova-file-explorer-search-box input {
                        flex: 1;
                        min-width: 0;
                        height: 100%;
                        border: 0;
                        outline: 0;
                        background: transparent;
                        color: #dce7f2;
                        font-size: 10px;
                    }

                    .nova-file-explorer-search-box input::placeholder {
                        color: #50657e;
                    }

                    .nova-file-explorer-search-clear {
                        border: 0;
                        background: transparent;
                        color: #71859b;
                        cursor: pointer;
                        font-size: 15px;
                    }

                    .nova-file-explorer-list {
                        flex: 1;
                        min-height: 0;
                        overflow-y: auto;
                        padding: 8px 10px;
                        scrollbar-width: thin;
                        scrollbar-color: rgba(100, 135, 175, 0.3) transparent;
                    }

                    .nova-file-explorer-list::-webkit-scrollbar {
                        width: 6px;
                    }

                    .nova-file-explorer-list::-webkit-scrollbar-thumb {
                        border-radius: 8px;
                        background: rgba(100, 135, 175, 0.3);
                    }

                    .nova-file-explorer-table-header {
                        height: 30px;
                        display: grid;
                        grid-template-columns: minmax(180px, 1fr) 90px 90px;
                        align-items: center;
                        padding: 0 10px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.1);
                        color: #526880;
                        font-size: 8px;
                        font-weight: 700;
                        letter-spacing: 0.7px;
                        text-transform: uppercase;
                    }

                    .nova-file-explorer-row {
                        width: 100%;
                        min-height: 50px;
                        display: grid;
                        grid-template-columns: minmax(180px, 1fr) 90px 90px;
                        align-items: center;
                        padding: 5px 10px;
                        border: 1px solid transparent;
                        border-radius: 7px;
                        background: transparent;
                        color: #aabbd0;
                        text-align: left;
                        cursor: pointer;
                    }

                    .nova-file-explorer-row:hover {
                        border-color: rgba(90, 145, 200, 0.12);
                        background: rgba(70, 130, 195, 0.06);
                    }

                    .nova-file-explorer-row.selected {
                        border-color: rgba(70, 145, 220, 0.3);
                        background: rgba(60, 125, 200, 0.13);
                    }

                    .nova-file-explorer-name {
                        min-width: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        overflow: hidden;
                    }

                    .nova-file-explorer-entry-icon {
                        width: 32px;
                        height: 32px;
                        flex: 0 0 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 8px;
                        background: rgba(65, 130, 205, 0.1);
                        color: #65a8df;
                    }

                    .nova-file-explorer-row:first-of-type .nova-file-explorer-entry-icon {
                        color: #6caee2;
                    }

                    .nova-file-explorer-name > span:last-child {
                        overflow: hidden;
                        color: #d5e1ed;
                        font-size: 11px;
                        font-weight: 600;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .nova-file-explorer-type,
                    .nova-file-explorer-size {
                        color: #61758d;
                        font-size: 9px;
                    }

                    .nova-file-explorer-empty {
                        height: 100%;
                        min-height: 220px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 7px;
                        color: #60748b;
                        text-align: center;
                    }

                    .nova-file-explorer-empty strong {
                        color: #b6c6d7;
                        font-size: 12px;
                    }

                    .nova-file-explorer-empty span {
                        font-size: 9px;
                    }

                    .nova-file-explorer-details {
                        width: 220px;
                        flex: 0 0 220px;
                        padding: 18px 15px;
                        border-left: 1px solid rgba(120, 155, 195, 0.12);
                        background: rgba(7, 16, 28, 0.72);
                        overflow-y: auto;
                    }

                    .nova-file-explorer-details-title {
                        color: #637891;
                        font-size: 8px;
                        font-weight: 700;
                        letter-spacing: 0.8px;
                        text-transform: uppercase;
                    }

                    .nova-file-explorer-details-icon {
                        width: 58px;
                        height: 58px;
                        margin: 12px 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 13px;
                        background: linear-gradient(
                            135deg,
                            #318fdd,
                            #6254d4
                        );
                        color: white;
                        box-shadow: 0 10px 25px rgba(45, 100, 190, 0.2);
                    }

                    .nova-file-explorer-details-name {
                        overflow: hidden;
                        color: #e1ebf5;
                        font-size: 13px;
                        font-weight: 700;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .nova-file-explorer-details-path {
                        margin-top: 5px;
                        overflow-wrap: anywhere;
                        color: #536980;
                        font-family: "SFMono-Regular", Consolas, monospace;
                        font-size: 8px;
                        line-height: 1.5;
                    }

                    .nova-file-explorer-details-grid {
                        display: grid;
                        grid-template-columns: 1fr auto;
                        gap: 10px;
                        margin-top: 18px;
                        padding-top: 13px;
                        border-top: 1px solid rgba(120, 155, 195, 0.1);
                    }

                    .nova-file-explorer-details-grid span {
                        color: #536980;
                        font-size: 9px;
                    }

                    .nova-file-explorer-details-grid strong {
                        color: #aabbd0;
                        font-size: 9px;
                        text-align: right;
                    }

                    .nova-file-explorer-details-hint {
                        margin-top: 20px;
                        padding: 9px;
                        border: 1px solid rgba(100, 140, 185, 0.1);
                        border-radius: 7px;
                        background: rgba(255, 255, 255, 0.02);
                        color: #536980;
                        font-size: 8px;
                        line-height: 1.5;
                    }

                    .nova-file-explorer-no-selection {
                        width: 220px;
                        flex: 0 0 220px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 9px;
                        padding: 20px;
                        border-left: 1px solid rgba(120, 155, 195, 0.12);
                        color: #52677f;
                        font-size: 9px;
                        text-align: center;
                    }

                    .nova-file-explorer-statusbar {
                        flex: 0 0 auto;
                        min-height: 28px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 0 12px;
                        border-top: 1px solid rgba(120, 155, 195, 0.11);
                        background: rgba(5, 12, 21, 0.9);
                        color: #52677e;
                        font-family: "SFMono-Regular", Consolas, monospace;
                        font-size: 8px;
                    }

                    .nova-file-explorer-status-separator {
                        color: #2d4056;
                    }

                    .nova-file-explorer-preview-overlay,
                    .nova-file-explorer-dialog-overlay {
                        position: fixed;
                        inset: 0;
                        z-index: 20000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        background: rgba(2, 7, 14, 0.72);
                        backdrop-filter: blur(5px);
                    }

                    .nova-file-explorer-preview {
                        width: min(760px, 90vw);
                        height: min(560px, 80vh);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        border: 1px solid rgba(105, 150, 205, 0.28);
                        border-radius: 13px;
                        background: #091522;
                        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                    }

                    .nova-file-explorer-preview-header {
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 14px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.13);
                    }

                    .nova-file-explorer-preview-header > div {
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        color: #dce8f4;
                        font-size: 11px;
                    }

                    .nova-file-explorer-preview-header button {
                        width: 28px;
                        height: 28px;
                        border: 0;
                        border-radius: 6px;
                        background: transparent;
                        color: #8295ab;
                        font-size: 18px;
                        cursor: pointer;
                    }

                    .nova-file-explorer-preview-header button:hover {
                        background: rgba(255, 255, 255, 0.06);
                        color: white;
                    }

                    .nova-file-explorer-preview-path {
                        padding: 7px 14px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.09);
                        color: #536980;
                        font-family: "SFMono-Regular", Consolas, monospace;
                        font-size: 8px;
                    }

                    .nova-file-explorer-preview pre {
                        flex: 1;
                        min-height: 0;
                        margin: 0;
                        padding: 16px;
                        overflow: auto;
                        color: #b8c9da;
                        background: #06101b;
                        font-family: "SFMono-Regular", Consolas, monospace;
                        font-size: 10px;
                        line-height: 1.65;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }

                    .nova-file-explorer-dialog {
                        width: min(380px, 90vw);
                        overflow: hidden;
                        border: 1px solid rgba(105, 150, 205, 0.28);
                        border-radius: 13px;
                        background: #0b1827;
                        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                    }

                    .nova-file-explorer-dialog-header {
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 15px;
                        border-bottom: 1px solid rgba(120, 155, 195, 0.12);
                        color: #dce7f2;
                        font-size: 12px;
                    }

                    .nova-file-explorer-dialog-body {
                        padding: 16px;
                    }

                    .nova-file-explorer-dialog-body label {
                        display: block;
                        margin-bottom: 7px;
                        color: #657990;
                        font-size: 9px;
                        font-weight: 600;
                    }

                    .nova-file-explorer-dialog-body input {
                        width: 100%;
                        height: 38px;
                        padding: 0 10px;
                        border: 1px solid rgba(110, 145, 185, 0.2);
                        border-radius: 7px;
                        outline: 0;
                        background: #07111e;
                        color: #e1ebf5;
                        font-size: 11px;
                    }

                    .nova-file-explorer-dialog-body input:focus {
                        border-color: rgba(70, 150, 225, 0.5);
                    }

                    .nova-file-explorer-dialog-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 7px;
                        padding: 11px 15px;
                        border-top: 1px solid rgba(120, 155, 195, 0.1);
                    }

                    .nova-file-explorer-dialog-actions button {
                        height: 32px;
                        padding: 0 12px;
                        border: 1px solid rgba(110, 145, 185, 0.16);
                        border-radius: 7px;
                        background: rgba(255, 255, 255, 0.03);
                        color: #8296ad;
                        font-size: 10px;
                        cursor: pointer;
                    }

                    .nova-file-explorer-dialog-actions button.primary {
                        border-color: rgba(70, 150, 225, 0.35);
                        background: rgba(60, 130, 205, 0.15);
                        color: #75b5e7;
                    }

                    .nova-file-explorer-dialog-actions button:disabled {
                        opacity: 0.35;
                        cursor: default;
                    }

                    @media (max-width: 850px) {
                        .nova-file-explorer-sidebar {
                            width: 145px;
                            flex-basis: 145px;
                        }

                        .nova-file-explorer-details,
                        .nova-file-explorer-no-selection {
                            display: none;
                        }

                        .nova-file-explorer-table-header,
                        .nova-file-explorer-row {
                            grid-template-columns: minmax(150px, 1fr) 70px;
                        }

                        .nova-file-explorer-table-header span:last-child,
                        .nova-file-explorer-row .nova-file-explorer-size {
                            display: none;
                        }
                    }

                    @media (max-width: 620px) {
                        .nova-file-explorer-sidebar {
                            display: none;
                        }

                        .nova-file-explorer-action-button span {
                            display: none;
                        }

                        .nova-file-explorer-action-button {
                            width: 34px;
                            justify-content: center;
                            padding: 0;
                        }

                        .nova-file-explorer-breadcrumb-item button {
                            max-width: 90px;
                        }
                    }
                `}
            </style>


            <div className="nova-file-explorer-toolbar">

                <div className="nova-file-explorer-navigation">

                    <button
                        type="button"
                        className="nova-file-explorer-icon-button"
                        onClick={
                            navigateBack
                        }
                        disabled={
                            historyIndex <=
                            0 ||
                            loading
                        }
                        title="Back"
                    >
                        ←
                    </button>


                    <button
                        type="button"
                        className="nova-file-explorer-icon-button"
                        onClick={
                            navigateForward
                        }
                        disabled={
                            historyIndex >=
                            history.length -
                            1 ||
                            loading
                        }
                        title="Forward"
                    >
                        →
                    </button>


                    <button
                        type="button"
                        className="nova-file-explorer-icon-button"
                        onClick={
                            navigateUp
                        }
                        disabled={
                            currentPath ===
                            "/" ||
                            loading
                        }
                        title="Up"
                    >
                        ↑
                    </button>


                    <button
                        type="button"
                        className="nova-file-explorer-icon-button"
                        onClick={
                            refresh
                        }
                        disabled={
                            loading
                        }
                        title="Refresh"
                    >
                        ↻
                    </button>

                </div>


                <div className="nova-file-explorer-breadcrumb">

                    {breadcrumbParts.map(
                        (
                            part,
                            index
                        ) => (
                            <div
                                key={
                                    part.path
                                }
                                className="nova-file-explorer-breadcrumb-item"
                            >

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigateTo(
                                            part.path
                                        )
                                    }
                                >
                                    {
                                        part.name
                                    }
                                </button>


                                {index <
                                    breadcrumbParts.length -
                                    1 && (
                                        <span>
                                            /
                                        </span>
                                    )}

                            </div>
                        )
                    )}

                </div>


                <div className="nova-file-explorer-actions">

                    <div className="nova-file-explorer-create-wrapper">

                        <button
                            type="button"
                            className="nova-file-explorer-action-button"
                            onClick={() =>
                                setShowCreateMenu(
                                    (
                                        value
                                    ) =>
                                        !value
                                )
                            }
                        >
                            +
                            <span>
                                New
                            </span>
                        </button>


                        {showCreateMenu && (
                            <div className="nova-file-explorer-create-menu">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCreate(
                                            "folder"
                                        )
                                    }
                                >
                                    +
                                    New Folder
                                </button>


                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCreate(
                                            "file"
                                        )
                                    }
                                >
                                    +
                                    New File
                                </button>

                            </div>
                        )}

                    </div>


                    <button
                        type="button"
                        className="nova-file-explorer-action-button danger"
                        onClick={
                            deleteSelected
                        }
                        disabled={
                            !selectedEntry
                        }
                    >
                        ×
                        <span>
                            Delete
                        </span>
                    </button>

                </div>

            </div>


            <div className="nova-file-explorer-location">

                <div className="nova-file-explorer-location-icon">
                    <NovaIcon
                        name="application"
                        size={15}
                    />
                </div>

                <span>
                    {currentPath}
                </span>

            </div>


            {error && (
                <div className="nova-file-explorer-message error">

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>

                </div>
            )}


            {statusMessage &&
                !error && (
                    <div className="nova-file-explorer-message success">

                        <span>
                            {
                                statusMessage
                            }
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setStatusMessage(
                                    ""
                                )
                            }
                        >
                            ×
                        </button>

                    </div>
                )}


            <div className="nova-file-explorer-content">

                <aside className="nova-file-explorer-sidebar">

                    <div className="nova-file-explorer-sidebar-title">

                        <NovaIcon
                            name="application"
                            size={14}
                        />

                        Locations

                    </div>


                    <div className="nova-file-explorer-sidebar-section">
                        Favorites
                    </div>


                    {locationItems.map(
                        (
                            location
                        ) => (
                            <button
                                type="button"
                                key={
                                    location.path
                                }
                                className={`nova-file-explorer-location-button ${currentPath ===
                                        location.path
                                        ? "active"
                                        : ""
                                    }`}
                                onClick={() =>
                                    navigateTo(
                                        location.path
                                    )
                                }
                            >

                                <span className="nova-file-explorer-location-button-icon">

                                    <NovaIcon
                                        name={
                                            location.icon
                                        }
                                        size={
                                            14
                                        }
                                    />

                                </span>

                                <span>
                                    {
                                        location.name
                                    }
                                </span>

                            </button>
                        )
                    )}

                </aside>


                <main className="nova-file-explorer-main">

                    <div className="nova-file-explorer-search">

                        <div className="nova-file-explorer-search-box">

                            <NovaIcon
                                name="application"
                                size={13}
                            />

                            <input
                                type="text"
                                value={
                                    searchQuery
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearchQuery(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Search this folder..."
                            />


                            {searchQuery && (
                                <button
                                    type="button"
                                    className="nova-file-explorer-search-clear"
                                    onClick={() =>
                                        setSearchQuery(
                                            ""
                                        )
                                    }
                                >
                                    ×
                                </button>
                            )}

                        </div>

                    </div>


                    <div className="nova-file-explorer-list">

                        <div className="nova-file-explorer-table-header">

                            <span>
                                Name
                            </span>

                            <span>
                                Type
                            </span>

                            <span>
                                Size
                            </span>

                        </div>


                        {loading ? (
                            <div className="nova-file-explorer-empty">

                                <NovaIcon
                                    name="application"
                                    size={28}
                                />

                                <strong>
                                    Loading filesystem
                                </strong>

                                <span>
                                    Reading the NovaOS VFS...
                                </span>

                            </div>
                        ) : filteredEntries.length ===
                            0 ? (
                            <div className="nova-file-explorer-empty">

                                <NovaIcon
                                    name="application"
                                    size={32}
                                />

                                <strong>
                                    {searchQuery
                                        ? "No matching items"
                                        : "This folder is empty"}
                                </strong>

                                <span>
                                    {searchQuery
                                        ? "Try a different search."
                                        : "Create a file or folder to get started."}
                                </span>

                            </div>
                        ) : (
                            filteredEntries.map(
                                (
                                    entry
                                ) => {
                                    const selected =
                                        selectedEntry?.name ===
                                        entry.name &&
                                        selectedEntry?.type ===
                                        entry.type;

                                    return (
                                        <button
                                            type="button"
                                            key={`${entry.type}-${entry.name}`}
                                            className={`nova-file-explorer-row ${selected
                                                    ? "selected"
                                                    : ""
                                                }`}
                                            onClick={() =>
                                                setSelectedEntry(
                                                    entry
                                                )
                                            }
                                            onDoubleClick={() =>
                                                handleEntryDoubleClick(
                                                    entry
                                                )
                                            }
                                        >

                                            <span className="nova-file-explorer-name">

                                                <span className="nova-file-explorer-entry-icon">

                                                    <NovaIcon
                                                        name={
                                                            entry.type ===
                                                                "directory"
                                                                ? "application"
                                                                : getFileIcon(
                                                                    entry.name
                                                                )
                                                        }
                                                        size={
                                                            18
                                                        }
                                                    />

                                                </span>


                                                <span>
                                                    {
                                                        entry.name
                                                    }
                                                </span>

                                            </span>


                                            <span className="nova-file-explorer-type">

                                                {entry.type ===
                                                    "directory"
                                                    ? "Folder"
                                                    : "File"}

                                            </span>


                                            <span className="nova-file-explorer-size">

                                                {entry.type ===
                                                    "directory"
                                                    ? `${entry.size} item${entry.size ===
                                                        1
                                                        ? ""
                                                        : "s"
                                                    }`
                                                    : formatSize(
                                                        entry.size
                                                    )}

                                            </span>

                                        </button>
                                    );
                                }
                            )
                        )}

                    </div>

                </main>


                {selectedEntry ? (
                    <aside className="nova-file-explorer-details">

                        <div className="nova-file-explorer-details-title">
                            Selected Item
                        </div>


                        <div className="nova-file-explorer-details-icon">

                            <NovaIcon
                                name="application"
                                size={30}
                            />

                        </div>


                        <div className="nova-file-explorer-details-name">
                            {
                                selectedEntry.name
                            }
                        </div>


                        <div className="nova-file-explorer-details-path">
                            {joinPath(
                                currentPath,
                                selectedEntry.name
                            )}
                        </div>


                        <div className="nova-file-explorer-details-grid">

                            <span>
                                Type
                            </span>

                            <strong>
                                {selectedEntry.type ===
                                    "directory"
                                    ? "Folder"
                                    : "File"}
                            </strong>


                            <span>
                                Size
                            </span>

                            <strong>
                                {selectedEntry.type ===
                                    "directory"
                                    ? `${selectedEntry.size} item${selectedEntry.size ===
                                        1
                                        ? ""
                                        : "s"
                                    }`
                                    : formatSize(
                                        selectedEntry.size
                                    )}
                            </strong>

                        </div>


                        <div className="nova-file-explorer-details-hint">

                            Double-click to{" "}
                            {selectedEntry.type ===
                                "directory"
                                ? "open this folder"
                                : "preview this file"}
                            .

                        </div>

                    </aside>
                ) : (
                    <aside className="nova-file-explorer-no-selection">

                        <NovaIcon
                            name="application"
                            size={26}
                        />

                        <span>
                            Select an item to view
                            its details.
                        </span>

                    </aside>
                )}

            </div>


            <div className="nova-file-explorer-statusbar">

                <span>
                    {sortedEntries.length}{" "}
                    item
                    {sortedEntries.length ===
                        1
                        ? ""
                        : "s"}
                </span>


                <span className="nova-file-explorer-status-separator">
                    |
                </span>


                <span>
                    {folderCount} folders
                </span>


                <span className="nova-file-explorer-status-separator">
                    |
                </span>


                <span>
                    {fileCount} files
                </span>


                <span className="nova-file-explorer-status-separator">
                    |
                </span>


                <span>
                    NovaOS VFS
                </span>


                {previewLoading && (
                    <>
                        <span className="nova-file-explorer-status-separator">
                            |
                        </span>

                        <span>
                            Opening...
                        </span>
                    </>
                )}

            </div>


            {preview && (
                <div className="nova-file-explorer-preview-overlay">

                    <div className="nova-file-explorer-preview">

                        <div className="nova-file-explorer-preview-header">

                            <div>

                                <NovaIcon
                                    name="application"
                                    size={17}
                                />

                                <strong>
                                    {
                                        preview.name
                                    }
                                </strong>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setPreview(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="nova-file-explorer-preview-path">
                            {
                                preview.path
                            }
                        </div>


                        <pre>
                            {
                                preview.content
                            }
                        </pre>

                    </div>

                </div>
            )}


            {dialog && (
                <div className="nova-file-explorer-dialog-overlay">

                    <div className="nova-file-explorer-dialog">

                        <div className="nova-file-explorer-dialog-header">

                            <NovaIcon
                                name="application"
                                size={18}
                            />

                            <strong>
                                {dialog ===
                                    "folder"
                                    ? "New Folder"
                                    : "New File"}
                            </strong>

                        </div>


                        <div className="nova-file-explorer-dialog-body">

                            <label>
                                Name
                            </label>

                            <input
                                autoFocus
                                value={
                                    dialogValue
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDialogValue(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                onKeyDown={(
                                    event
                                ) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
                                        submitDialog();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        closeDialog();
                                    }
                                }}
                                placeholder={
                                    dialog ===
                                        "folder"
                                        ? "Folder name"
                                        : "File name"
                                }
                            />

                        </div>


                        <div className="nova-file-explorer-dialog-actions">

                            <button
                                type="button"
                                onClick={
                                    closeDialog
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="primary"
                                disabled={
                                    !dialogValue.trim()
                                }
                                onClick={
                                    submitDialog
                                }
                            >
                                Create
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}