
import csv
import os
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)

# 1. Load the training examples
with open("data/labeled_examples.csv", encoding="utf-8-sig", newline="") as file:
    rows = list(csv.DictReader(file, delimiter=","))
# Use only rows explicitly marked for training
rows = [row for row in rows if row["split"] == "train"]

texts = [row["text"] for row in rows]
labels = [int(row["risk_label"]) for row in rows]

if len(set(labels)) < 2:
    raise ValueError("Training data must contain both risk labels: 0 and 1.")

print(f"Training examples: {len(texts)}")
print(f"Low-risk labels (0): {labels.count(0)}")
print(f"Potential-risk labels (1): {labels.count(1)}")

# 2. Convert text into numerical features
vectorizer = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 2),
    min_df=1,
)

X_train = vectorizer.fit_transform(texts)

# 3. Train the classifier
model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced",
    random_state=42,
)

model.fit(X_train, labels)

print("\nModel training completed!")

# 4. Load separate held-out examples for evaluation
with open("data/heldout_tests.csv", encoding="utf-8-sig", newline="") as file:
    test_rows = list(csv.DictReader(file))
    print("Detected held-out columns:", list(test_rows[0].keys()) if test_rows else "NO ROWS")
print("First held-out row:", test_rows[0] if test_rows else "NO ROWS")
X_test_text = [row["text"] for row in test_rows]
y_test = [int(row["expected_risk_label"]) for row in test_rows]

X_test = vectorizer.transform(X_test_text)
predictions = model.predict(X_test)

print("\nHeld-out evaluation")
print("-------------------")
print(f"Test examples: {len(y_test)}")
print(f"Accuracy: {accuracy_score(y_test, predictions):.3f}")

print("\nClassification report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Low risk", "Potential risk"],
        zero_division=0,
    )
)

print("Confusion matrix (rows = actual, columns = predicted):")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

# 5. Save the trained model and vectorizer
os.makedirs("models", exist_ok=True)

joblib.dump(
    {"vectorizer": vectorizer, "model": model},
    "models/risk_classifier.joblib",
)

print("\nSaved model to models/risk_classifier.joblib")
