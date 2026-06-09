"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ApiService } from '../../../services/api';
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await ApiService.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-20 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-500/5 rounded-full blur-[80px] -z-10" />

      <div className="w-full max-w-md glass-panel p-8 border-white/5 shadow-2xl">

        {/* Back Link */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </Link>

        {success ? (
          /* ── Success State ── */
          <div className="text-center flex flex-col items-center gap-4 py-4">
            <div className="p-4 rounded-full bg-brand-500/10 border border-brand-500/20">
              <CheckCircle2 className="h-10 w-10 text-brand-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-white text-outfit">Check Your Inbox</h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              If <span className="text-brand-500 font-semibold">{email}</span> is registered with us, you will receive a password reset link within a few minutes.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 w-full text-left mt-2">
              <p className="text-amber-400 text-xs leading-relaxed">
                ⏱ The reset link expires in <strong>1 hour</strong>. Check your spam folder if you do not see the email.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="mt-2 w-full text-center bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3 rounded-lg text-sm transition-all"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
                <Mail className="h-7 w-7 text-brand-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-white text-outfit">Forgot Password?</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Enter your registered email and we will send you a secure reset link.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-center gap-2.5 text-xs text-red-400 mb-6">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full glass-input"
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg mt-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>{loading ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-6">
              Remembered it?{' '}
              <Link href="/auth/login" className="text-brand-500 hover:text-brand-400 font-bold transition-colors">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
