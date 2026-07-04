from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
import traceback
import os

from dotenv import load_dotenv

# ✅ NEW GEMINI SDK
try:
    from google import genai  # pip install google-genai
except Exception:
    genai = None

# ---------------- CONFIG ----------------
BASE_DIR = Path(__file__).resolve().parent

dotenv_local = BASE_DIR / ".env.local"
dotenv_default = BASE_DIR / ".env"

if dotenv_local.exists():
    load_dotenv(dotenv_local, override=True)
elif dotenv_default.exists():
    load_dotenv(dotenv_default, override=True)
else:
    load_dotenv(override=True)

DEFAULT_THRESHOLD = float(os.getenv("STROKE_THRESHOLD", "0.5"))

MODEL_FILENAME = os.getenv("MODEL_FILENAME", "stroke_risk_model.pkl")
MODEL_PATH = BASE_DIR / "models" / MODEL_FILENAME

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# bạn có thể set trong .env.local: GEMINI_MODEL=...
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
# ---------------------------------------


app = FastAPI(title="Stroke Risk Predictor", version="1.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev OK. Production nên giới hạn domain cụ thể.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== GLOBALS =====================
pipeline = None
EXPECTED_COLUMNS = None
PREPROCESS_STEP = None

chat_enabled = False
gemini_client = None
AVAILABLE_MODELS = []
# ==================================================


# ===================== REQUEST SCHEMA =====================
class PredictRequest(BaseModel):
    # numeric
    age: float = Field(..., ge=0, le=120)
    avg_glucose_level: float = Field(..., ge=0)
    bmi: float = Field(..., ge=0)

    # categorical/text
    gender: str
    ever_married: str
    work_type: str
    Residence_type: str
    smoking_status: str

    # binary ints
    hypertension: int = Field(..., ge=0, le=1)
    heart_disease: int = Field(..., ge=0, le=1)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
# =========================================================


def safe_log1p(x: float) -> float:
    x = float(x)
    if x < 0:
        x = 0.0
    return float(np.log1p(x))


def clean_text(s: str) -> str:
    return str(s).strip()


def normalize_category(field_name: str, value: str) -> str:
    v = clean_text(value).lower()

    if field_name == "gender":
        if v in ["m", "male"]:
            return "male"
        if v in ["f", "female"]:
            return "female"
        if v in ["other", "others"]:
            return "other"
        return v

    if field_name == "ever_married":
        if v in ["y", "yes", "true", "1"]:
            return "yes"
        if v in ["n", "no", "false", "0"]:
            return "no"
        return v

    if field_name == "Residence_type":
        if v in ["urban", "u"]:
            return "urban"
        if v in ["rural", "r"]:
            return "rural"
        return v

    return v


def infer_expected_columns(model_pipeline):
    if not hasattr(model_pipeline, "named_steps"):
        return None, None

    preferred_names = ["preprocess", "preprocessor", "prep", "transform"]
    for name in preferred_names:
        if name in model_pipeline.named_steps:
            step = model_pipeline.named_steps[name]
            if hasattr(step, "feature_names_in_"):
                return list(step.feature_names_in_), name

    for name, step in model_pipeline.named_steps.items():
        if hasattr(step, "feature_names_in_"):
            return list(step.feature_names_in_), name

    return None, None


def build_dataframe(p: PredictRequest) -> pd.DataFrame:
    base = {
        "age": float(p.age),
        "avg_glucose_level": float(p.avg_glucose_level),
        "bmi": float(p.bmi),

        "gender": normalize_category("gender", p.gender),
        "ever_married": normalize_category("ever_married", p.ever_married),
        "work_type": normalize_category("work_type", p.work_type),
        "Residence_type": normalize_category("Residence_type", p.Residence_type),
        "smoking_status": normalize_category("smoking_status", p.smoking_status),

        "hypertension": int(p.hypertension),
        "heart_disease": int(p.heart_disease),
    }

    if EXPECTED_COLUMNS is not None:
        if "log_avg_glucose_level" in EXPECTED_COLUMNS:
            base["log_avg_glucose_level"] = safe_log1p(p.avg_glucose_level)
        if "log_bmi" in EXPECTED_COLUMNS:
            base["log_bmi"] = safe_log1p(p.bmi)

        row = {c: base.get(c, np.nan) for c in EXPECTED_COLUMNS}
        return pd.DataFrame([row], columns=EXPECTED_COLUMNS)

    base["log_avg_glucose_level"] = safe_log1p(p.avg_glucose_level)
    base["log_bmi"] = safe_log1p(p.bmi)
    return pd.DataFrame([base])


def risk_level_from_prob(prob: float) -> str:
    if prob >= 0.60:
        return "HIGH"
    if prob >= 0.30:
        return "MEDIUM"
    return "LOW"


def pick_best_model(preferred: str, available: list[str]) -> str | None:
    """
    - Nếu preferred có trong list -> dùng preferred
    - Nếu không, ưu tiên các model "flash" trước (rẻ/nhanh), rồi tới model khác
    """
    if not available:
        return None

    if preferred in available:
        return preferred

    # ưu tiên flash / pro / bất kỳ
    flash = [m for m in available if "flash" in m.lower()]
    if flash:
        return flash[0]
    return available[0]


# ===================== STARTUP =====================
@app.on_event("startup")
def startup():
    global pipeline, EXPECTED_COLUMNS, PREPROCESS_STEP
    global chat_enabled, gemini_client, AVAILABLE_MODELS, GEMINI_MODEL_NAME

    # ---- Load ML model ----
    try:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

        pipeline = joblib.load(MODEL_PATH)

        if not hasattr(pipeline, "predict_proba"):
            raise RuntimeError(
                "Loaded model does not support predict_proba(). "
                "Please export a sklearn classifier pipeline with probability output."
            )

        EXPECTED_COLUMNS, PREPROCESS_STEP = infer_expected_columns(pipeline)

        print("✅ Model loaded:", MODEL_PATH)
        print("✅ Preprocess step:", PREPROCESS_STEP)
        print("✅ Expected columns:", EXPECTED_COLUMNS)
    except Exception as e:
        print("❌ Model load failed")
        print(traceback.format_exc())
        raise RuntimeError(f"Model load failed at {MODEL_PATH}: {e}")

    # ---- Init Gemini ----
    print("✅ GEMINI_API_KEY loaded?", bool(GEMINI_API_KEY))
    print("✅ dotenv used:", str(dotenv_local if dotenv_local.exists() else dotenv_default))

    if genai is None:
        chat_enabled = False
        gemini_client = None
        print("⚠️ Chat disabled: missing package 'google-genai' (pip install google-genai)")
        return

    if not GEMINI_API_KEY:
        chat_enabled = False
        gemini_client = None
        print("⚠️ Chat disabled: GEMINI_API_KEY not found in environment (.env.local/.env)")
        return

    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        chat_enabled = True
        print("✅ Chat enabled: google-genai ready")

        # List models để chọn đúng model thật sự available
        ms = gemini_client.models.list()
        AVAILABLE_MODELS = [m.name for m in ms]

        chosen = pick_best_model(GEMINI_MODEL_NAME, AVAILABLE_MODELS)
        if chosen is None:
            chat_enabled = False
            gemini_client = None
            print("⚠️ Chat disabled: no models available for this API key")
            return

        if chosen != GEMINI_MODEL_NAME:
            print(f"⚠️ Preferred model '{GEMINI_MODEL_NAME}' not available. Auto-selected: '{chosen}'")

        GEMINI_MODEL_NAME = chosen
        print("✅ Gemini model in use:", GEMINI_MODEL_NAME)

    except Exception:
        chat_enabled = False
        gemini_client = None
        print("⚠️ Chat disabled: Gemini init/list models failed")
        print(traceback.format_exc())
# ==================================================


# ===================== PREDICT =====================
@app.post("/predict")
def predict(p: PredictRequest):
    try:
        if pipeline is None:
            raise RuntimeError("Model is not loaded.")

        df = build_dataframe(p)
        prob = float(pipeline.predict_proba(df)[0][1])

        threshold = DEFAULT_THRESHOLD
        pred = int(prob >= threshold)

        return {
            "prediction": pred,
            "probability": round(prob, 4),
            "threshold_used": threshold,
            "riskLevel": risk_level_from_prob(prob),
        }

    except Exception as e:
        print("==== INFERENCE ERROR ====")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
# ==================================================


# ===================== HEALTH =====================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "threshold": DEFAULT_THRESHOLD,
        "expected_columns": EXPECTED_COLUMNS,
        "preprocess_step": PREPROCESS_STEP,
        "dotenv_used": str(
            dotenv_local if dotenv_local.exists()
            else (dotenv_default if dotenv_default.exists() else "")
        ),
    }


@app.get("/chat/health")
def chat_health():
    return {
        "status": "ok",
        "provider": "gemini",
        "enabled": chat_enabled,
        "has_api_key": bool(GEMINI_API_KEY),
        "has_sdk": bool(genai),
        "model_in_use": GEMINI_MODEL_NAME if chat_enabled else None,
        "available_models_count": len(AVAILABLE_MODELS),
        "dotenv_used": str(
            dotenv_local if dotenv_local.exists()
            else (dotenv_default if dotenv_default.exists() else "")
        ),
    }
# ==================================================


# ===================== CHAT =====================
@app.post("/chat")
def chat(req: ChatRequest):
    if not chat_enabled or gemini_client is None:
        raise HTTPException(
            status_code=503,
            detail="Chatbot is disabled. Check /chat/health and /chat/models."
        )

    try:
        resp = gemini_client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=req.message
        )
        return {"reply": getattr(resp, "text", "") or ""}
    except Exception as e:
        print("==== CHATBOT ERROR ====")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chatbot failed: {str(e)}")


@app.get("/chat/models")
def chat_models():
    if not chat_enabled or gemini_client is None:
        raise HTTPException(status_code=503, detail="Chatbot is disabled.")
    try:
        # trả luôn list đã cache từ startup (nhanh)
        return {"models": AVAILABLE_MODELS, "model_in_use": GEMINI_MODEL_NAME}
    except Exception as e:
        print("==== LIST MODELS ERROR ====")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
# ==================================================