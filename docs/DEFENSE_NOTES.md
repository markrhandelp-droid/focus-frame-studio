# Defense Notes — how the system works

Study guide for explaining the code during the defense. Each section points to the files involved.

## 1. Request path, start to finish (example: an admin edits a product)

1. `InventoryPage.jsx` opens `ProductFormModal.jsx`. The form validates on the client (`validate()`) and calls `onSave`.
2. `AdminDataContext.jsx → saveProduct()` calls `api.products.update()` in `api/client.js`.
3. `client.js` adds `Authorization: Bearer <Firebase ID token>` and sends `PUT /api/products/:id` with a JSON body.
4. Express (`src/app.js`) runs the global middleware: `cors`, `express.json()`, the request logger.
5. `routes/products.js` runs `authenticate` (verifies the token with firebase-admin and loads the MySQL `users` row), then `requireAdmin`, then the handler.
6. The handler validates the body (`utils/validate.js`) and runs a parameterized `UPDATE` with `?` placeholders, which prevents SQL injection.
7. It sends back the updated product (`SELECT … JOIN categories`). The context swaps it into state, so the table updates with no page reload, and a toast confirms the save.
8. If anything throws, Express 5 passes the error to `middleware/errors.js`, which picks the status code and returns `{ error: { message, fields } }`. The form shows each message under its field.

## 2. Likely questions

**Why is the schema normalized? What is 3NF here?**
Category names used to repeat on every product row. Now they are stored once in `categories`, and `products.category_id` is a foreign key to it. Renaming a category changes one row. Every non-key column depends only on its own table's primary key.

**What do the foreign key options do?**
- `ON DELETE RESTRICT` stops deleting a category that still has products, or a product that still has loans.
- `ON UPDATE CASCADE` keeps child rows in step if a parent ID ever changes.
- The API checks for these cases first so it can return a clear 409 message, and the error handler also maps the raw MySQL error codes (`ER_ROW_IS_REFERENCED_2` → 409).

**Why use a transaction to approve a loan?**
Two rows change together: the loan's status and the product's stock. `beginTransaction` + `SELECT … FOR UPDATE` locks both rows, so a second admin approving the last unit at the same moment has to wait. That second request then sees the new stock and gets a 409. If any step fails, `rollback()` undoes both changes. This is tested in `tests/api.test.js` ("competing" request).

**How does role-based access work?**
Firebase proves *who* the user is. The backend decides *what* they can do. `authenticate` verifies the ID token and finds or creates the user in MySQL; emails listed in `ADMIN_EMAILS` get `role = 'admin'`. `requireAdmin` blocks everyone else with a 403. The frontend's `RequireRole` in `App.jsx` only hides pages. The real security check is on the server.

**Which HTTP methods and status codes do you use, and why?**
- GET reads, POST creates (201 + `Location` header), PUT replaces a product, PATCH changes part of a resource (stock adjustment, loan status), DELETE removes (204, no body).
- Errors use 400, 401, 403, 404, 409, 413 and 503 (table in the README).

**What does the central error handler do?**
Every route just `throw`s. Express 5 forwards errors from async handlers automatically. `errors.js` turns known MySQL and body-parser errors into the right status codes, hides internal details for 500s (it logs them instead), and always returns the same JSON shape.

**How does the frontend stay "real-time" without reloading?**
Each mutation uses the API response to update React state: `setProducts`, `setLoans`, etc. in `AdminDataContext.jsx`. Approving a loan patches that product's stock in place, then refreshes the summary numbers in the background.

**How is it responsive?**
- Bootstrap's grid (`Row`/`Col` with `xs`/`md`/`lg` props) sizes the layout.
- The `Navbar` collapses into a menu below 992 px.
- Tables (`d-none d-lg-block`) switch to stacked cards (`d-lg-none`) on phones and tablets, and less important columns hide at smaller widths.
- Modals go full-screen on phones (`fullscreen="sm-down"`).

**How was the database moved from XAMPP to the cloud?**
`npm run db:setup` uses the same connection settings as the API. Pointing `.env` at the cloud host and running it creates the tables from `schema.sql` and loads `seed.sql`. Cloud hosts need TLS, so `DB_SSL=true` (plus the CA certificate for Aiven). `migrate.js` can also upgrade the old one-table XAMPP schema in place.

**Where are the secrets?**
- In `backend/.env` locally (git-ignored) and in Render's Environment tab in production.
- The Firebase *web* config in `frontend/src/firebase.js` is public by design: it only identifies the project.

## 3. Things to demo

1. `GET /api/health` on the Render URL.
2. Admin: add an item → appears instantly; refresh phpMyAdmin / cloud console to show the row. Edit stock. Try saving with an empty name to show validation. Delete it.
3. Try deleting a category that has products → clear 409 message.
4. Student (second Google account or incognito): request an item with too many units → error; request 1 unit → pending.
5. Admin: approve it → stock drops by 1 on the Inventory page; mark returned → stock goes back up.
6. Reports page: totals by category (SQL `GROUP BY` with `LEFT JOIN`).
7. Resize to phone width: collapsed navbar, card layout.
