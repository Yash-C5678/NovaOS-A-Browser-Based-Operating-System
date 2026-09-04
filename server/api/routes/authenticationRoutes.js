import express from "express";
import { kernel } from "../../os/kernel/Kernel.js";

const router = express.Router();


/*
 * =========================================================
 * AUTHENTICATION HELPERS
 * =========================================================
 */

function getUserManager() {
    return kernel.getUserManager();
}


function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    return user.toJSON();
}


function requireAuthentication(req, res, next) {
    const userManager =
        getUserManager();

    if (
        !userManager.isAuthenticated()
    ) {
        return res.status(401).json({
            success: false,
            error: "Authentication required."
        });
    }

    next();
}


function requireAdmin(req, res, next) {
    const userManager =
        getUserManager();

    if (
        !userManager.isAuthenticated()
    ) {
        return res.status(401).json({
            success: false,
            error: "Authentication required."
        });
    }

    if (
        !userManager.isAdmin()
    ) {
        return res.status(403).json({
            success: false,
            error: "Administrator privileges required."
        });
    }

    next();
}


/*
 * =========================================================
 * REGISTER NEW USER
 * =========================================================
 *
 * POST /api/auth/register
 *
 * This endpoint is intentionally public so that a user can
 * create an account from the NovaOS login screen.
 *
 * Body:
 * {
 *     "username": "student",
 *     "displayName": "NovaOS Student",
 *     "password": "student123"
 * }
 *
 * New public accounts always receive the "user" role.
 * Administrator accounts can only be managed through the
 * protected administrator user-management endpoint.
 */

router.post(
    "/register",
    (req, res) => {

        try {

            const {
                username,
                displayName,
                password
            } = req.body ?? {};


            if (
                typeof username !==
                "string" ||
                typeof password !==
                "string"
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Username and password are required."
                });
            }


            const normalizedUsername =
                username
                    .trim()
                    .toLowerCase();


            if (
                normalizedUsername.length <
                3 ||
                normalizedUsername.length >
                32
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Username must contain between 3 and 32 characters."
                });
            }


            if (
                !/^[a-z0-9._-]+$/.test(
                    normalizedUsername
                )
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Username may contain only lowercase letters, numbers, dots, underscores, and hyphens."
                });
            }


            if (
                password.length < 4
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Password must contain at least 4 characters."
                });
            }


            const userManager =
                getUserManager();


            if (
                userManager.getUserByUsername(
                    normalizedUsername
                )
            ) {

                return res.status(409).json({
                    success: false,
                    error:
                        `Username '${normalizedUsername}' already exists.`
                });
            }


            const user =
                userManager.createUser({
                    username:
                        normalizedUsername,

                    displayName:
                        typeof displayName ===
                            "string" &&
                            displayName.trim()
                            ? displayName.trim()
                            : normalizedUsername,

                    password,

                    role: "user"
                });


            return res.status(201).json({
                success: true,

                message:
                    "Account created successfully.",

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * LOGIN
 * =========================================================
 *
 * POST /api/auth/login
 *
 * Body:
 * {
 *     "username": "admin",
 *     "password": "admin123"
 * }
 */

router.post(
    "/login",
    (req, res) => {

        try {

            const {
                username,
                password
            } = req.body ?? {};


            if (
                typeof username !==
                "string" ||
                typeof password !==
                "string"
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Username and password are required."
                });
            }


            const result =
                getUserManager().login(
                    username,
                    password
                );


            return res.json({
                success: true,

                message:
                    "Login successful.",

                user:
                    sanitizeUser(
                        result.user
                    ),

                session: {
                    id:
                        result.session.id,

                    userId:
                        result.session.userId,

                    username:
                        result.session.username,

                    loginAt:
                        result.session.loginAt
                }
            });

        } catch (error) {

            return res.status(401).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * LOGOUT
 * =========================================================
 *
 * POST /api/auth/logout
 */

router.post(
    "/logout",
    (req, res) => {

        try {

            const userManager =
                getUserManager();

            const wasAuthenticated =
                userManager.isAuthenticated();

            userManager.logout();


            return res.json({
                success: true,

                message:
                    wasAuthenticated
                        ? "Logout successful."
                        : "No active session.",

                authenticated:
                    userManager.isAuthenticated(),

                currentUser:
                    null
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * CURRENT AUTHENTICATION STATE
 * =========================================================
 *
 * GET /api/auth/current
 */

router.get(
    "/current",
    (req, res) => {

        try {

            const userManager =
                getUserManager();

            const user =
                userManager.getCurrentUser();

            const session =
                userManager.getCurrentSession();


            return res.json({
                success: true,

                authenticated:
                    userManager.isAuthenticated(),

                user:
                    sanitizeUser(user),

                session:
                    session
                        ? {
                            id:
                                session.id,

                            userId:
                                session.userId,

                            username:
                                session.username,

                            loginAt:
                                session.loginAt
                        }
                        : null
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * AUTHENTICATION SNAPSHOT
 * =========================================================
 *
 * GET /api/auth/snapshot
 */

router.get(
    "/snapshot",
    (req, res) => {

        try {

            return res.json({
                success: true,

                ...getUserManager()
                    .getSnapshot()
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * LIST USERS
 * =========================================================
 *
 * GET /api/auth/users
 *
 * Only administrators can manage/view the user directory.
 */

router.get(
    "/users",
    requireAdmin,
    (req, res) => {

        try {

            const users =
                getUserManager()
                    .getAllUsers()
                    .map(
                        (user) =>
                            sanitizeUser(
                                user
                            )
                    );


            return res.json({
                success: true,

                users,

                count:
                    users.length
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * CREATE USER AS ADMIN
 * =========================================================
 *
 * POST /api/auth/users
 *
 * Body:
 * {
 *     "username": "student",
 *     "displayName": "Student",
 *     "password": "password",
 *     "role": "user"
 * }
 */

router.post(
    "/users",
    requireAdmin,
    (req, res) => {

        try {

            const {
                username,
                displayName,
                password,
                role = "user"
            } = req.body ?? {};


            if (
                typeof username !==
                "string" ||
                typeof password !==
                "string"
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Username and password are required."
                });
            }


            const user =
                getUserManager()
                    .createUser({
                        username,
                        displayName,
                        password,
                        role
                    });


            return res.status(201).json({
                success: true,

                message:
                    "User created successfully.",

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * ENABLE USER
 * =========================================================
 *
 * PATCH /api/auth/users/:userId/enable
 */

router.patch(
    "/users/:userId/enable",
    requireAdmin,
    (req, res) => {

        try {

            const user =
                getUserManager()
                    .enableUser(
                        req.params.userId
                    );


            return res.json({
                success: true,

                message:
                    "User enabled successfully.",

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * DISABLE USER
 * =========================================================
 *
 * PATCH /api/auth/users/:userId/disable
 */

router.patch(
    "/users/:userId/disable",
    requireAdmin,
    (req, res) => {

        try {

            const user =
                getUserManager()
                    .disableUser(
                        req.params.userId
                    );


            return res.json({
                success: true,

                message:
                    "User disabled successfully.",

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * DELETE USER
 * =========================================================
 *
 * DELETE /api/auth/users/:userId
 */

router.delete(
    "/users/:userId",
    requireAdmin,
    (req, res) => {

        try {

            const user =
                getUserManager()
                    .deleteUser(
                        req.params.userId
                    );


            return res.json({
                success: true,

                message:
                    "User deleted successfully.",

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


/*
 * =========================================================
 * CURRENT USER PROFILE
 * =========================================================
 *
 * GET /api/auth/profile
 */

router.get(
    "/profile",
    requireAuthentication,
    (req, res) => {

        try {

            const user =
                getUserManager()
                    .getCurrentUser();


            return res.json({
                success: true,

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {

            return res.status(500).json({
                success: false,
                error:
                    error.message
            });
        }
    }
);


export default router;