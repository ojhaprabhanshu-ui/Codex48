
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Locate the main Codex48 project folder.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "risk_classifier.joblib"

app = FastAPI(
    title="BrandProof ML Service",
    description="Predicts generic content risk for marketing text.",
    version="1.0.0",
)

# Load the trained model and its TF-IDF vectorizer.
if not MODEL_PATH.exists():
    raise RuntimeError(f"Trained model not found: {MODEL_PATH}")

saved_artifacts = joblib.load(MODEL_PATH)
vectorizer = saved_artifacts["vectorizer"]
model = saved_artifacts["model"]


class PredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.post("/predict")
def predict(request: PredictionRequest):
    content = request.text.strip()

    if not content:
        raise HTTPException(status_code=422, detail="Text cannot be empty.")

    features = vectorizer.transform([content])
    prediction = int(model.predict(features)[0])

    probabilities = model.predict_proba(features)[0]
    classes = list(model.classes_)
    risk_index = classes.index(1) if 1 in classes else None

    risk_score = (
        float(probabilities[risk_index])
        if risk_index is not None
        else 0.0
    )

    return {
        "risk_label": prediction,
        "risk_category": (
            "potential_risk" if prediction == 1 else "low_risk"
        ),
        "risk_score": round(risk_score, 4),
        "advisory": True,
        "message": (
            "Potential content risk detected. Review the content."
            if prediction == 1
            else "No generic content risk detected by this classifier."
        ),
    }
