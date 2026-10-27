# BrandProof frontend API contract (proposal)

This document records the interface currently assumed by the frontend. There is no backend implementation or shared API contract in this repository. Paths, field names, and response envelopes below are **provisional** and must be aligned with the backend team before production integration.

## Base URL and versioning

- The browser client uses `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`).
- The current frontend calls unversioned paths relative to that base URL.
- API versioning is not established. Recommended options are a versioned prefix such as `/api/v1` or an agreed version header. Do not assume either until backend owners confirm it.
- JSON requests use `Content-Type: application/json`. The frontend does not send secrets or AI credentials.

## Endpoints used or prepared by the frontend

| Method | Path relative to base URL | Purpose |
| --- | --- | --- |
| GET | `/health` | Optional connectivity check in Settings. |
| GET | `/brands` | Load brand records. |
| GET | `/guidelines?brand_id={id}` | List a brand's rules. |
| POST | `/guidelines` | Create a guideline. |
| PUT | `/guidelines/{id}` | Update a guideline while preserving its stable ID. |
| DELETE | `/guidelines/{id}` | Delete a guideline. |
| GET | `/submissions?brand_id={id}` | List submissions, optionally scoped to one brand. |
| POST | `/submissions` | Create a submission. |
| GET | `/submissions/{id}` | Read a submission, latest analysis reference, and any returned history. |
| PUT | `/submissions/{id}` | Update draft content before a new analysis version. |
| POST | `/submissions/{id}/analyze` | Request a new analysis version. |
| POST | `/submissions/{id}/submit-for-review` | Queue an analyzed submission for human review. |
| GET | `/analyses/{id}` | Read a saved analysis version. |
| GET | `/reviews` | List review queue records. |
| POST | `/reviews/{id}/decision` | Record an approve, reject, or request-changes decision. |

## Proposed request shapes

```json
{
  "brand_id": "brand-id",
  "title": "Spring launch caption",
  "content": "Draft text",
  "content_type": "paid_promo",
  "platform": "Instagram"
}
```

Guideline create/update payloads:

```json
{
  "brand_id": "brand-id",
  "title": "Disclose paid promotion",
  "category": "Disclosure",
  "type": "disclosure",
  "text": "Paid promotional content must include #ad or #sponsored.",
  "approved_fact": null,
  "active": true
}
```

Review decision payload:

```json
{
  "decision": "request_changes",
  "comment": "Add the missing sponsorship disclosure."
}
```

The frontend requires a non-empty comment for `reject` and `request_changes`. The backend should enforce the same constraint.

## Proposed response fields

Submission records are expected to include `id`, `brand_id`, `title`, `content`, `content_type`, `platform`, `status`, and `created_at`. Optional fields used when supplied include `review_decision`, `reviewer_comment`, `reviewed_at`, `review_events`, `analysis`, `analysis_history`, and `version_count`.

Analysis responses keep sources separate:

```json
{
  "id": "analysis-id",
  "submission_id": "submission-id",
  "version": 1,
  "created_at": "2026-01-01T00:00:00Z",
  "status": "analyzed",
  "findings": [
    {
      "id": "finding-id",
      "rule_code": "RULE-001",
      "source": "rule_engine",
      "severity": "high",
      "quoted_span": "cures acne",
      "start": 10,
      "end": 20,
      "explanation": "This language makes a treatment claim.",
      "suggestion": "Use approved product wording.",
      "guideline_title": "No cure or treatment claims",
      "guideline_text": "Do not claim that products cure or treat a condition."
    }
  ],
  "ml_risk": null,
  "gemini_findings": [],
  "suggested_rewrite": null,
  "warnings": []
}
```

Finding citations should resolve to stable guideline IDs. `ml_risk` is an advisory classifier result and must not be merged with rule findings. Gemini output belongs in `gemini_findings` (or findings with `source: "gemini"`) and should not be fabricated when unavailable. Confidence scores are optional and must only be sent if the model contract defines their meaning.

## Status values

The frontend currently recognizes submission statuses `submitted`, `analyzing`, `analyzed`, `pending_review`, `approved`, `rejected`, `changes_requested`, and `failed`. Confirm canonical spelling and allowed transitions with the backend. Human approval is a reviewer decision; analysis alone must not set `approved`.

## Error envelope

The client can display either of these response forms; the backend should select and document one canonical schema:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "A reviewer comment is required." } }
```

or

```json
{ "message": "A reviewer comment is required." }
```

Use appropriate HTTP status codes and stable machine-readable error codes for validation, missing records, conflicts, authorization, and service failures.

## Data and demo boundaries

- The development fixture adapter is enabled only when `import.meta.env.DEV` and `VITE_USE_MOCK_API=true`.
- Fixture guideline CRUD is held in session storage; fixture submissions and review actions are held in local storage for the demo browser.
- Fixture rule matching is a small deterministic example. It does not invoke the real rule engine, ML classifier, or Gemini.
- Do not treat fixture records, review decisions, or dashboard totals as production evidence.
