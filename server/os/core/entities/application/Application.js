export class Application {
    constructor({
        id,
        name,
        version,
        description = "",
        icon = null,
        entryPoint,
        singleton = false
    }) {
        if (!id) {
            throw new Error("Application id is required.");
        }

        if (!name) {
            throw new Error("Application name is required.");
        }

        if (!entryPoint) {
            throw new Error("Application entry point is required.");
        }

        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
        this.icon = icon;
        this.entryPoint = entryPoint;
        this.singleton = singleton;
        this.registeredAt = new Date();
    }
}