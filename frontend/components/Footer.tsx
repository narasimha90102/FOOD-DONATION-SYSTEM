"use client";

import Link from 'next/link';
import { Heart, Mail, ShieldAlert, Award } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '../store/useAppStore';

export default function Footer() {
  const pathname = usePathname();
  const { isAuthenticated } = useAppStore();

  // Only show footer on the home page and only when the user is NOT logged in
  if (isAuthenticated || pathname !== '/') {
    return null;
  }

  return (
    <footer className="w-full bg-dark-900 border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Information */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-brand-500 fill-brand-500/20" />
            <span className="text-lg font-bold tracking-tight text-white text-outfit">
              FoodBridge<span className="text-brand-500">.AI</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Enterprise-grade, AI-powered redistribution platform matching food surplus with real-time humanitarian needs. Building a zero-waste, zero-hunger tomorrow.
          </p>
        </div>

        {/* Dynamic Navigation Column */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Surplus Routing</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/about" className="hover:text-brand-500 transition-colors">Surplus Analytics</Link>
            </li>
            <li>
              <Link href="/donor/donate" className="hover:text-brand-500 transition-colors">Smart Expiry Predictions</Link>
            </li>
            <li>
              <Link href="/ngo" className="hover:text-brand-500 transition-colors">Surplus Matching Radar</Link>
            </li>
          </ul>
        </div>

        {/* Help & Support Column */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Documentation</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/faq" className="hover:text-brand-500 transition-colors">Frequently Asked Questions</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-500 transition-colors">Help Desk & Hotline</Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-brand-500 transition-colors">System Architecture</Link>
            </li>
          </ul>
        </div>

        {/* Security & Badges */}
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200 mb-4">Legal & Verification</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/privacy" className="hover:text-brand-500 transition-colors">Privacy & Data Governance</Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-brand-500 transition-colors">Terms of Operations</Link>
            </li>
          </ul>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-slate-300">
              <ShieldAlert className="h-3 w-3 text-brand-500" />
              <span>TLS Secure</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-slate-300">
              <Award className="h-3 w-3 text-brand-500" />
              <span>ISO 14001</span>
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} FoodBridge AI Initiative. Open-source enterprise license.</span>
        <span className="flex items-center gap-1">
          Made with <Heart className="h-3.5 w-3.5 text-brand-500 fill-brand-500/20" /> for global zero-hunger goals.
        </span>
      </div>
    </footer>
  );
}
