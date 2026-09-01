import json
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
import joblib

with open('data/dataset.json') as f:
    data = json.load(f)
df = pd.DataFrame(data)

X_train, X_test, y_cat_train, y_cat_test = train_test_split(
    df['text'], df['category'], test_size=0.2, random_state=42, stratify=df['category']
)
_, _, y_sev_train, y_sev_test = train_test_split(
    df['text'], df['severity'], test_size=0.2, random_state=42, stratify=df['category']
)

category_model = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=5000)),
    ('clf', LogisticRegression(max_iter=1000, class_weight='balanced')),
])
category_model.fit(X_train, y_cat_train)
print("=== Category ===")
print(classification_report(y_cat_test, category_model.predict(X_test), zero_division=0))

cm = confusion_matrix(y_cat_test, category_model.predict(X_test), labels=category_model.classes_)
print("=== Confusion matrix (rows=actual, cols=predicted) ===")
print("        ", "  ".join(f"{c[:4]:>4}" for c in category_model.classes_))
for i, row in enumerate(cm):
    print(f"{category_model.classes_[i]:10}", "  ".join(f"{v:4d}" for v in row))

cv_scores_cat = cross_val_score(category_model, df['text'], df['category'], cv=5, scoring='f1_macro')
print(f"\nCategory 5-fold CV f1_macro: {cv_scores_cat.mean():.3f} (+/- {cv_scores_cat.std():.3f})")

severity_model = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=5000)),
    ('clf', LogisticRegression(max_iter=1000, class_weight='balanced')),
])
severity_model.fit(X_train, y_sev_train)
print("\n=== Severity ===")
print(classification_report(y_sev_test, severity_model.predict(X_test), zero_division=0))

cv_scores_sev = cross_val_score(severity_model, df['text'], df['severity'], cv=5, scoring='f1_macro')
print(f"\nSeverity 5-fold CV f1_macro: {cv_scores_sev.mean():.3f} (+/- {cv_scores_sev.std():.3f})")

joblib.dump(category_model, 'models/category_model.joblib')
joblib.dump(severity_model, 'models/severity_model.joblib')
print("\nSaved models to models/")