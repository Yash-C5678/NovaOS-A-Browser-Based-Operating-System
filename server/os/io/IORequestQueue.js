import {
    IO_REQUEST_STATES
} from "./IORequest.js";

export class IORequestQueue {
    constructor() {
        this.queue = [];
        this.requests = new Map();
    }

    enqueue(request) {
        if (!request) {
            throw new Error(
                "I/O request is required."
            );
        }

        if (!request.id) {
            throw new Error(
                "I/O request must have an id."
            );
        }

        if (
            this.requests.has(request.id)
        ) {
            throw new Error(
                `I/O request '${request.id}' is already in the queue.`
            );
        }

        if (
            request.state !==
            IO_REQUEST_STATES.QUEUED
        ) {
            throw new Error(
                `Only queued I/O requests can be added. Current state: '${request.state}'.`
            );
        }

        this.queue.push(request.id);
        this.requests.set(
            request.id,
            request
        );

        return request;
    }

    dequeue() {
        while (this.queue.length > 0) {
            const requestId =
                this.queue.shift();

            const request =
                this.requests.get(requestId);

            this.requests.delete(requestId);

            if (request) {
                return request;
            }
        }

        return null;
    }

    peek() {
        while (this.queue.length > 0) {
            const requestId =
                this.queue[0];

            const request =
                this.requests.get(requestId);

            if (request) {
                return request;
            }

            this.queue.shift();
        }

        return null;
    }

    remove(requestId) {
        if (!requestId) {
            throw new Error(
                "Request id is required."
            );
        }

        if (
            !this.requests.has(requestId)
        ) {
            return false;
        }

        this.queue =
            this.queue.filter(
                (id) => id !== requestId
            );

        this.requests.delete(
            requestId
        );

        return true;
    }

    getRequest(requestId) {
        return (
            this.requests.get(requestId) ??
            null
        );
    }

    getAllRequests() {
        return this.queue
            .map(
                (requestId) =>
                    this.requests.get(
                        requestId
                    )
            )
            .filter(Boolean);
    }

    getRequestsByPid(pid) {
        return this.getAllRequests()
            .filter(
                (request) =>
                    request.pid === pid
            );
    }

    getRequestsByDevice(deviceId) {
        return this.getAllRequests()
            .filter(
                (request) =>
                    request.deviceId ===
                    deviceId
            );
    }

    getSize() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        this.queue = [];
        this.requests.clear();
    }

    getStatistics() {
        const requests =
            this.getAllRequests();

        return {
            queueLength: requests.length,
            queuedRequests:
                requests.filter(
                    (request) =>
                        request.state ===
                        IO_REQUEST_STATES.QUEUED
                ).length
        };
    }

    toJSON() {
        return this.getAllRequests().map(
            (request) =>
                request.toJSON()
        );
    }
}