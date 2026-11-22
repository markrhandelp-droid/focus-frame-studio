// Entry point: prepare the database, then start listening.
const config = require("./src/config");
const app = require("./src/app");
const { pool } = require("./src/db/pool");
const { migrate } = require("./src/db/migrate");

async function start() {
    if (config.db.autoMigrate) {
        await migrate();
    }
    await pool.query("SELECT 1");
    const server = app.listen(config.port, () => {
        console.log(`Focus Frame API listening on port ${config.port}`);
        console.log(`MySQL: connected to ${config.db.url ? "DATABASE_URL" : `${config.db.host}:${config.db.port}/${config.db.database}`}${config.db.ssl ? " (TLS)" : ""}`);
        console.log(`CORS origins: ${config.clientOrigins.join(", ")}`);
    });

    const shutdown = () => {
        server.close(() => pool.end().finally(() => process.exit(0)));
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

start().catch((error) => {
    console.error("Could not start the API. Check the database settings in .env / Render environment variables.");
    console.error(error);
    process.exit(1);
});
