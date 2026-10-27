# BrandProof rule-evaluation dataset

Files: `brandproof_dataset.csv` (100 rows), `brand_guidelines.json`, `gemini_test_cases.json`, `validate_dataset.py`.
Purpose: evaluate the rule engine and Gemini against rules C-02 and D-01. It is not meant for training the ML classifier.

- 20 compliant, 20 unsupported claims (C-02), 20 missing disclosures (D-01), 20 multiple violations (C-02 + D-01), 20 ambiguous/paraphrased (label `review`).
- Assumption: every post is promotional, so D-01 applies to all. D-01 is literal: the post must contain `#ad` (case-insensitive).
- Ambiguous rows use `expected_label = review` and `needs_human_review = true`. For the other rows it is `false`, except one `#sponsored` case. This policy is our choice; change it if the team decides differently.
- AF-002 and AF-003 are illustrative approved facts added for variety. Confirm or remove them with the team.
- `evidence_excerpt` is empty for D-01 because a missing hashtag has no text to quote.
- `split`: `dev` (75 rows) and `heldout` (25 rows). Do not tune prompts or rules on the held-out rows.
- Labels were written by us, not independently verified. Have a teammate review them.
- Rule IDs here are C-02/D-01. The Part 1 files use RULE-001 to RULE-006. Pick one scheme for the whole project.


## Check it
```
python data/validate_dataset.py
```
Run from this folder. Needs only Python, no installs.
