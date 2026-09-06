"""
Serves the trained models (models/category_model.joblib,
models/severity_model.joblib from train.py) behind /classify.

No external API calls — this is entirely your own model. The severity
safety-net and required-services logic live in safety_net.py, shared with
try_it.py so the two can't drift apart.

Run:
    uvicorn serve:app --host 0.0.0.0 --port 8000

Env vars (all optional):
    ALLOWED_ORIGINS  comma-separated list of allowed origins for CORS.
                     Defaults to "*" — fine for local dev, set this
                     explicitly in production.
    API_KEY          if set, /classify requires header `x-api-key`
                     matching this value. Unset by default (open, for
                     local dev / testing).
"""
import logging
import os
from pathlib import Path
from typing import Optional

import joblib
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from safety_net import apply_safety_net

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("resq-ml")

HERE = Path(__file__).parent
MODELS_DIR = HERE / "models"

app = FastAPI(title="ResQ-ML classifier")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("API_KEY")  # None => auth disabled

try:
    category_model = joblib.load(MODELS_DIR / "category_model.joblib")
    severity_model = joblib.load(MODELS_DIR / "severity_model.joblib")
except FileNotFoundError as e:
    raise RuntimeError(
        f"Model files not found in {MODELS_DIR}/. Run `python train.py` first."
    ) from e


class ReportIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


@app.post("/classify")
def classify(report: ReportIn, x_api_key: Optional[str] = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="invalid or missing API key")

    text = report.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    try:
        cat_probs = category_model.predict_proba([text])[0]
        top_idx = cat_probs.argsort()[::-1]
        category = category_model.classes_[top_idx[0]]
        category_confidence = float(cat_probs[top_idx[0]])
        second_category = (
            category_model.classes_[top_idx[1]] if len(top_idx) > 1 else category
        )

        sev_probs = severity_model.predict_proba([text])[0]
        severity = severity_model.classes_[sev_probs.argmax()]
    except Exception:
        log.exception("prediction failed")
        raise HTTPException(status_code=500, detail="classification failed")

    final_severity, required_services, forced = apply_safety_net(
        text, category, category_confidence, second_category, severity
    )

    log.info(
        "classify text_len=%d category=%s(%.2f) severity=%s forced=%s",
        len(text), category, category_confidence, final_severity, forced,
    )

    return {
        "category": category,
        "severity": final_severity,
        "confidence": round(category_confidence * 100),
        "requiredServices": required_services,
        "safetyNetForced": forced,
        "source": "own_model",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "categories": list(category_model.classes_),
        "severities": list(severity_model.classes_),
        "auth_enabled": bool(API_KEY),
    }