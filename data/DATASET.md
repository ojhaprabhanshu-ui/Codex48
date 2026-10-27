
# BrandProof Dataset Documentation

## 1. Purpose

This dataset supports the development and evaluation of BrandProof, a brand-governance prototype that checks marketing content for potential claim risks and brand-guideline issues.

## 2. Dataset Files

- `brand_rules.json`: Brand-specific rules and approved product facts.
- `labeled_examples.csv`: Synthetic marketing text labeled for generic claim-risk classification.
- `heldout_tests.csv`: Separate examples reserved for evaluating the classifier.
- `e2e_expected.csv`: End-to-end test cases with expected brand-rule IDs.

## 3. Label Definitions

- `risk_label = 0`: No obvious generic claim risk identified in the example.
- `risk_label = 1`: Potential generic claim risk identified in the example.

These labels describe generic text risk. They do not independently prove that a specific brand rule has been violated.

## 4. Risk Categories

- `medical_claim`: Claims about curing, treating, or healing medical or skin conditions.
- `guarantee`: Guaranteed, permanent, or specific-outcome promises.
- `pressure_tactic`: Urgent or coercive promotional wording.
- `misleading_claim`: Claims that may be unsupported or misleading.
- `ordinary_copy`: Neutral product descriptions or ordinary marketing language.

## 5. Data Origin

The initial examples are manually authored synthetic marketing text for prototype development. They are not collected from real customers and should not be represented as a production dataset.

## 6. Training and Evaluation

The training dataset and held-out evaluation dataset must remain separate. Related or near-duplicate examples should not be split across training and evaluation partitions.

Model performance must be measured on data that was not used to train or tune the model. Report the evaluation method, class counts, precision, recall, F1 score, and confusion matrix before making performance claims.

## 7. Limitations

- The current dataset is a small starter dataset.
- Synthetic examples may not represent the variety of real marketing content.
- A generic risk classifier cannot establish brand-rule violations by itself.
- Rule-engine findings must be tied to applicable rule IDs and supporting evidence.
- Contextual findings require review, and final approval remains with a human reviewer.

## 8. Future Improvements

Expand the dataset with varied phrasing, misspellings, hashtags, emojis, ambiguous examples, and hard negatives. Review labels consistently and evaluate the classifier on a larger, independent test set.
