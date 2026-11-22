// An error with an HTTP status code. Throw it from any route or middleware;
// the central error handler turns it into a JSON response.
class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.details = details;
    }

    static badRequest(message, details) { return new ApiError(400, message, details); }
    static unauthorized(message = "Sign in required.") { return new ApiError(401, message); }
    static forbidden(message = "You do not have permission to do this.") { return new ApiError(403, message); }
    static notFound(message = "Not found.") { return new ApiError(404, message); }
    static conflict(message) { return new ApiError(409, message); }
}

module.exports = ApiError;
