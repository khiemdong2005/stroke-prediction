export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum MaritalStatus {
  MARRIED = 'married',
  NOT_MARRIED = 'not_married'
}

export enum ResidenceType {
  URBAN = 'urban',
  RURAL = 'rural'
}

export enum EmploymentType {
  PRIVATE = 'private',
  SELF_EMPLOYED = 'self_employed',
  GOVT_JOB = 'govt_job',
  CHILDREN = 'children',
  NEVER_WORKED = 'never_worked'
}

export enum SmokingStatus {
  NEVER = 'never',
  FORMERLY = 'formerly',
  SMOKES = 'smokes',
  UNKNOWN = 'unknown'
}

export interface PatientData {
  age: number
  gender: Gender
  hypertension: boolean
  heart_disease: boolean
  ever_married: MaritalStatus
  work_type: EmploymentType
  residence_type: ResidenceType
  avg_glucose_level: number
  bmi: number
  smoking_status: SmokingStatus
}

/* kết quả AI prediction */
export interface PredictionResult {
  riskScore: number
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical'
  explanation: string
  topTriggers: string[]
  recommendations: string[]
}

/* record lưu trong dashboard / history */
export interface ClinicalRecord extends PatientData {
  id: string
  timestamp: number

  riskScore: number
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical'

  engine: 'gemini' | 'custom'

  /* thêm field này để fix lỗi */
  stroke: 0 | 1
}