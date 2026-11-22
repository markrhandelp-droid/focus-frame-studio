// /api/health — used by Render's health check and for the live demo
// /api/me     — the signed-in user's MySQL profile and role
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/health", async (req, res) => {
    const started = Date.now();
    try {
        await pool.query("SELECT 1");
        res.json({
            status: "ok",
            database: "connected",
            dbLatencyMs: Date.now() - started,
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({ status: "degraded", database: "unreachable", timestamp: new Date().toISOString() });
    }
});

router.get("/me", authenticate, async (req, res) => {
    await pool.execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [req.user.id]);
    res.json(req.user);
});

module.exports = router;
