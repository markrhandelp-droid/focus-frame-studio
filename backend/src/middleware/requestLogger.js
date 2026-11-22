// Logs one line per request: method, path, status and duration.
function requestLogger(req, res, next) {
    const started = Date.now();
    res.on("finish", () => {
        if (process.env.NODE_ENV === "test") return;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started} ms)`);
    });
    next();
}

module.exports = requestLogger;
