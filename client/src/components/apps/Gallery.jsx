import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

const API_BASE =
    "http://localhost:5000/api/filesystem";

const PHOTO_DIRECTORY =
    "/home/nova/Pictures";

const VIDEO_DIRECTORY =
    "/home/nova/Videos";

function isImageFile(name = "") {
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(
        name
    );
}

function isVideoFile(name = "") {
    return /\.(mp4|webm|ogg|mov)$/i.test(
        name
    );
}

function formatDate(value) {
    if (!value) {
        return "Unknown date";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString();
}

function formatSize(value) {
    const size = Number(value);

    if (!Number.isFinite(size) || size <= 0) {
        return "0 B";
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    if (size < 1024 * 1024 * 1024) {
        return `${(
            size /
            (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    return `${(
        size /
        (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
}

function getEntryPath(directory, entry) {
    if (!entry) {
        return directory;
    }

    if (entry.path) {
        return entry.path;
    }

    const name = entry.name || "";

    return `${directory}/${name}`.replace(
        /\/+/g,
        "/"
    );
}

function getEntryName(entry) {
    return (
        entry?.name ||
        entry?.path?.split("/").pop() ||
        "Unnamed"
    );
}

function getEntryModifiedAt(entry) {
    return (
        entry?.modifiedAt ||
        entry?.updatedAt ||
        entry?.createdAt ||
        entry?.created ||
        null
    );
}

function getEntrySize(entry) {
    return (
        entry?.size ??
        entry?.contentLength ??
        entry?.length ??
        0
    );
}

export default function Gallery() {
    const [activeTab, setActiveTab] =
        useState("photos");

    const [photos, setPhotos] =
        useState([]);

    const [videos, setVideos] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [selectedMedia, setSelectedMedia] =
        useState(null);

    const [mediaContent, setMediaContent] =
        useState("");

    const [loadingMedia, setLoadingMedia] =
        useState(false);

    const [mediaLoadError, setMediaLoadError] =
        useState("");

    const [deletingPath, setDeletingPath] =
        useState("");

    const [notice, setNotice] =
        useState("");

    const visibleMedia =
        activeTab === "photos"
            ? photos
            : videos;

    const totalMedia =
        photos.length + videos.length;

    const loadDirectory = useCallback(
        async (directory) => {
            const response = await fetch(
                `${API_BASE}/list?path=${encodeURIComponent(
                    directory
                )}`
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ||
                    `Unable to read ${directory}.`
                );
            }

            const entries =
                Array.isArray(
                    result.data?.entries
                )
                    ? result.data.entries
                    : [];

            return entries.filter(
                (entry) =>
                    entry?.type === "file" ||
                    entry?.type === undefined
            );
        },
        []
    );

    const ensureDirectory =
        useCallback(
            async (directory) => {
                try {
                    const response =
                        await fetch(
                            `${API_BASE}/list?path=${encodeURIComponent(
                                directory
                            )}`
                        );

                    if (response.ok) {
                        const result =
                            await response.json();

                        if (result.success) {
                            return;
                        }
                    }
                } catch {
                    // Directory may not exist.
                }

                const response =
                    await fetch(
                        `${API_BASE}/mkdir`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                path: directory,
                                cwd: "/"
                            })
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok &&
                    !String(
                        result.error || ""
                    ).includes(
                        "already exists"
                    )
                ) {
                    throw new Error(
                        result.error ||
                        `Unable to create ${directory}.`
                    );
                }
            },
            []
        );

    const refreshGallery =
        useCallback(async () => {
            setLoading(true);
            setError("");

            try {
                await ensureDirectory(
                    PHOTO_DIRECTORY
                );

                await ensureDirectory(
                    VIDEO_DIRECTORY
                );

                const [
                    photoEntries,
                    videoEntries
                ] = await Promise.all([
                    loadDirectory(
                        PHOTO_DIRECTORY
                    ),
                    loadDirectory(
                        VIDEO_DIRECTORY
                    )
                ]);

                const validPhotos =
                    photoEntries
                        .filter((entry) =>
                            isImageFile(
                                getEntryName(
                                    entry
                                )
                            )
                        )
                        .map((entry) => ({
                            ...entry,
                            mediaType:
                                "photo",
                            path:
                                getEntryPath(
                                    PHOTO_DIRECTORY,
                                    entry
                                )
                        }));

                const validVideos =
                    videoEntries
                        .filter((entry) =>
                            isVideoFile(
                                getEntryName(
                                    entry
                                )
                            )
                        )
                        .map((entry) => ({
                            ...entry,
                            mediaType:
                                "video",
                            path:
                                getEntryPath(
                                    VIDEO_DIRECTORY,
                                    entry
                                )
                        }));

                setPhotos(validPhotos);
                setVideos(validVideos);
            } catch (loadError) {
                setError(
                    loadError?.message ||
                    "Unable to load Gallery."
                );
            } finally {
                setLoading(false);
            }
        }, [
            ensureDirectory,
            loadDirectory
        ]);

    useEffect(() => {
        refreshGallery();
    }, [refreshGallery]);

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timer =
            window.setTimeout(
                () => setNotice(""),
                3000
            );

        return () =>
            window.clearTimeout(timer);
    }, [notice]);

    const openMedia = useCallback(
        async (media) => {
            setSelectedMedia(media);
            setMediaContent("");
            setMediaLoadError("");
            setLoadingMedia(true);
            setError("");

            try {
                const response =
                    await fetch(
                        `${API_BASE}/read?path=${encodeURIComponent(
                            media.path
                        )}`
                    );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.error ||
                        "Unable to read media."
                    );
                }

                const content =
                    result.data?.content ??
                    "";

                if (
                    typeof content !==
                    "string" ||
                    !content.trim()
                ) {
                    throw new Error(
                        "The filesystem entry contains no readable media content."
                    );
                }

                setMediaContent(
                    content.trim()
                );
            } catch (readError) {
                setMediaLoadError(
                    readError?.message ||
                    "Unable to open media."
                );
            } finally {
                setLoadingMedia(false);
            }
        },
        []
    );

    const closeViewer =
        useCallback(() => {
            setSelectedMedia(null);
            setMediaContent("");
            setMediaLoadError("");
            setLoadingMedia(false);
        }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeViewer();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
    }, [closeViewer]);

    const deleteMedia =
        useCallback(
            async (media) => {
                const confirmed =
                    window.confirm(
                        `Delete "${getEntryName(
                            media
                        )}" from NovaOS?`
                    );

                if (!confirmed) {
                    return;
                }

                setDeletingPath(
                    media.path
                );

                setError("");

                try {
                    const response =
                        await fetch(
                            `${API_BASE}/remove?path=${encodeURIComponent(
                                media.path
                            )}`,
                            {
                                method: "DELETE"
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
                            "Unable to delete media."
                        );
                    }

                    if (
                        selectedMedia?.path ===
                        media.path
                    ) {
                        closeViewer();
                    }

                    setNotice(
                        `${getEntryName(
                            media
                        )} deleted.`
                    );

                    await refreshGallery();
                } catch (deleteError) {
                    setError(
                        deleteError?.message ||
                        "Unable to delete media."
                    );
                } finally {
                    setDeletingPath("");
                }
            },
            [
                closeViewer,
                refreshGallery,
                selectedMedia
            ]
        );

    const downloadMedia =
        useCallback(() => {
            if (
                !selectedMedia ||
                !mediaContent
            ) {
                return;
            }

            const link =
                document.createElement(
                    "a"
                );

            link.href = mediaContent;

            link.download =
                getEntryName(
                    selectedMedia
                );

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();
        }, [
            mediaContent,
            selectedMedia
        ]);

    const currentTitle =
        activeTab === "photos"
            ? "Photos"
            : "Videos";

    const currentCount =
        visibleMedia.length;

    const sortedMedia =
        useMemo(
            () =>
                [...visibleMedia].sort(
                    (a, b) => {
                        const first =
                            new Date(
                                getEntryModifiedAt(
                                    a
                                ) || 0
                            ).getTime();

                        const second =
                            new Date(
                                getEntryModifiedAt(
                                    b
                                ) || 0
                            ).getTime();

                        return (
                            second - first
                        );
                    }
                ),
            [visibleMedia]
        );

    return (
        <div className="nova-gallery">
            <style>{`
                .nova-gallery {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    background:
                        linear-gradient(
                            180deg,
                            #101722 0%,
                            #0b1018 100%
                        );
                    color: #e8edf5;
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

                .gallery-header {
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 18px;
                    padding: 18px 20px;
                    border-bottom: 1px solid
                        rgba(255,255,255,0.08);
                    background:
                        rgba(14,20,30,0.92);
                }

                .gallery-title-area {
                    min-width: 0;
                }

                .gallery-title {
                    margin: 0;
                    font-size: 21px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .gallery-subtitle {
                    margin: 5px 0 0;
                    color: #8995a6;
                    font-size: 12px;
                }

                .gallery-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .gallery-button {
                    border: 1px solid
                        rgba(255,255,255,0.09);
                    background: #151e2a;
                    color: #dce4ee;
                    border-radius: 9px;
                    min-height: 36px;
                    padding: 0 13px;
                    font-weight: 600;
                    font-size: 12px;
                    cursor: pointer;
                }

                .gallery-button:hover {
                    background: #1d2938;
                    border-color:
                        rgba(255,255,255,0.16);
                }

                .gallery-button:active {
                    transform: translateY(1px);
                }

                .gallery-button:disabled {
                    opacity: 0.55;
                    cursor: default;
                }

                .gallery-button.primary {
                    background: #e7edf5;
                    color: #111722;
                    border-color: #e7edf5;
                }

                .gallery-tabs {
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 12px 20px;
                    border-bottom: 1px solid
                        rgba(255,255,255,0.06);
                }

                .gallery-tab {
                    border: 1px solid transparent;
                    background: transparent;
                    color: #8793a4;
                    border-radius: 8px;
                    padding: 9px 15px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 700;
                }

                .gallery-tab:hover {
                    color: #dce4ee;
                    background: #131b26;
                }

                .gallery-tab.active {
                    background: #e7edf5;
                    color: #111722;
                }

                .gallery-content {
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow: auto;
                    padding: 18px 20px 24px;
                }

                .gallery-status {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 15px;
                }

                .gallery-section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #c8d1dc;
                }

                .gallery-count {
                    color: #778496;
                    font-size: 11px;
                }

                .gallery-message {
                    border: 1px solid
                        rgba(255,255,255,0.07);
                    background: #101823;
                    min-height: 220px;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 30px;
                    box-sizing: border-box;
                }

                .gallery-message-icon {
                    width: 58px;
                    height: 58px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #182230;
                    border: 1px solid
                        rgba(255,255,255,0.08);
                    font-size: 24px;
                    margin-bottom: 14px;
                }

                .gallery-message-title {
                    font-size: 15px;
                    font-weight: 700;
                    margin-bottom: 6px;
                }

                .gallery-message-text {
                    max-width: 430px;
                    color: #7f8b9c;
                    font-size: 12px;
                    line-height: 1.55;
                }

                .gallery-error {
                    margin-bottom: 14px;
                    padding: 11px 13px;
                    border-radius: 9px;
                    border: 1px solid
                        rgba(255,105,105,0.25);
                    background:
                        rgba(150,40,40,0.12);
                    color: #ffb0b0;
                    font-size: 12px;
                }

                .gallery-notice {
                    margin-bottom: 14px;
                    padding: 11px 13px;
                    border-radius: 9px;
                    border: 1px solid
                        rgba(100,220,160,0.2);
                    background:
                        rgba(50,150,100,0.1);
                    color: #a7e5c2;
                    font-size: 12px;
                }

                .gallery-grid {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            auto-fill,
                            minmax(165px, 1fr)
                        );
                    gap: 14px;
                }

                .gallery-card {
                    min-width: 0;
                    border: 1px solid
                        rgba(255,255,255,0.07);
                    border-radius: 12px;
                    overflow: hidden;
                    background: #101823;
                }

                .gallery-card:hover {
                    transform: translateY(-2px);
                    border-color:
                        rgba(255,255,255,0.15);
                    box-shadow:
                        0 10px 28px
                        rgba(0,0,0,0.22);
                }

                .gallery-thumbnail {
                    width: 100%;
                    aspect-ratio: 4 / 3;
                    background: #080c12;
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .gallery-thumbnail img,
                .gallery-thumbnail video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .gallery-video-placeholder {
                    font-size: 36px;
                    opacity: 0.7;
                }

                .gallery-video-badge {
                    position: absolute;
                    right: 9px;
                    bottom: 9px;
                    background:
                        rgba(0,0,0,0.7);
                    border: 1px solid
                        rgba(255,255,255,0.12);
                    border-radius: 6px;
                    padding: 4px 7px;
                    font-size: 10px;
                    font-weight: 700;
                }

                .gallery-card-info {
                    padding: 11px 12px;
                }

                .gallery-file-name {
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    color: #dce4ed;
                    font-size: 12px;
                    font-weight: 650;
                }

                .gallery-file-meta {
                    margin-top: 5px;
                    color: #6f7c8d;
                    font-size: 10px;
                }

                .gallery-card-actions {
                    display: flex;
                    gap: 7px;
                    padding: 0 12px 11px;
                }

                .gallery-small-button {
                    flex: 1;
                    min-width: 0;
                    border: 1px solid
                        rgba(255,255,255,0.07);
                    background: #151e2a;
                    color: #aeb9c8;
                    border-radius: 7px;
                    min-height: 29px;
                    font-size: 10px;
                    font-weight: 650;
                    cursor: pointer;
                }

                .gallery-small-button:hover {
                    background: #1d2938;
                    color: #e4ebf3;
                }

                .gallery-small-button:disabled {
                    opacity: 0.55;
                    cursor: default;
                }

                /*
                 * VIEWER
                 *
                 * The viewer is positioned relative to
                 * the NovaOS Gallery application rather
                 * than the browser viewport.
                 */

                .gallery-viewer-backdrop {
                    position: absolute;
                    inset: 0;
                    z-index: 99999;
                    background:
                        rgba(2,5,9,0.88);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    box-sizing: border-box;
                    overflow: hidden;
                }

                .gallery-viewer {
                    width: min(
                        1050px,
                        calc(100% - 48px)
                    );

                    height: min(
                        760px,
                        calc(100% - 48px)
                    );

                    max-height: calc(
                        100% - 48px
                    );

                    min-height: 0;

                    display: grid;

                    grid-template-rows:
                        auto
                        minmax(0, 1fr)
                        auto;

                    background: #0e151f;

                    border: 1px solid
                        rgba(255,255,255,0.1);

                    border-radius: 14px;

                    overflow: hidden;

                    box-shadow:
                        0 30px 90px
                        rgba(0,0,0,0.5);

                    box-sizing: border-box;
                }

                .gallery-viewer-header {
                    min-width: 0;
                    min-height: 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 15px;
                    padding: 13px 15px;
                    border-bottom: 1px solid
                        rgba(255,255,255,0.08);
                    box-sizing: border-box;
                    background: #0e151f;
                }

                .gallery-viewer-name {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 12px;
                    font-weight: 700;
                }

                .gallery-viewer-actions {
                    display: flex;
                    gap: 7px;
                    flex-shrink: 0;
                    align-items: center;
                }

                .gallery-viewer-body {
                    min-width: 0;
                    min-height: 0;
                    position: relative;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding: 16px;

                    overflow: hidden;

                    background: #070b10;

                    box-sizing: border-box;
                }

                .gallery-viewer-media {
                    display: block;

                    width: auto;
                    height: auto;

                    max-width: 100%;
                    max-height: 100%;

                    object-fit: contain;

                    border-radius: 5px;

                    box-sizing: border-box;
                }

                .gallery-viewer-body
                    .gallery-message {
                    width: min(
                        430px,
                        100%
                    );

                    min-height: 180px;
                    max-height: 100%;

                    margin: 0;
                }

                .gallery-viewer-footer {
                    min-width: 0;
                    min-height: 0;

                    padding: 10px 15px;

                    border-top: 1px solid
                        rgba(255,255,255,0.08);

                    color: #758294;

                    font-size: 10px;

                    white-space: nowrap;

                    overflow: hidden;

                    text-overflow: ellipsis;

                    box-sizing: border-box;

                    background: #0e151f;
                }

                .gallery-media-error {
                    width: min(
                        450px,
                        100%
                    );

                    padding: 24px;

                    border: 1px solid
                        rgba(255,100,100,0.2);

                    border-radius: 12px;

                    background:
                        rgba(100,30,30,0.12);

                    text-align: center;

                    box-sizing: border-box;
                }

                .gallery-media-error-icon {
                    font-size: 32px;
                    margin-bottom: 12px;
                }

                .gallery-media-error-title {
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 7px;
                    color: #e6edf5;
                }

                .gallery-media-error-text {
                    color: #8e9aaa;
                    font-size: 11px;
                    line-height: 1.5;
                    word-break: break-word;
                }

                @media (max-width: 700px) {
                    .gallery-header {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    .gallery-header-actions {
                        width: 100%;
                        justify-content: flex-start;
                    }

                    .gallery-grid {
                        grid-template-columns:
                            repeat(
                                auto-fill,
                                minmax(130px, 1fr)
                            );
                    }

                    .gallery-viewer-backdrop {
                        padding: 10px;
                    }

                    .gallery-viewer {
                        width: calc(
                            100% - 20px
                        );

                        height: calc(
                            100% - 20px
                        );

                        max-height: calc(
                            100% - 20px
                        );
                    }

                    .gallery-viewer-header {
                        padding: 10px;
                    }

                    .gallery-viewer-actions {
                        gap: 5px;
                    }

                    .gallery-viewer-actions
                        .gallery-button {
                        min-height: 32px;
                        padding: 0 9px;
                    }

                    .gallery-viewer-body {
                        padding: 10px;
                    }
                }
            `}</style>

            <div className="gallery-header">
                <div className="gallery-title-area">
                    <h1 className="gallery-title">
                        NovaOS Gallery
                    </h1>

                    <p className="gallery-subtitle">
                        Photos and videos stored in
                        the NovaOS filesystem
                    </p>
                </div>

                <div className="gallery-header-actions">
                    <button
                        type="button"
                        className="gallery-button"
                        onClick={
                            refreshGallery
                        }
                        disabled={loading}
                    >
                        {loading
                            ? "Refreshing..."
                            : "↻ Refresh"}
                    </button>

                    <button
                        type="button"
                        className="gallery-button primary"
                        onClick={() =>
                            setActiveTab(
                                "photos"
                            )
                        }
                    >
                        📷 Photos{" "}
                        {photos.length}
                    </button>

                    <button
                        type="button"
                        className="gallery-button"
                        onClick={() =>
                            setActiveTab(
                                "videos"
                            )
                        }
                    >
                        🎥 Videos{" "}
                        {videos.length}
                    </button>
                </div>
            </div>

            <div className="gallery-tabs">
                <button
                    type="button"
                    className={
                        `gallery-tab ${activeTab ===
                            "photos"
                            ? "active"
                            : ""
                        }`
                    }
                    onClick={() =>
                        setActiveTab(
                            "photos"
                        )
                    }
                >
                    📷 Photos
                </button>

                <button
                    type="button"
                    className={
                        `gallery-tab ${activeTab ===
                            "videos"
                            ? "active"
                            : ""
                        }`
                    }
                    onClick={() =>
                        setActiveTab(
                            "videos"
                        )
                    }
                >
                    🎥 Videos
                </button>
            </div>

            <div className="gallery-content">
                <div className="gallery-status">
                    <span className="gallery-section-title">
                        {currentTitle}
                    </span>

                    <span className="gallery-count">
                        {currentCount} item
                        {currentCount === 1
                            ? ""
                            : "s"}{" "}
                        · {totalMedia} total
                    </span>
                </div>

                {error && (
                    <div className="gallery-error">
                        {error}
                    </div>
                )}

                {notice && (
                    <div className="gallery-notice">
                        {notice}
                    </div>
                )}

                {loading ? (
                    <div className="gallery-message">
                        <div className="gallery-message-icon">
                            ⏳
                        </div>

                        <div className="gallery-message-title">
                            Loading Gallery
                        </div>

                        <div className="gallery-message-text">
                            Reading media from
                            the NovaOS
                            filesystem.
                        </div>
                    </div>
                ) : sortedMedia.length ===
                    0 ? (
                    <div className="gallery-message">
                        <div className="gallery-message-icon">
                            {activeTab ===
                                "photos"
                                ? "📷"
                                : "🎥"}
                        </div>

                        <div className="gallery-message-title">
                            No{" "}
                            {currentTitle.toLowerCase()}{" "}
                            yet
                        </div>

                        <div className="gallery-message-text">
                            Captured media
                            saved by NovaOS
                            will appear
                            here
                            automatically.
                        </div>
                    </div>
                ) : (
                    <div className="gallery-grid">
                        {sortedMedia.map(
                            (media) => {
                                const name =
                                    getEntryName(
                                        media
                                    );

                                const modifiedAt =
                                    getEntryModifiedAt(
                                        media
                                    );

                                const size =
                                    getEntrySize(
                                        media
                                    );

                                return (
                                    <div
                                        className="gallery-card"
                                        key={
                                            media.path
                                        }
                                    >
                                        <div
                                            className="gallery-thumbnail"
                                            onClick={() =>
                                                openMedia(
                                                    media
                                                )
                                            }
                                            role="button"
                                            tabIndex={
                                                0
                                            }
                                            onKeyDown={(
                                                event
                                            ) => {
                                                if (
                                                    event.key ===
                                                    "Enter" ||
                                                    event.key ===
                                                    " "
                                                ) {
                                                    event.preventDefault();

                                                    openMedia(
                                                        media
                                                    );
                                                }
                                            }}
                                        >
                                            {media.mediaType ===
                                                "photo" ? (
                                                media.preview ? (
                                                    <img
                                                        src={
                                                            media.preview
                                                        }
                                                        alt={
                                                            name
                                                        }
                                                    />
                                                ) : (
                                                    <div className="gallery-video-placeholder">
                                                        📷
                                                    </div>
                                                )
                                            ) : (
                                                <>
                                                    <div className="gallery-video-placeholder">
                                                        🎥
                                                    </div>

                                                    <span className="gallery-video-badge">
                                                        VIDEO
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className="gallery-card-info">
                                            <div
                                                className="gallery-file-name"
                                                title={
                                                    name
                                                }
                                            >
                                                {
                                                    name
                                                }
                                            </div>

                                            <div className="gallery-file-meta">
                                                {formatSize(
                                                    size
                                                )}
                                                {" · "}
                                                {formatDate(
                                                    modifiedAt
                                                )}
                                            </div>
                                        </div>

                                        <div className="gallery-card-actions">
                                            <button
                                                type="button"
                                                className="gallery-small-button"
                                                onClick={() =>
                                                    openMedia(
                                                        media
                                                    )
                                                }
                                            >
                                                Open
                                            </button>

                                            <button
                                                type="button"
                                                className="gallery-small-button"
                                                disabled={
                                                    deletingPath ===
                                                    media.path
                                                }
                                                onClick={() =>
                                                    deleteMedia(
                                                        media
                                                    )
                                                }
                                            >
                                                {deletingPath ===
                                                    media.path
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

            {selectedMedia && (
                <div
                    className="gallery-viewer-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeViewer();
                        }
                    }}
                >
                    <div
                        className="gallery-viewer"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Viewing ${getEntryName(
                            selectedMedia
                        )}`}
                    >
                        <div className="gallery-viewer-header">
                            <div
                                className="gallery-viewer-name"
                                title={getEntryName(
                                    selectedMedia
                                )}
                            >
                                {getEntryName(
                                    selectedMedia
                                )}
                            </div>

                            <div className="gallery-viewer-actions">
                                <button
                                    type="button"
                                    className="gallery-button"
                                    disabled={
                                        !mediaContent ||
                                        loadingMedia
                                    }
                                    onClick={
                                        downloadMedia
                                    }
                                >
                                    Export
                                </button>

                                <button
                                    type="button"
                                    className="gallery-button"
                                    onClick={
                                        closeViewer
                                    }
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="gallery-viewer-body">
                            {loadingMedia ? (
                                <div className="gallery-message">
                                    <div className="gallery-message-icon">
                                        ⏳
                                    </div>

                                    <div className="gallery-message-title">
                                        Opening media
                                    </div>

                                    <div className="gallery-message-text">
                                        Reading the
                                        file from
                                        the NovaOS
                                        filesystem.
                                    </div>
                                </div>
                            ) : mediaLoadError ? (
                                <div className="gallery-media-error">
                                    <div className="gallery-media-error-icon">
                                        ⚠️
                                    </div>

                                    <div className="gallery-media-error-title">
                                        Image unavailable
                                    </div>

                                    <div className="gallery-media-error-text">
                                        {
                                            mediaLoadError
                                        }
                                    </div>
                                </div>
                            ) : !mediaContent ? (
                                <div className="gallery-media-error">
                                    <div className="gallery-media-error-icon">
                                        ⚠️
                                    </div>

                                    <div className="gallery-media-error-title">
                                        Media unavailable
                                    </div>

                                    <div className="gallery-media-error-text">
                                        The filesystem
                                        entry did not
                                        contain
                                        readable media
                                        content.
                                    </div>
                                </div>
                            ) : selectedMedia.mediaType ===
                                "photo" ? (
                                <img
                                    className="gallery-viewer-media"
                                    src={
                                        mediaContent
                                    }
                                    alt={getEntryName(
                                        selectedMedia
                                    )}
                                    onError={() =>
                                        setMediaLoadError(
                                            "The filesystem returned content, but the browser could not decode it as an image."
                                        )
                                    }
                                />
                            ) : (
                                <video
                                    className="gallery-viewer-media"
                                    src={
                                        mediaContent
                                    }
                                    controls
                                    preload="metadata"
                                    onError={() =>
                                        setMediaLoadError(
                                            "The filesystem returned content, but the browser could not decode it as a video."
                                        )
                                    }
                                />
                            )}
                        </div>

                        <div
                            className="gallery-viewer-footer"
                            title={
                                selectedMedia.path
                            }
                        >
                            {selectedMedia.path}
                            {" · "}
                            {formatSize(
                                getEntrySize(
                                    selectedMedia
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}