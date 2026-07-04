import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Legend,
  Cell,
} from 'recharts';
import {
  ClinicalRecord,
  Gender,
  MaritalStatus,
  EmploymentType,
  ResidenceType,
  SmokingStatus,
} from '../types';



const COLORS = {
  stroke: '#ef4444',
  nonStroke: '#3b82f6',
  neutral: '#94a3b8',
  green: '#10b981',
  amber: '#f59e0b',
};

const AGE_GROUPS = [
  { label: '0-20', min: 0, max: 20 },
  { label: '21-40', min: 21, max: 40 },
  { label: '41-60', min: 41, max: 60 },
  { label: '61-80', min: 61, max: 80 },
  { label: '80+', min: 81, max: 200 },
];

const DashboardPage: React.FC = () => {
const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

const loadRecords = () => {
  const saved = localStorage.getItem('stroke_ai_records');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const normalized = Array.isArray(parsed)
        ? parsed.map((item) => ({
            ...item,
            stroke: toStrokeNumber(item.stroke ?? item.prediction),
          }))
        : [];
      setRecords(normalized);
    } catch {
      setRecords([]);
    }
  } else {
    setRecords([]);
  }
};

  useEffect(() => {
    loadRecords();
    window.addEventListener('storage', loadRecords);
    return () => window.removeEventListener('storage', loadRecords);
  }, []);

const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    
    const term = searchTerm.toLowerCase();
    return records.filter(r => 
      String(r.id).toLowerCase().includes(term) ||
      r.gender.toLowerCase().includes(term) ||
      String(r.age).includes(term)
    );
  }, [records, searchTerm]);

  const normalizeGender = (value?: string): Gender => {
    const v = value?.trim().toLowerCase();
    if (v === 'male') return Gender.MALE;
    if (v === 'female') return Gender.FEMALE;
    return Gender.OTHER;
  };

  const normalizeSmokingStatus = (value?: string): SmokingStatus => {
    const v = value?.trim().toLowerCase();
    if (v === 'never smoked') return SmokingStatus.NEVER;
    if (v === 'formerly smoked') return SmokingStatus.FORMERLY;
    if (v === 'smokes') return SmokingStatus.SMOKES;
    return SmokingStatus.UNKNOWN;
  };

  const normalizeResidence = (value?: string): ResidenceType => {
    const v = value?.trim().toLowerCase();
    return v === 'rural' ? ResidenceType.RURAL : ResidenceType.URBAN;
  };

  const normalizeWorkType = (value?: string): EmploymentType => {
    const v = value?.trim().toLowerCase();
    if (v === 'self-employed') return EmploymentType.SELF_EMPLOYED;
    if (v === 'govt_job') return EmploymentType.GOVT_JOB;
    if (v === 'children') return EmploymentType.CHILDREN;
    if (v === 'never_worked') return EmploymentType.NEVER_WORKED;
    return EmploymentType.PRIVATE;
  };

  const safeNumber = (value?: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
const toStrokeNumber = (value: unknown): 0 | 1 => {
  if (value === 1 || value === true) return 1;
  if (value === 0 || value === false) return 0;

  const v = String(value ?? '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'stroke' || v === 'high') return 1;
  return 0;
};
  const parseCSV = (csvText: string): ClinicalRecord[] => {
    const lines = csvText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    return lines.slice(1).map((line, idx) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      // Enhanced stroke parsing for display values
      const strokeVal = row.stroke ? String(row.stroke).trim().toLowerCase() : '';
      const isStroke = toStrokeNumber(strokeVal) === 1 || strokeVal === 'stroke' || strokeVal === '1';

      return {
        id: row.id ?? `csv_${Date.now()}_${idx}`,
        age: safeNumber(row.age),
        gender: normalizeGender(row.gender),
        hypertension: row.hypertension === '1' || row.hypertension?.toLowerCase() === 'yes',
        heart_disease: row.heart_disease === '1' || row.heart_disease?.toLowerCase() === 'yes',
        ever_married:
          row.ever_married.toLowerCase() === 'yes'
            ? MaritalStatus.MARRIED
            : MaritalStatus.NOT_MARRIED,
        work_type: normalizeWorkType(row.work_type),
        residence_type: normalizeResidence(row.residence_type),
        avg_glucose_level: safeNumber(row.avg_glucose_level),
        bmi: safeNumber(row.bmi),
        smoking_status: normalizeSmokingStatus(row.smoking_status),
        stroke: isStroke ? 1 : 0,
        riskLevel: isStroke ? 'High' : 'Low',
        riskScore: isStroke ? 85 : 15,
        timestamp: Date.now(),
        engine: 'custom'
      } as ClinicalRecord;
          });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let newItems: ClinicalRecord[] = [];

        if (file.name.endsWith('.csv')) {
          newItems = parseCSV(content);
        } else {
          const parsed = JSON.parse(content);
newItems = Array.isArray(parsed)
  ? parsed.map((item) => ({
      ...item,
      stroke: toStrokeNumber(item.stroke ?? item.prediction),
    }))
  : [];
        }

        const updatedRecords = [...records, ...newItems];
        setRecords(updatedRecords);
        localStorage.setItem('stroke_ai_records', JSON.stringify(updatedRecords));
        alert(`Imported ${newItems.length} records successfully.`);
      } catch {
        alert('Error parsing file. Please upload a valid CSV or JSON.');
      }
    };

    reader.readAsText(file);
  };

  
const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No data to export!');
      return;
    }

    // Chỉ định chính xác các cột muốn xuất ra dựa theo bảng Patient Monitoring
    // EXACT FastAPI schema for perfect roundtrip
    const csvHeaders = ['id','gender','age','hypertension','heart_disease','ever_married','work_type','Residence_type','avg_glucose_level','bmi','smoking_status','stroke'];
    const csvRows = [];
    
    csvRows.push(csvHeaders.join(','));
    
    for (const row of filteredRecords) {
      const values = csvHeaders.map(key => {
        let val: any = (row as any)[key] ?? '';
        
        // Raw 0/1 for booleans, numbers direct, enums stringified
        if (key === 'hypertension' || key === 'heart_disease' || key === 'stroke') {
          val = Number(val) === 1 ? '1' : '0';
        } else if (typeof val === 'boolean') {
          val = val ? '1' : '0';
        } else if (typeof val === 'number' && !Number.isFinite(val)) {
          val = '';
        } else {
          val = String(val);
        }
        
        if (val.includes(',')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }
    
    // 3. Tạo file và tự động tải xuống
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stroke_data_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Precompute stroke groups for performance
  const { strokeRecords, nonStrokeRecords } = useMemo(() => {
    const stroke: ClinicalRecord[] = [];
    const nonStroke: ClinicalRecord[] = [];
    for (const r of filteredRecords) {
      if (r.stroke === 1) stroke.push(r);
      else nonStroke.push(r);
    }
    return { strokeRecords: stroke, nonStrokeRecords: nonStroke };
  }, [filteredRecords]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) {
      return {
        total: 0,
        strokeCases: 0,
        strokeRate: '0.0',
        avgBmi: '0.0',
        avgGlucose: '0.0',
      };
    }

    const strokeCases = strokeRecords.length;
    const avgBmi =
      filteredRecords.reduce((sum, r) => sum + (r.bmi || 0), 0) / total;
    const avgGlucose =
      filteredRecords.reduce((sum, r) => sum + (r.avg_glucose_level || 0), 0) /
      total;

    return {
      total,
      strokeCases,
      strokeRate: ((strokeCases / total) * 100).toFixed(2),
      avgBmi: avgBmi.toFixed(2),
      avgGlucose: avgGlucose.toFixed(2),
    };
  }, [filteredRecords, strokeRecords.length]);

  const distributionData = useMemo(() => {
    return [
      {
        name: 'Stroke',
        value: strokeRecords.length,
        color: COLORS.stroke,
      },
      {
        name: 'No Stroke',
        value: nonStrokeRecords.length,
        color: COLORS.nonStroke,
      },
    ];
  }, [strokeRecords.length, nonStrokeRecords.length]);

  const ageData = useMemo(() => {
    return AGE_GROUPS.map((group) => {
      const subset = filteredRecords.filter(
        (r) => r.age >= group.min && r.age <= group.max
      );
      const strokeCount = subset.filter((r) => r.stroke === 1).length;
      const strokeRate =
        subset.length > 0
          ? (strokeCount / subset.length) * 100
          : 0;

      return {
        name: group.label,
        rate: Number(strokeRate.toFixed(1)),
      };
    });
  }, [filteredRecords]);

  const genderData = useMemo(() => {
    const genders = [
      { key: Gender.FEMALE, label: 'Female' },
      { key: Gender.MALE, label: 'Male' },
      { key: Gender.OTHER, label: 'Other' },
    ];

    return genders.map((g) => {
      const groupStroke = strokeRecords.filter((r) => r.gender === g.key);
      const groupNonStroke = nonStrokeRecords.filter((r) => r.gender === g.key);
      
      return {
        name: g.label,
        stroke: groupStroke.length,
        noStroke: groupNonStroke.length,
      };
    });
  }, [strokeRecords, nonStrokeRecords]);

  const comorbidityData = useMemo(() => {
const rate = (arr: ClinicalRecord[]) =>
      arr.length > 0
        ? Number(((arr.filter((r) => r.stroke === 1).length / arr.length) * 100).toFixed(1))
        : 0;

    const withHyper = filteredRecords.filter((r) => r.hypertension);
    const withoutHyper = filteredRecords.filter((r) => !r.hypertension);
    const withHeart = filteredRecords.filter((r) => r.heart_disease);
    const withoutHeart = filteredRecords.filter((r) => !r.heart_disease);

    return [
      {
        name: 'Hypertension',
        withCondition: rate(withHyper),
        withoutCondition: rate(withoutHyper),
      },
      {
        name: 'Heart Disease',
        withCondition: rate(withHeart),
        withoutCondition: rate(withoutHeart),
      },
    ];
  }, [filteredRecords]);

  const smokingData = useMemo(() => {
    const statuses = [
      { key: SmokingStatus.NEVER, label: 'Never' },
      { key: SmokingStatus.FORMERLY, label: 'Formerly' },
      { key: SmokingStatus.SMOKES, label: 'Smokes' },
      { key: SmokingStatus.UNKNOWN, label: 'Unknown' },
    ];

    return statuses.map((s) => {
      const groupStroke = strokeRecords.filter((r) => r.smoking_status === s.key);
      const groupTotal = filteredRecords.filter((r) => r.smoking_status === s.key);
      const rate = groupTotal.length > 0 ? (groupStroke.length / groupTotal.length) * 100 : 0;

      return {
        name: s.label,
        rate: Number(rate.toFixed(1)),
      };
    });
  }, [strokeRecords, filteredRecords]);

const bmiCompareData = useMemo(() => {
  const strokeGroup = strokeRecords.filter((r) => r.bmi > 0);
  const noStrokeGroup = nonStrokeRecords.filter((r) => r.bmi > 0);

  const avg = (arr: ClinicalRecord[], key: 'bmi' | 'avg_glucose_level') =>
    arr.length > 0
      ? Number(
          (
            arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length
          ).toFixed(1)
        )
      : 0;

  return [
    { name: 'No Stroke', value: avg(noStrokeGroup, 'bmi'), color: COLORS.nonStroke },
    { name: 'Stroke', value: avg(strokeGroup, 'bmi'), color: COLORS.stroke },
  ];
}, [strokeRecords, nonStrokeRecords]);

  const glucoseCompareData = useMemo(() => {
  const strokeGroup = strokeRecords.filter((r) => r.avg_glucose_level > 0);
  const noStrokeGroup = nonStrokeRecords.filter((r) => r.avg_glucose_level > 0);

  const avg = (arr: ClinicalRecord[], key: 'bmi' | 'avg_glucose_level') =>
    arr.length > 0
      ? Number(
          (
            arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length
          ).toFixed(1)
        )
      : 0;

  return [
    {
      name: 'No Stroke',
      value: avg(noStrokeGroup, 'avg_glucose_level'),
      color: COLORS.nonStroke,
    },
    {
      name: 'Stroke',
      value: avg(strokeGroup, 'avg_glucose_level'),
      color: COLORS.stroke,
    },
  ];
}, [strokeRecords, nonStrokeRecords]);

  const clearAll = () => {
    if (confirm('Delete all data?')) {
      localStorage.removeItem('stroke_ai_records');
      setRecords([]);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-6 space-y-8 font-manrope animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-primary text-[11px] font-black uppercase tracking-[0.25em] mb-2">
            Clinical Stroke Dashboard
          </p>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight dark:text-white">
            Stroke Risk Monitoring
          </h1>
        <p className="text-slate-400 mt-2 font-medium flex items-center gap-4">
            Analyzing {filteredRecords.length} {searchTerm ? `filtered (${records.length} total)` : 'records'} from uploaded dataset
            {searchTerm && (
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, gender, age..."
                className="px-4 py-1 bg-white/50 rounded-xl text-sm font-bold border border-slate-200 focus:ring-2 ring-primary/50 outline-none w-48"
              />
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-2xl hover:bg-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Upload Dataset
          </button>


          {/* ĐOẠN CODE NÚT EXPORT MỚI THÊM VÀO ĐÂY */}
          <button
            onClick={exportToCSV}
            className="h-14 px-8 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm flex items-center gap-3 shadow-sm hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">download</span>
            Export CSV
          </button>
          {/* KẾT THÚC ĐOẠN CODE MỚI */}

          <button
            onClick={clearAll}
            className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {[
          {
            label: 'Total Patients',
            value: stats.total,
            icon: 'groups',
            color: '#3b82f6',
          },
          {
            label: 'Stroke Cases',
            value: stats.strokeCases,
            icon: 'neurology',
            color: '#ef4444',
          },
          {
            label: 'Stroke Rate',
            value: `${stats.strokeRate}%`,
            icon: 'monitoring',
            color: '#ef4444',
          },
          {
            label: 'Avg. BMI',
            value: stats.avgBmi,
            icon: 'weight',
            color: '#f59e0b',
          },
          {
            label: 'Avg. Glucose',
            value: stats.avgGlucose,
            icon: 'bloodtype',
            color: '#10b981',
          },
        ].map((card, i) => (
          <div
            key={i}
            className="glass-card p-7 rounded-[2rem] shadow-xl border-b-4"
            style={{ borderBottomColor: card.color }}
          >
            <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 mb-5">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
              {card.label}
            </p>
            <h3 className="text-3xl font-black dark:text-white mt-1">
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Stroke Distribution</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-red-500/10 text-red-500 rounded-full uppercase">
              Outcome
            </span>
          </div>

          <div className="h-[260px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                Upload data to view chart
              </div>
            )}
          </div>

          <div className="space-y-3 mt-4">
            {distributionData.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-bold">
                <div className="flex items-center gap-3">
                  <div className="size-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="dark:text-white">
                  {filteredRecords.length > 0
                    ? ((d.value / filteredRecords.length) * 100).toFixed(1)
                    : '0.0'}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Stroke by Age Group</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full uppercase">
              Primary Risk Factor
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Stroke Rate']}
                    contentStyle={{ borderRadius: '16px', border: 'none' }}
                  />
                  <Bar dataKey="rate" fill={COLORS.stroke} radius={[10, 10, 0, 0]} barSize={52} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Stroke by Gender</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-pink-500/10 text-pink-500 rounded-full uppercase">
              Demographics
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderData} layout="vertical" barCategoryGap={22}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                    width={70}
                  />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Legend />
                  <Bar dataKey="noStroke" stackId="a" name="No Stroke" fill={COLORS.nonStroke} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="stroke" stackId="a" name="Stroke" fill={COLORS.stroke} radius={[0, 12, 12, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Condition Impact</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-red-500/10 text-red-500 rounded-full uppercase">
              Clinical
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comorbidityData} barGap={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Legend />
                  <Bar dataKey="withCondition" name="With Condition" fill={COLORS.stroke} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="withoutCondition" name="Without Condition" fill={COLORS.nonStroke} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Smoking vs Stroke</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full uppercase">
              Lifestyle
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={smokingData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Stroke Rate']}
                    contentStyle={{ borderRadius: '16px', border: 'none' }}
                  />
                  <Bar dataKey="rate" fill={COLORS.amber} radius={[0, 12, 12, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Average BMI by Outcome</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full uppercase">
              Biomarker
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bmiCompareData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {bmiCompareData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black tracking-tight">Average Glucose by Outcome</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-green-500/10 text-green-500 rounded-full uppercase">
              Biomarker
            </span>
          </div>

          <div className="h-[320px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={glucoseCompareData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {glucoseCompareData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
          <div>
            <h3 className="font-black text-xl">Patient Monitoring Table</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Showing last {Math.min(filteredRecords.length, 10)} filtered records
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/60 dark:bg-slate-800/60">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Patient ID</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Gender / Age</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Hypertension</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Heart</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Glucose</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">BMI</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Smoking</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Stroke</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords
                .slice(-10)
                .reverse()
                .map((r, i) => (
                  <tr
                    key={i}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-5 font-mono text-xs font-bold text-primary">
                      #{String(r.id).substring(0, 8)}
                    </td>
                    <td className="p-5">
                      <div className="text-sm font-black dark:text-white capitalize">
                        {r.gender}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        Age {r.age}
                      </div>
                    </td>
                    <td className="p-5 text-sm font-bold">
                      {r.hypertension ? 'Yes' : 'No'}
                    </td>
                    <td className="p-5 text-sm font-bold">
                      {r.heart_disease ? 'Yes' : 'No'}
                    </td>
                    <td className="p-5 text-sm font-bold">{r.avg_glucose_level}</td>
                    <td className="p-5 text-sm font-bold">{r.bmi}</td>
                    <td className="p-5 text-sm font-bold capitalize">
                      {r.smoking_status}
                    </td>
                    <td className="p-5">
                      <span
className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
  r.stroke === 1
    ? 'bg-red-100 text-red-600'
    : 'bg-blue-100 text-blue-600'
}`}
>
  {r.stroke === 1 ? 'Stroke' : 'No Stroke'}
</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="p-20 text-center text-slate-300 italic font-medium">
              No data found. Upload a dataset or change filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;