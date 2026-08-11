"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '../../../store/useAppStore';
import { ApiService } from '../../../services/api';
import { InputWithIcon } from '../../../components/InputWithIcon';
import { UserPlus, Mail, Key, User, ShieldAlert, CheckCircle2, RefreshCw, Compass, Building, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAppStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DONOR' | 'NGO' | 'VOLUNTEER'>('DONOR');
  
  // NGO & Volunteer custom properties
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // GPS coordinates — start null so we don't submit Bangalore as a default
  const [lng, setLng] = useState<string | null>(null);
  const [lat, setLat] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  
  // Auto-detect location coordinates on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.geolocation) {
      setGpsStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLng(pos.coords.longitude.toString());
          setLat(pos.coords.latitude.toString());
          setGpsStatus('ok');
          setGpsError(null);
          console.log('[Register] GPS detected:', pos.coords.longitude, pos.coords.latitude);
        },
        (err) => {
          console.warn('[Register] Geolocation failed:', err.message);
          setGpsStatus('error');
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location permission denied. Your location will not be saved.');
          } else {
            setGpsError('Unable to detect current location. Your location will not be saved.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }, []);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please provide all primary fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload: any = {
        name,
        email,
        password,
        role,
        phoneNumber,
        address: (role === 'NGO' || role === 'VOLUNTEER') ? address : '',
        // Only include coordinates if GPS succeeded — never send hardcoded Bangalore
        ...(lng !== null && lat !== null ? { coordinates: [Number(lng), Number(lat)] } : {}),
      };

      const data = await ApiService.post('/auth/register', payload);

      if (data.code === 'ACCOUNT_PENDING_APPROVAL') {
        setSuccess('Registration successful. Your account is currently waiting for admin approval. You will be able to login after the administrator approves your account.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 5000);
        return;
      }

      // Log the user in immediately — no OTP step
      login(data.token, data.user);
      setSuccess('Account created! Redirecting to your dashboard...');

      setTimeout(() => {
        if (data.user.role === 'NGO') router.push('/ngo');
        else if (data.user.role === 'ADMIN') router.push('/admin');
        else if (data.user.role === 'VOLUNTEER') router.push('/volunteer');
        else router.push('/donor');
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Signup failed. Please audit input details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-20 relative">
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-brand-500/5 rounded-full blur-[90px] -z-10" />

      <div className="w-full max-w-lg glass-panel p-8 border-white/5 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-white text-outfit">Create Surplus Account</h2>
          <p className="text-sm text-slate-400 mt-2">Become part of the FoodBridge AI zero-waste network</p>
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

        {/* Dynamic Role Toggle Buttons */}
        <div className="flex gap-4 p-1 bg-white/5 rounded-lg border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => setRole('DONOR')}
            className={`flex-1 py-2 rounded font-bold text-xs uppercase transition-all ${
              role === 'DONOR' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('NGO')}
            className={`flex-1 py-2 rounded font-bold text-xs uppercase transition-all ${
              role === 'NGO' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            NGO
          </button>
          <button
            type="button"
            onClick={() => setRole('VOLUNTEER')}
            className={`flex-1 py-2 rounded font-bold text-xs uppercase transition-all ${
              role === 'VOLUNTEER' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Volunteer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputWithIcon
              type="text"
              id="register-name"
              label={role === 'VOLUNTEER' ? 'Name' : 'Surplus Name / Organization'}
              placeholder={role === 'VOLUNTEER' ? 'e.g. John Doe' : 'e.g. Spice Grill Cafe'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={User}
              required
              disabled={loading}
            />

            <InputWithIcon
              type="email"
              id="register-email"
              label="Email Coordinates"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secure Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Key className="h-4 w-4" />
              </div>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
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

          {/* Conditional rendering for NGO specifics */}
          {role === 'NGO' && (
            <div className="space-y-4 border-t border-white/5 pt-4 mt-2">
              <span className="text-brand-500 text-xs font-bold uppercase tracking-wider block">Organization Credentials</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWithIcon
                  type="text"
                  id="register-phone"
                  label="Contact Phone"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  icon={User}
                  required
                  disabled={loading}
                />

                <InputWithIcon
                  type="text"
                  id="register-address"
                  label="Address"
                  placeholder="e.g. 5th Cross, Tech Hub"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  icon={Compass}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Conditional rendering for Volunteer specifics */}
          {role === 'VOLUNTEER' && (
            <div className="space-y-4 border-t border-white/5 pt-4 mt-2">
              <span className="text-brand-500 text-xs font-bold uppercase tracking-wider block">Volunteer Details</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputWithIcon
                  type="text"
                  id="register-phone-vol"
                  label="Phone Number"
                  placeholder="e.g. +91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  icon={User}
                  required
                  disabled={loading}
                />

                <InputWithIcon
                  type="text"
                  id="register-address-vol"
                  label="Residential Address"
                  placeholder="e.g. 5th Cross Road, Bangalore"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  icon={Compass}
                  required
                  disabled={loading}
                />
              </div>

            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-3.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-brand-500/10 mt-6"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            <span>{loading ? 'Creating Account...' : 'Sign Up Account'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8">
          Already coordinate surpluses with us?{' '}
          <Link href="/auth/login" className="text-brand-500 hover:text-brand-600 font-bold transition-all underline">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
