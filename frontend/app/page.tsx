"use client";

import Link from 'next/link';
import { useAppStore } from '../store/useAppStore';
import { Heart, Compass, ShieldCheck, Zap, ArrowRight, CheckCircle2, ChevronRight, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const { isAuthenticated, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'donor' | 'ngo'>('donor');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { label: 'Meals Redirected', value: '738,490+', color: 'text-brand-500' },
    { label: 'Carbon Saved (CO₂)', value: '1.84M kg', color: 'text-emerald-400' },
    { label: 'Active Stations', value: '4,200+', color: 'text-teal-400' },
    { label: 'Matched Surpluses', value: '99.4%', color: 'text-green-500' },
  ];

  const features = [
    {
      title: 'Microbiological AI Expiry',
      desc: 'Predicts precise safety consumption hours based on biological decay constants and storage mediums.',
      icon: Zap,
    },
    {
      title: 'Haversine Matching Engine',
      desc: 'Connects surplus food to closest NGOs in real-time matching capacity constraints.',
      icon: Compass,
    },
    {
      title: 'Trust Verification Score',
      desc: 'Monitors food freshness, photo proofs, and donor histories to assign real-time safety confidence.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col w-full pb-20">
      
      {/* 1. Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 flex flex-col items-center text-center">
        
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/5 text-brand-500 text-xs font-semibold uppercase tracking-wider mb-6 animate-glow">
          <Heart className="h-3.5 w-3.5 fill-brand-500/10" /> Connected Surpluses, Rescued Lives
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 max-w-4xl text-outfit leading-[1.1]">
          Connecting Surplus Food to Human Need, <br />
          <span className="bg-gradient-to-r from-brand-500 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Powered by Predictive AI
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          FoodBridge AI is an enterprise-grade platform connecting restaurants, suppliers, and individual donors directly to localized NGOs using geospatial matching and biochemical decay models.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {mounted && isAuthenticated && user ? (
            <Link href={user.role === 'DONOR' ? '/donor' : user.role === 'NGO' ? '/ngo' : user.role === 'VOLUNTEER' ? '/volunteer' : '/admin'} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-dark-900 px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:shadow-brand-500/20 text-lg">
              Enter Platform Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link href="/auth/register" className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-dark-900 px-8 py-4 rounded-xl font-bold transition-all shadow-xl hover:shadow-brand-500/20 text-lg">
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/about" className="px-8 py-4 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl font-bold transition-all text-slate-300 hover:text-white text-lg">
                View System Specs
              </Link>
            </>
          )}
        </div>

      </section>

      {/* 2. Numerical Impact Tickers */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="glass-panel p-6 border-white/5 text-center flex flex-col items-center justify-center">
              <span className={`text-2xl sm:text-4xl font-extrabold text-outfit ${stat.color} mb-1`}>
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Core Engine Grid (AI & Distance) */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-outfit mb-4">
            Under The Hood: Enterprise Architecture
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Our technology stack is calibrated to minimize surplus transit times while guaranteeing absolute microbiological safety standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="glass-panel p-8 border-white/5 glass-panel-hover flex flex-col gap-4 text-left">
                <div className="bg-brand-500/10 border border-brand-500/25 p-3 rounded-xl w-fit">
                  <Icon className="h-6 w-6 text-brand-500" />
                </div>
                <h3 className="text-xl font-bold text-white text-outfit">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Role Action Scenarios Tabs */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <div className="glass-panel p-8 md:p-12 border-white/5">
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setActiveTab('donor')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'donor'
                  ? 'bg-brand-500 text-dark-900 shadow-lg'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Surplus Donor Pipeline
            </button>
            <button
              onClick={() => setActiveTab('ngo')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'ngo'
                  ? 'bg-brand-500 text-dark-900 shadow-lg'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Surplus Receiver / NGO Pipeline
            </button>
          </div>

          {activeTab === 'donor' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left">
              <div className="flex flex-col gap-5">
                <span className="text-brand-500 text-xs font-bold uppercase tracking-wider">For Restaurants & Suppliers</span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white text-outfit leading-snug">
                  Upload surplus stock, let AI route it instantly.
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Log commercial surpluses via our smart form. Our microbiological system computes shelf degradation margins in real-time, matches nearby NGO capacities, and lists pickup schedules instantly.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Upload quantities, food types & photo proofs</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Earn verified Carbon Savings Certificate points</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Live integrated coordinator socket chats</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-dark-900/50 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-bold text-slate-400">Smart Surplus Form Preview</span>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">AI Evaluated</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Surplus surplus surplus Category</label>
                    <div className="bg-white/5 border border-white/5 px-3 py-2 rounded text-xs text-white">Veg Meal (Surplus Servings)</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Microbiological Freshness Index</label>
                    <div className="flex items-center justify-between">
                      <div className="w-full bg-white/5 rounded-full h-2 mr-3">
                        <div className="bg-brand-500 h-2 rounded-full" style={{ width: '92%' }} />
                      </div>
                      <span className="text-brand-500 text-xs font-bold">92%</span>
                    </div>
                  </div>
                  <div className="bg-brand-500/5 border border-brand-500/25 p-3 rounded-lg text-xs text-brand-500">
                    <strong>AI Recommendation:</strong> Food is safe and highly stable. Safe consumption window extends 8.4 Hours.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-left">
              <div className="flex flex-col gap-5">
                <span className="text-brand-500 text-xs font-bold uppercase tracking-wider">For Humanitarian Organizations</span>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white text-outfit leading-snug">
                  Claim local food surpluses instantly.
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sign up as a verified NGO. View surrounding unclaimed active surpluses ranked by coordinates distance. Track precise routing pipelines to direct collections seamlessly.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Real-time proximity matching notifications</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Dynamic vector route coordinate maps</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-brand-500" />
                    <span>Complete transparent status pipeline logs</span>
                  </div>
                </div>
              </div>

              <div className="bg-dark-900/50 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-bold text-slate-400">NGO Proximity Radar Preview</span>
                  <span className="bg-brand-500/10 text-brand-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Proximity Scan</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-lg">
                    <div>
                      <h4 className="font-bold text-white">Surplus Veg Meal (24 Servings)</h4>
                      <p className="text-slate-400 text-[10px]">Donor: Spice Grill Restaurant</p>
                    </div>
                    <span className="bg-brand-500/20 text-brand-500 px-2 py-1 rounded font-bold">1.2 km away</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-lg">
                    <div>
                      <h4 className="font-bold text-white">Surplus Bakery Breads (3.0 kg)</h4>
                      <p className="text-slate-400 text-[10px]">Donor: Artisan Bakery Station</p>
                    </div>
                    <span className="bg-brand-500/20 text-brand-500 px-2 py-1 rounded font-bold">3.4 km away</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. FAQs Accordion Accordion */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-left">
        <h2 className="text-3xl font-bold text-white text-outfit mb-10 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <details className="glass-panel p-6 border-white/5 cursor-pointer group">
            <summary className="text-md font-semibold text-white flex justify-between items-center outline-none">
              How does the microbiological AI prediction work?
              <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-slate-400 text-sm leading-relaxed mt-4">
              Our AI service approximates standard microbiological growth and decay kinetics (using parameters inspired by the Arrhenius reaction model). It uses elapsed time, storage methods (ambient vs refrigerating vs freezing), and specific food degradation rates to accurately evaluate bacteria hazards, freshness percentages, and remaining consumption margins.
            </p>
          </details>

          <details className="glass-panel p-6 border-white/5 cursor-pointer group">
            <summary className="text-md font-semibold text-white flex justify-between items-center outline-none">
              Is there any cost for NGOs to claim food?
              <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-slate-400 text-sm leading-relaxed mt-4">
              Absolutely not. FoodBridge AI operates under an open-source, humanitarian license. Surplus distribution is entirely free, aligning with global sustainable development goals (UN SDG 2 - Zero Hunger).
            </p>
          </details>

          <details className="glass-panel p-6 border-white/5 cursor-pointer group">
            <summary className="text-md font-semibold text-white flex justify-between items-center outline-none">
              How are donor trust scores calculated?
              <ChevronRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <p className="text-slate-400 text-sm leading-relaxed mt-4">
              Trust scores are computed dynamically (scale 0-100) based on multiple factors: average rating reviews left by accepted NGOs, past completion streaks, email/business verification status, and historical precision of AI freshness predictions at point-of-pickup.
            </p>
          </details>
        </div>
      </section>

    </div>
  );
}
