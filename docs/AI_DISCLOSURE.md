# AI Usage Disclosure

> **Before submitting:** fill in every `[ ]` / *TODO* below with what *you*
> actually did. Delete anything that isn't true. The rubric rewards an accurate
> disclosure, not a perfect-looking one.

## Tools used

| Tool | Used for |
|---|---|
| Claude (Anthropic), Claude Opus 5.5 | Restructuring the backend, designing the normalized schema, adding the loans module, rebuilding the UI with React-Bootstrap, writing tests and documentation |
| *TODO — any other tool (ChatGPT, Copilot, …)* | *TODO* |

## What I built before using AI

*TODO — describe your starting point honestly. For example:* the original
version had a React admin/student UI with custom CSS, Firebase Google login,
and an Express server in one `server.js` file with CRUD for a single
`products` table on XAMPP MySQL.

## What the AI generated or changed

| Area | Files | What changed |
|---|---|---|
| Backend structure | `backend/src/**`, `backend/server.js` | Split one file into config, db, middleware, routes and utils. Added a central error handler, a JSON 404, request logging, a configurable CORS origin and a `/api/health` endpoint |
| Database | `backend/database/schema.sql`, `seed.sql`, `src/db/migrate.js` | Normalized into `categories`, `products`, `users` and `loans` with foreign keys and CHECK constraints. Added a migration that upgrades the old single-table database, plus `npm run db:setup` for moving it to cloud MySQL |
| Business logic | `src/routes/loans.js`, `src/routes/stats.js` | Borrow-request workflow with transactions and row locks, status transitions, overdue detection, SQL aggregate reports |
| Validation | `src/utils/validate.js`, form components | Server-side field validation; matching client-side validation in the Bootstrap forms |
| Frontend | `frontend/src/**` | Rebuilt the pages with React-Bootstrap components, React Router routes with role guards, shared data contexts, responsive table/card layouts |
| Tests & docs | `backend/tests/api.test.js`, `README.md`, deploy configs | API tests, README, `render.yaml`, `netlify.toml`, `.env.example` files |

## Example prompts

- "Only do the requirements for WS102 [React + Bootstrap 5, Express REST API, cloud MySQL, full CRUD, system complexity] for my project." (I attached the requirements document, the rubric and my project zip.)
- *TODO — add any follow-up prompts you used.*

## How I reviewed, tested and adapted the output

*TODO — replace with what you actually did. Ideas for what to check:*

- [ ] Read through every backend route and can explain each SQL query
- [ ] Ran `npm test` in `backend` and saw all tests pass
- [ ] Ran the app locally on XAMPP and tried every CRUD action while watching phpMyAdmin
- [ ] Tested the loan flow: request as a student, approve as admin, check stock went down, mark returned, check stock went back up
- [ ] Tested on a phone or with browser dev tools at phone/tablet widths
- [ ] Migrated the database to *TODO cloud host* with `npm run db:setup`
- [ ] Deployed to Render and Netlify and tested the live URLs
- [ ] Things I changed or fixed myself: *TODO*
- [ ] Things that didn't work the first time and how I fixed them: *TODO*

## What I understand and can explain

See `docs/DEFENSE_NOTES.md` for a guide to the main flows. *TODO — note any
part you still need to study before the defense.*
