import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-500">
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
                <span className="material-symbols-outlined text-sm font-bold">
                  model_training
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Machine Learning-Based Screening
                </span>
              </div>

              <h1 className="text-6xl lg:text-8xl font-black leading-[0.95] tracking-tight text-slate-900 dark:text-white transition-colors duration-500">
                Machine Learning <br />
                <span className="text-primary">Stroke Risk</span> <br />
                Screening
              </h1>

              <p className="text-xl text-slate-500 dark:text-slate-300 leading-relaxed max-w-xl font-medium transition-colors duration-500">
                An educational machine learning application that estimates stroke
                risk from demographic, clinical, and lifestyle information. It
                supports early risk screening and health awareness, not medical
                diagnosis.
              </p>

              <div className="flex flex-wrap gap-6 mt-4">
                <Link
                  to="/predict"
                  className="h-16 px-10 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center"
                >
                  Assess Stroke Risk
                </Link>

                <Link
                  to="/dashboard"
                  className="h-16 px-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 font-black text-lg hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center shadow-lg"
                >
                  Explore Analytics
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
              <div className="w-full h-[2px] bg-slate-200 dark:bg-slate-800 relative transition-colors duration-500">
                <div className="absolute right-0 -top-[3px] w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(51,153,204,1)]"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: 'school',
              title: 'Educational Project',
              desc: 'Built for academic research, health awareness, and early risk screening.'
            },
            {
              icon: 'analytics',
              title: 'Data-Driven Screening',
              desc: 'Uses a Logistic Regression model trained on public healthcare data.'
            },
            {
              icon: 'computer',
              title: 'Local Development',
              desc: 'Built with React, FastAPI, TypeScript, and a local machine learning model.'
            }
          ].map((item, i) => (
            <div
              key={i}
              className="glass-card p-10 rounded-[2.5rem] flex flex-col gap-6 border border-white/40 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/50 bg-white/50 dark:bg-slate-800/40 backdrop-blur-md transition-all group cursor-default shadow-xl"
            >
              <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">
                  {item.icon}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight transition-colors duration-500">
                  {item.title}
                </h3>

                <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors duration-500">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default LandingPage;