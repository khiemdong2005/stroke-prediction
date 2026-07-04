import React, { useMemo, useState, useRef, useEffect } from "react";
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

function mapRiskLevelFromBackend(
  level: string
): "Low" | "Moderate" | "High" | "Critical" {
  const v = String(level || "").toUpperCase();
  if (v === "LOW") return "Low";
  if (v === "MEDIUM") return "Moderate";
  if (v === "HIGH") return "High";
  return "Moderate";
}

function toLowerText(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function mapSmokingToBackend(v: unknown): string {
  const x = toLowerText(v);
  if (x === "never") return "never smoked";
  if (x === "formerly") return "formerly smoked";
  if (x === "smokes") return "smokes";
  if (x === "unknown") return "unknown";
  if (x === "never smoked") return "never smoked";
  if (x === "formerly smoked") return "formerly smoked";
  return x;
}

function onlyDigits(s: string): string {
  return s.replace(/[^0-9]/g, "");
}

function toIntSafe(s: string, fallback = 0): number {
  const cleaned = onlyDigits(s);
  if (!cleaned) return fallback;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatSafe(s: string, fallback = 0): number {
  if (!s.trim()) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

type BackendPredictPayload = {
  age: number;
  avg_glucose_level: number;
  bmi: number;
  gender: string;
  hypertension: 0 | 1;
  heart_disease: 0 | 1;
  ever_married: "yes" | "no";
  work_type: string;
  Residence_type: string;
  smoking_status: string;
};

type BackendPredictResponse = {
  prediction: number;
  probability: number;
  threshold_used?: number;
  riskLevel: string;
  riskScore?: number;
  engine?: string;
  explanation?: string;
  topTriggers?: string[];
  recommendations?: string[];
};

const CustomDropdown = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || "";

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-14 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-white px-5 font-bold flex items-center justify-between cursor-pointer hover:border-primary hover:shadow-sm transition-all"
      >
        <span className="text-slate-700 dark:text-slate-200">
          {selectedLabel}
        </span>
        <span
          className={`material-symbols-outlined transition-transform duration-300 ${
            isOpen ? "rotate-180 text-primary" : "text-slate-400"
          }`}
        >
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-5 py-3.5 cursor-pointer font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                value === option.value
                  ? "bg-primary/5 text-primary"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PredictionPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [height, setHeight] = useState<number>(170);
  const [weight, setWeight] = useState<number>(70);
  const [heightInput, setHeightInput] = useState<string>("");
  const [weightInput, setWeightInput] = useState<string>("");
  const [glucoseInput, setGlucoseInput] = useState<string>("");

    const [formData, setFormData] = useState<PatientData>({
      age: 0,
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

  const currentBMI = useMemo(() => {
    const h = Math.max(height, 0.1);
    const w = Math.max(weight, 0);
    const bmiVal = w / (h / 100) ** 2;
    return Number.isFinite(bmiVal) ? parseFloat(bmiVal.toFixed(1)) : 0;
  }, [height, weight]);

  const saveRecord = (
    backendResult: BackendPredictResponse,
    data: PatientData
  ) => {
    const existing = localStorage.getItem("stroke_ai_records") || "[]";
    let records: any[] = [];

    try {
      records = JSON.parse(existing);
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }

    const newRecord = {
      id: `pred_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`,

      gender: String(data.gender),
      age: Number(data.age),
      hypertension: data.hypertension ? 1 : 0,
      heart_disease: data.heart_disease ? 1 : 0,
      ever_married:
        data.ever_married === MaritalStatus.MARRIED ? "Yes" : "No",
      work_type: String(data.work_type),
      Residence_type: String(data.residence_type),
      avg_glucose_level: Number(data.avg_glucose_level),
      bmi: Number(data.bmi),
      smoking_status: mapSmokingToBackend(data.smoking_status),
      stroke: Number(backendResult.prediction ?? 0),

      riskLevel: mapRiskLevelFromBackend(
        backendResult.riskLevel ?? "MEDIUM"
      ),
      riskScore:
        typeof backendResult.riskScore === "number"
          ? backendResult.riskScore
          : Math.round(Number(backendResult.probability ?? 0) * 100),
      probability: Number(backendResult.probability ?? 0),
      engine: backendResult.engine ?? "FASTAPI_JOBLIB",
      timestamp: Date.now(),
    };

    console.log("Saving prediction record:", newRecord);

    records.unshift(newRecord);
    localStorage.setItem(
      "stroke_ai_records",
      JSON.stringify(records.slice(0, 100))
    );
    window.dispatchEvent(new Event("storage"));
  };

  function buildBackendPayload(
    data: PatientData,
    bmi: number
  ): BackendPredictPayload {
    return {
      age: Number(data.age),
      avg_glucose_level: Number(data.avg_glucose_level),
      bmi: Number(bmi),
      gender: toLowerText(data.gender),
      hypertension: data.hypertension ? 1 : 0,
      heart_disease: data.heart_disease ? 1 : 0,
      ever_married:
        data.ever_married === MaritalStatus.MARRIED ? "yes" : "no",
      work_type: toLowerText(data.work_type),
      Residence_type: toLowerText(data.residence_type),
      smoking_status: mapSmokingToBackend(data.smoking_status),
    };
  }

  async function predictViaBackend(
    payload: BackendPredictPayload
  ): Promise<BackendPredictResponse> {
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

    // Kiểm tra required fields
    if (formData.age === 0 || glucoseInput.trim() === '' || heightInput.trim() === '' || weightInput.trim() === '') {
      setError("Vui lòng nhập đầy đủ Age, Glucose, Height, Weight.");
      return;
    }

    if (formData.age < 1 || formData.avg_glucose_level < 50) {
      setError("Please check Age and Glucose values.");
      return;
    }

    if (height <= 0 || weight <= 0) {
      setError("Please enter valid Height and Weight.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const currentData: PatientData = { ...formData, bmi: currentBMI };
    const payload = buildBackendPayload(currentData, currentBMI);

    try {
      const backendResult = await predictViaBackend(payload);
      const uiRisk = mapRiskLevelFromBackend(backendResult.riskLevel);

      const uiResult = {
        prediction: Number(backendResult.prediction ?? 0),
        riskLevel: uiRisk,
        riskScore:
          typeof backendResult.riskScore === "number"
            ? backendResult.riskScore
            : Math.round(Number(backendResult.probability ?? 0) * 100),
        probability: Number(backendResult.probability ?? 0),
        engine: backendResult.engine ?? "FASTAPI_JOBLIB",
        explanation:
          backendResult.explanation ??
          (uiRisk === "High"
            ? "High risk. Specialist consultation and close cardiovascular monitoring are highly recommended."
            : uiRisk === "Moderate"
            ? "Moderate risk. Lifestyle modifications and regular health tracking are required."
            : "Low risk. Maintain a healthy lifestyle and schedule routine check-ups."),
        topTriggers: backendResult.topTriggers ?? ["Age", "Glucose", "BMI"],
        recommendations:
          backendResult.recommendations ?? [
            "Monitor blood pressure daily.",
            "Limit sodium/sugar intake, increase vegetables.",
            "Exercise for at least 20 minutes daily.",
          ],
      };

      setResult(uiResult);
      saveRecord(backendResult, currentData);
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
              <span className="text-slate-600 dark:text-slate-200">
                {result.engine}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start transition-all duration-500">
        <div className="glass-card p-10 rounded-[3rem] shadow-2xl border-white/40">
          <form onSubmit={handleSubmit} className="space-y-10">
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
                    type="number"
                    min="0"
                    max="200"
                    value={formData.age || ""}
                    onChange={(e) => {
                      const val = toIntSafe(e.target.value);
                      setFormData({ ...formData, age: val });
                    }}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-white px-5 font-bold focus:ring-4 ring-primary/10 outline-none transition-all hover:border-primary"
                    placeholder="e.g. 45"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Biological Gender
                  </label>
                  <CustomDropdown
                    value={formData.gender}
                    options={[
                      { label: "Male", value: Gender.MALE },
                      { label: "Female", value: Gender.FEMALE },
                    ]}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        gender: val as Gender,
                      })
                    }
                  />
                </div>
              </div>
            </div>

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
                    type="number"
                    step="0.1"
                    min="50"
                    max="300"
                    value={glucoseInput}
                    onChange={(e) => setGlucoseInput(e.target.value)}
                    onBlur={() => {
                      const val = parseFloatSafe(glucoseInput, 0);
                      if (val === 0 && glucoseInput.trim() === '') {
                        // Giữ trống, dùng formData default
                      } else if (val < 50) {
                        setError("Glucose phải ≥ 50 mg/dL");
                      } else {
                        setFormData({ ...formData, avg_glucose_level: val });
                        setGlucoseInput(Number.isInteger(val) ? val.toString() : val.toFixed(1));
                      }
                    }}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-white px-5 font-bold focus:ring-4 ring-primary/10 outline-none transition-all hover:border-primary"
                    placeholder="e.g. 95.5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="100"
                    max="250"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    onBlur={() => {
                      const val = parseFloatSafe(heightInput, 0);
                      if (val === 0 && heightInput.trim() === '') {
                        // Giữ trống, dùng height state default  
                      } else if (val < 100) {
                        setError("Height phải ≥ 100 cm");
                      } else if (val > 250) {
                        setError("Height phải ≤ 250 cm");
                      } else {
                        setHeight(val);
                        setHeightInput(Number.isInteger(val) ? val.toString() : val.toFixed(1));
                      }
                    }}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-white px-5 font-bold focus:ring-4 ring-primary/10 outline-none transition-all hover:border-primary"
                    placeholder="e.g. 170.5"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="200"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    onBlur={() => {
                      const val = parseFloatSafe(weightInput, 0);
                      if (val === 0 && weightInput.trim() === '') {
                        // Giữ trống, dùng weight state default
                      } else if (val < 30) {
                        setError("Weight phải ≥ 30 kg");
                      } else if (val > 200) {
                        setError("Weight phải ≤ 200 kg");
                      } else {
                        setWeight(val);
                        setWeightInput(Number.isInteger(val) ? val.toString() : val.toFixed(1));
                      }
                    }}
                    className="w-full h-14 rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-white px-5 font-bold focus:ring-4 ring-primary/10 outline-none transition-all hover:border-primary"
                    placeholder="e.g. 70.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Work Type
                  </label>
                  <CustomDropdown
                    value={formData.work_type}
                    options={[
                      { label: "Private", value: EmploymentType.PRIVATE },
                      {
                        label: "Self-employed",
                        value: EmploymentType.SELF_EMPLOYED,
                      },
                      { label: "Govt Job", value: EmploymentType.GOVT_JOB },
                      { label: "Children", value: EmploymentType.CHILDREN },
                      {
                        label: "Never Worked",
                        value: EmploymentType.NEVER_WORKED,
                      },
                    ]}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        work_type: val as EmploymentType,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Residence
                  </label>
                  <CustomDropdown
                    value={formData.residence_type}
                    options={[
                      { label: "Urban", value: ResidenceType.URBAN },
                      { label: "Rural", value: ResidenceType.RURAL },
                    ]}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        residence_type: val as ResidenceType,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                    Ever Married
                  </label>
                  <CustomDropdown
                    value={formData.ever_married}
                    options={[
                      { label: "Married", value: MaritalStatus.MARRIED },
                      {
                        label: "Not married",
                        value: MaritalStatus.NOT_MARRIED,
                      },
                    ]}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        ever_married: val as MaritalStatus,
                      })
                    }
                  />
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

            <div className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                  3
                </span>
                Behavioral Profile
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <CustomDropdown
                  value={formData.smoking_status}
                  options={[
                    { label: "Never smoked", value: SmokingStatus.NEVER },
                    { label: "Smokes", value: SmokingStatus.SMOKES },
                    {
                      label: "Formerly smoked",
                      value: SmokingStatus.FORMERLY,
                    },
                    { label: "Unknown", value: SmokingStatus.UNKNOWN },
                  ]}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      smoking_status: val as SmokingStatus,
                    })
                  }
                />

                <div className="bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/20">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-primary uppercase tracking-tighter">
                      Automatic BMI
                    </p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">
                      {currentBMI}
                    </p>
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
                  <span className="material-symbols-outlined">
                    psychology
                  </span>
                  <span>PREDICT STROKE RISK</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="sticky top-32">
          <div className="animate-in fade-in duration-500">
            <div
              className={`glass-card p-12 rounded-[4rem] border-l-[24px] shadow-2xl transition-all duration-500 ${
                loading
                  ? "border-l-blue-400 opacity-80 scale-[0.98]"
                  : !result
                  ? "border-l-slate-200 dark:border-l-slate-700 opacity-70"
                  : result.riskLevel === "Low"
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
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">
                    {loading
                      ? "Processing..."
                      : !result
                      ? "Status: Standby"
                      : "Inference Complete"}
                  </p>
                  <h3
                    className={`font-black uppercase tracking-tighter transition-all duration-300 ${
                      loading
                        ? "text-5xl text-blue-500 animate-pulse"
                        : !result
                        ? "text-5xl text-slate-300 dark:text-slate-600"
                        : "text-7xl text-slate-900 dark:text-white"
                    }`}
                  >
                    {loading
                      ? "CALCULATING..."
                      : !result
                      ? "AWAITING DATA"
                      : result.riskLevel}
                  </h3>
                </div>

                <div className="size-24 rounded-3xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700 transition-all duration-300">
                  <span
                    className={`font-black ${
                      loading || !result
                        ? "text-3xl text-slate-300"
                        : "text-3xl text-primary"
                    }`}
                  >
                    {loading
                      ? "..."
                      : !result
                      ? "--%"
                      : typeof result.probability === "number"
                      ? `${(result.probability * 100).toFixed(2)}%`
                      : `${result.riskScore}%`}
                  </span>
                  <span className="text-[8px] font-black text-slate-400 uppercase">
                    Probability
                  </span>
                </div>
              </div>

              <div className="space-y-10">
                <p
                  className={`text-2xl font-black leading-[1.3] transition-colors duration-300 ${
                    !result || loading
                      ? "text-slate-300 dark:text-slate-600 italic"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  "
                  {loading
                    ? "System is invoking the AI model to analyze patient data..."
                    : !result
                    ? "Please enter patient information and click predict to view the assessment."
                    : result.explanation}
                  "
                </p>

                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100 dark:border-slate-800 transition-opacity duration-300 ${
                    !result || loading ? "opacity-50" : "opacity-100"
                  }`}
                >
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        troubleshoot
                      </span>
                      Primary Drivers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {loading || !result ? (
                        <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-tight">
                          --
                        </span>
                      ) : (
                        result.topTriggers?.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-tight"
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        assignment_turned_in
                      </span>
                      Clinical Plan
                    </h4>
                    <ul className="space-y-3">
                      {loading || !result ? (
                        <li className="flex gap-3 text-[11px] font-bold text-slate-400">
                          <span
                            className={`size-1.5 rounded-full mt-1.5 shrink-0 ${
                              loading
                                ? "bg-blue-400 animate-ping"
                                : "bg-slate-300"
                            }`}
                          ></span>
                          {loading
                            ? "Processing results..."
                            : "Awaiting data for analysis..."}
                        </li>
                      ) : (
                        result.recommendations?.map(
                          (r: string, i: number) => (
                            <li
                              key={i}
                              className="flex gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-300"
                            >
                              <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0"></span>
                              {r}
                            </li>
                          )
                        )
                      )}
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
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;