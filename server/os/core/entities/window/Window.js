import { WINDOW_STATES } from "../../constants/windowStates.js";

export class Window {
    constructor({
        id,
        processId,
        title,
        x = 80,
        y = 80,
        width = 800,
        height = 600
    }) {
        if (!id) {
            throw new Error(
                "Window id is required."
            );
        }

        if (!processId) {
            throw new Error(
                "Process id is required."
            );
        }

        if (!title) {
            throw new Error(
                "Window title is required."
            );
        }

        this.id = id;
        this.processId = processId;
        this.title = title;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.state =
            WINDOW_STATES.NORMAL;

        this.zIndex = 0;
        this.focused = false;
    }

    minimize() {
        if (
            this.state ===
            WINDOW_STATES.CLOSED
        ) {
            throw new Error(
                "A closed window cannot be minimized."
            );
        }

        this.state =
            WINDOW_STATES.MINIMIZED;

        this.focused = false;
    }

    maximize() {
        if (
            this.state ===
            WINDOW_STATES.CLOSED
        ) {
            throw new Error(
                "A closed window cannot be maximized."
            );
        }

        this.state =
            WINDOW_STATES.MAXIMIZED;

        this.focused = true;
    }

    restore() {
        if (
            this.state ===
            WINDOW_STATES.CLOSED
        ) {
            throw new Error(
                "A closed window cannot be restored."
            );
        }

        this.state =
            WINDOW_STATES.NORMAL;
    }

    close() {
        this.state =
            WINDOW_STATES.CLOSED;

        this.focused = false;
    }

    focus() {
        if (
            this.state ===
            WINDOW_STATES.CLOSED
        ) {
            throw new Error(
                "A closed window cannot receive focus."
            );
        }

        if (
            this.state ===
            WINDOW_STATES.MINIMIZED
        ) {
            throw new Error(
                "A minimized window must be restored before receiving focus."
            );
        }

        this.focused = true;
    }

    blur() {
        this.focused = false;
    }
}