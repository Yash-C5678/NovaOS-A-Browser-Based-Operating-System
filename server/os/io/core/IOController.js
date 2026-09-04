import {
    IORequest,
    IO_REQUEST_STATES
} from "../IORequest.js";

import { IORequestQueue } from "../IORequestQueue.js";
import { DeviceManager } from "../devices/DeviceManager.js";

export class IOController {
    constructor({
        deviceManager = new DeviceManager(),
        requestQueue = new IORequestQueue()
    } = {}) {
        if (!deviceManager) {
            throw new Error(
                "DeviceManager is required."
            );
        }

        if (!requestQueue) {
            throw new Error(
                "IORequestQueue is required."
            );
        }

        this.deviceManager = deviceManager;
        this.requestQueue = requestQueue;

        this.activeRequests = new Map();

        this.completedRequests = [];
        this.cancelledRequests = [];

        this.nextRequestNumber = 1000;
        this.currentTime = 0;
    }

    createRequest({
        pid,
        deviceId,
        operation,
        size = 1,
        duration = 1
    }) {
        const requestId =
            `io-${this.nextRequestNumber++}`;

        return new IORequest({
            id: requestId,
            pid,
            deviceId,
            operation,
            size,
            duration
        });
    }

    submitRequest({
        pid,
        deviceId,
        operation,
        size = 1,
        duration = 1
    }) {
        const request =
            this.createRequest({
                pid,
                deviceId,
                operation,
                size,
                duration
            });

        this.requestQueue.enqueue(
            request
        );

        this.dispatchNext();

        return request;
    }

    dispatchNext() {
        /*
         * Continue dispatching while there are
         * queued requests whose devices are free.
         */
        let dispatched = false;

        while (!this.requestQueue.isEmpty()) {
            const request =
                this.requestQueue.peek();

            if (!request) {
                break;
            }

            /*
             * A request for a device that is currently
             * busy must remain in the queue.
             *
             * Search for another request that can run
             * instead of blocking the entire subsystem.
             */
            const availableRequest =
                this.findDispatchableRequest();

            if (!availableRequest) {
                break;
            }

            this.requestQueue.remove(
                availableRequest.id
            );

            const device =
                this.deviceManager.allocateDevice(
                    availableRequest.deviceId,
                    availableRequest.id
                );

            availableRequest.start(
                this.currentTime
            );

            this.activeRequests.set(
                availableRequest.id,
                {
                    request: availableRequest,
                    deviceId: device.id
                }
            );

            dispatched = true;
        }

        return dispatched;
    }

    findDispatchableRequest() {
        const requests =
            this.requestQueue.getAllRequests();

        for (const request of requests) {
            const device =
                this.deviceManager.getDevice(
                    request.deviceId
                );

            if (
                device &&
                device.isAvailable()
            ) {
                return request;
            }
        }

        return null;
    }

    executeUnit(requestId) {
        const active =
            this.activeRequests.get(
                requestId
            );

        if (!active) {
            throw new Error(
                `Active I/O request '${requestId}' not found.`
            );
        }

        const request =
            active.request;

        if (
            request.state !==
            IO_REQUEST_STATES.ACTIVE
        ) {
            throw new Error(
                `I/O request '${requestId}' is not active.`
            );
        }

        const completed =
            request.executeUnit();

        this.currentTime++;

        const device =
            this.deviceManager.getDevice(
                active.deviceId
            );

        if (device) {
            device.addBusyTime(1);
        }

        if (completed) {
            this.completeRequest(
                requestId
            );
        }

        return request;
    }

    executeAllActiveUnits() {
        const requestIds =
            Array.from(
                this.activeRequests.keys()
            );

        const results = [];

        for (const requestId of requestIds) {
            if (
                this.activeRequests.has(
                    requestId
                )
            ) {
                results.push(
                    this.executeUnit(
                        requestId
                    )
                );
            }
        }

        return results;
    }

    completeRequest(requestId) {
        const active =
            this.activeRequests.get(
                requestId
            );

        if (!active) {
            throw new Error(
                `Active I/O request '${requestId}' not found.`
            );
        }

        const request =
            active.request;

        if (
            request.state !==
            IO_REQUEST_STATES.ACTIVE
        ) {
            throw new Error(
                `I/O request '${requestId}' cannot be completed from state '${request.state}'.`
            );
        }

        request.complete(
            this.currentTime
        );

        this.deviceManager.releaseDevice(
            active.deviceId
        );

        this.activeRequests.delete(
            requestId
        );

        this.completedRequests.push(
            request
        );

        /*
         * Immediately attempt to dispatch the
         * next waiting request.
         */
        this.dispatchNext();

        return request;
    }

    cancelRequest(requestId) {
        const active =
            this.activeRequests.get(
                requestId
            );

        /*
         * Active requests cannot be cancelled
         * by the queue-level cancellation path.
         */
        if (active) {
            throw new Error(
                `Active I/O request '${requestId}' cannot be cancelled.`
            );
        }

        const request =
            this.requestQueue.getRequest(
                requestId
            );

        if (!request) {
            throw new Error(
                `I/O request '${requestId}' not found.`
            );
        }

        this.requestQueue.remove(
            requestId
        );

        request.cancel();

        this.cancelledRequests.push(
            request
        );

        return request;
    }

    getActiveRequest(requestId) {
        return (
            this.activeRequests.get(
                requestId
            )?.request ?? null
        );
    }

    getActiveRequests() {
        return Array.from(
            this.activeRequests.values()
        ).map(
            ({ request }) => request
        );
    }

    getQueuedRequests() {
        return this.requestQueue
            .getAllRequests();
    }

    getCompletedRequests() {
        return [
            ...this.completedRequests
        ];
    }

    getCancelledRequests() {
        return [
            ...this.cancelledRequests
        ];
    }

    getRequest(requestId) {
        const active =
            this.getActiveRequest(
                requestId
            );

        if (active) {
            return active;
        }

        const queued =
            this.requestQueue.getRequest(
                requestId
            );

        if (queued) {
            return queued;
        }

        return (
            this.completedRequests.find(
                (request) =>
                    request.id ===
                    requestId
            ) ??
            this.cancelledRequests.find(
                (request) =>
                    request.id ===
                    requestId
            ) ??
            null
        );
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getStatistics() {
        return {
            currentTime:
                this.currentTime,

            queuedRequests:
                this.getQueuedRequests()
                    .length,

            activeRequests:
                this.getActiveRequests()
                    .length,

            completedRequests:
                this.completedRequests
                    .length,

            cancelledRequests:
                this.cancelledRequests
                    .length,

            devices:
                this.deviceManager
                    .getStatistics()
        };
    }

    reset() {
        /*
         * Active requests must release their devices
         * before resetting the controller.
         */
        for (const active of
            this.activeRequests.values()) {
            const device =
                this.deviceManager.getDevice(
                    active.deviceId
                );

            if (
                device &&
                device.isBusy() &&
                device.currentRequestId ===
                    active.request.id
            ) {
                device.completeRequest();
            }
        }

        this.activeRequests.clear();

        this.completedRequests = [];
        this.cancelledRequests = [];

        this.requestQueue.clear();

        this.currentTime = 0;
        this.nextRequestNumber = 1000;
    }
}