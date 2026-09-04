import { PROCESS_STATES } from "../../core/constants/processStates.js";
import { IOController } from "../core/IOController.js";
import {
    IO_REQUEST_STATES,
    IO_OPERATIONS
} from "../IORequest.js";

export class ProcessIOManager {
    constructor({
        processManager,
        ioController = new IOController()
    } = {}) {
        if (!processManager) {
            throw new Error(
                "ProcessManager is required."
            );
        }

        if (!ioController) {
            throw new Error(
                "IOController is required."
            );
        }

        this.processManager = processManager;
        this.ioController = ioController;

        /*
         * Maps I/O request IDs to process IDs.
         *
         * This lets NovaOS determine which process
         * must be awakened when an I/O request completes.
         */
        this.requestToProcess = new Map();
    }

    requestIO({
        pid,
        deviceId,
        operation,
        size = 1,
        duration = 1
    }) {
        const process =
            this.processManager.getProcess(pid);

        if (!process) {
            throw new Error(
                `Process '${pid}' not found.`
            );
        }

        if (
            process.state !==
            PROCESS_STATES.RUNNING
        ) {
            throw new Error(
                `Process '${pid}' must be running to request I/O. Current state: '${process.state}'.`
            );
        }

        if (
            !Object.values(IO_OPERATIONS).includes(
                operation
            )
        ) {
            throw new Error(
                `Invalid I/O operation '${operation}'.`
            );
        }

        /*
         * A running process blocks while waiting
         * for its I/O operation.
         */
        process.wait();

        let request;

        try {
            request =
                this.ioController.submitRequest({
                    pid,
                    deviceId,
                    operation,
                    size,
                    duration
                });
        } catch (error) {
            /*
             * If submission fails, restore the
             * process to RUNNING so the process
             * is not left incorrectly waiting.
             */
            process.wake();
            process.run();

            throw error;
        }

        this.requestToProcess.set(
            request.id,
            pid
        );

        /*
         * submitRequest() may dispatch immediately,
         * so the request can already be ACTIVE here.
         */
        return request;
    }

    executeRequestUnit(requestId) {
        const request =
            this.ioController.getRequest(
                requestId
            );

        if (!request) {
            throw new Error(
                `I/O request '${requestId}' not found.`
            );
        }

        if (
            request.state !==
            IO_REQUEST_STATES.ACTIVE
        ) {
            throw new Error(
                `I/O request '${requestId}' is not active.`
            );
        }

        const result =
            this.ioController.executeUnit(
                requestId
            );

        /*
         * executeUnit() automatically completes
         * the request when its duration is reached.
         */
        if (
            result.state ===
            IO_REQUEST_STATES.COMPLETED
        ) {
            this.completeRequest(
                requestId
            );
        }

        return result;
    }

    completeRequest(requestId) {
        const pid =
            this.requestToProcess.get(
                requestId
            );

        if (!pid) {
            throw new Error(
                `No process is associated with I/O request '${requestId}'.`
            );
        }

        const request =
            this.ioController.getRequest(
                requestId
            );

        if (!request) {
            throw new Error(
                `I/O request '${requestId}' not found.`
            );
        }

        if (
            request.state !==
            IO_REQUEST_STATES.COMPLETED
        ) {
            throw new Error(
                `I/O request '${requestId}' is not completed.`
            );
        }

        const process =
            this.processManager.getProcess(
                pid
            );

        if (!process) {
            throw new Error(
                `Process '${pid}' associated with I/O request '${requestId}' was not found.`
            );
        }

        if (
            process.state ===
            PROCESS_STATES.WAITING
        ) {
            process.wake();
        }

        this.requestToProcess.delete(
            requestId
        );

        return process;
    }

    cancelRequest(requestId) {
        const pid =
            this.requestToProcess.get(
                requestId
            );

        if (!pid) {
            throw new Error(
                `No process is associated with I/O request '${requestId}'.`
            );
        }

        const process =
            this.processManager.getProcess(
                pid
            );

        const request =
            this.ioController.cancelRequest(
                requestId
            );

        if (
            process &&
            process.state ===
                PROCESS_STATES.WAITING
        ) {
            process.wake();
        }

        this.requestToProcess.delete(
            requestId
        );

        return request;
    }

    getProcessRequest(pid) {
        const requestIds =
            Array.from(
                this.requestToProcess.entries()
            )
                .filter(
                    ([, processId]) =>
                        processId === pid
                )
                .map(
                    ([requestId]) =>
                        requestId
                );

        return requestIds
            .map(
                (requestId) =>
                    this.ioController.getRequest(
                        requestId
                    )
            )
            .filter(Boolean);
    }

    getRequestProcess(requestId) {
        const pid =
            this.requestToProcess.get(
                requestId
            );

        if (!pid) {
            return null;
        }

        return this.processManager.getProcess(
            pid
        );
    }

    getWaitingProcesses() {
        return this.processManager
            .getProcessesByState(
                PROCESS_STATES.WAITING
            );
    }

    getStatistics() {
        return {
            waitingProcesses:
                this.getWaitingProcesses()
                    .length,

            trackedRequests:
                this.requestToProcess.size,

            activeRequests:
                this.ioController
                    .getActiveRequests()
                    .length,

            queuedRequests:
                this.ioController
                    .getQueuedRequests()
                    .length,

            completedRequests:
                this.ioController
                    .getCompletedRequests()
                    .length,

            cancelledRequests:
                this.ioController
                    .getCancelledRequests()
                    .length
        };
    }

    reset() {
        this.ioController.reset();
        this.requestToProcess.clear();
    }
}
