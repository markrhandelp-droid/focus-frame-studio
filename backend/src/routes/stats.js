// /api/stats/summary — admin dashboard numbers, all computed in SQL
// (aggregates + JOINs) so the figures always match the database.
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// SUM()/COUNT() can come back as strings on some MySQL drivers/hosts.
function numbers(row) {
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)) ? Number(value) : value
        ])
    );
}

router.get("/summary", authenticate, requireAdmin, async (req, res) => {
    const [[inventory]] = await pool.query(`
        SELECT COUNT(*) AS products,
               COALESCE(SUM(stock), 0) AS units,
               COALESCE(SUM(stock * price), 0) AS value,
               COALESCE(SUM(stock <= low_stock_threshold), 0) AS lowStock,
               COALESCE(SUM(stock = 0), 0) AS outOfStock
        FROM products`);

    const [[loans]] = await pool.query(`
        SELECT COALESCE(SUM(status = 'pending'), 0) AS pending,
               COALESCE(SUM(status = 'approved'), 0) AS active,
               COALESCE(SUM(status = 'approved' AND due_date < CURDATE()), 0) AS overdue,
               COALESCE(SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END), 0) AS unitsOnLoan,
               COALESCE(SUM(status = 'returned' AND returned_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')), 0) AS returnedThisMonth,
               COUNT(*) AS total
        FROM loans`);

    const [byCategory] = await pool.query(`
        SELECT c.id, c.name,
               COUNT(p.id) AS products,
               COALESCE(SUM(p.stock), 0) AS units,
               COALESCE(SUM(p.stock * p.price), 0) AS value,
               COALESCE(SUM(p.stock <= p.low_stock_threshold), 0) AS lowStock
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY units DESC, c.name`);

    const [topBorrowed] = await pool.query(`
        SELECT p.id, p.name, c.name AS category,
               COUNT(l.id) AS loans, SUM(l.quantity) AS units
        FROM loans l
        JOIN products p ON p.id = l.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE l.status IN ('approved', 'returned')
        GROUP BY p.id, p.name, c.name
        ORDER BY loans DESC, units DESC, p.name
        LIMIT 5`);

    const [topBorrowers] = await pool.query(`
        SELECT u.id, u.display_name AS name, u.email,
               COUNT(l.id) AS loans,
               COALESCE(SUM(l.status = 'approved' AND l.due_date < CURDATE()), 0) AS overdue
        FROM users u
        JOIN loans l ON l.user_id = u.id
        WHERE l.status IN ('approved', 'returned')
        GROUP BY u.id, u.display_name, u.email
        ORDER BY loans DESC, name
        LIMIT 5`);

    res.json({
        inventory: numbers(inventory),
        loans: numbers(loans),
        byCategory: byCategory.map(numbers),
        topBorrowed: topBorrowed.map(numbers),
        topBorrowers: topBorrowers.map(numbers),
        generatedAt: new Date().toISOString()
    });
});

module.exports = router;
