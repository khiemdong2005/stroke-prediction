
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode }) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Risk Predictor', path: '/predict' },
    { name: 'Analytics', path: '/dashboard' },
  ];

  return (
    <header className="sticky top-0 z-50 px-6 lg:px-20 py-6 pointer-events-none">
      <nav className="glass-card rounded-full px-10 py-4 flex items-center justify-between mx-auto max-w-7xl border border-white/10 shadow-2xl pointer-events-auto">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="size-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform group-hover:rotate-12">
            <span className="material-symbols-outlined text-2xl">neurology</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">StrokeAI</h2>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-bold tracking-tight transition-colors ${
                location.pathname === link.path 
                  ? 'text-primary' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex gap-6 items-center">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="size-11 flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-slate-300"
          >
            <span className="material-symbols-outlined text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <Link
            to="/predict"
            className="bg-primary hover:brightness-110 text-white px-8 h-11 rounded-full text-sm font-black shadow-xl shadow-primary/20 transition-all flex items-center tracking-tight"
          >
            Get Assessment
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
