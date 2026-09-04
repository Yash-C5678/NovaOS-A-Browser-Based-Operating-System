import { User } from "../core/entities/user/User.js";

export class UserManager {
    constructor() {
        this.users = new Map();
        this.nextUserId = 1;

        this.currentUserId = null;
        this.sessions = new Map();

        this.createDefaultAdmin();
    }

    /* =====================================================
       DEFAULT USER
       ===================================================== */

    createDefaultAdmin() {
        const admin = this.createUser({
            username: "admin",
            displayName: "NovaOS Administrator",
            password: "admin123",
            role: "admin"
        });

        admin.lastLoginAt = null;
    }

    /* =====================================================
       USER MANAGEMENT
       ===================================================== */

    createUser({
        username,
        displayName,
        password,
        role = "user"
    }) {
        const normalizedUsername =
            String(username ?? "")
                .trim()
                .toLowerCase();

        if (!normalizedUsername) {
            throw new Error(
                "Username is required."
            );
        }

        if (
            this.getUserByUsername(
                normalizedUsername
            )
        ) {
            throw new Error(
                `Username '${normalizedUsername}' already exists.`
            );
        }

        const userId =
            `user-${this.nextUserId++}`;

        const user = new User({
            id: userId,
            username:
                normalizedUsername,
            displayName:
                displayName ||
                normalizedUsername,
            password,
            role
        });

        this.users.set(
            user.id,
            user
        );

        return user;
    }

    getUser(userId) {
        return (
            this.users.get(userId) ??
            null
        );
    }

    getUserByUsername(username) {
        const normalizedUsername =
            String(username ?? "")
                .trim()
                .toLowerCase();

        return (
            Array.from(
                this.users.values()
            ).find(
                (user) =>
                    user.username ===
                    normalizedUsername
            ) ?? null
        );
    }

    getAllUsers() {
        return Array.from(
            this.users.values()
        );
    }

    getUserCount() {
        return this.users.size;
    }

    deleteUser(userId) {
        const user =
            this.getUser(userId);

        if (!user) {
            throw new Error(
                `User '${userId}' not found.`
            );
        }

        if (user.isAdmin()) {
            const adminCount =
                this.getAllUsers().filter(
                    (candidate) =>
                        candidate.isAdmin() &&
                        candidate.isEnabled()
                ).length;

            if (adminCount <= 1) {
                throw new Error(
                    "The last enabled administrator cannot be deleted."
                );
            }
        }

        if (
            this.currentUserId ===
            userId
        ) {
            this.logout();
        }

        for (
            const [
                sessionId,
                session
            ] of this.sessions.entries()
        ) {
            if (
                session.userId ===
                userId
            ) {
                this.sessions.delete(
                    sessionId
                );
            }
        }

        this.users.delete(userId);

        return user;
    }

    enableUser(userId) {
        const user =
            this.getUserOrThrow(
                userId
            );

        user.enable();

        return user;
    }

    disableUser(userId) {
        const user =
            this.getUserOrThrow(
                userId
            );

        if (user.isAdmin()) {
            const enabledAdmins =
                this.getAllUsers().filter(
                    (candidate) =>
                        candidate.isAdmin() &&
                        candidate.isEnabled()
                );

            if (
                enabledAdmins.length <=
                1
            ) {
                throw new Error(
                    "The last enabled administrator cannot be disabled."
                );
            }
        }

        if (
            this.currentUserId ===
            userId
        ) {
            this.logout();
        }

        user.disable();

        return user;
    }

    /* =====================================================
       AUTHENTICATION
       ===================================================== */

    login(
        username,
        password
    ) {
        const user =
            this.getUserByUsername(
                username
            );

        if (!user) {
            throw new Error(
                "Invalid username or password."
            );
        }

        if (!user.isEnabled()) {
            throw new Error(
                "This user account is disabled."
            );
        }

        if (
            !user.verifyPassword(
                password
            )
        ) {
            throw new Error(
                "Invalid username or password."
            );
        }

        /*
         * End any previous active session
         * for this simulated console login.
         */
        this.logout();

        const sessionId =
            `session-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`;

        const session = {
            id: sessionId,
            userId: user.id,
            username: user.username,
            loginAt:
                new Date().toISOString()
        };

        this.sessions.set(
            sessionId,
            session
        );

        this.currentUserId =
            user.id;

        user.recordLogin();

        return {
            user,
            session
        };
    }

    logout() {
        if (
            this.currentUserId ===
            null
        ) {
            return false;
        }

        for (
            const [
                sessionId,
                session
            ] of this.sessions.entries()
        ) {
            if (
                session.userId ===
                this.currentUserId
            ) {
                this.sessions.delete(
                    sessionId
                );
            }
        }

        this.currentUserId = null;

        return true;
    }

    isAuthenticated() {
        return (
            this.currentUserId !==
            null
        );
    }

    getCurrentUser() {
        if (
            this.currentUserId ===
            null
        ) {
            return null;
        }

        return this.getUser(
            this.currentUserId
        );
    }

    getCurrentSession() {
        const currentUser =
            this.getCurrentUser();

        if (!currentUser) {
            return null;
        }

        return (
            Array.from(
                this.sessions.values()
            ).find(
                (session) =>
                    session.userId ===
                    currentUser.id
            ) ?? null
        );
    }

    /* =====================================================
       AUTHORIZATION
       ===================================================== */

    hasRole(
        role
    ) {
        const user =
            this.getCurrentUser();

        return (
            user !== null &&
            user.role === role
        );
    }

    isAdmin() {
        return this.hasRole(
            "admin"
        );
    }

    canManageUsers() {
        return this.isAdmin();
    }

    /* =====================================================
       HELPERS
       ===================================================== */

    getUserOrThrow(userId) {
        const user =
            this.getUser(userId);

        if (!user) {
            throw new Error(
                `User '${userId}' not found.`
            );
        }

        return user;
    }

    getSnapshot() {
        return {
            users: this.getAllUsers().map(
                (user) =>
                    user.toJSON()
            ),
            userCount:
                this.getUserCount(),
            authenticated:
                this.isAuthenticated(),
            currentUser:
                this.getCurrentUser()
                    ?.toJSON() ?? null,
            currentSession:
                this.getCurrentSession()
                    ? {
                        ...this.getCurrentSession()
                    }
                    : null
        };
    }

    reset() {
        this.users.clear();
        this.sessions.clear();

        this.nextUserId = 1;
        this.currentUserId = null;

        this.createDefaultAdmin();
    }
}