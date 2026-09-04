import crypto from "crypto";

export class User {
    constructor({
        id,
        username,
        displayName = username,
        password,
        role = "user",
        createdAt = new Date().toISOString(),
        enabled = true
    }) {
        if (!id || typeof id !== "string") {
            throw new Error(
                "User ID is required and must be a string."
            );
        }

        if (
            !username ||
            typeof username !== "string"
        ) {
            throw new Error(
                "Username is required and must be a string."
            );
        }

        const normalizedUsername =
            username.trim().toLowerCase();

        if (
            normalizedUsername.length < 3 ||
            normalizedUsername.length > 32
        ) {
            throw new Error(
                "Username must contain between 3 and 32 characters."
            );
        }

        if (
            !/^[a-z0-9._-]+$/.test(
                normalizedUsername
            )
        ) {
            throw new Error(
                "Username may contain only lowercase letters, numbers, dots, underscores, and hyphens."
            );
        }

        if (
            !password ||
            typeof password !== "string"
        ) {
            throw new Error(
                "Password is required."
            );
        }

        if (password.length < 4) {
            throw new Error(
                "Password must contain at least 4 characters."
            );
        }

        const validRoles = [
            "admin",
            "user"
        ];

        if (!validRoles.includes(role)) {
            throw new Error(
                `Invalid user role '${role}'.`
            );
        }

        this.id = id;
        this.username =
            normalizedUsername;
        this.displayName =
            String(displayName).trim() ||
            normalizedUsername;

        this.role = role;
        this.enabled = Boolean(enabled);

        this.passwordSalt =
            crypto.randomBytes(16).toString(
                "hex"
            );

        this.passwordHash =
            User.hashPassword(
                password,
                this.passwordSalt
            );

        this.createdAt = createdAt;
        this.lastLoginAt = null;
    }

    /* =====================================================
       PASSWORD
       ===================================================== */

    static hashPassword(
        password,
        salt
    ) {
        return crypto
            .pbkdf2Sync(
                password,
                salt,
                100000,
                64,
                "sha512"
            )
            .toString("hex");
    }

    verifyPassword(password) {
        if (
            typeof password !==
            "string"
        ) {
            return false;
        }

        const hash =
            User.hashPassword(
                password,
                this.passwordSalt
            );

        return crypto.timingSafeEqual(
            Buffer.from(
                hash,
                "hex"
            ),
            Buffer.from(
                this.passwordHash,
                "hex"
            )
        );
    }

    /* =====================================================
       LOGIN STATE
       ===================================================== */

    recordLogin() {
        this.lastLoginAt =
            new Date().toISOString();
    }

    /* =====================================================
       ACCOUNT STATE
       ===================================================== */

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    isAdmin() {
        return this.role === "admin";
    }

    /* =====================================================
       SAFE REPRESENTATION
       ===================================================== */

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            displayName:
                this.displayName,
            role: this.role,
            enabled:
                this.enabled,
            createdAt:
                this.createdAt,
            lastLoginAt:
                this.lastLoginAt
        };
    }
}