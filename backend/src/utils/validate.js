// Tiny request-body validator. Collects every problem at once so the
// front end can show each message next to its form field.
const ApiError = require("./ApiError");

function createValidator(body = {}) {
    const errors = {};
    const values = {};

    return {
        string(field, { label = field, required = false, max = 255 } = {}) {
            const raw = body[field];
            const value = raw === undefined || raw === null ? "" : String(raw).trim();
            if (required && !value) errors[field] = `${label} is required.`;
            else if (value.length > max) errors[field] = `${label} must be at most ${max} characters.`;
            values[field] = value || null;
            return this;
        },

        number(field, { label = field, required = false, min, max, integer = false } = {}) {
            const raw = body[field];
            if (raw === undefined || raw === null || raw === "") {
                if (required) errors[field] = `${label} is required.`;
                values[field] = null;
                return this;
            }
            const value = Number(raw);
            if (!Number.isFinite(value)) errors[field] = `${label} must be a number.`;
            else if (integer && !Number.isInteger(value)) errors[field] = `${label} must be a whole number.`;
            else if (min !== undefined && value < min) errors[field] = `${label} must be at least ${min}.`;
            else if (max !== undefined && value > max) errors[field] = `${label} must be at most ${max}.`;
            values[field] = value;
            return this;
        },

        date(field, { label = field, required = false } = {}) {
            const raw = body[field];
            if (!raw) {
                if (required) errors[field] = `${label} is required.`;
                values[field] = null;
                return this;
            }
            const valid = /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(`${raw}T00:00:00Z`));
            if (!valid) errors[field] = `${label} must be a date in YYYY-MM-DD format.`;
            values[field] = raw;
            return this;
        },

        oneOf(field, allowed, { label = field, required = false } = {}) {
            const value = body[field];
            if (value === undefined || value === null || value === "") {
                if (required) errors[field] = `${label} is required.`;
            } else if (!allowed.includes(value)) {
                errors[field] = `${label} must be one of: ${allowed.join(", ")}.`;
            }
            values[field] = value ?? null;
            return this;
        },

        addError(field, message) {
            errors[field] = message;
            return this;
        },

        // Throws a 400 with every field error, or returns the cleaned values.
        result() {
            if (Object.keys(errors).length) {
                throw ApiError.badRequest("Please fix the highlighted fields.", { fields: errors });
            }
            return values;
        }
    };
}

function parseId(value, label = "ID") {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw ApiError.badRequest(`Invalid ${label}.`);
    return id;
}

module.exports = { createValidator, parseId };
