// MySQL connection pool shared by every route.
// Works with XAMPP (no TLS) and with cloud MySQL hosts (TLS on).
const fs = require("fs");
const mysql = require("mysql2/promise");
const config = require("../config");

function sslOptions() {
    if (!config.db.ssl) return undefined;
    const ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };
    const ca = config.db.sslCa;
    if (ca) {
        // Accept either the certificate text or a path to it.
        ssl.ca = ca.includes("BEGIN CERTIFICATE") ? ca.replace(/\\n/g, "\n") : fs.readFileSync(ca, "utf8");
    }
    return ssl;
}

function connectionOptions(overrides = {}) {
    const base = {
        ssl: sslOptions(),
        timezone: config.db.timezone,
        decimalNumbers: true, // DECIMAL columns come back as JS numbers
        ...overrides
    };
    if (config.db.url) return { uri: config.db.url, ...base };
    return {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ...base
    };
}

const pool = mysql.createPool(
    connectionOptions({
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true // helps keep idle cloud connections from dropping
    })
);

// Every new connection uses the studio's time zone.
pool.on("connection", (connection) => {
    connection.query("SET time_zone = ?", [config.db.timezone]);
});

module.exports = { pool, connectionOptions };
