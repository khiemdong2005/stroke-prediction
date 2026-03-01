
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-background-light overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl w-full px-6 lg:px-8">
        <section className="pt-20 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col gap-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary w-fit">
                <span className="material-symbols-outlined text-sm font-bold">verified</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Clinically Validated AI</span>
              </div>
              
              <h1 className="text-6xl lg:text-8xl font-black leading-[0.95] tracking-tight text-slate-900">
                AI-Powered <br /> 
                <span className="text-primary">Stroke Risk</span> <br /> 
                Prediction
              </h1>

              <p className="text-xl text-slate-500 leading-relaxed max-w-xl font-medium">
                Secure, instant, and medically grounded. Leverage advanced neural networks to assess your cardiovascular health markers in real-time with enterprise-grade privacy.
              </p>

              <div className="flex flex-wrap gap-6 mt-4">
                <Link 
                  to="/predict" 
                  className="h-16 px-10 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center"
                >
                  Predict Your Risk
                </Link>
                <Link 
                  to="/dashboard" 
                  className="h-16 px-10 rounded-full border border-slate-200 bg-white/50 text-slate-700 font-black text-lg hover:bg-white transition-all flex items-center shadow-lg"
                >
                  View Population Data
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
              <div className="w-full h-[2px] bg-slate-200 relative">
                <div className="absolute right-0 -top-[3px] w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(51,153,204,1)]"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: 'shield', title: 'HIPAA Compliant', desc: 'Enterprise-level data security' },
            { icon: 'clinical_notes', title: 'Clinically Validated', desc: 'Trained on 5,000+ clinical cases' },
            { icon: 'lock_reset', title: 'End-to-End Encryption', desc: 'Your health data is private' }
          ].map((item, i) => (
            <div key={i} className="glass-card p-10 rounded-[2.5rem] flex flex-col gap-6 border border-white/40 hover:border-primary/30 transition-all group cursor-default shadow-xl">
              <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">{item.icon}</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">{item.title}</h3>
                <p className="text-base text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
