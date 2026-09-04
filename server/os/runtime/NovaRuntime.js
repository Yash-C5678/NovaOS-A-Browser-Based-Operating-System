import { Application } from "../core/entities/application/Application.js";
import { Window } from "../core/entities/window/Window.js";
import { SystemEvent } from "../core/events/SystemEvent.js";
import { ProcessManager } from "../process/ProcessManager.js";

export class NovaRuntime {
    constructor() {
        this.applications = new Map();
        this.windows = new Map();
        this.events = [];

        this.processManager =
            new ProcessManager();

        this.nextWindowId = 1;
    }

    /* =====================================================
       APPLICATIONS
       ===================================================== */

    registerApplication(
        applicationDefinition
    ) {
        const application =
            new Application(
                applicationDefinition
            );

        if (
            this.applications.has(
                application.id
            )
        ) {
            throw new Error(
                `Application '${application.id}' is already registered.`
            );
        }

        this.applications.set(
            application.id,
            application
        );

        this.emitEvent(
            new SystemEvent({
                type:
                    "APPLICATION_REGISTERED",
                source:
                    "nova-runtime",
                payload: {
                    applicationId:
                        application.id
                }
            })
        );

        return application;
    }

    getApplication(
        applicationId
    ) {
        return (
            this.applications.get(
                applicationId
            ) ?? null
        );
    }

    listApplications() {
        return Array.from(
            this.applications.values()
        );
    }

    /* =====================================================
       APPLICATION LAUNCH
       ===================================================== */

    launchApplication(
        applicationId
    ) {
        const application =
            this.getApplication(
                applicationId
            );

        if (!application) {
            throw new Error(
                `Application '${applicationId}' is not registered.`
            );
        }

        if (application.singleton) {
            const existingProcess =
                this.processManager
                    .getAllProcesses()
                    .find(
                        (process) =>
                            process.applicationId ===
                                applicationId &&
                            process.state !==
                                "terminated"
                    );

            if (existingProcess) {
                return {
                    application,
                    process:
                        existingProcess,
                    window:
                        this.getWindowByProcess(
                            existingProcess.pid
                        )
                };
            }
        }

        const process =
            this.processManager.createProcess(
                {
                    applicationId:
                        application.id
                }
            );

        this.emitEvent(
            new SystemEvent({
                type:
                    "PROCESS_CREATED",
                source:
                    "nova-runtime",
                payload: {
                    pid:
                        process.pid,
                    applicationId:
                        application.id
                }
            })
        );

        this.processManager.startProcess(
            process.pid
        );

        const windowId =
            `window-${this.nextWindowId++}`;

        const window =
            new Window({
                id: windowId,
                processId:
                    process.pid,
                title:
                    application.name
            });

        this.windows.set(
            window.id,
            window
        );

        this.focusWindow(
            window.id
        );

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_CREATED",
                source:
                    "nova-runtime",
                payload: {
                    windowId:
                        window.id,
                    processId:
                        process.pid
                }
            })
        );

        return {
            application,
            process,
            window
        };
    }

    /* =====================================================
       PROCESSES
       ===================================================== */

    runProcess(pid) {
        const process =
            this.processManager
                .runProcess(pid);

        this.emitEvent(
            new SystemEvent({
                type:
                    "PROCESS_STARTED",
                source:
                    "nova-runtime",
                payload: {
                    pid
                }
            })
        );

        return process;
    }

    terminateProcess(pid) {
        const process =
            this.processManager
                .terminateProcess(pid);

        this.emitEvent(
            new SystemEvent({
                type:
                    "PROCESS_TERMINATED",
                source:
                    "nova-runtime",
                payload: {
                    pid
                }
            })
        );

        return process;
    }

    getProcesses() {
        return this.processManager
            .getAllProcesses();
    }

    /* =====================================================
       WINDOWS
       ===================================================== */

    getWindow(windowId) {
        return (
            this.windows.get(
                windowId
            ) ?? null
        );
    }

    getWindowOrThrow(windowId) {
        const window =
            this.getWindow(windowId);

        if (!window) {
            throw new Error(
                `Window '${windowId}' not found.`
            );
        }

        return window;
    }

    focusWindow(windowId) {
        const targetWindow =
            this.getWindowOrThrow(
                windowId
            );

        if (
            targetWindow.state ===
            "closed"
        ) {
            throw new Error(
                "A closed window cannot receive focus."
            );
        }

        for (
            const window
            of this.windows.values()
        ) {
            window.blur();
        }

        targetWindow.focus();

        const highestZIndex =
            Math.max(
                0,
                ...Array.from(
                    this.windows.values()
                )
                    .filter(
                        (window) =>
                            window.state !==
                            "closed"
                    )
                    .map(
                        (window) =>
                            window.zIndex
                    )
            );

        targetWindow.zIndex =
            highestZIndex + 1;

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_FOCUSED",
                source:
                    "nova-runtime",
                payload: {
                    windowId
                }
            })
        );

        return targetWindow;
    }

    minimizeWindow(windowId) {
        const window =
            this.getWindowOrThrow(
                windowId
            );

        window.minimize();

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_MINIMIZED",
                source:
                    "nova-runtime",
                payload: {
                    windowId
                }
            })
        );

        return window;
    }

    maximizeWindow(windowId) {
        const window =
            this.getWindowOrThrow(
                windowId
            );

        window.maximize();

        this.focusWindow(
            windowId
        );

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_MAXIMIZED",
                source:
                    "nova-runtime",
                payload: {
                    windowId
                }
            })
        );

        return window;
    }

    restoreWindow(windowId) {
        const window =
            this.getWindowOrThrow(
                windowId
            );

        if (
            window.state ===
            "closed"
        ) {
            throw new Error(
                "A closed window cannot be restored."
            );
        }

        window.restore();

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_RESTORED",
                source:
                    "nova-runtime",
                payload: {
                    windowId
                }
            })
        );

        return window;
    }

    closeWindow(windowId) {
        const window =
            this.getWindowOrThrow(
                windowId
            );

        window.close();

        this.emitEvent(
            new SystemEvent({
                type:
                    "WINDOW_CLOSED",
                source:
                    "nova-runtime",
                payload: {
                    windowId,
                    processId:
                        window.processId
                }
            })
        );

        return window;
    }

    getWindowByProcess(pid) {
        return (
            Array.from(
                this.windows.values()
            ).find(
                (window) =>
                    window.processId ===
                    pid
            ) ?? null
        );
    }

    getWindows() {
        return Array.from(
            this.windows.values()
        );
    }

    /* =====================================================
       EVENTS
       ===================================================== */

    getEvents() {
        return [
            ...this.events
        ];
    }

    emitEvent(event) {
        this.events.push(event);

        return event;
    }
}