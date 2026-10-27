# BrandProof frontend

BrandProof is a React and Vite frontend for reviewing promotional content against brand guidelines. It includes an overview dashboard, content analyzer, saved analysis details, reviewer queue, editable guideline library, submission history, and workspace settings.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. In development, `VITE_USE_MOCK_API=true` enables the fixture adapter. The fixtures include fictional GlowCare and Morrow Skin brands, sample guidelines, submissions, and deterministic demo rule checks. A visible **DEMO DATA** banner remains on while fixtures are active. The ML classifier and Gemini are not invoked in fixture mode, and the sample rule check is not represented as a real AI result.

Guideline fixture edits last for the browser session. Fixture submissions and review actions persist in local storage so the demo workflow can be shown across reloads. These records are still sample data, not production evidence.

To connect a backend during development, set `VITE_USE_MOCK_API=false` and set `VITE_API_BASE_URL` to the backend's API base URL. The fixture switch is gated by Vite's development mode, so production builds always use the configured API client.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Public API base URL |
| `VITE_USE_MOCK_API` | `true` in development | Enables development fixtures |

Do not place Gemini, database, AI-service, or signing keys in frontend environment variables. Browser-visible `VITE_` values are not secrets.

## Routes

- `/dashboard` — submission counts, rejected count, recent submissions, and a trend chart
- `/analyze` — create a submission and request analysis
- `/analysis/:id` — cited findings, separate ML/Gemini sections, edit and re-analyze, review submission, and analysis versions
- `/reviews` and `/reviews/:id` — searchable, filterable review queue with confirmed reviewer decisions
- `/guidelines` — search, filter, create, edit, and delete brand rules
- `/history` and `/history/:id` — searchable submission history, analysis versions, and any review events supplied by the data source
- `/settings` — theme, active brand, API status, mock state, and app version

Light and dark palettes apply across the content area, cards, navigation, form controls, and feedback states. The selected theme persists in local storage.

## API integration

There is no backend or shared API contract in this repository. The frontend uses provisional paths and normalized response shapes listed in [docs/api-contract.md](docs/api-contract.md). Confirm those paths, payloads, response fields, status values, error format, and versioning with the backend team before production integration.

Current assumed paths include `GET /brands`, guideline CRUD, submission CRUD, `POST /submissions/:id/analyze`, `GET /analyses/:id`, submission-for-review, and review decisions. Analysis findings cite stable guideline IDs; ML risk stays advisory and separate; unavailable Gemini output remains empty with an explicit UI state.

## Commands

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

## Scope and limitations

- The GlowCare and Morrow Skin brands and guideline sets are fictional fixtures.
- Fixture analysis runs a small deterministic adapter. It is not the actual backend rule engine, trained classifier, Gemini, or a compliance guarantee.
- The API paths in the contract document are proposals until confirmed by backend owners.
- No backend, model, AI service, or database code is included or modified.
