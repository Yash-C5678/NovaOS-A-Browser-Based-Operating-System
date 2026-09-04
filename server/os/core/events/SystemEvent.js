export class SystemEvent {
    constructor({
        type,
        source,
        payload = {},
        timestamp = new Date()
    }) {
        if (!type) {
            throw new Error("Event type is required.");
        }

        if (!source) {
            throw new Error("Event source is required.");
        }

        this.id = crypto.randomUUID();
        this.type = type;
        this.source = source;
        this.payload = payload;
        this.timestamp = timestamp;
    }
}