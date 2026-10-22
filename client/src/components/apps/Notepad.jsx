import { useEffect, useState } from "react";
import NovaIcon from "../ui/NovaIcon";

const API_BASE = "/api/filesystem";

async function apiRequest(path, options = {}) {
    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
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

export default function Notepad({
    initialFile = null
}) {
    const [filePath, setFilePath] =
        useState(
            initialFile?.path || ""
        );

    const [fileName, setFileName] =
        useState(
            initialFile?.name ||
            "Untitled"
        );

    const [content, setContent] =
        useState(
            initialFile?.content || ""
        );

    const [savedContent, setSavedContent] =
        useState(
            initialFile?.content || ""
        );

    const [openPath, setOpenPath] =
        useState(
            initialFile?.path || ""
        );

    const [loading, setLoading] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [status, setStatus] =
        useState("");

    const [showOpenDialog, setShowOpenDialog] =
        useState(false);

    const [pathInput, setPathInput] =
        useState(
            initialFile?.path || ""
        );

    const [showSaveDialog, setShowSaveDialog] =
        useState(false);

    const [savePathInput, setSavePathInput] =
        useState(
            initialFile?.path || ""
        );

    const dirty =
        content !== savedContent;


    useEffect(() => {
        if (!initialFile) {
            return;
        }

        setFilePath(
            initialFile.path || ""
        );

        setFileName(
            initialFile.name ||
            "Untitled"
        );

        setContent(
            initialFile.content || ""
        );

        setSavedContent(
            initialFile.content || ""
        );

        setOpenPath(
            initialFile.path || ""
        );

        setPathInput(
            initialFile.path || ""
        );

        setSavePathInput(
            initialFile.path || ""
        );

        setStatus(
            "File opened"
        );
    }, [initialFile]);


    const openFile = async (
        requestedPath
    ) => {
        const path =
            requestedPath.trim();

        if (!path) {
            return;
        }

        setLoading(true);
        setError("");
        setStatus("");

        try {
            const payload =
                await apiRequest(
                    `/read?path=${encodeURIComponent(
                        path
                    )}`
                );

            const nextContent =
                payload?.data?.content ||
                "";

            const parts =
                path
                    .split("/")
                    .filter(Boolean);

            const name =
                parts.length > 0
                    ? parts[
                          parts.length - 1
                      ]
                    : "Untitled";

            setFilePath(path);
            setFileName(name);

            setContent(
                nextContent
            );

            setSavedContent(
                nextContent
            );

            setOpenPath(path);

            setPathInput(path);

            setSavePathInput(path);

            setShowOpenDialog(
                false
            );

            setStatus(
                "File opened"
            );
        } catch (requestError) {
            setError(
                requestError.message ||
                    "Unable to open file."
            );
        } finally {
            setLoading(false);
        }
    };


    const saveFile = async (
        requestedPath = filePath
    ) => {
        const path =
            requestedPath.trim();

        if (!path) {
            setSavePathInput("");
            setShowSaveDialog(
                true
            );

            return;
        }

        setSaving(true);
        setError("");
        setStatus("");

        try {
            await apiRequest(
                "/write",
                {
                    method: "POST",
                    body: JSON.stringify(
                        {
                            path,
                            content
                        }
                    )
                }
            );

            const parts =
                path
                    .split("/")
                    .filter(Boolean);

            const name =
                parts.length > 0
                    ? parts[
                          parts.length - 1
                      ]
                    : "Untitled";

            setFilePath(path);
            setFileName(name);

            setSavedContent(
                content
            );

            setOpenPath(path);

            setPathInput(path);

            setSavePathInput(path);

            setShowSaveDialog(
                false
            );

            setStatus(
                "Saved to NovaOS VFS"
            );
        } catch (requestError) {
            setError(
                requestError.message ||
                    "Unable to save file."
            );
        } finally {
            setSaving(false);
        }
    };


    const newDocument = () => {
        if (dirty) {
            const confirmed =
                window.confirm(
                    "You have unsaved changes. Create a new document anyway?"
                );

            if (!confirmed) {
                return;
            }
        }

        setFilePath("");
        setFileName(
            "Untitled"
        );

        setContent("");
        setSavedContent("");

        setOpenPath("");
        setPathInput("");
        setSavePathInput("");

        setError("");

        setStatus(
            "New document"
        );
    };


    const handleOpenSubmit =
        async () => {
            await openFile(
                pathInput
            );
        };


    const handleSaveSubmit =
        async () => {
            await saveFile(
                savePathInput
            );
        };


    const handleKeyDown =
        (event) => {
            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "s"
            ) {
                event.preventDefault();

                if (filePath) {
                    saveFile(
                        filePath
                    );
                } else {
                    setSavePathInput(
                        "/home/nova/"
                    );

                    setShowSaveDialog(
                        true
                    );
                }
            }

            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "o"
            ) {
                event.preventDefault();

                setShowOpenDialog(
                    true
                );
            }

            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key.toLowerCase() ===
                    "n"
            ) {
                event.preventDefault();

                newDocument();
            }
        };


    return (
        <div className="nova-notepad">

            <style>
                {`
                    .nova-notepad {
                        width: 100%;
                        height: 100%;
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        background: var(--nova-bg-1, #0d1324);
                        color: var(--nova-text, #f1f5ff);
                        font-family:
                            Inter,
                            ui-sans-serif,
                            system-ui,
                            -apple-system,
                            BlinkMacSystemFont,
                            "Segoe UI",
                            sans-serif;
                    }

                    .nova-notepad * {
                        box-sizing: border-box;
                    }

                    .nova-notepad-toolbar {
                        flex: 0 0 auto;
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        padding: 7px 10px;
                        border-bottom: 1px solid var(--nova-border, #252f48);
                        background: var(--nova-surface-strong, #171e32);
                    }

                    .nova-notepad-button {
                        height: 32px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 0 9px;
                        border: 1px solid rgba(105, 145, 185, 0.16);
                        border-radius: 7px;
                        background: rgba(255, 255, 255, 0.025);
                        color: #91a5ba;
                        font-size: 10px;
                        font-weight: 600;
                        cursor: pointer;
                    }

                    .nova-notepad-button:hover:not(:disabled) {
                        border-color: rgba(75, 150, 225, 0.35);
                        background: rgba(65, 130, 205, 0.1);
                        color: #dce8f4;
                    }

                    .nova-notepad-button.primary {
                        border-color: rgba(70, 150, 225, 0.28);
                        background: rgba(55, 130, 210, 0.12);
                        color: #72afe0;
                    }

                    .nova-notepad-button:disabled {
                        opacity: 0.4;
                        cursor: default;
                    }

                    .nova-notepad-separator {
                        width: 1px;
                        height: 20px;
                        margin: 0 4px;
                        background: rgba(120, 155, 195, 0.12);
                    }

                    .nova-notepad-title {
                        min-width: 0;
                        flex: 1;
                        padding: 0 10px;
                        overflow: hidden;
                        color: var(--nova-text-muted, #71809a);
                        font-size: 10px;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .nova-notepad-title strong {
                        color: var(--nova-text, #f1f5ff);
                    }

                    .nova-notepad-dirty {
                        margin-left: 4px;
                        color: #70aee0;
                    }

                    .nova-notepad-editor {
                        flex: 1;
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        overflow: hidden;
                    }

                    .nova-notepad-textarea {
                        width: 100%;
                        height: 100%;
                        min-width: 0;
                        min-height: 0;
                        resize: none;
                        border: 0;
                        outline: 0;
                        padding: 18px 20px;
                        background: var(--nova-surface, #12182a);
                        color: var(--nova-text, #f1f5ff);
                        font-family:
                            "SFMono-Regular",
                            Consolas,
                            "Liberation Mono",
                            monospace;
                        font-size: 12px;
                        line-height: 1.7;
                        tab-size: 4;
                    }

                    .nova-notepad-textarea::selection {
                        background: rgba(65, 140, 220, 0.3);
                    }

                    .nova-notepad-textarea::placeholder {
                        color: #40556c;
                    }

                    .nova-notepad-status {
                        flex: 0 0 auto;
                        min-height: 27px;
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 0 11px;
                        border-top: 1px solid var(--nova-border, #252f48);
                        background: var(--nova-surface-strong, #171e32);
                        color: var(--nova-text-muted, #71809a);
                        font-family:
                            "SFMono-Regular",
                            Consolas,
                            monospace;
                        font-size: 8px;
                    }

                    .nova-notepad-status-message {
                        flex: 1;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .nova-notepad-status-message.error {
                        color: #c87882;
                    }

                    .nova-notepad-status-message.success {
                        color: #6cba9c;
                    }

                    .nova-notepad-dialog-overlay {
                        position: fixed;
                        inset: 0;
                        z-index: 20000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        background: rgba(2, 7, 14, 0.72);
                        backdrop-filter: blur(4px);
                    }

                    .nova-notepad-dialog {
                        width: min(410px, 90vw);
                        overflow: hidden;
                        border: 1px solid var(--nova-border, #252f48);
                        border-radius: 12px;
                        background: var(--nova-surface-strong, #171e32);
                        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
                    }

                    .nova-notepad-dialog-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 14px 15px;
                        border-bottom: 1px solid var(--nova-border-soft, rgba(148, 163, 184, 0.10));
                        color: var(--nova-text, #f1f5ff);
                        font-size: 12px;
                        font-weight: 700;
                    }

                    .nova-notepad-dialog-body {
                        padding: 15px;
                    }

                    .nova-notepad-dialog-body label {
                        display: block;
                        margin-bottom: 7px;
                        color: #657a91;
                        font-size: 9px;
                        font-weight: 600;
                    }

                    .nova-notepad-dialog-input {
                        width: 100%;
                        height: 37px;
                        padding: 0 10px;
                        border: 1px solid var(--nova-border, #252f48);
                        border-radius: 7px;
                        outline: 0;
                        background: var(--nova-surface, #12182a);
                        color: var(--nova-text, #f1f5ff);
                        font-family:
                            "SFMono-Regular",
                            Consolas,
                            monospace;
                        font-size: 10px;
                    }

                    .nova-notepad-dialog-input:focus {
                        border-color: rgba(70, 150, 225, 0.45);
                    }

                    .nova-notepad-dialog-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 7px;
                        padding: 11px 15px;
                        border-top: 1px solid rgba(120, 155, 195, 0.1);
                    }

                    .nova-notepad-dialog-actions button {
                        height: 31px;
                        padding: 0 12px;
                        border: 1px solid rgba(105, 145, 185, 0.17);
                        border-radius: 7px;
                        background: rgba(255,255,255,0.025);
                        color: #8195aa;
                        font-size: 10px;
                        cursor: pointer;
                    }

                    .nova-notepad-dialog-actions button.primary {
                        border-color: rgba(70, 150, 225, 0.3);
                        background: rgba(60, 130, 205, 0.13);
                        color: #72afe0;
                    }

                    @media (max-width: 650px) {
                        .nova-notepad-button span {
                            display: none;
                        }

                        .nova-notepad-button {
                            width: 32px;
                            justify-content: center;
                            padding: 0;
                        }

                        .nova-notepad-title {
                            padding: 0 5px;
                        }
                    }
                `}
            </style>


            <div className="nova-notepad-toolbar">

                <button
                    type="button"
                    className="nova-notepad-button"
                    onClick={
                        newDocument
                    }
                >
                    <NovaIcon
                        name="application"
                        size={15}
                    />
                    <span>
                        New
                    </span>
                </button>


                <button
                    type="button"
                    className="nova-notepad-button"
                    onClick={() =>
                        setShowOpenDialog(
                            true
                        )
                    }
                >
                    <NovaIcon
                        name="application"
                        size={15}
                    />
                    <span>
                        Open
                    </span>
                </button>


                <button
                    type="button"
                    className="nova-notepad-button primary"
                    onClick={() => {
                        if (
                            filePath
                        ) {
                            saveFile(
                                filePath
                            );
                        } else {
                            setSavePathInput(
                                "/home/nova/"
                            );

                            setShowSaveDialog(
                                true
                            );
                        }
                    }}
                    disabled={
                        saving
                    }
                >
                    <NovaIcon
                        name="application"
                        size={15}
                    />
                    <span>
                        {saving
                            ? "Saving..."
                            : "Save"}
                    </span>
                </button>


                <div className="nova-notepad-separator" />


                <div className="nova-notepad-title">
                    <strong>
                        {fileName}
                    </strong>

                    {dirty && (
                        <span className="nova-notepad-dirty">
                            ●
                        </span>
                    )}
                </div>

            </div>


            <div className="nova-notepad-editor">

                <textarea
                    className="nova-notepad-textarea"
                    value={
                        content
                    }
                    onChange={(
                        event
                    ) => {
                        setContent(
                            event.target
                                .value
                        );

                        setStatus("");
                        setError("");
                    }}
                    onKeyDown={
                        handleKeyDown
                    }
                    placeholder={
                        "Start typing...\n\nCtrl+S  Save\nCtrl+O  Open\nCtrl+N  New"
                    }
                    spellCheck={
                        false
                    }
                    disabled={
                        loading
                    }
                />

            </div>


            <div className="nova-notepad-status">

                <span>
                    {loading
                        ? "Opening..."
                        : saving
                          ? "Saving..."
                          : dirty
                            ? "Modified"
                            : "Saved"}
                </span>


                <span>
                    |
                </span>


                <span>
                    {content.length} chars
                </span>


                <span>
                    |
                </span>


                <span>
                    {content.split("\n").length} lines
                </span>


                <span>
                    |
                </span>


                <span className="nova-notepad-status-message">
                    {error || status || openPath || "Untitled document"}
                </span>

            </div>


            {showOpenDialog && (
                <div className="nova-notepad-dialog-overlay">

                    <div className="nova-notepad-dialog">

                        <div className="nova-notepad-dialog-header">

                            <NovaIcon
                                name="application"
                                size={17}
                            />

                            Open File

                        </div>


                        <div className="nova-notepad-dialog-body">

                            <label>
                                VFS file path
                            </label>

                            <input
                                className="nova-notepad-dialog-input"
                                autoFocus
                                value={
                                    pathInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setPathInput(
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
                                        handleOpenSubmit();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        setShowOpenDialog(
                                            false
                                        );
                                    }
                                }}
                                placeholder="/home/nova/welcome.txt"
                            />

                        </div>


                        <div className="nova-notepad-dialog-actions">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowOpenDialog(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="primary"
                                onClick={
                                    handleOpenSubmit
                                }
                                disabled={
                                    !pathInput.trim() ||
                                    loading
                                }
                            >
                                Open
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {showSaveDialog && (
                <div className="nova-notepad-dialog-overlay">

                    <div className="nova-notepad-dialog">

                        <div className="nova-notepad-dialog-header">

                            <NovaIcon
                                name="application"
                                size={17}
                            />

                            Save File

                        </div>


                        <div className="nova-notepad-dialog-body">

                            <label>
                                VFS file path
                            </label>

                            <input
                                className="nova-notepad-dialog-input"
                                autoFocus
                                value={
                                    savePathInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSavePathInput(
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
                                        handleSaveSubmit();
                                    }

                                    if (
                                        event.key ===
                                        "Escape"
                                    ) {
                                        setShowSaveDialog(
                                            false
                                        );
                                    }
                                }}
                                placeholder="/home/nova/notes.txt"
                            />

                        </div>


                        <div className="nova-notepad-dialog-actions">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowSaveDialog(
                                        false
                                    )
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="primary"
                                onClick={
                                    handleSaveSubmit
                                }
                                disabled={
                                    !savePathInput.trim() ||
                                    saving
                                }
                            >
                                Save
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}