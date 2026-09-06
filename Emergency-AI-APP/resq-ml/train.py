"""
Train category + severity classifiers on data/dataset_augmented.json,
evaluate on data/dataset_test_holdout.json (both produced by augment.py —
run that first).

Key properties:
- Word TF-IDF (1,2-grams) fused with CHARACTER TF-IDF (3,5-grams,
  word-boundary aware). Char n-grams are what make this robust to
  misspellings/garbled input ("bleding", "unconcious") because the model
  matches sub-word pieces instead of needing the exact token.
- min_df=1 so rare-but-critical words like "hostage" or "overdose" aren't
  dropped just for appearing once.
- Trained on the augmented (relabeled + noise-expanded + deduped) set,
  evaluated on the held-out set that never saw augmentation — so the
  score reflects real generalization, not leakage.
- Saves a metadata.json alongside the models: which dataset produced
  them, when, and what the eval scores were. For anything gating real
  dispatch decisions you want to be able to answer "what changed" when
  behavior shifts in production.
"""
import json
import hashlib
import datetime
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.pipeline import Pipeline, FeatureUnion
import joblib

HERE = Path(__file__).parent
DATA_DIR = HERE / "data"
MODELS_DIR = HERE / "models"
MODELS_DIR.mkdir(exist_ok=True)

AUGMENTED_FILE = DATA_DIR / "dataset_augmented.json"
HOLDOUT_FILE = DATA_DIR / "dataset_test_holdout.json"

for f in (AUGMENTED_FILE, HOLDOUT_FILE):
    if not f.exists():
        raise FileNotFoundError(f"{f} not found. Run `python augment.py` first.")

with open(AUGMENTED_FILE) as f:
    train_data = json.load(f)
with open(HOLDOUT_FILE) as f:
    test_data = json.load(f)

df_train = pd.DataFrame(train_data)
df_test = pd.DataFrame(test_data)
X_train, y_cat_train, y_sev_train = df_train["text"], df_train["category"], df_train["severity"]
X_test, y_cat_test, y_sev_test = df_test["text"], df_test["category"], df_test["severity"]


def make_pipeline():
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True)),
    ])
    return Pipeline([
        ("features", features),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", C=5)),
    ])


category_model = make_pipeline()
category_model.fit(X_train, y_cat_train)
cat_preds = category_model.predict(X_test)
print("=== Category (evaluated on held-out, never-augmented data) ===")
print(classification_report(y_cat_test, cat_preds, zero_division=0))
cat_report = classification_report(y_cat_test, cat_preds, zero_division=0, output_dict=True)

severity_model = make_pipeline()
severity_model.fit(X_train, y_sev_train)
sev_preds = severity_model.predict(X_test)
print("\n=== Severity (evaluated on held-out, never-augmented data) ===")
print(classification_report(y_sev_test, sev_preds, zero_division=0))
sev_report = classification_report(y_sev_test, sev_preds, zero_division=0, output_dict=True)

joblib.dump(category_model, MODELS_DIR / "category_model.joblib")
joblib.dump(severity_model, MODELS_DIR / "severity_model.joblib")

with open(AUGMENTED_FILE, "rb") as f:
    train_hash = hashlib.sha256(f.read()).hexdigest()[:12]

metadata = {
    "trained_at": datetime.datetime.utcnow().isoformat() + "Z",
    "train_rows": len(df_train),
    "test_rows": len(df_test),
    "train_dataset_sha256_12": train_hash,
    "category_report": cat_report,
    "severity_report": sev_report,
}
with open(MODELS_DIR / "metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\nSaved category_model.joblib, severity_model.joblib, metadata.json -> {MODELS_DIR}/")