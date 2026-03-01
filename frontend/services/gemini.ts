import type { PatientData, PredictionResult } from "../types";

/**
 * Frontend chỉ gọi backend FastAPI.
 * Backend chịu trách nhiệm giữ GEMINI_API_KEY và gọi Gemini.
 */
const API_URL =
  (import.meta as any).env?.VITE_API_URL?.toString()?.trim() || "http://127.0.0.1:8000";

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j?.detail || j?.message || JSON.stringify(j);
  } catch {
    try {
      return await res.text();
    } catch {
      return "Unknown error";
    }
  }
}

/**
 * Gọi model ML stroke predictor ở backend (/predict)
 * (Nếu frontend của bạn đang tính risk bằng Gemini thì nên chuyển qua backend /predict để nhất quán)
 */
export async function predictStrokeRisk(data: PatientData): Promise<PredictionResult> {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      age: data.age,
      avg_glucose_level: data.avg_glucose_level,
      bmi: data.bmi,
      gender: data.gender,
      ever_married: data.ever_married,
      work_type: data.work_type,
      Residence_type: data.residence_type, // backend đang dùng key "Residence_type"
      smoking_status: data.smoking_status,
      hypertension: data.hypertension ? 1 : 0,
      heart_disease: data.heart_disease ? 1 : 0,
    }),
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`Predict API error ${res.status}: ${detail}`);
  }

  // Backend của bạn trả: prediction, probability, threshold_used, riskLevel
  const j = await res.json();

  // Nếu type PredictionResult của bạn khác, bạn có thể map lại cho khớp UI
  // Mình cố gắng trả về theo PredictionResult hiện có của bạn (nếu cần bạn gửi type, mình chỉnh chuẩn)
  const prob = typeof j?.probability === "number" ? j.probability : 0;
  const riskScore = Math.round(prob * 100);

  return {
    riskScore,
    riskLevel: j?.riskLevel ?? (riskScore >= 60 ? "High" : riskScore >= 30 ? "Moderate" : "Low"),
    explanation:
      "This score is computed by the backend clinical model. It is not a substitute for professional medical advice.",
    topTriggers: [],
    recommendations: [],
  } as unknown as PredictionResult;
}

export type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

/**
 * Chatbot: gọi backend (/chat). Backend sẽ gọi Gemini.
 * history: backend hiện chưa dùng, nhưng giữ param để UI không phải sửa nhiều.
 */
export async function chatWithAssistant(message: string, _history: ChatHistoryItem[] = []) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(`Chat API error ${res.status}: ${detail}`);
  }

  const j = await res.json();
  return (j?.reply ?? "").toString();
}