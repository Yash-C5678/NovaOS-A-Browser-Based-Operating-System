import { Router } from "express";
import { kernel } from "../kernel.js";

const router = Router();

function getFileSystem() {
    return kernel.getFileSystemManager();
}

function getPath(req) {
    return (
        req.query.path ??
        req.body?.path ??
        "/"
    );
}

function getCwd(req) {
    return (
        req.query.cwd ??
        req.body?.cwd ??
        "/"
    );
}

router.get("/", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const cwd =
            getCwd(req);

        res.json({
            success: true,
            data: {
                cwd,
                entries:
                    fileSystem.list(
                        cwd,
                        "/"
                    )
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get("/list", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const cwd =
            getCwd(req);

        const target =
            getPath(req);

        const normalized =
            fileSystem.normalize(
                target,
                cwd
            );

        res.json({
            success: true,
            data: {
                path: normalized,
                entries:
                    fileSystem.list(
                        normalized
                    )
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get("/read", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const result =
            fileSystem.readFile(
                getPath(req),
                getCwd(req)
            );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get("/snapshot", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        res.json({
            success: true,
            data:
                fileSystem.getSnapshot(
                    getPath(req),
                    getCwd(req)
                )
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/mkdir", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const result =
            fileSystem.makeDirectory(
                req.body.path,
                req.body.cwd ?? "/"
            );

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/touch", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const result =
            fileSystem.touch(
                req.body.path,
                req.body.cwd ?? "/"
            );

        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/write", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const result =
            fileSystem.writeFile(
                req.body.path,
                req.body.content ?? "",
                req.body.cwd ?? "/"
            );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.delete("/remove", (req, res) => {
    try {
        const fileSystem =
            getFileSystem();

        const result =
            fileSystem.remove(
                req.query.path,
                req.query.cwd ?? "/"
            );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
