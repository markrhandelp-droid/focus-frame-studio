// notFound: any /api route that does not exist -> 404 JSON
// errorHandler: the single place where errors become HTTP responses.
//   Express 5 forwards errors thrown in async handlers here automatically,
//   so routes can simply `throw`.
const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
}

// Translate common MySQL / body-parser errors into meaningful status codes.
function normalize(error) {
    if (error instanceof ApiError) return error;

    switch (error.code) {
        case "ER_DUP_ENTRY":
            return ApiError.conflict("A record with that value already exists.");
        case "ER_ROW_IS_REFERENCED":
        case "ER_ROW_IS_REFERENCED_2":
            return ApiError.conflict("This record is still used by other records, so it cannot be deleted.");
        case "ER_NO_REFERENCED_ROW":
        case "ER_NO_REFERENCED_ROW_2":
            return ApiError.badRequest("A related record (for example the category) does not exist.");
        case "ER_CHECK_CONSTRAINT_VIOLATED":
        case "ER_CONSTRAINT_FAILED":
            return ApiError.badRequest("A value is outside the allowed range.");
        case "ER_DATA_TOO_LONG":
            return ApiError.badRequest("A value is too long for its field.");
        case "ECONNREFUSED":
        case "ETIMEDOUT":
        case "PROTOCOL_CONNECTION_LOST":
        case "ER_ACCESS_DENIED_ERROR":
            return new ApiError(503, "The database is unavailable. Please try again shortly.");
        default:
            break;
    }

    if (error.type === "entity.parse.failed") return ApiError.badRequest("Request body is not valid JSON.");
    if (error.type === "entity.too.large") return new ApiError(413, "Request body is too large (images must be under ~7 MB).");

    return new ApiError(500, "Something went wrong on the server.");
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
    const apiError = normalize(error);
    if (apiError.status >= 500) {
        console.error(`[${req.method} ${req.originalUrl}]`, error);
    }
    res.status(apiError.status).json({
        error: {
            status: apiError.status,
            message: apiError.message,
            ...(apiError.details || {})
        }
    });
}

module.exports = { notFound, errorHandler };
