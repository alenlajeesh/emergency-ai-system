"""
Quick manual sanity check. Mirrors exactly what serve.py does (same
safety_net module), so testing here reflects the real API's behavior.

Run from the project root (same place you ran train.py):
    python try_it.py
"""
from pathlib import Path
import joblib

from safety_net import apply_safety_net

HERE = Path(__file__).parent
MODELS_DIR = HERE / "models"

category_model = joblib.load(MODELS_DIR / "category_model.joblib")
severity_model = joblib.load(MODELS_DIR / "severity_model.joblib")

print("Type a report and press enter (empty line to quit).\n")
while True:
    text = input("> ").strip()
    if not text:
        break

    cat_probs = category_model.predict_proba([text])[0]
    top_idx = cat_probs.argsort()[::-1]
    category = category_model.classes_[top_idx[0]]
    cat_conf = float(cat_probs[top_idx[0]])
    second_category = category_model.classes_[top_idx[1]] if len(top_idx) > 1 else category

    sev_probs = severity_model.predict_proba([text])[0]
    severity = severity_model.classes_[sev_probs.argmax()]
    sev_conf = float(sev_probs.max())

    final_severity, required, forced = apply_safety_net(
        text, category, cat_conf, second_category, severity
    )

    print(f"  category: {category}  ({cat_conf*100:.0f}%)")
    print(
        f"  severity: {final_severity}  ({sev_conf*100:.0f}%)"
        + ("  [forced by safety net]" if forced else "")
    )
    print(f"  required services: {', '.join(required)}")
    print()