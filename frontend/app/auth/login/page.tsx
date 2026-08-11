"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { useAppStore } from '../../../store/useAppStore';
import { ApiService } from '../../../services/api';
import { InputWithIcon } from '../../../components/InputWithIcon';
import { LogIn, Key, Mail, ShieldAlert, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "593391029903-3rb6nc1c2mctdj8rf17eb95g42c5q6rf.apps.googleusercontent.com";

// Extend Window interface for Google Identity Services
declare global {
  interface Window {
    google?: any;
    handleGoogleCredentialResponse?: (response: any) => void;
  }
}

// Helper: decode Google JWT id_token payload
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  // Handle the authentication success
  const handleGoogleSuccess = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    setError('');
    setSuccess('');

    try {
      const decoded = parseJwt(idToken);
      if (!decoded || !decoded.email) {
        throw new Error('Failed to read email from Google token.');
      }

      console.log('[Google OAuth] Decoded:', { email: decoded.email, name: decoded.name });

      const data = await ApiService.post('/auth/google', {
        email: decoded.email,
        name: decoded.name || 'Google User',
        profilePicture: decoded.picture || '',
        googleIdToken: idToken,
        role: 'DONOR',
      });

      console.log('[Google OAuth] Backend authentication successful.');
      setSuccess('Authenticated via Google! Redirecting...');
      login(data.token, data.user);

      setTimeout(() => {
        if (data.user.role === 'ADMIN') router.push('/admin');
        else if (data.user.role === 'NGO') router.push('/ngo');
        else if (data.user.role === 'VOLUNTEER') router.push('/volunteer');
        else router.push('/donor');
      }, 1200);

    } catch (err: any) {
      console.error('[Google OAuth Error]', err);
      let errMsg = err.message || 'Google authentication failed. Please try again.';
      if (err.stackTrace) {
        errMsg += `\n\n[Backend Error Stack]:\n${err.stackTrace}`;
      }
      setError(errMsg);
      setGoogleLoading(false);
    }
  }, [login, router]);

  const initializeGSI = useCallback(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) {
            handleGoogleSuccess(response.credential);
          }
        },
        use_fedcm_for_prompt: false, // Disables FedCM to avoid One Tap errors
      });

      const btnContainer = document.getElementById('google-signin-btn');
      if (btnContainer) {
        window.google.accounts.id.renderButton(
          btnContainer,
          {
            theme: 'outline',
            size: 'large',
            width: btnContainer.clientWidth || 384, // render full width
            text: 'continue_with',
            shape: 'rectangular',
          }
        );
      }
    }
  }, [handleGoogleSuccess]);

  // If window.google is already loaded, render button immediately
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      initializeGSI();
    }
  }, [initializeGSI]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await ApiService.post('/auth/login', { email, password });

      setSuccess('Login authenticated successfully! Redirecting...');
      login(data.token, data.user);

      setTimeout(() => {
        if (data.user.role === 'ADMIN') router.push('/admin');
        else if (data.user.role === 'NGO') router.push('/ngo');
        else if (data.user.role === 'VOLUNTEER') router.push('/volunteer');
        else router.push('/donor');
      }, 1200);

    } catch (err: any) {
      if (err.code === 'ACCOUNT_PENDING_APPROVAL' || (err.status === 403 && err.message?.includes('waiting for admin approval'))) {
        setError(
          `Waiting for Admin Approval ⏳\n\nYour account has been successfully registered but is waiting for administrator approval. Please try again after your account is approved.`
        );
      } else {
        let errMsg = err.message || 'Login failed. Please check credentials.';
        if (err.stackTrace) {
          errMsg += `\n\n[Backend Error Stack]:\n${err.stackTrace}`;
        }
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-20 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-brand-500/5 rounded-full blur-[80px] -z-10" />

      <div className="w-full max-w-md glass-panel p-8 border-white/5 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white text-outfit">Welcome Back</h2>
          <p className="text-sm text-slate-400 mt-2">Log in to coordinate food surplus distributions</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg flex items-start gap-2.5 text-xs text-red-400 mb-6 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-brand-500/10 border border-brand-500/25 p-3 rounded-lg flex items-center gap-2.5 text-xs text-brand-500 mb-6">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputWithIcon
            type="email"
            id="login-email"
            label="Email Address"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
            disabled={loading}
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Password</label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] text-brand-500 hover:text-brand-400 font-semibold transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Key className="h-4 w-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full glass-input"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-brand-500/10 mt-6"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div className="w-full flex justify-center mt-2 min-h-[44px]">
          <div id="google-signin-btn" className="w-full"></div>
        </div>

        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initializeGSI}
        />

        <p className="text-center text-xs text-slate-500 mt-8">
          Don't have a surplus routing profile?{' '}
          <Link href="/auth/register" className="text-brand-500 hover:text-brand-600 font-bold transition-all underline">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
}
