// Creates / upgrades the schema and loads seed data.
// Used on server startup (when DB_AUTO_MIGRATE=true) and by `npm run db:setup`.
//
// Steps
//   1. Upgrade a legacy single-table database (products.category as text,
//      from the earlier XAMPP version of this project) to the normalized one.
//   2. Run database/schema.sql (every CREATE TABLE uses IF NOT EXISTS).
//   3. If there are no categories and no products yet, run database/seed.sql.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { connectionOptions } = require("./pool");

const SQL_DIR = path.join(__dirname, "..", "..", "database");

function readStatements(file) {
    const sql = fs.readFileSync(path.join(SQL_DIR, file), "utf8");
    return sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
        .filter(Boolean);
}

async function columnExists(conn, table, column) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) AS total FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
    );
    return Number(rows[0].total) > 0;
}

async function upgradeLegacyProducts(conn, log) {
    const legacy = (await columnExists(conn, "products", "category")) && !(await columnExists(conn, "products", "category_id"));
    if (!legacy) return;

    log("Legacy products table found — migrating text categories into the categories table...");
    const createCategories = readStatements("schema.sql").find((s) => /CREATE TABLE IF NOT EXISTS categories/i.test(s));
    await conn.query(createCategories);
    await conn.query(
        "INSERT IGNORE INTO categories (name) SELECT DISTINCT TRIM(category) FROM products WHERE TRIM(category) <> ''"
    );
    await conn.query(`ALTER TABLE products
        MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        ADD COLUMN category_id INT UNSIGNED NULL AFTER id,
        ADD COLUMN low_stock_threshold INT NOT NULL DEFAULT 6 AFTER stock`);
    await conn.query(`UPDATE products p
        JOIN categories c ON c.name = TRIM(p.category) COLLATE utf8mb4_unicode_ci
        SET p.category_id = c.id`);
    await conn.query(`ALTER TABLE products
        MODIFY category_id INT UNSIGNED NOT NULL,
        DROP COLUMN category,
        ADD KEY idx_products_category (category_id),
        ADD KEY idx_products_name (name),
        ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id)
            REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT`);
    log("Legacy products table migrated.");
}

async function migrate({ reset = false, log = console.log } = {}) {
    const conn = await mysql.createConnection(connectionOptions({ multipleStatements: true }));
    try {
        if (reset) {
            log("Dropping existing tables (--reset)...");
            await conn.query("SET FOREIGN_KEY_CHECKS = 0");
            await conn.query("DROP TABLE IF EXISTS loans, users, products, categories");
            await conn.query("SET FOREIGN_KEY_CHECKS = 1");
        }

        await upgradeLegacyProducts(conn, log);

        for (const statement of readStatements("schema.sql")) {
            await conn.query(statement);
        }

        const [[{ categories }]] = await conn.query("SELECT COUNT(*) AS categories FROM categories");
        const [[{ products }]] = await conn.query("SELECT COUNT(*) AS products FROM products");
        if (Number(categories) === 0 && Number(products) === 0) {
            await conn.query(fs.readFileSync(path.join(SQL_DIR, "seed.sql"), "utf8"));
            log("Seed data loaded (categories, products, demo users and loans).");
        }
    } finally {
        await conn.end();
    }
}

module.exports = { migrate };
