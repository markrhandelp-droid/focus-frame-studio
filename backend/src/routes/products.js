// /api/products — equipment catalog
//   GET    /                 public   list, with ?search= &categoryId= &stock= &sort=
//   GET    /:id              public   one product
//   POST   /                 admin    create
//   PUT    /:id              admin    replace all editable fields
//   PATCH  /:id/stock        admin    add/subtract units (restock or write-off)
//   DELETE /:id              admin    delete (blocked if the product has loans)
const express = require("express");
const { pool } = require("../db/pool");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { createValidator, parseId } = require("../utils/validate");
const ApiError = require("../utils/ApiError");

const router = express.Router();

// products JOIN categories, plus how many units are currently out on loan.
const SELECT_PRODUCTS = `
    SELECT p.id, p.name, p.category_id AS categoryId, c.name AS category,
           p.price, p.stock, p.low_stock_threshold AS lowStockThreshold,
           p.description, p.image, p.created_at AS createdAt, p.updated_at AS updatedAt,
           COALESCE(l.units_on_loan, 0) AS unitsOnLoan,
           COALESCE(l.pending_requests, 0) AS pendingRequests
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN (
        SELECT product_id,
               SUM(CASE WHEN status = 'approved' THEN quantity ELSE 0 END) AS units_on_loan,
               SUM(status = 'pending') AS pending_requests
        FROM loans
        GROUP BY product_id
    ) l ON l.product_id = p.id`;

const SORTS = {
    name: "p.name ASC",
    price_asc: "p.price ASC, p.name ASC",
    price_desc: "p.price DESC, p.name ASC",
    stock_asc: "p.stock ASC, p.name ASC",
    stock_desc: "p.stock DESC, p.name ASC",
    newest: "p.created_at DESC, p.id DESC"
};

function toProduct(row) {
    return {
        ...row,
        unitsOnLoan: Number(row.unitsOnLoan),
        pendingRequests: Number(row.pendingRequests),
        isLowStock: row.stock <= row.lowStockThreshold
    };
}

async function findProduct(id) {
    const [rows] = await pool.execute(`${SELECT_PRODUCTS} WHERE p.id = ?`, [id]);
    if (!rows.length) throw ApiError.notFound("Product not found.");
    return toProduct(rows[0]);
}

function validateProduct(body) {
    return createValidator(body)
        .string("name", { label: "Equipment name", required: true, max: 255 })
        .number("categoryId", { label: "Category", required: true, integer: true, min: 1 })
        .number("price", { label: "Price", required: true, min: 0, max: 9999999999 })
        .number("stock", { label: "Stock", required: true, integer: true, min: 0, max: 100000 })
        .number("lowStockThreshold", { label: "Low-stock alert level", integer: true, min: 0, max: 100000 })
        .string("description", { label: "Description", max: 2000 })
        .result();
}

function validateImage(image) {
    if (image === undefined || image === null || image === "") return null;
    const value = String(image);
    const ok = value.startsWith("data:image/") || /^https?:\/\//.test(value) || value.startsWith("/");
    if (!ok) throw ApiError.badRequest("Please fix the highlighted fields.", { fields: { image: "Image must be an uploaded picture or a URL." } });
    return value;
}

router.get("/", async (req, res) => {
    const { search, categoryId, stock, sort = "name" } = req.query;
    const where = [];
    const params = [];

    if (search) {
        where.push("(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)");
        const term = `%${String(search).trim()}%`;
        params.push(term, term, term);
    }
    if (categoryId) {
        where.push("p.category_id = ?");
        params.push(parseId(categoryId, "category ID"));
    }
    if (stock === "low") where.push("p.stock <= p.low_stock_threshold");
    if (stock === "out") where.push("p.stock = 0");
    if (stock === "available") where.push("p.stock > 0");

    const orderBy = SORTS[sort] || SORTS.name;
    const sql = `${SELECT_PRODUCTS} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderBy}`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(toProduct));
});

router.get("/:id", async (req, res) => {
    res.json(await findProduct(parseId(req.params.id, "product ID")));
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
    const data = validateProduct(req.body);
    const image = validateImage(req.body.image);
    const [result] = await pool.execute(
        `INSERT INTO products (name, category_id, price, stock, low_stock_threshold, description, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.categoryId, data.price, data.stock, data.lowStockThreshold ?? 6, data.description, image]
    );
    res.status(201).location(`/api/products/${result.insertId}`).json(await findProduct(result.insertId));
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "product ID");
    const data = validateProduct(req.body);
    const image = validateImage(req.body.image);
    const [result] = await pool.execute(
        `UPDATE products
         SET name = ?, category_id = ?, price = ?, stock = ?, low_stock_threshold = ?, description = ?, image = ?
         WHERE id = ?`,
        [data.name, data.categoryId, data.price, data.stock, data.lowStockThreshold ?? 6, data.description, image, id]
    );
    if (result.affectedRows === 0) throw ApiError.notFound("Product not found.");
    res.json(await findProduct(id));
});

router.patch("/:id/stock", authenticate, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "product ID");
    const { adjustment } = createValidator(req.body)
        .number("adjustment", { label: "Adjustment", required: true, integer: true, min: -100000, max: 100000 })
        .result();
    if (adjustment === 0) throw ApiError.badRequest("Adjustment cannot be zero.");

    // The WHERE clause makes the check-and-update atomic: stock never goes negative.
    const [result] = await pool.execute(
        "UPDATE products SET stock = stock + ? WHERE id = ? AND stock + ? >= 0",
        [adjustment, id, adjustment]
    );
    if (result.affectedRows === 0) {
        const product = await findProduct(id); // throws 404 if missing
        throw ApiError.conflict(`Cannot remove ${-adjustment} units: only ${product.stock} in stock.`);
    }
    res.json(await findProduct(id));
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id, "product ID");
    const [[usage]] = await pool.execute("SELECT COUNT(*) AS total FROM loans WHERE product_id = ?", [id]);
    if (Number(usage.total) > 0) {
        throw ApiError.conflict(
            `This item has ${usage.total} loan record(s) and is kept for history. Set its stock to 0 instead of deleting it.`
        );
    }
    const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) throw ApiError.notFound("Product not found.");
    res.status(204).end();
});

module.exports = router;
