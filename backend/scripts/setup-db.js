// npm run db:setup          create missing tables and seed an empty database
// npm run db:setup -- --reset   DROP all four tables first, then recreate + seed
//
// Uses the same DB_* / DATABASE_URL settings as the API, so pointing .env at a
// cloud MySQL host and running this is how the XAMPP data model is migrated.
const { migrate } = require("../src/db/migrate");
const { pool } = require("../src/db/pool");

const reset = process.argv.includes("--reset");

migrate({ reset })
    .then(async () => {
        const [rows] = await pool.query(`
            SELECT 'categories' AS tbl, COUNT(*) AS total FROM categories UNION ALL
            SELECT 'products', COUNT(*) FROM products UNION ALL
            SELECT 'users', COUNT(*) FROM users UNION ALL
            SELECT 'loans', COUNT(*) FROM loans`);
        console.table(rows);
        console.log("Database is ready.");
    })
    .catch((error) => {
        console.error("Database setup failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
