import path from "node:path";

export class FileSystemManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.root = this.createDirectory("/");
        this.createDirectoryAt("/home");
        this.createDirectoryAt("/home/nova");
        this.createDirectoryAt("/tmp");
        this.createDirectoryAt("/apps");
        this.createDirectoryAt("/etc");

        this.createFileAt(
            "/etc/motd",
            "Welcome to NovaOS.\nSimulated filesystem initialized."
        );

        this.createFileAt(
            "/home/nova/welcome.txt",
            "Welcome to your NovaOS home directory."
        );
    }

    createDirectory(name) {
        return {
            type: "directory",
            name,
            children: new Map(),
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
    }

    createFile(name, content = "") {
        return {
            type: "file",
            name,
            content,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
    }

    normalize(inputPath = "/", currentDirectory = "/") {
        const value =
            String(inputPath || "").trim();

        if (!value) {
            return path.posix.normalize(
                currentDirectory
            );
        }

        const resolved =
            value.startsWith("/")
                ? path.posix.normalize(value)
                : path.posix.normalize(
                    path.posix.join(
                        currentDirectory,
                        value
                    )
                );

        if (
            !resolved.startsWith("/")
        ) {
            return `/${resolved}`;
        }

        return resolved;
    }

    getNode(inputPath, currentDirectory = "/") {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        if (normalized === "/") {
            return this.root;
        }

        const parts =
            normalized
                .split("/")
                .filter(Boolean);

        let current = this.root;

        for (const part of parts) {
            if (
                current.type !==
                "directory"
            ) {
                return null;
            }

            current =
                current.children.get(part);

            if (!current) {
                return null;
            }
        }

        return current;
    }

    getParentPath(inputPath, currentDirectory = "/") {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        if (normalized === "/") {
            return null;
        }

        return (
            path.posix.dirname(
                normalized
            ) || "/"
        );
    }

    getBaseName(inputPath, currentDirectory = "/") {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        return path.posix.basename(
            normalized
        );
    }

    getParent(
        inputPath,
        currentDirectory = "/"
    ) {
        const parentPath =
            this.getParentPath(
                inputPath,
                currentDirectory
            );

        if (!parentPath) {
            return null;
        }

        return this.getNode(parentPath);
    }

    ensureDirectory(
        inputPath,
        currentDirectory = "/"
    ) {
        const node =
            this.getNode(
                inputPath,
                currentDirectory
            );

        if (!node) {
            throw new Error(
                `Directory '${this.normalize(
                    inputPath,
                    currentDirectory
                )}' not found.`
            );
        }

        if (
            node.type !==
            "directory"
        ) {
            throw new Error(
                `'${this.normalize(
                    inputPath,
                    currentDirectory
                )}' is not a directory.`
            );
        }

        return node;
    }

    ensureParent(
        inputPath,
        currentDirectory = "/"
    ) {
        const parent =
            this.getParent(
                inputPath,
                currentDirectory
            );

        if (!parent) {
            throw new Error(
                "The root directory has no parent."
            );
        }

        if (
            parent.type !==
            "directory"
        ) {
            throw new Error(
                "Parent path is not a directory."
            );
        }

        return parent;
    }

    createDirectoryAt(
        inputPath
    ) {
        const normalized =
            this.normalize(inputPath);

        if (
            normalized === "/"
        ) {
            return this.root;
        }

        const existing =
            this.getNode(normalized);

        if (existing) {
            return existing;
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const directory =
            this.createDirectory(
                name
            );

        parent.children.set(
            name,
            directory
        );

        parent.modifiedAt =
            new Date().toISOString();

        return directory;
    }

    createFileAt(
        inputPath,
        content = ""
    ) {
        const normalized =
            this.normalize(inputPath);

        const existing =
            this.getNode(normalized);

        if (existing) {
            return existing;
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const file =
            this.createFile(
                name,
                content
            );

        parent.children.set(
            name,
            file
        );

        parent.modifiedAt =
            new Date().toISOString();

        return file;
    }

    list(
        inputPath = "/",
        currentDirectory = "/"
    ) {
        const directory =
            this.ensureDirectory(
                inputPath,
                currentDirectory
            );

        return Array.from(
            directory.children.values()
        )
            .sort((a, b) => {
                if (
                    a.type !==
                    b.type
                ) {
                    return a.type ===
                        "directory"
                        ? -1
                        : 1;
                }

                return a.name.localeCompare(
                    b.name
                );
            })
            .map((node) => ({
                name: node.name,
                type: node.type,
                size:
                    node.type === "file"
                        ? node.content.length
                        : node.children.size
            }));
    }

    makeDirectory(
        inputPath,
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        if (
            normalized === "/"
        ) {
            throw new Error(
                "Directory '/' already exists."
            );
        }

        const existing =
            this.getNode(normalized);

        if (existing) {
            throw new Error(
                `'${normalized}' already exists.`
            );
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const directory =
            this.createDirectory(
                name
            );

        parent.children.set(
            name,
            directory
        );

        parent.modifiedAt =
            new Date().toISOString();

        return {
            path: normalized,
            type: "directory"
        };
    }

    touch(
        inputPath,
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        const existing =
            this.getNode(normalized);

        if (existing) {
            if (
                existing.type ===
                "directory"
            ) {
                throw new Error(
                    `'${normalized}' is a directory.`
                );
            }

            existing.modifiedAt =
                new Date().toISOString();

            return {
                path: normalized,
                type: "file",
                created: false
            };
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const file =
            this.createFile(
                name,
                ""
            );

        parent.children.set(
            name,
            file
        );

        parent.modifiedAt =
            new Date().toISOString();

        return {
            path: normalized,
            type: "file",
            created: true
        };
    }

    readFile(
        inputPath,
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        const node =
            this.getNode(normalized);

        if (!node) {
            throw new Error(
                `File '${normalized}' not found.`
            );
        }

        if (
            node.type !==
            "file"
        ) {
            throw new Error(
                `'${normalized}' is a directory.`
            );
        }

        return {
            path: normalized,
            content: node.content
        };
    }

    writeFile(
        inputPath,
        content,
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        const existing =
            this.getNode(normalized);

        if (
            existing &&
            existing.type ===
            "directory"
        ) {
            throw new Error(
                `'${normalized}' is a directory.`
            );
        }

        if (existing) {
            existing.content =
                String(content ?? "");

            existing.modifiedAt =
                new Date().toISOString();

            return {
                path: normalized,
                created: false,
                size: existing.content.length
            };
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const file =
            this.createFile(
                name,
                String(content ?? "")
            );

        parent.children.set(
            name,
            file
        );

        parent.modifiedAt =
            new Date().toISOString();

        return {
            path: normalized,
            created: true,
            size: file.content.length
        };
    }

    remove(
        inputPath,
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        if (
            normalized === "/"
        ) {
            throw new Error(
                "The root directory cannot be removed."
            );
        }

        const parent =
            this.ensureParent(
                normalized
            );

        const name =
            this.getBaseName(
                normalized
            );

        const existing =
            parent.children.get(name);

        if (!existing) {
            throw new Error(
                `'${normalized}' not found.`
            );
        }

        parent.children.delete(
            name
        );

        parent.modifiedAt =
            new Date().toISOString();

        return {
            path: normalized,
            type: existing.type
        };
    }

    getSnapshot(
        inputPath = "/",
        currentDirectory = "/"
    ) {
        const normalized =
            this.normalize(
                inputPath,
                currentDirectory
            );

        const node =
            this.getNode(normalized);

        if (!node) {
            throw new Error(
                `'${normalized}' not found.`
            );
        }

        const build =
            (currentNode) => {
                if (
                    currentNode.type ===
                    "file"
                ) {
                    return {
                        name:
                            currentNode.name,
                        type:
                            "file",
                        content:
                            currentNode.content
                    };
                }

                return {
                    name:
                        currentNode.name,
                    type:
                        "directory",
                    children:
                        Array.from(
                            currentNode.children.values()
                        ).map(build)
                };
            };

        return build(node);
    }
}
