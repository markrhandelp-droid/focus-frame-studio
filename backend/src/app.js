// Builds the Express application (kept separate from server.js so it can be
// imported by tests without opening a port).
const express = require("express");
const cors = require("cors");
const config = require("./config");
const requestLogger = require("./middleware/requestLogger");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();

// ---- Global middleware ----------------------------------------------------
app.use(
    cors({
        origin: config.clientOrigins.includes("*") ? true : config.clientOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);
app.use(express.json({ limit: "10mb" })); // product photos are sent as data URLs
app.use(requestLogger);

// ---- Routes ---------------------------------------------------------------
app.get("/", (req, res) => {
    res.json({ name: "Focus Frame Studio API", health: "/api/health" });
});
app.use("/api", require("./routes/system"));
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/loans", require("./routes/loans"));
app.use("/api/stats", require("./routes/stats"));

// ---- Errors (must be last) ------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
