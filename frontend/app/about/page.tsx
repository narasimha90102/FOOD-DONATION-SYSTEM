import Link from 'next/link';
import { ArrowLeft, Zap, Compass, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-16 text-left">
      <Link href="/" className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-colors mb-8 font-semibold">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      
      <h1 className="text-4xl font-extrabold text-white text-outfit mb-6">
        About FoodBridge<span className="text-brand-500">.AI</span>
      </h1>
      
      <p className="text-lg text-slate-300 mb-8 leading-relaxed">
        FoodBridge AI is a state-of-the-art surplus food redistribution platform designed to minimize waste and combat hunger. By leveraging predictive microbiological AI decay models and real-time geospatial optimization, we bridge the gap between commercial food donors and local humanitarian organizations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-panel p-6 border-white/5">
          <Zap className="h-8 w-8 text-brand-500 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">AI Decay Modeling</h3>
          <p className="text-slate-400 text-sm">Predicts shelf-life using biological decay constants and storage telemetry.</p>
        </div>
        <div className="glass-panel p-6 border-white/5">
          <Compass className="h-8 w-8 text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Geospatial Routing</h3>
          <p className="text-slate-400 text-sm">Calculates shortest transit vectors to maximize fresh food utility.</p>
        </div>
        <div className="glass-panel p-6 border-white/5">
          <ShieldCheck className="h-8 w-8 text-teal-400 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Safety Scoring</h3>
          <p className="text-slate-400 text-sm">Enforces strict compliance standards for safe redistribution.</p>
        </div>
      </div>

      <div className="glass-panel p-8 border-white/5 text-center">
        <h2 className="text-2xl font-bold text-white mb-4 text-outfit">Join the Movement</h2>
        <p className="text-slate-300 text-sm mb-6 max-w-xl mx-auto">
          Help us build a zero-waste future. Register as a Donor or NGO and begin making a measurable impact in your community today.
        </p>
        <Link href="/auth/register" className="inline-block bg-brand-500 hover:bg-brand-600 text-dark-900 px-6 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-brand-500/20">
          Get Started
        </Link>
      </div>
    </div>
  );
}
