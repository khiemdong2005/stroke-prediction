import React, { useMemo, useState } from "react";
import {
  Gender,
  MaritalStatus,
  EmploymentType,
  ResidenceType,
  SmokingStatus,
  PatientData,
  ClinicalRecord,
} from "../types";

const API_BASE = "http://127.0.0.1:8000";

/** Backend trả HIGH/MEDIUM/LOW -> map về UI dùng High/Moderate/Low */
function mapRiskLevelFromBackend(level: string): "Low" | "Moderate" | "High" | "Critical" {
  const v = String(level || "").toUpperCase();
  if (v === "LOW") return "Low";
  if (v === "MEDIUM") return "Moderate";
  if (v === "HIGH") return "High";
  return "Moderate";
}

/** Convert enum/string sang lowercase text backend build_dataframe đang norm_text() */
function toLowerText(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

/** Map smoking enum/UI text -> backend text chuẩn dataset */
function mapSmokingToBackend(v: any): string {
  const x = toLowerText(v);
  if (x === "never") return "never smoked";
  if (x === "formerly") return "formerly smoked";
  if (x === "smokes") return "smokes";
  if (x === "unknown") return "unknown";
  if (x === "never smoked") return "never smoked";
  if (x === "formerly smoked") return "formerly smoked";
  return x;
}

/** Helpers để input gõ thoải mái */
function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}
function toIntSafe(s: string, fallback = 0) {
  const cleaned = onlyDigits(s);
  if (!cleaned) return fallback;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Payload đúng theo backend FastAPI hiện tại của bạn */
type BackendPredictPayload = {
  age: number;
  avg_glucose_level: number;
  bmi: number;

  gender: string;
  hypertension: 0 | 1;
  heart_disease: 0 | 1;
  ever_married: "yes" | "no";
  work_type: string;

  // backend đang dùng Residence_type (R hoa)
  Residence_type: string;

  smoking_status: string;
};

type BackendPredictResponse = {
  riskLevel: string;
  probability: number;
  riskScore: number;
  engine?: string;
  explanation?: string;
  topTriggers?: string[];
  recommendations?: string[];
};

const PredictionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(70);

  const [formData, setFormData] = useState<PatientData>({
    age: 45,
    gender: Gender.MALE,
    hypertension: false,
    heart_disease: false,
    ever_married: MaritalStatus.MARRIED,
    work_type: EmploymentType.PRIVATE,
    residence_type: ResidenceType.URBAN,
    avg_glucose_level: 95,
    bmi: 24.2,
    smoking_status: SmokingStatus.NEVER,
  });

  // auto BMI
  const currentBMI = useMemo(() => {
    if (!height || height <= 0) return 0;
    const bmiVal = weight / (height / 100) ** 2;
    return Number.isFinite(bmiVal) ? parseFloat(bmiVal.toFixed(1)) : 0;
  }, [height, weight]);

  const saveRecord = (res: any, data: PatientData) => {
    const existing = localStorage.getItem("stroke_ai_records");
    const records: ClinicalRecord[] = existing ? JSON.parse(existing) : [];

    const newRecord: ClinicalRecord = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      riskLevel: res.riskLevel,
      riskScore: res.riskScore,
      engine: res.engine ?? "FASTAPI_JOBLIB",
    };

    records.push(newRecord);
    localStorage.setItem("stroke_ai_records", JSON.stringify(records));
    window.dispatchEvent(new Event("storage"));
  };

  function buildBackendPayload(data: PatientData, bmi: number): BackendPredictPayload {
    return {
      age: Number(data.age),
      avg_glucose_level: Number(data.avg_glucose_level),
      bmi: Number(bmi),

      gender: toLowerText(data.gender),
      hypertension: data.hypertension ? 1 : 0,
      heart_disease: data.heart_disease ? 1 : 0,

      ever_married: data.ever_married === MaritalStatus.MARRIED ? "yes" : "no",

      work_type: toLowerText(data.work_type),
      Residence_type: toLowerText((data as any).residence_type),

      smoking_status: mapSmokingToBackend(data.smoking_status),
    };
  }

  async function predictViaBackend(payload: BackendPredictPayload): Promise<BackendPredictResponse> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Backend ${res.status}: ${text}`);
    }

    return await res.json();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const currentData: PatientData = { ...formData, bmi: currentBMI };
    const payload = buildBackendPayload(currentData, currentBMI);

    try {
      const backendResult = await predictViaBackend(payload);
      const uiRisk = mapRiskLevelFromBackend(backendResult.riskLevel);

      const uiResult = {
        riskLevel: uiRisk,
        riskScore: backendResult.riskScore,
        probability: backendResult.probability,
        engine: backendResult.engine ?? "FASTAPI_JOBLIB",

        explanation:
          backendResult.explanation ??
          (uiRisk === "High"
            ? "Nguy cơ cao. Nên khám chuyên khoa và theo dõi sát các chỉ số tim mạch."
            : uiRisk === "Moderate"
            ? "Nguy cơ trung bình. Cần điều chỉnh lối sống và theo dõi các chỉ số."
            : "Nguy cơ thấp. Duy trì lối sống lành mạnh và theo dõi định kỳ."),
        topTriggers: backendResult.topTriggers ?? ["Age", "Glucose", "BMI"],
        recommendations:
          backendResult.recommendations ?? [
            "Theo dõi huyết áp hằng ngày.",
            "Hạn chế muối/đường, tăng rau xanh.",
            "Tập thể dục ít nhất 20 phút mỗi ngày.",
          ],
      };

      setResult(uiResult);
      saveRecord(uiResult, currentData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Không gọi được backend /predict.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 font-manrope">
      <div className="text-center mb-16">
        <h1 className="text-5xl lg:text-7xl font-black dark:text-white mb-4 tracking-tighter">
          StrokeAI <span className="text-primary">Engine</span>
        </h1>

        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.5em]">
            Clinical Logistic Regression Model v2.4
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-widest uppercase">
            <span className="size-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
            Backend Processing: Enabled
          </div>

          {result?.engine && (
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Engine:{" "}
              <span className="text-slate-600 dark:text-slate-200">{result.engine}</span>
            </p>
          )}
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${
          result || loading ? "lg:grid-cols-2" : "max-w-4xl mx-auto"
        } gap-12 items-start transition-all duration-500`}
      >
        {/* Input Card */}
        <div className="glass-card p-10 rounded-[3rem] shadow-2xl border-white/40">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Section 1 */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                  1
                </span>
                Patient Demographics
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Current Age
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(formData.age ?? "")}
                    onChange={(e) =>
                      setFormData({ ...formData, age: toIntSafe(e.target.value, 0) })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-5 font-bold focus:ring-4 ring-primary/10 outline-none"
                    placeholder="e.g. 45"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Biological Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as Gender,
                      })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-5 font-bold"
                  >
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                  2
                </span>
                Biometric Markers
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Glucose (mg/dL)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(formData.avg_glucose_level ?? "")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avg_glucose_level: toIntSafe(e.target.value, 0),
                      })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                    placeholder="e.g. 95"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Height (cm)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(height ?? "")}
                    onChange={(e) => setHeight(toIntSafe(e.target.value, 0))}
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                    placeholder="e.g. 170"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(weight ?? "")}
                    onChange={(e) => setWeight(toIntSafe(e.target.value, 0))}
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                    placeholder="e.g. 70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Work Type
                  </label>
                  <select
                    value={formData.work_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        work_type: e.target.value as EmploymentType,
                      })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                  >
                    <option value={EmploymentType.PRIVATE}>Private</option>
                    <option value={EmploymentType.SELF_EMPLOYED}>Self-employed</option>
                    <option value={EmploymentType.GOVT_JOB}>Govt_job</option>
                    <option value={EmploymentType.CHILDREN}>children</option>
                    <option value={EmploymentType.NEVER_WORKED}>Never_worked</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Residence
                  </label>
                  <select
                    value={formData.residence_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        residence_type: e.target.value as ResidenceType,
                      })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                  >
                    <option value={ResidenceType.URBAN}>Urban</option>
                    <option value={ResidenceType.RURAL}>Rural</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Ever Married
                  </label>
                  <select
                    value={formData.ever_married}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ever_married: e.target.value as MaritalStatus,
                      })
                    }
                    className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-4 font-bold"
                  >
                    <option value={MaritalStatus.MARRIED}>Married</option>
                    <option value={MaritalStatus.NOT_MARRIED}>Not married</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      hypertension: !formData.hypertension,
                    })
                  }
                  className={`h-16 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${
                    formData.hypertension
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  Hypertension
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      heart_disease: !formData.heart_disease,
                    })
                  }
                  className={`h-16 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${
                    formData.heart_disease
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                      : "bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-400"
                  }`}
                >
                  Heart Disease
                </button>
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                  3
                </span>
                Behavioral Profile
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={formData.smoking_status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      smoking_status: e.target.value as SmokingStatus,
                    })
                  }
                  className="w-full h-14 rounded-2xl border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:text-white px-5 font-bold"
                >
                  <option value={SmokingStatus.NEVER}>Never smoked</option>
                  <option value={SmokingStatus.SMOKES}>Smokes</option>
                  <option value={SmokingStatus.FORMERLY}>Formerly smoked</option>
                  <option value={SmokingStatus.UNKNOWN}>Unknown</option>
                </select>

                <div className="bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-primary uppercase tracking-tighter">
                      Automatic BMI
                    </p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{currentBMI}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 rounded-3xl bg-primary text-white font-black text-xl shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="size-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>RUNNING BACKEND MODEL...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">psychology</span>
                  <span>PREDICT STROKE RISK</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Sticky Card */}
        <div className="sticky top-32">
          {!result && !loading && (
            <div className="glass-card p-16 rounded-[4rem] text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[500px]">
              <span className="material-symbols-outlined text-7xl text-slate-200 mb-6">
                analytics
              </span>
              <h3 className="text-2xl font-black text-slate-300">Awaiting Simulation</h3>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">
                Model standby for patient data
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-card p-16 rounded-[4rem] text-center flex flex-col items-center justify-center min-h-[500px]">
              <div className="relative mb-10">
                <span className="material-symbols-outlined text-9xl text-primary animate-pulse">
                  model_training
                </span>
                <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full"></div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Calculating Probability
              </h3>
              <p className="text-slate-400 font-bold mt-2 text-[10px] uppercase tracking-[0.3em]">
                Calling /predict on FastAPI
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="animate-in fade-in slide-in-from-bottom-20 duration-500">
              <div
                className={`glass-card p-12 rounded-[4rem] border-l-[24px] shadow-2xl ${
                  result.riskLevel === "Low"
                    ? "border-l-emerald-500"
                    : result.riskLevel === "Moderate"
                    ? "border-l-amber-400"
                    : result.riskLevel === "High"
                    ? "border-l-orange-500"
                    : "border-l-red-600"
                }`}
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                      Inference Complete
                    </p>
                    <h3 className="text-7xl font-black uppercase text-slate-900 dark:text-white tracking-tighter">
                      {result.riskLevel}
                    </h3>
                  </div>

                  <div className="size-24 rounded-3xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700">
                    <span className="text-3xl font-black text-primary">
                      {typeof result.probability === "number"
                        ? `${(result.probability * 100).toFixed(2)}%`
                        : `${result.riskScore}%`}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">
                      Probability
                    </span>
                  </div>
                </div>

                <div className="space-y-10">
                  <p className="text-2xl font-black text-slate-700 dark:text-slate-200 leading-[1.3]">
                    "{result.explanation}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">troubleshoot</span>
                        Primary Drivers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.topTriggers?.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tight"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                        Clinical Plan
                      </h4>
                      <ul className="space-y-3">
                        {result.recommendations?.map((r: string, i: number) => (
                          <li
                            key={i}
                            className="flex gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-300"
                          >
                            <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 inline-block px-6 py-2 rounded-full">
                  Mathematical Model Source: Clinical Stroke Datasets
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;
