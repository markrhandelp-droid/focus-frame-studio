// End-to-end API tests against a real MySQL/MariaDB database.
//
//   TEST_DB_NAME=focus_frame_test npm test
//
// WARNING: the test database is DROPPED and re-seeded. Never point
// TEST_DB_NAME at your real database. Firebase is replaced with a fake token
// verifier, so no Google account is needed.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.TEST_DB_NAME || "focus_frame_test";
process.env.ADMIN_EMAILS = "admin@studio.test";

const { tokenVerifier } = require("../src/firebase");
const app = require("../src/app");
const { pool } = require("../src/db/pool");
const { migrate } = require("../src/db/migrate");

const USERS = {
    admin: { uid: "test-admin", email: "admin@studio.test", name: "Test Admin" },
    student: { uid: "test-student", email: "student@studio.test", name: "Test Student" },
    other: { uid: "test-other", email: "other@studio.test", name: "Other Student" }
};
tokenVerifier.verify = async (token) => {
    if (!USERS[token]) throw new Error("bad token");
    return USERS[token];
};

let server;
let base;

async function api(method, path, { as, body } = {}) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(as ? { Authorization: `Bearer ${as}` } : {})
        },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
}

function isoDate(offsetDays) {
    // Same +08:00 clock the database session uses.
    const now = new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400 * 1000);
    return now.toISOString().slice(0, 10);
}

test.before(async () => {
    const mysql = require("mysql2/promise");
    const { connectionOptions } = require("../src/db/pool");
    const { database, ...rest } = connectionOptions();
    const admin = await mysql.createConnection(rest);
    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await admin.end();

    await migrate({ reset: true, log: () => {} });
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    server.close();
    await pool.end();
});

test("health check reports the database", async () => {
    const res = await api("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.database, "connected");
});

test("unknown routes return JSON 404", async () => {
    const res = await api("GET", "/api/nope");
    assert.equal(res.status, 404);
    assert.match(res.body.error.message, /does not exist/);
});

test("malformed JSON returns 400", async () => {
    const res = await api("POST", "/api/products", { as: "admin", body: "{bad" });
    assert.equal(res.status, 400);
});

test("public product list joins category names and supports filters", async () => {
    const all = await api("GET", "/api/products");
    assert.equal(all.status, 200);
    assert.equal(all.body.length, 77);
    assert.ok(all.body[0].category);

    const lens = await api("GET", "/api/products?search=lens&sort=price_desc");
    assert.ok(lens.body.length > 0);
    for (let i = 1; i < lens.body.length; i++) assert.ok(lens.body[i - 1].price >= lens.body[i].price);

    const low = await api("GET", "/api/products?stock=low");
    assert.ok(low.body.every((p) => p.stock <= p.lowStockThreshold));
});

test("/api/me creates the MySQL user with the right role", async () => {
    assert.equal((await api("GET", "/api/me", { as: "admin" })).body.role, "admin");
    assert.equal((await api("GET", "/api/me", { as: "student" })).body.role, "student");
    assert.equal((await api("GET", "/api/me")).status, 401);
    assert.equal((await api("GET", "/api/me", { as: "forged" })).status, 401);
});

test("product CRUD with validation and role checks", async () => {
    const payload = { name: "CRUD Demo Camera", categoryId: 1, price: 15000, stock: 3, description: "Temporary" };

    assert.equal((await api("POST", "/api/products", { body: payload })).status, 401);
    assert.equal((await api("POST", "/api/products", { as: "student", body: payload })).status, 403);

    const invalid = await api("POST", "/api/products", { as: "admin", body: { name: "", categoryId: 1, price: -5, stock: 1.5 } });
    assert.equal(invalid.status, 400);
    assert.deepEqual(Object.keys(invalid.body.error.fields).sort(), ["name", "price", "stock"]);

    const badCategory = await api("POST", "/api/products", { as: "admin", body: { ...payload, categoryId: 9999 } });
    assert.equal(badCategory.status, 400);

    const created = await api("POST", "/api/products", { as: "admin", body: payload });
    assert.equal(created.status, 201);
    assert.equal(created.body.category, "Camera Body");
    const id = created.body.id;

    const updated = await api("PUT", `/api/products/${id}`, { as: "admin", body: { ...payload, stock: 8 } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.stock, 8);

    const restock = await api("PATCH", `/api/products/${id}/stock`, { as: "admin", body: { adjustment: 2 } });
    assert.equal(restock.body.stock, 10);
    const tooMuch = await api("PATCH", `/api/products/${id}/stock`, { as: "admin", body: { adjustment: -50 } });
    assert.equal(tooMuch.status, 409);

    assert.equal((await api("PUT", "/api/products/999999", { as: "admin", body: payload })).status, 404);
    assert.equal((await api("DELETE", `/api/products/${id}`, { as: "admin" })).status, 204);
    assert.equal((await api("GET", `/api/products/${id}`)).status, 404);
    assert.equal((await api("GET", "/api/products/abc")).status, 400);
});

test("category CRUD blocks deleting a category that is in use", async () => {
    const created = await api("POST", "/api/categories", { as: "admin", body: { name: "Audio", description: "Mics and recorders" } });
    assert.equal(created.status, 201);
    assert.equal(created.body.productCount, 0);

    const duplicate = await api("POST", "/api/categories", { as: "admin", body: { name: "Audio" } });
    assert.equal(duplicate.status, 409);

    const renamed = await api("PUT", `/api/categories/${created.body.id}`, { as: "admin", body: { name: "Audio Gear" } });
    assert.equal(renamed.body.name, "Audio Gear");

    assert.equal((await api("DELETE", "/api/categories/1", { as: "admin" })).status, 409);
    assert.equal((await api("DELETE", `/api/categories/${created.body.id}`, { as: "admin" })).status, 204);
});

test("loan workflow updates stock inside a transaction", async () => {
    const product = (await api("POST", "/api/products", { as: "admin", body: { name: "Loan Test Lens", categoryId: 2, price: 1000, stock: 2 } })).body;

    // Validation: past date, too long, too many units
    const past = await api("POST", "/api/loans", { as: "student", body: { productId: product.id, quantity: 1, dueDate: isoDate(-1) } });
    assert.equal(past.status, 400);
    assert.ok(past.body.error.fields.dueDate);
    const tooLong = await api("POST", "/api/loans", { as: "student", body: { productId: product.id, quantity: 1, dueDate: isoDate(45) } });
    assert.equal(tooLong.status, 400);
    const tooMany = await api("POST", "/api/loans", { as: "student", body: { productId: product.id, quantity: 5, dueDate: isoDate(3) } });
    assert.ok(tooMany.body.error.fields.quantity);

    const request = await api("POST", "/api/loans", { as: "student", body: { productId: product.id, quantity: 2, dueDate: isoDate(3), purpose: "Thesis shoot" } });
    assert.equal(request.status, 201);
    assert.equal(request.body.status, "pending");
    const loanId = request.body.id;

    assert.equal((await api("POST", "/api/loans", { as: "student", body: { productId: product.id, quantity: 1, dueDate: isoDate(3) } })).status, 409);

    // Students only see their own loans and cannot approve
    const mine = await api("GET", "/api/loans", { as: "student" });
    assert.ok(mine.body.every((loan) => loan.borrowerEmail === "student@studio.test"));
    assert.equal((await api("GET", "/api/loans", { as: "other" })).body.length, 0);
    assert.equal((await api("PATCH", `/api/loans/${loanId}/status`, { as: "student", body: { status: "approved" } })).status, 403);
    assert.equal((await api("PATCH", `/api/loans/${loanId}/status`, { as: "other", body: { status: "cancelled" } })).status, 404);

    // A second student asks for the same 2 units
    const competing = await api("POST", "/api/loans", { as: "other", body: { productId: product.id, quantity: 2, dueDate: isoDate(2) } });
    assert.equal(competing.status, 201);

    // Approve first: stock 2 -> 0
    const approved = await api("PATCH", `/api/loans/${loanId}/status`, { as: "admin", body: { status: "approved", note: "Pick up at the desk" } });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.productStock, 0);
    assert.equal((await api("GET", `/api/products/${product.id}`)).body.unitsOnLoan, 2);

    // Approving the competing request now fails and leaves stock untouched
    const blocked = await api("PATCH", `/api/loans/${competing.body.id}/status`, { as: "admin", body: { status: "approved" } });
    assert.equal(blocked.status, 409);
    assert.equal((await api("GET", `/api/products/${product.id}`)).body.stock, 0);

    // Invalid transition
    assert.equal((await api("PATCH", `/api/loans/${loanId}/status`, { as: "admin", body: { status: "rejected" } })).status, 409);

    // Return: stock 0 -> 2
    const returned = await api("PATCH", `/api/loans/${loanId}/status`, { as: "admin", body: { status: "returned" } });
    assert.equal(returned.body.status, "returned");
    assert.equal(returned.body.productStock, 2);
    assert.ok(returned.body.returnedAt);

    // Owner can cancel their own pending request
    const cancelled = await api("PATCH", `/api/loans/${competing.body.id}/status`, { as: "other", body: { status: "cancelled" } });
    assert.equal(cancelled.body.status, "cancelled");

    // Products with loan history cannot be deleted
    assert.equal((await api("DELETE", `/api/products/${product.id}`, { as: "admin" })).status, 409);
});

test("admin summary aggregates inventory and loans", async () => {
    assert.equal((await api("GET", "/api/stats/summary", { as: "student" })).status, 403);
    const res = await api("GET", "/api/stats/summary", { as: "admin" });
    assert.equal(res.status, 200);
    assert.ok(res.body.inventory.products >= 77);
    assert.equal(typeof res.body.inventory.value, "number");
    assert.ok(res.body.loans.overdue >= 1); // seeded overdue loan
    assert.ok(res.body.byCategory.length >= 7);
    assert.ok(res.body.topBorrowed.length > 0);

    const overdue = await api("GET", "/api/loans?status=overdue", { as: "admin" });
    assert.ok(overdue.body.length >= 1);
    assert.ok(overdue.body.every((loan) => loan.isOverdue));
});
