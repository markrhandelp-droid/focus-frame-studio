// /api/loans — equipment borrow requests (signed-in users)
//   GET   /             students see their own loans, admins see all (?status=)
//   POST  /             student files a borrow request (status "pending")
//   PATCH /:id/status   move a loan through its lifecycle:
//                         admin:   pending -> approved | rejected | cancelled
//                                  approved -> returned
//                         student: own pending -> cancelled
//
// Approving subtracts the quantity from stock and returning adds it back.
// Both run in a transaction with row locks (SELECT ... FOR UPDATE) so two
// admins approving at the same time can never push stock below zero.
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate } = require("../middleware/auth");
const { createValidator, parseId } = require("../utils/validate");
const ApiError = require("../utils/ApiError");

const router = express.Router();
router.use(authenticate);

const STATUSES = ["pending", "approved", "rejected", "returned", "cancelled"];
const MAX_LOAN_DAYS = 30;

// loans JOIN users JOIN products JOIN categories
const SELECT_LOANS = `
    SELECT l.id, l.quantity, l.status, l.purpose, l.admin_note AS adminNote,
           DATE_FORMAT(l.due_date, '%Y-%m-%d') AS dueDate,
           l.requested_at AS requestedAt, l.decided_at AS decidedAt, l.returned_at AS returnedAt,
           (l.status = 'approved' AND l.due_date < CURDATE()) AS isOverdue,
           DATEDIFF(l.due_date, CURDATE()) AS daysUntilDue,
           u.id AS userId, u.display_name AS borrowerName, u.email AS borrowerEmail,
           p.id AS productId, p.name AS productName, p.image AS productImage, p.stock AS productStock,
           c.name AS category
    FROM loans l
    JOIN users u ON u.id = l.user_id
    JOIN products p ON p.id = l.product_id
    JOIN categories c ON c.id = p.category_id`;

function toLoan(row) {
    return { ...row, isOverdue: Boolean(Number(row.isOverdue)), daysUntilDue: Number(row.daysUntilDue) };
}

async function findLoan(id, db = pool) {
    const [rows] = await db.execute(`${SELECT_LOANS} WHERE l.id = ?`, [id]);
    if (!rows.length) throw ApiError.notFound("Loan not found.");
    return toLoan(rows[0]);
}

function todayInDb() {
    return pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today, DATE_FORMAT(CURDATE() + INTERVAL ? DAY, '%Y-%m-%d') AS latest", [MAX_LOAN_DAYS])
        .then(([[row]]) => row);
}

router.get("/", async (req, res) => {
    const where = [];
    const params = [];

    if (req.user.role !== "admin") {
        where.push("l.user_id = ?");
        params.push(req.user.id);
    }
    const { status } = req.query;
    if (status === "overdue") {
        where.push("l.status = 'approved' AND l.due_date < CURDATE()");
    } else if (status) {
        if (!STATUSES.includes(status)) throw ApiError.badRequest(`Unknown status "${status}".`);
        where.push("l.status = ?");
        params.push(status);
    }

    const sql = `${SELECT_LOANS} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY FIELD(l.status, 'pending', 'approved', 'returned', 'rejected', 'cancelled'), l.due_date ASC, l.id DESC`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(toLoan));
});

router.post("/", async (req, res) => {
    const { today, latest } = await todayInDb();
    const validator = createValidator(req.body)
        .number("productId", { label: "Equipment", required: true, integer: true, min: 1 })
        .number("quantity", { label: "Quantity", required: true, integer: true, min: 1, max: 50 })
        .date("dueDate", { label: "Return date", required: true })
        .string("purpose", { label: "Purpose", max: 255 });

    const { dueDate } = req.body;
    if (dueDate && dueDate < today) validator.addError("dueDate", "Return date cannot be in the past.");
    if (dueDate && dueDate > latest) validator.addError("dueDate", `Loans can be at most ${MAX_LOAN_DAYS} days long.`);
    const data = validator.result();

    const [[product]] = await pool.execute("SELECT id, name, stock FROM products WHERE id = ?", [data.productId]);
    if (!product) throw ApiError.notFound("That equipment no longer exists.");
    if (product.stock < data.quantity) {
        throw ApiError.badRequest("Please fix the highlighted fields.", {
            fields: { quantity: `Only ${product.stock} unit(s) of ${product.name} are available.` }
        });
    }

    const [[duplicate]] = await pool.execute(
        "SELECT id FROM loans WHERE user_id = ? AND product_id = ? AND status = 'pending'",
        [req.user.id, data.productId]
    );
    if (duplicate) throw ApiError.conflict("You already have a pending request for this item.");

    const [result] = await pool.execute(
        "INSERT INTO loans (user_id, product_id, quantity, purpose, due_date) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, data.productId, data.quantity, data.purpose, data.dueDate]
    );
    res.status(201).json(await findLoan(result.insertId));
});

const ADMIN_TRANSITIONS = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["returned"]
};

router.patch("/:id/status", async (req, res) => {
    const id = parseId(req.params.id, "loan ID");
    const { status, note } = createValidator(req.body)
        .oneOf("status", ["approved", "rejected", "returned", "cancelled"], { label: "Status", required: true })
        .string("note", { label: "Note", max: 255 })
        .result();

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[loan]] = await conn.execute("SELECT * FROM loans WHERE id = ? FOR UPDATE", [id]);
        if (!loan) throw ApiError.notFound("Loan not found.");

        const isAdmin = req.user.role === "admin";
        const isOwner = loan.user_id === req.user.id;
        if (!isAdmin) {
            if (!isOwner) throw ApiError.notFound("Loan not found.");
            if (status !== "cancelled") throw ApiError.forbidden("Only an administrator can change this loan.");
        }

        const allowed = isAdmin ? ADMIN_TRANSITIONS[loan.status] || [] : loan.status === "pending" ? ["cancelled"] : [];
        if (!allowed.includes(status)) {
            throw ApiError.conflict(`A ${loan.status} loan cannot be marked ${status}.`);
        }

        if (status === "approved") {
            const [[product]] = await conn.execute("SELECT name, stock FROM products WHERE id = ? FOR UPDATE", [loan.product_id]);
            if (product.stock < loan.quantity) {
                throw ApiError.conflict(`Not enough stock: ${loan.quantity} requested, ${product.stock} available for ${product.name}.`);
            }
            await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [loan.quantity, loan.product_id]);
        }

        if (status === "returned") {
            await conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [loan.quantity, loan.product_id]);
        }

        await conn.execute(
            `UPDATE loans
             SET status = ?,
                 admin_note = COALESCE(?, admin_note),
                 decided_at = IF(? IN ('approved', 'rejected', 'cancelled'), NOW(), decided_at),
                 returned_at = IF(? = 'returned', NOW(), returned_at)
             WHERE id = ?`,
            [status, note, status, status, id]
        );

        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }

    res.json(await findLoan(id));
});

module.exports = router;
