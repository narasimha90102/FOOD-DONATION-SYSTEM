"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '../../../store/useAppStore';
import { ApiService } from '../../../services/api';
import { InputWithIcon } from '../../../components/InputWithIcon';
import { LogIn, Key, Mail, ShieldAlert, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';

const GOOGLE_CLIENT_ID = "593391029903-3rb6nc1c2mctdj8rf17eb95g42c5q6rf.apps.googleusercontent.com";

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

  // Handle the credential response from Google GSI popup
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    console.log('[Google GSI] Credential received from popup.');
    setGoogleLoading(true);
    setError('');
    setSuccess('');

    try {
      const idToken = response.credential;
      if (!idToken) throw new Error('No credential received from Google.');

      const decoded = parseJwt(idToken);
      if (!decoded || !decoded.email) {
        throw new Error('Failed to read email from Google token.');
      }

      console.log('[Google GSI] Decoded:', { email: decoded.email, name: decoded.name });

      const data = await ApiService.post('/auth/google', {
        email: decoded.email,
        name: decoded.name || 'Google User',
        profilePicture: decoded.picture || '',
        googleIdToken: idToken,
        role: 'DONOR',
      });

      console.log('[Google GSI] Backend authentication successful.');
      setSuccess('Authenticated via Google! Redirecting...');
      login(data.token, data.user);

      setTimeout(() => {
        if (data.user.role === 'ADMIN') router.push('/admin');
        else if (data.user.role === 'NGO') router.push('/ngo');
        else router.push('/donor');
      }, 1200);

    } catch (err: any) {
      console.error('[Google GSI Error]', err);
      setError(err.message || 'Google authentication failed. Please try again.');
      setGoogleLoading(false);
    }
  }, [login, router]);

  // Load Google Identity Services script
  useEffect(() => {
    // Expose callback globally so GSI can call it
    window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[Google GSI] Script loaded.');
        initializeGSI();
      };
      script.onerror = () => {
        console.error('[Google GSI] Failed to load script.');
        setError('Failed to load Google Sign-In. Please check your connection.');
      };
      document.head.appendChild(script);
    } else if (window.google) {
      initializeGSI();
    }

    return () => {
      delete window.handleGoogleCredentialResponse;
    };
  }, [handleGoogleCredentialResponse]);

  const initializeGSI = () => {
    if (!window.google) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      console.log('[Google GSI] Initialized successfully.');
      setGsiReady(true);
    } catch (err) {
      console.error('[Google GSI] Initialization failed:', err);
    }
  };

  // Trigger GSI popup when button clicked
  const handleGoogleLogin = () => {
    setError('');
    setSuccess('');

    if (!window.google) {
      setError('Google Sign-In is not loaded yet. Please wait and try again.');
      return;
    }

    try {
      console.log('[Google GSI] Prompting popup...');
      setGoogleLoading(true);
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.warn('[Google GSI] Prompt not displayed:', notification.getNotDisplayedReason());
          // Fallback: render the button popup manually
          setGoogleLoading(false);
          setError('Google popup was blocked. Please allow popups for this site and try again.');
        }
        if (notification.isDismissedMoment()) {
          console.log('[Google GSI] User dismissed the prompt.');
          setGoogleLoading(false);
        }
      });
    } catch (err: any) {
      console.error('[Google GSI] Prompt error:', err);
      setError('Failed to open Google Sign-In. Please try again.');
      setGoogleLoading(false);
    }
  };

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
        else router.push('/donor');
      }, 1200);

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
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

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-200 py-3.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
        >
          {googleLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

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
