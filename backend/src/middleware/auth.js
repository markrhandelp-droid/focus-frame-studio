// authenticate: verifies the Firebase ID token and loads (or creates) the
//               matching row in the MySQL users table -> req.user
// requireAdmin: lets the request through only when req.user.role is "admin"
const { pool } = require("../db/pool");
const { tokenVerifier } = require("../firebase");
const config = require("../config");
const ApiError = require("../utils/ApiError");

async function findOrCreateUser(decoded) {
    const email = decoded.email.toLowerCase();
    const isAdminEmail = config.adminEmails.includes(email);

    const [rows] = await pool.execute("SELECT * FROM users WHERE firebase_uid = ?", [decoded.uid]);
    let user = rows[0];

    if (!user) {
        const [result] = await pool.execute(
            "INSERT INTO users (firebase_uid, email, display_name, role, last_login_at) VALUES (?, ?, ?, ?, NOW())",
            [decoded.uid, email, decoded.name || null, isAdminEmail ? "admin" : "student"]
        );
        const [created] = await pool.execute("SELECT * FROM users WHERE id = ?", [result.insertId]);
        user = created[0];
    } else if (isAdminEmail && user.role !== "admin") {
        await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
        user.role = "admin";
    }

    return {
        id: user.id,
        firebaseUid: user.firebase_uid,
        email: user.email,
        displayName: user.display_name,
        role: user.role
    };
}

async function authenticate(req, res, next) {
    const [scheme, idToken] = (req.get("authorization") || "").split(" ");
    if (scheme !== "Bearer" || !idToken) {
        throw ApiError.unauthorized("Sign in required: missing Bearer token.");
    }

    let decoded;
    try {
        decoded = await tokenVerifier.verify(idToken);
    } catch (error) {
        throw ApiError.unauthorized("Your session is invalid or expired. Please sign in again.");
    }
    if (!decoded.email) throw ApiError.unauthorized("Your Google account has no email address.");

    req.user = await findOrCreateUser(decoded);
    next();
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") throw ApiError.forbidden("Administrator access required.");
    next();
}

module.exports = { authenticate, requireAdmin };
