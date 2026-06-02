"use client";

import { useEffect, useState } from 'react';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { Award, ShieldCheck, Heart, RefreshCw, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CertificatesPage() {
  const { user } = useAppStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await ApiService.get('/donations/donor-stats');
        setStats(statsRes.stats);
      } catch (err) {
        console.error('[Certificates] Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading verified certificate databases...</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6 print:py-0">
      
      {/* 1. Header options (Hidden in print) */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 print:hidden">
        <Link href="/donor" className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-semibold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        
        <button
          onClick={handlePrint}
          className="bg-brand-500 hover:bg-brand-600 text-dark-900 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-brand-500/15 flex items-center gap-2"
        >
          <Printer className="h-4.5 w-4.5" /> Print / Export PDF Certificate
        </button>
      </div>

      {/* 2. Certificate Frame */}
      <div className="w-full bg-dark-800 border-8 border-brand-700 p-8 sm:p-16 rounded-2xl shadow-2xl relative text-center flex flex-col items-center justify-center gap-8 print:border-dark-900 print:shadow-none bg-glass-gradient border-double">
        
        {/* Dynamic Watermark Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
          <Heart className="w-[450px] h-[450px] text-brand-500" />
        </div>

        {/* Certificate Header Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-brand-500/10 border-2 border-brand-500 p-3 rounded-full">
            <Award className="h-12 w-12 text-brand-500 fill-brand-500/10 animate-float" />
          </div>
          <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-[4px] text-brand-500">Certificate of Verified Ecological Impact</span>
        </div>

        {/* Dynamic Body Details */}
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm font-medium text-slate-400">This certifies that organization</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white text-outfit tracking-tight leading-tight">{user?.name}</h2>
          
          <div className="w-32 h-0.5 bg-brand-500 mx-auto" />
          
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            has successfully completed surplus redirection procedures through the FoodBridge AI network, transferring active perishables to verified humanitarian centers. Through this action, they have contributed to global food rescue and carbon offset thresholds as documented below:
          </p>
        </div>

        {/* Dynamic Core stats values */}
        <div className="grid grid-cols-2 gap-8 border-t border-b border-white/5 py-8 w-full max-w-lg my-4 text-center">
          <div className="flex flex-col">
            <span className="text-2xl sm:text-4xl font-extrabold text-white text-outfit">{stats?.mealsSaved || 0}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Verified Meals Rescued</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-4xl font-extrabold text-brand-500 text-outfit">{stats?.co2Reduction || 0} kg</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-1">Surplus Carbon Offset</span>
          </div>
        </div>

        {/* Verification Footers */}
        <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-2xl mt-6 border-t border-white/5 pt-8 gap-6 text-left">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-brand-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified System Audit</span>
              <span className="text-xs text-white font-medium">FoodBridge Trust Engine (FTE)</span>
            </div>
          </div>

          <div className="flex flex-col text-right sm:text-left">
            <span className="text-[9px] uppercase font-semibold text-slate-500">Certificate Hash Identifier</span>
            <span className="text-[11px] font-mono text-slate-400">fb-cert-verified-{user?._id.substring(0, 8)}-{Date.now().toString().slice(-6)}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
