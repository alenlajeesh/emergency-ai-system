from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
category_model = joblib.load('category_model.joblib')
severity_model = joblib.load('severity_model.joblib')

REQUIRED_SERVICES = {
    'medical': ['medical'], 'accident': ['medical', 'security'], 'fire': ['fire', 'medical'],
    'security': ['security'], 'disaster': ['fire', 'medical', 'security'],
    'missing': ['security'], 'other': ['security'],
}

class ReportIn(BaseModel):
    text: str

@app.post('/classify')
def classify(report: ReportIn):
    cat_probs = category_model.predict_proba([report.text])[0]
    category = category_model.classes_[cat_probs.argmax()]
    category_confidence = float(cat_probs.max())

    severity = severity_model.predict([report.text])[0]

    return {
        'category': category,
        'severity': severity,
        'confidence': round(category_confidence * 100),
        'requiredServices': REQUIRED_SERVICES.get(category, ['security']),
        'source': 'ml',
    }