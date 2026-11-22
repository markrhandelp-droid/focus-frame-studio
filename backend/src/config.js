// Central place for every environment variable the API reads.
// Locally these come from backend/.env (see .env.example); on Render they are
// set in the service's Environment tab. Nothing secret is hard-coded here.
require("dotenv").config({ quiet: true });

function list(value, fallback = []) {
    if (!value) return fallback;
    return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function bool(value, fallback = false) {
    if (value === undefined || value === "") return fallback;
    return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

const config = {
    env: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 5000),

    // Comma-separated list of front-end origins allowed by CORS,
    // e.g. "http://localhost:5173,https://focus-frame.netlify.app"
    clientOrigins: list(process.env.CLIENT_ORIGIN, ["http://localhost:5173"]),

    // Google accounts that are given the admin role when they sign in.
    adminEmails: list(process.env.ADMIN_EMAILS).map((email) => email.toLowerCase()),

    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || "",
        // Optional. Token verification only needs the project ID, but a
        // service account can be supplied as base64-encoded JSON.
        serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || ""
    },

    db: {
        url: process.env.DATABASE_URL || "",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "focus_frame_db",
        // Cloud hosts (Aiven, TiDB Cloud, ...) require TLS.
        ssl: bool(process.env.DB_SSL, false),
        // CA certificate: either the PEM text itself or a path to a .pem file.
        sslCa: process.env.DB_SSL_CA || "",
        // Session time zone so CURDATE() / "overdue" match the studio's clock.
        timezone: process.env.DB_TIMEZONE || "+08:00",
        // Create tables and seed data on startup when they are missing.
        autoMigrate: bool(process.env.DB_AUTO_MIGRATE, true)
    }
};

module.exports = config;
