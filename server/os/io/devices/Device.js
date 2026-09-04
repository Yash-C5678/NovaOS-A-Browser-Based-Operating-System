export class Device {
    constructor({
        id,
        name,
        type,
        status = "idle"
    }) {
        if (!id) {
            throw new Error(
                "Device id is required."
            );
        }

        if (!name) {
            throw new Error(
                "Device name is required."
            );
        }

        if (!type) {
            throw new Error(
                "Device type is required."
            );
        }

        const validStatuses = [
            "idle",
            "busy",
            "offline"
        ];

        if (!validStatuses.includes(status)) {
            throw new Error(
                `Invalid device status '${status}'.`
            );
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.status = status;

        this.currentRequestId = null;

        this.totalRequests = 0;
        this.completedRequests = 0;
        this.totalBusyTime = 0;

        this.createdAt = new Date();
    }

    isAvailable() {
        return this.status === "idle";
    }

    isBusy() {
        return this.status === "busy";
    }

    isOffline() {
        return this.status === "offline";
    }

    startRequest(requestId) {
        if (!requestId) {
            throw new Error(
                "Request id is required."
            );
        }

        if (this.isOffline()) {
            throw new Error(
                `Device '${this.id}' is offline.`
            );
        }

        if (this.isBusy()) {
            throw new Error(
                `Device '${this.id}' is already busy.`
            );
        }

        this.status = "busy";
        this.currentRequestId = requestId;
        this.totalRequests++;
    }

    completeRequest() {
        if (!this.isBusy()) {
            throw new Error(
                `Device '${this.id}' has no active request.`
            );
        }

        this.status = "idle";
        this.currentRequestId = null;
        this.completedRequests++;
    }

    setOffline() {
        if (this.isBusy()) {
            throw new Error(
                `Device '${this.id}' cannot go offline while busy.`
            );
        }

        this.status = "offline";
    }

    setOnline() {
        if (this.status !== "offline") {
            return;
        }

        this.status = "idle";
    }

    addBusyTime(time) {
        if (
            !Number.isInteger(time) ||
            time < 0
        ) {
            throw new Error(
                "Busy time must be a non-negative integer."
            );
        }

        this.totalBusyTime += time;
    }

    getStatistics() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            status: this.status,
            currentRequestId:
                this.currentRequestId,
            totalRequests:
                this.totalRequests,
            completedRequests:
                this.completedRequests,
            totalBusyTime:
                this.totalBusyTime
        };
    }

    toJSON() {
        return this.getStatistics();
    }
}