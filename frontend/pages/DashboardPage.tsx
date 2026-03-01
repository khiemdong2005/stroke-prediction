
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { ClinicalRecord, Gender, MaritalStatus, EmploymentType, ResidenceType, SmokingStatus } from '../types';

const DashboardPage: React.FC = () => {
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage
  const loadRecords = () => {
    const saved = localStorage.getItem('stroke_ai_records');
    if (saved) {
      setRecords(JSON.parse(saved));
    }
  };

  useEffect(() => {
    loadRecords();
    // Lắng nghe thay đổi từ các tab khác (nếu có)
    window.addEventListener('storage', loadRecords);
    return () => window.removeEventListener('storage', loadRecords);
  }, []);

  // CSV Parser Logic
  const parseCSV = (csvText: string): ClinicalRecord[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Map CSV to ClinicalRecord interface
      const isStroke = row.stroke === '1';
      return {
        id: row.id || Math.random().toString(36).substr(2, 9),
        age: Number(row.age) || 0,
        gender: (row.gender?.toLowerCase() as Gender) || Gender.OTHER,
        hypertension: row.hypertension === '1',
        heart_disease: row.heart_disease === '1',
        ever_married: row.ever_married?.toLowerCase() === 'yes' ? MaritalStatus.MARRIED : MaritalStatus.SINGLE,
        work_type: (row.work_type?.toLowerCase() as EmploymentType) || EmploymentType.PRIVATE,
        residence_type: (row.residence_type?.toLowerCase() as ResidenceType) || ResidenceType.URBAN,
        avg_glucose_level: Number(row.avg_glucose_level) || 0,
        bmi: Number(row.bmi) || 0,
        smoking_status: (row.smoking_status?.toLowerCase() as SmokingStatus) || SmokingStatus.UNKNOWN,
        riskLevel: isStroke ? 'High' : 'Low',
        riskScore: isStroke ? 85 : 15,
        timestamp: Date.now(),
        engine: 'custom' // Mark as dataset import
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
          newItems = JSON.parse(content);
        }

        const updatedRecords = [...records, ...newItems];
        setRecords(updatedRecords);
        localStorage.setItem('stroke_ai_records', JSON.stringify(updatedRecords));
        alert(`Successfully imported ${newItems.length} records!`);
      } catch (err) {
        alert("Error parsing file. Please ensure it's a valid CSV or JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Analytics Calculations
  const stats = useMemo(() => {
    const total = records.length;
    if (total === 0) return { total: 0, highRisk: 0, avgBmi: 0, strokeRate: 0 };

    const highRisk = records.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length;
    const avgBmi = records.reduce((acc, r) => acc + r.bmi, 0) / total;
    const strokeRate = (highRisk / total) * 100;

    return { total, highRisk, avgBmi: avgBmi.toFixed(1), strokeRate: strokeRate.toFixed(1) };
  }, [records]);

  const distributionData = useMemo(() => {
    const counts: any = { 'Low': 0, 'Moderate': 0, 'High': 0 };
    records.forEach(r => {
      const level = r.riskLevel === 'Critical' ? 'High' : r.riskLevel;
      if (counts[level] !== undefined) counts[level]++;
    });
    return [
      { name: 'Low Risk', value: counts['Low'], color: '#10b981' },
      { name: 'Moderate', value: counts['Moderate'], color: '#f59e0b' },
      { name: 'High Risk', value: counts['High'], color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [records]);

  const ageData = useMemo(() => {
    const groups = ['18-30', '31-45', '46-60', '61-75', '76-85'];
    return groups.map(g => {
      const [min, max] = g.split('-').map(Number);
      const filtered = records.filter(r => r.age >= min && r.age <= max);
      const risk = filtered.length > 0 
        ? (filtered.filter(r => r.riskLevel === 'High').length / filtered.length) * 100 
        : 0;
      return { name: g, risk: Math.round(risk) };
    });
  }, [records]);

  const clearAll = () => {
    if (confirm("Delete all data?")) {
      localStorage.removeItem('stroke_ai_records');
      setRecords([]);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto p-6 space-y-10 font-manrope animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-3 bg-primary rounded-full animate-ping"></div>
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">Neural Analytics Dashboard</p>
          </div>
          <h1 className="text-5xl font-black dark:text-white tracking-tight">Clinical Insights</h1>
          <p className="text-slate-400 mt-2 font-medium">Analyzing {records.length} records from CSV & Real-time Predictions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.json" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-2xl hover:bg-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Upload CSV / Dataset
          </button>
          <button 
            onClick={clearAll}
            className="size-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Screened', val: stats.total, icon: 'groups', color: '#3399cc' },
          { label: 'Stroke Prevalence', val: stats.strokeRate + '%', icon: 'monitoring', color: '#ef4444' },
          { label: 'Avg. BMI Index', val: stats.avgBmi, icon: 'weight', color: '#f59e0b' },
          { label: 'High Risk Alerts', val: stats.highRisk, icon: 'emergency', color: '#ef4444' }
        ].map((card, i) => (
          <div key={i} className="glass-card p-8 rounded-[2.5rem] shadow-xl border-b-4" style={{ borderBottomColor: card.color }}>
            <div className="flex justify-between items-start mb-6">
              <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">{card.label}</p>
            <h3 className="text-4xl font-black dark:text-white mt-1">{card.val}</h3>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5 glass-card p-10 rounded-[3rem] shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black tracking-tight">Risk Distribution</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-primary/10 text-primary rounded-full uppercase">Real-time Data</span>
          </div>
          <div className="h-[300px]">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={80} outerRadius={105} paddingAngle={10} dataKey="value" stroke="none">
                    {distributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">Upload data to view breakdown</div>
            )}
          </div>
          <div className="mt-8 space-y-3">
            {distributionData.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-bold">
                <div className="flex items-center gap-3">
                  <div className="size-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="dark:text-white">{((d.value/records.length)*100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 glass-card p-10 rounded-[3rem] shadow-2xl">
           <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black tracking-tight">Stroke Risk by Age Group</h3>
            <span className="text-[10px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full uppercase">Population Trend</span>
          </div>
          <div className="h-[380px]">
            {records.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ageData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3399cc" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3399cc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} dy={10} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                  <Area type="monotone" dataKey="risk" stroke="#3399cc" strokeWidth={5} fill="url(#colorRisk)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">No data available for trend analysis</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-xl">Recent Assessments</h3>
          <p className="text-xs text-slate-400 font-bold">Last {Math.min(records.length, 5)} entries</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Patient ID</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Profile</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Clinical Markers</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Risk Level</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.slice(-5).reverse().map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-6 font-mono text-xs font-bold text-primary">#{r.id.substr(0,8)}</td>
                  <td className="p-6">
                    <div className="text-sm font-black dark:text-white capitalize">{r.gender}, Age {r.age}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{r.smoking_status}</div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black uppercase">Glu: {r.avg_glucose_level}</span>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black uppercase">BMI: {r.bmi}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      r.riskLevel === 'High' ? 'bg-red-100 text-red-600' : 
                      r.riskLevel === 'Moderate' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {r.riskLevel} Risk
                    </span>
                  </td>
                  <td className="p-6">
                    <span className="text-[10px] font-bold text-slate-400 italic">
                      {r.engine === 'gemini' ? 'Gemini AI' : 'Dataset Import'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="p-20 text-center text-slate-300 italic font-medium">No data found. Start by predicting or uploading a dataset.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
