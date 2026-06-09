"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ApiService } from '../../../services/api';
import {
  KeyRound, Eye, EyeOff, ArrowLeft, CheckCircle2,
  ShieldAlert, RefreshCw, AlertTriangle,
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Strength helpers
  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-brand-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await ApiService.post('/auth/reset-password', { token, newPassword, confirmPassword });
      setSuccess(true);
      // Auto-redirect to login after 3s
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // No token — show error immediately
  if (!token) {
    return (
      <div className="text-center flex flex-col items-center gap-4 py-4">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-white text-outfit">Invalid Reset Link</h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
          This reset link is missing a token. Please request a new password reset link.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-2 w-full text-center bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3 rounded-lg text-sm transition-all"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center flex flex-col items-center gap-4 py-4">
        <div className="p-4 rounded-full bg-brand-500/10 border border-brand-500/20">
          <CheckCircle2 className="h-10 w-10 text-brand-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-white text-outfit">Password Reset!</h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
          Your password has been changed successfully. Redirecting you to login in 3 seconds...
        </p>
        <Link
          href="/auth/login"
          className="mt-2 w-full text-center bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3 rounded-lg text-sm transition-all"
        >
          Go to Login Now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 mb-4">
          <KeyRound className="h-7 w-7 text-brand-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-white text-outfit">Set New Password</h2>
        <p className="text-sm text-slate-400 mt-2">
          Choose a strong password for your FoodBridge AI account.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-start gap-2.5 text-xs text-red-400 mb-6">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <KeyRound className="h-4 w-4" />
            </div>
            <input
              id="reset-new-password"
              type={showNew ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full glass-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength Bar */}
          {newPassword && (
            <div className="mt-1.5">
              <div className="flex gap-1 h-1 rounded-full overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-white/10'}`}
                  />
                ))}
              </div>
              <p className={`text-[10px] mt-1 font-semibold ${strengthColor.replace('bg-', 'text-')}`}>
                {strengthLabel}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <KeyRound className="h-4 w-4" />
            </div>
            <input
              id="reset-confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className={`w-full glass-input pl-10 pr-10 transition-all ${
                confirmPassword && newPassword !== confirmPassword
                  ? 'border-red-500/50'
                  : confirmPassword && newPassword === confirmPassword
                  ? 'border-brand-500/50'
                  : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-red-400 text-[11px] font-medium">Passwords do not match</p>
          )}
          {confirmPassword && newPassword === confirmPassword && (
            <p className="text-brand-500 text-[11px] font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!!confirmPassword && newPassword !== confirmPassword)}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/40 disabled:cursor-not-allowed text-dark-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg mt-2"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          <span>{loading ? 'Resetting Password...' : 'Reset Password'}</span>
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-grow flex items-center justify-center px-4 py-20 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-500/5 rounded-full blur-[80px] -z-10" />

      <div className="w-full max-w-md glass-panel p-8 border-white/5 shadow-2xl">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </Link>

        {/* Suspense wraps useSearchParams() */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
