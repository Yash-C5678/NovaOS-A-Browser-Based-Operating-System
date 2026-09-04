import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";


const CAMERA_MODES = {
    PHOTO: "photo",
    VIDEO: "video"
};


const FILESYSTEM_API =
    "http://localhost:5000/api/filesystem";


const PHOTO_DIRECTORY =
    "/home/nova/Pictures";


const VIDEO_DIRECTORY =
    "/home/nova/Videos";


function formatDuration(seconds) {
    const safeSeconds =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const minutes =
        Math.floor(
            safeSeconds / 60
        );

    const remainingSeconds =
        safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds
    ).padStart(2, "0")}`;
}


function blobToDataUrl(blob) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload =
                () => {
                    resolve(
                        reader.result
                    );
                };

            reader.onerror =
                () => {
                    reject(
                        new Error(
                            "Unable to convert recorded media."
                        )
                    );
                };

            reader.readAsDataURL(
                blob
            );
        }
    );
}


function Camera() {
    const videoRef =
        useRef(null);

    const canvasRef =
        useRef(null);

    const streamRef =
        useRef(null);

    const recorderRef =
        useRef(null);

    const recordedChunksRef =
        useRef([]);

    const timerRef =
        useRef(null);


    const [
        mode,
        setMode
    ] = useState(
        CAMERA_MODES.PHOTO
    );

    const [
        streamActive,
        setStreamActive
    ] = useState(false);

    const [
        recording,
        setRecording
    ] = useState(false);

    const [
        recordingSeconds,
        setRecordingSeconds
    ] = useState(0);

    const [
        capturedMedia,
        setCapturedMedia
    ] = useState([]);

    const [
        selectedCamera,
        setSelectedCamera
    ] = useState("");

    const [
        cameras,
        setCameras
    ] = useState([]);

    const [
        error,
        setError
    ] = useState("");

    const [
        status,
        setStatus
    ] = useState(
        "Camera is stopped"
    );


    /*
     * =========================================================
     * ENSURE NOVAOS MEDIA DIRECTORIES
     * =========================================================
     */

    const ensureDirectory =
        useCallback(
            async (
                directory
            ) => {

                const listResponse =
                    await fetch(
                        `${FILESYSTEM_API}/list?path=${encodeURIComponent(
                            directory
                        )}`
                    );

                if (
                    listResponse.ok
                ) {

                    const result =
                        await listResponse.json();

                    if (
                        result.success
                    ) {
                        return true;
                    }
                }


                const mkdirResponse =
                    await fetch(
                        `${FILESYSTEM_API}/mkdir`,
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    path:
                                        directory,

                                    cwd:
                                        "/"
                                })
                        }
                    );


                const mkdirResult =
                    await mkdirResponse.json();


                if (
                    !mkdirResponse.ok &&
                    !String(
                        mkdirResult.error ||
                        ""
                    ).includes(
                        "already exists"
                    )
                ) {

                    throw new Error(
                        mkdirResult.error ||
                        `Unable to create ${directory}.`
                    );
                }


                return true;
            },
            []
        );


    /*
     * =========================================================
     * SAVE MEDIA TO NOVAOS FILESYSTEM
     * =========================================================
     */

    const saveToNovaFilesystem =
        useCallback(
            async (
                media
            ) => {

                const directory =
                    media.type === "photo"
                        ? PHOTO_DIRECTORY
                        : VIDEO_DIRECTORY;


                try {

                    await ensureDirectory(
                        directory
                    );


                    const response =
                        await fetch(
                            `${FILESYSTEM_API}/write`,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        path:
                                            `${directory}/${media.name}`,

                                        content:
                                            media.url,

                                        cwd:
                                            "/"
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
                            "Unable to save media to the NovaOS filesystem."
                        );
                    }


                    return result;

                } catch (
                filesystemError
                ) {

                    throw new Error(
                        filesystemError?.message ||
                        "Unable to save media to the NovaOS filesystem."
                    );
                }
            },
            [
                ensureDirectory
            ]
        );


    /*
     * =========================================================
     * STOP STREAM
     * =========================================================
     */

    const stopStream =
        useCallback(
            () => {

                const stream =
                    streamRef.current;


                if (
                    stream
                ) {

                    stream
                        .getTracks()
                        .forEach(
                            (track) =>
                                track.stop()
                        );
                }


                streamRef.current =
                    null;


                if (
                    videoRef.current
                ) {

                    videoRef.current.srcObject =
                        null;
                }


                setStreamActive(
                    false
                );


                setStatus(
                    "Camera is stopped"
                );
            },
            []
        );


    /*
     * =========================================================
     * ENUMERATE CAMERAS
     * =========================================================
     */

    const loadCameras =
        useCallback(
            async () => {

                if (
                    !navigator
                        .mediaDevices ||
                    !navigator
                        .mediaDevices
                        .enumerateDevices
                ) {

                    return;
                }


                try {

                    const devices =
                        await navigator
                            .mediaDevices
                            .enumerateDevices();


                    const videoDevices =
                        devices.filter(
                            (device) =>
                                device.kind ===
                                "videoinput"
                        );


                    setCameras(
                        videoDevices
                    );


                    if (
                        videoDevices.length > 0 &&
                        !selectedCamera
                    ) {

                        setSelectedCamera(
                            videoDevices[0]
                                .deviceId
                        );
                    }

                } catch {
                    // Device enumeration is optional.
                }
            },
            [
                selectedCamera
            ]
        );


    /*
     * =========================================================
     * START CAMERA
     * =========================================================
     */

    const startCamera =
        useCallback(
            async () => {

                setError("");


                if (
                    !navigator
                        .mediaDevices ||
                    !navigator
                        .mediaDevices
                        .getUserMedia
                ) {

                    setError(
                        "Camera access is not supported by this browser."
                    );

                    return;
                }


                try {

                    stopStream();


                    const constraints = {
                        video: selectedCamera
                            ? {
                                deviceId: {
                                    exact:
                                        selectedCamera
                                }
                            }
                            : {
                                facingMode:
                                    "user"
                            },

                        audio:
                            false
                    };


                    const stream =
                        await navigator
                            .mediaDevices
                            .getUserMedia(
                                constraints
                            );


                    streamRef.current =
                        stream;


                    if (
                        videoRef.current
                    ) {

                        videoRef.current.srcObject =
                            stream;


                        await videoRef.current
                            .play()
                            .catch(
                                () => { }
                            );
                    }


                    setStreamActive(
                        true
                    );


                    setStatus(
                        "Camera is ready"
                    );


                    await loadCameras();

                } catch (
                cameraError
                ) {

                    setStreamActive(
                        false
                    );


                    setError(
                        cameraError?.name ===
                            "NotAllowedError"
                            ? "Camera permission was denied."
                            : cameraError?.name ===
                                "NotFoundError"
                                ? "No camera device was found."
                                : cameraError?.message ||
                                "Unable to access the camera."
                    );


                    setStatus(
                        "Camera unavailable"
                    );
                }
            },
            [
                selectedCamera,
                stopStream,
                loadCameras
            ]
        );


    /*
     * =========================================================
     * CAPTURE PHOTO
     * =========================================================
     */

    const capturePhoto =
        useCallback(
            async () => {

                if (
                    !streamActive ||
                    !videoRef.current ||
                    !canvasRef.current
                ) {

                    setError(
                        "Start the camera before capturing a photo."
                    );

                    return;
                }


                const video =
                    videoRef.current;


                const canvas =
                    canvasRef.current;


                const width =
                    video.videoWidth ||
                    1280;


                const height =
                    video.videoHeight ||
                    720;


                canvas.width =
                    width;


                canvas.height =
                    height;


                const context =
                    canvas.getContext(
                        "2d"
                    );


                if (
                    !context
                ) {

                    setError(
                        "Unable to capture the camera frame."
                    );

                    return;
                }


                context.drawImage(
                    video,
                    0,
                    0,
                    width,
                    height
                );


                const dataUrl =
                    canvas.toDataURL(
                        "image/png"
                    );


                const media = {
                    id:
                        `photo-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2)}`,

                    type:
                        "photo",

                    name:
                        `NovaPhoto-${new Date()
                            .toISOString()
                            .replace(
                                /[:.]/g,
                                "-"
                            )}.png`,

                    url:
                        dataUrl,

                    createdAt:
                        new Date(),

                    filesystemPath:
                        `${PHOTO_DIRECTORY}/${`NovaPhoto-${new Date()
                            .toISOString()
                            .replace(
                                /[:.]/g,
                                "-"
                            )}.png`}`
                };


                /*
                 * Save to local Camera state immediately.
                 */

                setCapturedMedia(
                    (items) => [
                        media,
                        ...items
                    ]
                );


                setError("");


                /*
                 * Save to NovaOS filesystem.
                 */

                setStatus(
                    "Saving photo to NovaOS..."
                );


                try {

                    await saveToNovaFilesystem(
                        media
                    );


                    setStatus(
                        "Photo saved to NovaOS"
                    );

                } catch (
                filesystemError
                ) {

                    setError(
                        `Photo captured, but filesystem save failed: ${filesystemError?.message ||
                        "Unknown error"
                        }`
                    );


                    setStatus(
                        "Photo captured"
                    );
                }
            },
            [
                streamActive,
                saveToNovaFilesystem
            ]
        );


    /*
     * =========================================================
     * START RECORDING
     * =========================================================
     */

    const startRecording =
        useCallback(
            () => {

                if (
                    !streamActive ||
                    !streamRef.current
                ) {

                    setError(
                        "Start the camera before recording."
                    );

                    return;
                }


                if (
                    typeof MediaRecorder ===
                    "undefined"
                ) {

                    setError(
                        "Video recording is not supported by this browser."
                    );

                    return;
                }


                try {

                    const stream =
                        streamRef.current;


                    const preferredTypes = [
                        "video/webm;codecs=vp9",
                        "video/webm;codecs=vp8",
                        "video/webm"
                    ];


                    const supportedType =
                        preferredTypes.find(
                            (type) =>
                                MediaRecorder
                                    .isTypeSupported(
                                        type
                                    )
                        );


                    const recorder =
                        supportedType
                            ? new MediaRecorder(
                                stream,
                                {
                                    mimeType:
                                        supportedType
                                }
                            )
                            : new MediaRecorder(
                                stream
                            );


                    recordedChunksRef.current =
                        [];


                    recorder.ondataavailable =
                        (event) => {

                            if (
                                event.data &&
                                event.data.size > 0
                            ) {

                                recordedChunksRef.current.push(
                                    event.data
                                );
                            }
                        };


                    recorder.onstop =
                        async () => {

                            const chunks =
                                recordedChunksRef.current;


                            if (
                                chunks.length ===
                                0
                            ) {

                                setError(
                                    "No video data was recorded."
                                );

                                return;
                            }


                            const blob =
                                new Blob(
                                    chunks,
                                    {
                                        type:
                                            recorder
                                                .mimeType ||
                                            "video/webm"
                                    }
                                );


                            const url =
                                URL.createObjectURL(
                                    blob
                                );


                            const fileName =
                                `NovaVideo-${new Date()
                                    .toISOString()
                                    .replace(
                                        /[:.]/g,
                                        "-"
                                    )}.webm`;


                            const media = {
                                id:
                                    `video-${Date.now()}-${Math.random()
                                        .toString(36)
                                        .slice(2)}`,

                                type:
                                    "video",

                                name:
                                    fileName,

                                url,

                                createdAt:
                                    new Date(),

                                filesystemPath:
                                    `${VIDEO_DIRECTORY}/${fileName}`
                            };


                            setCapturedMedia(
                                (items) => [
                                    media,
                                    ...items
                                ]
                            );


                            setStatus(
                                "Converting video for NovaOS..."
                            );


                            try {

                                /*
                                 * Convert the recorded Blob into
                                 * a data URL because the NovaOS
                                 * filesystem stores file content
                                 * as strings.
                                 */

                                const dataUrl =
                                    await blobToDataUrl(
                                        blob
                                    );


                                const filesystemMedia = {
                                    ...media,
                                    url:
                                        dataUrl
                                };


                                await saveToNovaFilesystem(
                                    filesystemMedia
                                );


                                setStatus(
                                    "Video saved to NovaOS"
                                );

                            } catch (
                            filesystemError
                            ) {

                                setError(
                                    `Video recorded, but filesystem save failed: ${filesystemError?.message ||
                                    "Unknown error"
                                    }`
                                );


                                setStatus(
                                    "Video recording saved"
                                );
                            }
                        };


                    recorder.onerror =
                        () => {

                            setError(
                                "An error occurred while recording video."
                            );


                            setRecording(
                                false
                            );
                        };


                    recorder.start();


                    recorderRef.current =
                        recorder;


                    setRecording(
                        true
                    );


                    setRecordingSeconds(
                        0
                    );


                    setStatus(
                        "Recording video..."
                    );


                    timerRef.current =
                        setInterval(
                            () => {

                                setRecordingSeconds(
                                    (seconds) =>
                                        seconds + 1
                                );
                            },
                            1000
                        );

                } catch (
                recordingError
                ) {

                    setError(
                        recordingError?.message ||
                        "Unable to start video recording."
                    );
                }
            },
            [
                streamActive,
                saveToNovaFilesystem
            ]
        );


    /*
     * =========================================================
     * STOP RECORDING
     * =========================================================
     */

    const stopRecording =
        useCallback(
            () => {

                const recorder =
                    recorderRef.current;


                if (
                    recorder &&
                    recorder.state !==
                    "inactive"
                ) {

                    recorder.stop();
                }


                recorderRef.current =
                    null;


                setRecording(
                    false
                );


                if (
                    timerRef.current
                ) {

                    clearInterval(
                        timerRef.current
                    );


                    timerRef.current =
                        null;
                }


                setRecordingSeconds(
                    0
                );
            },
            []
        );


    /*
     * =========================================================
     * DELETE MEDIA
     * =========================================================
     */

    const deleteMedia =
        useCallback(
            async (
                media
            ) => {

                if (
                    media.type ===
                    "video" &&
                    media.url &&
                    media.url.startsWith(
                        "blob:"
                    )
                ) {

                    URL.revokeObjectURL(
                        media.url
                    );
                }


                setCapturedMedia(
                    (items) =>
                        items.filter(
                            (item) =>
                                item.id !==
                                media.id
                        )
                );


                /*
                 * Delete the corresponding file from
                 * the NovaOS filesystem when it exists.
                 */

                if (
                    media.filesystemPath
                ) {

                    try {

                        const response =
                            await fetch(
                                `${FILESYSTEM_API}/remove?path=${encodeURIComponent(
                                    media.filesystemPath
                                )}`,
                                {
                                    method:
                                        "DELETE"
                                }
                            );


                        /*
                         * A missing filesystem file should not
                         * prevent removing the Camera item.
                         */

                        if (
                            !response.ok
                        ) {
                            return;
                        }

                    } catch {
                        // Local Camera deletion still succeeds.
                    }
                }
            },
            []
        );


    /*
     * =========================================================
     * DOWNLOAD MEDIA
     * =========================================================
     */

    const saveMedia =
        useCallback(
            (
                media
            ) => {

                const anchor =
                    document.createElement(
                        "a"
                    );


                anchor.href =
                    media.url;


                anchor.download =
                    media.name;


                document.body.appendChild(
                    anchor
                );


                anchor.click();


                anchor.remove();


                setStatus(
                    `${media.type === "photo"
                        ? "Photo"
                        : "Video"} exported`
                );
            },
            []
        );


    /*
     * =========================================================
     * INITIAL DEVICE LOAD
     * =========================================================
     */

    useEffect(
        () => {

            loadCameras();


            return () => {

                stopRecording();

                stopStream();


                setCapturedMedia(
                    (items) => {

                        items.forEach(
                            (media) => {

                                if (
                                    media.type ===
                                    "video" &&
                                    media.url &&
                                    media.url.startsWith(
                                        "blob:"
                                    )
                                ) {

                                    URL.revokeObjectURL(
                                        media.url
                                    );
                                }
                            }
                        );


                        return [];
                    }
                );
            };
        },
        [
            loadCameras,
            stopRecording,
            stopStream
        ]
    );


    /*
     * =========================================================
     * CAMERA DEVICE CHANGED
     * =========================================================
     */

    useEffect(
        () => {

            const handleDeviceChange =
                () => {
                    loadCameras();
                };


            if (
                navigator.mediaDevices
            ) {

                navigator.mediaDevices.addEventListener(
                    "devicechange",
                    handleDeviceChange
                );
            }


            return () => {

                if (
                    navigator.mediaDevices
                ) {

                    navigator.mediaDevices.removeEventListener(
                        "devicechange",
                        handleDeviceChange
                    );
                }
            };
        },
        [
            loadCameras
        ]
    );


    /*
     * =========================================================
     * MODE CHANGE
     * =========================================================
     */

    useEffect(
        () => {

            if (
                mode ===
                CAMERA_MODES.PHOTO &&
                recording
            ) {

                stopRecording();
            }
        },
        [
            mode,
            recording,
            stopRecording
        ]
    );


    const photos =
        capturedMedia.filter(
            (media) =>
                media.type ===
                "photo"
        );


    const videos =
        capturedMedia.filter(
            (media) =>
                media.type ===
                "video"
        );


    return (
        <div className="nova-camera">

            <style>
                {`
                    .nova-camera {
                        height: 100%;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        background: #0b0f14;
                        color: #eef3f8;
                        overflow: hidden;
                        font-family: Inter, system-ui, sans-serif;
                    }

                    .camera-toolbar {
                        flex: 0 0 auto;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 12px 14px;
                        border-bottom: 1px solid rgba(255,255,255,.08);
                        background: #111720;
                    }

                    .camera-brand {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .camera-brand-mark {
                        width: 34px;
                        height: 34px;
                        border-radius: 9px;
                        display: grid;
                        place-items: center;
                        background: #e8eef5;
                        color: #10151c;
                        font-weight: 800;
                    }

                    .camera-title {
                        font-weight: 700;
                        font-size: 14px;
                    }

                    .camera-status {
                        font-size: 11px;
                        color: #8f9aaa;
                        margin-top: 2px;
                    }

                    .camera-toolbar-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .camera-select {
                        max-width: 190px;
                        background: #171e28;
                        color: #eef3f8;
                        border: 1px solid rgba(255,255,255,.1);
                        border-radius: 7px;
                        padding: 7px 9px;
                        font-size: 12px;
                    }

                    .camera-main {
                        flex: 1 1 auto;
                        min-height: 0;
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) 270px;
                        gap: 12px;
                        padding: 12px;
                    }

                    .camera-preview-panel {
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    .camera-preview {
                        position: relative;
                        flex: 1 1 auto;
                        min-height: 250px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        border: 1px solid rgba(255,255,255,.08);
                        border-radius: 12px;
                        background: #05080c;
                    }

                    .camera-video {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        background: #05080c;
                    }

                    .camera-placeholder {
                        position: absolute;
                        inset: 0;
                        display: grid;
                        place-items: center;
                        text-align: center;
                        padding: 24px;
                        color: #7f8b9a;
                    }

                    .camera-placeholder-icon {
                        width: 56px;
                        height: 56px;
                        margin: 0 auto 12px;
                        border-radius: 50%;
                        display: grid;
                        place-items: center;
                        border: 1px solid rgba(255,255,255,.12);
                        font-size: 25px;
                    }

                    .camera-recording {
                        position: absolute;
                        top: 12px;
                        left: 12px;
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        padding: 6px 9px;
                        border-radius: 999px;
                        background: rgba(0,0,0,.65);
                        font-size: 11px;
                        font-weight: 700;
                    }

                    .camera-recording-dot {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        background: #ff5d5d;
                    }

                    .camera-controls {
                        display: flex;
                        justify-content: center;
                        gap: 10px;
                    }

                    .camera-button {
                        border: 1px solid rgba(255,255,255,.1);
                        background: #171e28;
                        color: #eef3f8;
                        border-radius: 8px;
                        padding: 9px 14px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 650;
                    }

                    .camera-button:hover {
                        background: #202a37;
                    }

                    .camera-button:disabled {
                        opacity: .45;
                        cursor: not-allowed;
                    }

                    .camera-button.primary {
                        background: #e8eef5;
                        color: #10151c;
                    }

                    .camera-button.danger {
                        background: #472126;
                        border-color: rgba(255,100,100,.25);
                    }

                    .camera-button.capture {
                        min-width: 120px;
                    }

                    .camera-side {
                        min-width: 0;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    .camera-card {
                        border: 1px solid rgba(255,255,255,.08);
                        border-radius: 10px;
                        background: #111720;
                        padding: 11px;
                    }

                    .camera-card-title {
                        font-size: 11px;
                        font-weight: 700;
                        color: #aab5c3;
                        margin-bottom: 9px;
                        text-transform: uppercase;
                        letter-spacing: .06em;
                    }

                    .camera-mode {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 6px;
                    }

                    .camera-mode button {
                        border: 1px solid rgba(255,255,255,.08);
                        background: #171e28;
                        color: #9ca8b7;
                        border-radius: 7px;
                        padding: 8px;
                        cursor: pointer;
                        font-size: 11px;
                    }

                    .camera-mode button.active {
                        background: #e8eef5;
                        color: #10151c;
                    }

                    .camera-counts {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                    }

                    .camera-count {
                        padding: 9px;
                        border-radius: 8px;
                        background: #171e28;
                    }

                    .camera-count span {
                        display: block;
                        font-size: 10px;
                        color: #7f8b9a;
                    }

                    .camera-count strong {
                        display: block;
                        margin-top: 3px;
                        font-size: 17px;
                    }

                    .camera-media-list {
                        flex: 1 1 auto;
                        min-height: 0;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 7px;
                    }

                    .camera-media-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 7px;
                        border-radius: 8px;
                        background: #171e28;
                    }

                    .camera-thumbnail {
                        width: 48px;
                        height: 38px;
                        border-radius: 5px;
                        object-fit: cover;
                        background: #090d12;
                        flex: 0 0 auto;
                    }

                    .camera-media-info {
                        min-width: 0;
                        flex: 1;
                    }

                    .camera-media-name {
                        font-size: 10px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .camera-media-type {
                        margin-top: 2px;
                        font-size: 9px;
                        color: #778394;
                    }

                    .camera-media-actions {
                        display: flex;
                        gap: 4px;
                    }

                    .camera-small-button {
                        border: 0;
                        background: transparent;
                        color: #9da8b5;
                        cursor: pointer;
                        font-size: 11px;
                        padding: 4px;
                    }

                    .camera-small-button:hover {
                        color: #fff;
                    }

                    .camera-error {
                        flex: 0 0 auto;
                        margin: 0 12px 12px;
                        padding: 9px 11px;
                        border-radius: 8px;
                        border: 1px solid rgba(255,100,100,.18);
                        background: rgba(120,30,35,.18);
                        color: #ffb3b3;
                        font-size: 11px;
                    }

                    @media (max-width: 800px) {
                        .camera-main {
                            grid-template-columns: 1fr;
                            overflow: auto;
                        }

                        .camera-side {
                            min-height: 260px;
                        }

                        .camera-toolbar-actions {
                            flex-wrap: wrap;
                            justify-content: flex-end;
                        }
                    }
                `}
            </style>


            <div className="camera-toolbar">

                <div className="camera-brand">

                    <div className="camera-brand-mark">
                        📷
                    </div>

                    <div>
                        <div className="camera-title">
                            NovaOS Camera
                        </div>

                        <div className="camera-status">
                            {status}
                        </div>
                    </div>

                </div>


                <div className="camera-toolbar-actions">

                    {cameras.length > 0 && (
                        <select
                            className="camera-select"
                            value={
                                selectedCamera
                            }
                            onChange={(event) =>
                                setSelectedCamera(
                                    event.target.value
                                )
                            }
                            disabled={
                                recording
                            }
                        >

                            {cameras.map(
                                (
                                    camera,
                                    index
                                ) => (
                                    <option
                                        key={
                                            camera.deviceId ||
                                            index
                                        }
                                        value={
                                            camera.deviceId
                                        }
                                    >
                                        {camera.label ||
                                            `Camera ${index + 1}`}
                                    </option>
                                )
                            )}

                        </select>
                    )}


                    {!streamActive ? (
                        <button
                            type="button"
                            className="camera-button primary"
                            onClick={
                                startCamera
                            }
                        >
                            Start Camera
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="camera-button"
                            onClick={
                                stopStream
                            }
                            disabled={
                                recording
                            }
                        >
                            Stop Camera
                        </button>
                    )}

                </div>

            </div>


            <div className="camera-main">

                <div className="camera-preview-panel">

                    <div className="camera-preview">

                        <video
                            ref={
                                videoRef
                            }
                            className="camera-video"
                            autoPlay
                            muted
                            playsInline
                        />


                        {!streamActive && (
                            <div className="camera-placeholder">

                                <div>

                                    <div className="camera-placeholder-icon">
                                        📷
                                    </div>

                                    <strong>
                                        Camera is not active
                                    </strong>

                                    <div
                                        style={{
                                            marginTop:
                                                "5px",
                                            fontSize:
                                                "11px"
                                        }}
                                    >
                                        Start the camera to
                                        begin capturing media.
                                    </div>

                                </div>

                            </div>
                        )}


                        {recording && (
                            <div className="camera-recording">

                                <span className="camera-recording-dot" />

                                REC{" "}
                                {
                                    formatDuration(
                                        recordingSeconds
                                    )
                                }

                            </div>
                        )}

                    </div>


                    <div className="camera-controls">

                        {mode ===
                            CAMERA_MODES.PHOTO ? (
                            <button
                                type="button"
                                className="camera-button primary capture"
                                onClick={
                                    capturePhoto
                                }
                                disabled={
                                    !streamActive
                                }
                            >
                                📸 Capture Photo
                            </button>
                        ) : (
                            recording ? (
                                <button
                                    type="button"
                                    className="camera-button danger capture"
                                    onClick={
                                        stopRecording
                                    }
                                >
                                    ⏹ Stop Recording
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="camera-button primary capture"
                                    onClick={
                                        startRecording
                                    }
                                    disabled={
                                        !streamActive
                                    }
                                >
                                    🎥 Start Recording
                                </button>
                            )
                        )}

                    </div>

                </div>


                <aside className="camera-side">

                    <div className="camera-card">

                        <div className="camera-card-title">
                            Capture Mode
                        </div>

                        <div className="camera-mode">

                            <button
                                type="button"
                                className={
                                    mode ===
                                        CAMERA_MODES.PHOTO
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMode(
                                        CAMERA_MODES.PHOTO
                                    )
                                }
                                disabled={
                                    recording
                                }
                            >
                                📸 Photo
                            </button>

                            <button
                                type="button"
                                className={
                                    mode ===
                                        CAMERA_MODES.VIDEO
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setMode(
                                        CAMERA_MODES.VIDEO
                                    )
                                }
                                disabled={
                                    recording
                                }
                            >
                                🎥 Video
                            </button>

                        </div>

                    </div>


                    <div className="camera-card">

                        <div className="camera-card-title">
                            Captured Media
                        </div>

                        <div className="camera-counts">

                            <div className="camera-count">

                                <span>
                                    Photos
                                </span>

                                <strong>
                                    {
                                        photos.length
                                    }
                                </strong>

                            </div>


                            <div className="camera-count">

                                <span>
                                    Videos
                                </span>

                                <strong>
                                    {
                                        videos.length
                                    }
                                </strong>

                            </div>

                        </div>

                    </div>


                    <div className="camera-card camera-media-list">

                        <div className="camera-card-title">
                            Recent Captures
                        </div>


                        {capturedMedia.length ===
                            0 ? (
                            <div
                                style={{
                                    color:
                                        "#778394",
                                    fontSize:
                                        "11px",
                                    padding:
                                        "10px 2px"
                                }}
                            >
                                No captured media yet.
                            </div>
                        ) : (
                            capturedMedia.map(
                                (
                                    media
                                ) => (
                                    <div
                                        className="camera-media-item"
                                        key={
                                            media.id
                                        }
                                    >

                                        {media.type ===
                                            "photo" ? (
                                            <img
                                                src={
                                                    media.url
                                                }
                                                alt={
                                                    media.name
                                                }
                                                className="camera-thumbnail"
                                            />
                                        ) : (
                                            <video
                                                src={
                                                    media.url
                                                }
                                                className="camera-thumbnail"
                                                muted
                                            />
                                        )}


                                        <div className="camera-media-info">

                                            <div className="camera-media-name">
                                                {
                                                    media.name
                                                }
                                            </div>

                                            <div className="camera-media-type">
                                                {
                                                    media.type
                                                }
                                            </div>

                                        </div>


                                        <div className="camera-media-actions">

                                            <button
                                                type="button"
                                                className="camera-small-button"
                                                title="Save"
                                                onClick={() =>
                                                    saveMedia(
                                                        media
                                                    )
                                                }
                                            >
                                                ↓
                                            </button>

                                            <button
                                                type="button"
                                                className="camera-small-button"
                                                title="Delete"
                                                onClick={() =>
                                                    deleteMedia(
                                                        media
                                                    )
                                                }
                                            >
                                                ×
                                            </button>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </aside>

            </div>


            {error && (
                <div className="camera-error">
                    {error}
                </div>
            )}


            <canvas
                ref={
                    canvasRef
                }
                style={{
                    display: "none"
                }}
            />

        </div>
    );
}


export default Camera;