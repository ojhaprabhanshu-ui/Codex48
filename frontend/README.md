# BrandProof frontend

BrandProof is a React and Vite frontend for reviewing promotional content against brand guidelines. This build covers repository setup, the shared dashboard shell, an overview, a read-only guideline reference, and the content analyzer.

## Run locally

    npm install
    Copy-Item .env.example .env.local
    npm run dev

Open the local URL printed by Vite. In development, VITE_USE_MOCK_API=true enables the fixture adapter. The fixtures include fictional GlowCare and Morrow Skin brands, sample guidelines, submissions, and deterministic demo rule checks. A visible **DEMO DATA** banner stays on while fixtures are active. The ML classifier and Gemini are not invoked in fixture mode, and the sample rule check is not represented as a real AI result.

To connect a backend during development, set VITE_USE_MOCK_API=false and set VITE_API_BASE_URL to the backend's /api base URL. The fixture switch is gated by Vite's development mode, so production builds always use the configured API client.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| VITE_API_BASE_URL | http://localhost:5000/api | Public API base URL |
| VITE_USE_MOCK_API | true in development | Enables development fixtures |

Do not place Gemini, database, AI-service, or signing keys in frontend environment variables. Browser-visible VITE_ values are not secrets.

## Current routes

- /dashboard — submission counts, recent activity, and trend chart
- /analyze — content form, loading and error states, results, citations, and editable rule-based draft
- /guidelines — read-only view of the active brand's guideline records
- Review queue, History, and Settings appear in the sidebar as disabled items for later build stages

Only routes implemented through Stage 4 are active product views. Review actions, guideline editing, and history search are not part of this increment.

## API integration

There is no backend or shared API contract in this repository yet. The client uses the proposed frontend routes from the build request and the normalized snake_case finding shape from the supplied v2 guide as a draft:

- GET /brands
- GET /guidelines?brand_id=...
- POST /guidelines, PUT /guidelines/:id, DELETE /guidelines/:id
- GET /submissions, POST /submissions, GET /submissions/:id
- POST /submissions/:id/analyze
- GET /analyses/:id
- GET /reviews, POST /reviews/:id/decision

The expected analysis response uses findings[] with rule_code, source, severity, quoted_span, start, end, explanation, suggestion, and guideline_text; ml_risk remains a separate advisory value, and warnings[] is surfaced in the UI. These endpoints and fields are not confirmed against a running backend. Align them with the team-owned docs/api-contract.md before production integration.

## Commands

    npm run dev
    npm run build
    npm run preview
    npm run lint

## Scope and limitations

- The sample GlowCare brand and its guideline set are fictional, development-only fixtures.
- Fixture analysis runs a small deterministic rule adapter. It is not the actual backend rule engine, trained classifier, Gemini, or a compliance guarantee.
- The active reviewer workflow, editable guideline management, and persistent production history depend on backend contracts and later frontend stages.
- No backend, model, AI service, or database code is included or modified.
