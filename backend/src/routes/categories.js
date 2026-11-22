// /api/categories — product categories
//   GET    /      public  list with product counts (LEFT JOIN products)
//   POST   /      admin   create
//   PUT    /:id   admin   rename / edit description
//   DELETE /:id   admin   delete (blocked while products use it)
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { createValidator, parseId } = require("../utils/validate");
const ApiError = require("../utils/ApiError");

const router = express.Router();

const SELECT_CATEGORIES = `
    SELECT c.id, c.name, c.description,
           COUNT(p.id) AS productCount,
           COALESCE(SUM(p.stock), 0) AS units,
           COALESCE(SUM(p.stock * p.price), 0) AS value
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id`;

function toCategory(row) {
    return { ...row, productCount: Number(row.productCount), units: Number(row.units), value: Number(row.value) };
}

async function findCategory(id) {
    const [rows] = await pool.execute(`${SELECT_CATEGORIES} WHERE c.id = ? GROUP BY c.id, c.name, c.description`, [id]);
    if (!rows.length) throw ApiError.notFound("Category not found.");
    return toCategory(rows[0]);
}

function validateCategory(body) {
    return createValidator(body)
        .string("name", { label: "Category name", required: true, max: 100 })
        .string("description", { label: "Description", max: 255 })
        .result();
}

router.get("/", async (req, res) => {
    const [rows] = await pool.execute(`${SELECT_CATEGORIES} GROUP BY c.id, c.name, c.description ORDER BY c.name`);
    res.json(rows.map(toCategory));
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
    const data = validateCategory(req.body);
    const [result] = await pool.execute("INSERT INTO categories (name, description) VALUES (?, ?)", [data.name, data.description]);
    res.status(201).json(await findCategory(result.insertId));
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "category ID");
    const data = validateCategory(req.body);
    const [result] = await pool.execute("UPDATE categories SET name = ?, description = ? WHERE id = ?", [data.name, data.description, id]);
    if (result.affectedRows === 0) throw ApiError.notFound("Category not found.");
    res.json(await findCategory(id));
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "category ID");
    const category = await findCategory(id);
    if (category.productCount > 0) {
        throw ApiError.conflict(`"${category.name}" still has ${category.productCount} product(s). Move or delete them first.`);
    }
    await pool.execute("DELETE FROM categories WHERE id = ?", [id]);
    res.status(204).end();
});

module.exports = router;
