"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '../../../store/useAppStore';
import { ApiService } from '../../../services/api';
import { ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAppStore();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError('Missing scope parameter. Please register or login to receive code.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await ApiService.post('/auth/verify-email', { email, code });

      setSuccess('Email successfully verified! Unlocking surplus dashboard...');
      login(data.token, data.user);

      setTimeout(() => {
        if (data.user.role === 'NGO') router.push('/ngo');
        else router.push('/donor');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Verification rejected. Please audit code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel p-8 border-white/5 shadow-2xl">
      <div className="text-center mb-8">
        <div className="bg-brand-500/10 border border-brand-500/25 p-3 rounded-full w-fit mx-auto mb-4">
          <ShieldCheck className="h-8 w-8 text-brand-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-white text-outfit">Verify Email Address</h2>
        <p className="text-sm text-slate-400 mt-2">Enter the verification code sent to {email || 'your email'}</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-center gap-2.5 text-xs text-red-400 mb-6">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-brand-500/10 border border-brand-500/25 p-3 rounded-lg flex items-center gap-2.5 text-xs text-brand-500 mb-6">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-2 text-center uppercase tracking-wider">6-Digit Verification Code</label>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full glass-input text-center text-3xl font-bold tracking-[8px] py-4"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-brand-500/10"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          <span>{loading ? 'Verifying...' : 'Verify & Unlock Platform'}</span>
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex-grow flex items-center justify-center px-4 py-20 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-500/5 rounded-full blur-[80px] -z-10" />
      <Suspense fallback={
        <div className="w-full max-w-md glass-panel p-8 border-white/5 shadow-2xl flex flex-col items-center justify-center text-center">
          <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
          <p className="text-slate-400">Loading verification details...</p>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
