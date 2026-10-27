# BrandProof backend

Express and PostgreSQL API for the existing BrandProof frontend. The service uses PostgreSQL IDs (integers), snake_case JSON, ISO 8601 timestamps, parameterized SQL, and a deterministic guideline engine. The frontend currently submits `title` and `platform` as well as the canonical submission fields; both are stored.

## Setup

1. Use Node.js 20 or newer and provision a PostgreSQL database. For judge evaluation, a managed PostgreSQL provider is suitable; the API does not require the database to run on the same machine.
2. Copy `.env.example` to `.env` for local PostgreSQL development. The backend reads `backend/.env` first, then falls back to the root `.env.local` populated by Neon CLI. Set `DATABASE_URL` to the pooled Neon URL for API traffic, and set `DATABASE_URL_UNPOOLED` to its direct URL for migrations. A backend-local `.env` takes precedence, so it can select localhost while the root Neon environment remains available. Set `AI_SERVICE_URL` if an AI service is available. Keep credentials in ignored environment files or deployment secrets, never Git.
3. Install dependencies with `npm install`.
4. Apply the schema with `npm run migrate` (uses `DATABASE_URL_UNPOOLED` when set, otherwise `DATABASE_URL`).
5. Seed GlowCare with `npm run seed`.
6. Start the API with `npm run dev` (or `npm start`). The default API origin is `http://localhost:5000/api`.

The migration and seed are deliberately separate commands. The seed is safe to rerun and upserts GlowCare’s RULE-001 through RULE-006. It includes the approved fact “Supports healthy-looking skin.” For a hosted database that requires TLS, the connection string should include the provider's SSL option (commonly `?sslmode=require`). The Node API pool can also enable TLS with `PGSSL=true`; certificate verification stays enabled unless `PGSSL_REJECT_UNAUTHORIZED=false` is explicitly set. `node-pg-migrate` uses the connection string for migration connections.

Before evaluation, set `DATABASE_URL` in the backend hosting environment, run `npm run migrate` and `npm run seed` once against that database, and set `VITE_API_BASE_URL` in the frontend build to the deployed API URL plus `/api` (for example, `https://your-api.example/api`). Set `FRONTEND_ORIGIN` to the deployed frontend origin for CORS. Do not put the database connection string in frontend variables; frontend build variables are public.

## AI service contract

The bridge posts to `${AI_SERVICE_URL}/analyze` with `{ content, guidelines, rule_findings }`. It accepts JSON containing `ml_risk` (or `risk`), `suggested_rewrite` (or `suggested_correction`), and `gemini_findings` (or Gemini-sourced entries in `findings`). Each AI finding must cite a known `rule_code` (or `rule_id`/`guideline_id`) and an exact `quoted_span` (or `quote`/`exact_text`) from the submitted content. Invalid citations and quotes are discarded, and offsets are recomputed by the API. AI failures become warnings; deterministic findings remain available.

## API notes

The canonical paths from the implementation brief are supported. Compatibility paths used by the current frontend are also provided: `GET /guidelines?brand_id=`, `POST /guidelines`, and `DELETE /guidelines/:id` (soft deactivation), plus `GET /reviews` and `POST /reviews/:id/decision`. Submission lists accept `brand_id`, `status`, and `q`. Finding responses include both canonical `start_idx`/`end_idx` and frontend `start`/`end` offsets.

Review decisions only succeed for `pending_review` submissions. `client_request_id` is unique per submission and makes repeated requests idempotent. AI responses never update workflow status.

## Tests

`npm test` runs built-in Node tests for offsets, three-token negation guards, and content-type-specific disclosure rules.
