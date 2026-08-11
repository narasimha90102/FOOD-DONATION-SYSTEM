"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../store/useAppStore';
import { ApiService } from '../../services/api';
import UserAvatar from '../../components/UserAvatar';
import {
  ArrowLeft,
  Save,
  MapPin,
  Phone,
  User,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Award,
  Flame,
  Coffee,
  Heart,
  ShieldAlert,
} from 'lucide-react';

// Preset avatars from Unsplash
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export default function ProfilePage() {
  const { user, isAuthenticated, updateUser } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [customPicUrl, setCustomPicUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'File size exceeds the 5MB limit.');
      return;
    }

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Only JPG, JPEG, PNG, or WEBP images are allowed.');
      return;
    }

    setUploadProgress('Processing image...');
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result as string);
      setCustomPicUrl('');
      setUploadProgress('Image processed successfully!');
      showToast('success', 'Profile photo selected! Save changes to persist.');
    };
    reader.onerror = () => {
      setUploadProgress('Failed to read file.');
      showToast('error', 'Failed to process file.');
    };
    reader.readAsDataURL(file);
  };

  const [volAvailability, setVolAvailability] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('AVAILABLE');

  // UI States
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set form fields once user is loaded
  useEffect(() => {
    if (mounted && user) {
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setProfilePicture(user.profilePicture || '');
      setCustomPicUrl(user.profilePicture || '');
      if (user.volunteerAvailability) {
        setVolAvailability(user.volunteerAvailability as any);
      }
    }
  }, [mounted, user]);

  // Auth Guard
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !user) {
    return (
      <div className="flex-grow flex items-center justify-center bg-dark-900 py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-semibold">Loading Profile Console...</p>
        </div>
      </div>
    );
  }

  // Handle Preset Avatar Selection
  const handlePresetSelect = (url: string) => {
    setProfilePicture(url);
    setCustomPicUrl('');
  };

  // Handle Custom Avatar URL submission
  const handleCustomPicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPicUrl.trim()) {
      setProfilePicture(customPicUrl.trim());
      showToast('success', 'Custom profile picture URL applied!');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Submit profile details to API
  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete your account? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      const response = await ApiService.delete('/auth/delete-account');
      if (response.success) {
        showToast('success', 'Account deleted successfully.');
        setTimeout(() => {
          updateUser({});
          router.push('/auth/login');
        }, 1500);
      } else {
        showToast('error', response.message || 'Failed to delete account.');
      }
    } catch (error: any) {
      showToast('error', error.message || 'An error occurred during account deletion.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        profilePicture: profilePicture.trim(),
      };

      if (user.role === 'VOLUNTEER') {
        payload.volunteerAvailability = volAvailability;
      }

      const response = await ApiService.put('/auth/update', payload);

      if (response.success) {
        // Update local Zustand store
        updateUser(payload);
        showToast('success', 'Profile updated successfully!');
      } else {
        showToast('error', response.message || 'Failed to update profile details.');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      showToast('error', error.message || 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    ADMIN: 'System Administrator',
    NGO: 'Registered NGO Partner',
    DONOR: 'Food Surplus Donor',
    VOLUNTEER: 'Registered Volunteer Partner',
  };

  return (
    <div className="flex-grow bg-dark-900/50 py-12 px-4 sm:px-6 lg:px-8 relative min-h-screen">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 animate-in fade-in slide-in-from-right-5 ${
            toast.type === 'success'
              ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-brand-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Back navigation */}
        <Link
          href={user.role === 'DONOR' ? '/donor' : user.role === 'NGO' ? '/ngo' : user.role === 'VOLUNTEER' ? '/volunteer' : '/admin'}
          className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all mb-6 font-bold text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-outfit tracking-tight">
            Account Profile Console
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Configure your personal profile details, contact information, and avatar display preferences.
          </p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: User Card & Stats Summary */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Profile widget card */}
            <div className="glass-panel p-6 border-white/5 flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <UserAvatar
                  src={profilePicture}
                  name={name || user.name}
                  size="2xl"
                  className="border-4 border-brand-500 ring-4 ring-brand-500/10"
                />
                <span className="absolute bottom-1 right-2 bg-brand-500 text-dark-900 p-1.5 rounded-full shadow-lg">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>

              <h2 className="text-xl font-bold text-white tracking-wide truncate max-w-full">
                {name || user.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{user.email}</p>
              
              <span className="mt-3.5 inline-block text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20 px-3 py-1 rounded-full">
                {roleLabels[user.role] || user.role}
              </span>

              {/* Trust score gauge */}
              <div className="w-full mt-6 bg-white/5 rounded-2xl p-3 border border-white/5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Trust Score</span>
                  <span className="text-brand-400 font-extrabold">{user.trustScore}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="bg-gradient-to-r from-brand-600 to-brand-500 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    style={{ width: `${user.trustScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-left leading-normal">
                  Calculated based on donation completion reliability and user verification indices.
                </p>
              </div>
            </div>

            {/* Metrics block based on Role */}
            <div className="glass-panel p-5 border-white/5">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-brand-500" /> Platform Impact Metrics
              </h3>

              {user.role === 'DONOR' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Meals Saved</span>
                    <span className="text-lg font-bold text-white">{user.mealsSaved || 0}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Impact Points</span>
                    <span className="text-lg font-bold text-brand-400">{user.impactPoints || 0} pts</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 col-span-2 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">CO2 Avoided</span>
                      <span className="text-base font-bold text-emerald-400">{user.co2Reduction?.toFixed(1) || '0.0'} kg</span>
                    </div>
                    <Flame className="h-6 w-6 text-brand-500 animate-float" />
                  </div>
                </div>
              )}

              {user.role === 'NGO' && (
                <div className="space-y-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Capacity Capacity</span>
                      <p className="text-base font-bold text-white">{user.ngoCapacity || 100} meals / day</p>
                    </div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Verification Status</span>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        user.ngoVerificationStatus === 'APPROVED'
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          : user.ngoVerificationStatus === 'PENDING'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {user.ngoVerificationStatus || 'PENDING'}
                    </span>
                  </div>
                </div>
              )}

              {user.role === 'VOLUNTEER' && (
                <div className="space-y-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Availability Status</span>
                    <span className="text-sm font-semibold text-white block mt-1">
                      {volAvailability === 'AVAILABLE' ? '🟢 Available' : volAvailability === 'BUSY' ? '🟡 Busy' : '⚫ Offline'}
                    </span>
                  </div>
                </div>
              )}

              {user.role === 'ADMIN' && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                  <p className="text-xs text-slate-300">
                    Administrator privilege level unlocks full verification controllers and platform settings.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Edit Form Console */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Avatar settings card */}
            <div className="glass-panel p-6 border-white/5">
              <h3 className="text-base font-bold text-white mb-4 text-outfit">
                Profile Avatar Configuration
              </h3>
              
              {/* Presets selection */}
              <p className="text-xs text-slate-400 mb-3">Select one of our preset avatars:</p>
              <div className="flex flex-wrap gap-3 mb-6">
                {PRESET_AVATARS.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePresetSelect(url)}
                    className={`h-12 w-12 rounded-full overflow-hidden border-2 transition-all duration-200 ${
                      profilePicture === url
                        ? 'border-brand-500 scale-110 shadow-lg shadow-brand-500/20'
                        : 'border-transparent hover:border-slate-500 hover:scale-105'
                    }`}
                  >
                    <img src={url} alt={`Preset ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Custom Image URL form */}
              <form onSubmit={handleCustomPicSubmit} className="flex gap-2 flex-col sm:flex-row mb-4">
                <div className="relative flex-grow">
                  <input
                    type="url"
                    placeholder="Or enter custom image URL..."
                    value={customPicUrl}
                    onChange={(e) => setCustomPicUrl(e.target.value)}
                    className="w-full glass-input text-sm text-slate-100 placeholder-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-white hover:text-brand-400 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Apply URL
                </button>
              </form>

              {/* Device file upload option */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <p className="text-xs text-slate-400">Or upload a profile photo from your device:</p>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-upload"
                  />
                  <label
                    htmlFor="profile-upload"
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-lg text-sm cursor-pointer transition-all inline-block"
                  >
                    Select Photo File
                  </label>
                  {uploadProgress && (
                    <span className="text-xs text-slate-400 font-semibold">{uploadProgress}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile fields form */}
            <form onSubmit={handleSubmit} className="glass-panel p-6 border-white/5 space-y-5">
              <h3 className="text-base font-bold text-white border-b border-white/5 pb-3 text-outfit">
                Update Profile Information
              </h3>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-brand-500" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-brand-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter contact mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-500" /> Physical Address
                </label>
                <textarea
                  placeholder="Enter street, city, postal code address details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full glass-input resize-none"
                />
              </div>

              {/* Volunteer Availability status selector */}
              {user.role === 'VOLUNTEER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-500" /> Availability Status
                  </label>
                  <select
                    value={volAvailability}
                    onChange={(e) => setVolAvailability(e.target.value as any)}
                    className="w-full glass-input"
                  >
                    <option value="AVAILABLE">🟢 Available (Ready for Pickups)</option>
                    <option value="BUSY">🟡 Busy (On active run / unavailable)</option>
                    <option value="OFFLINE">⚫ Offline (Offline mode)</option>
                  </select>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-dark-900 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-500/20"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="h-4.5 w-4.5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Permanent Account Deletion Section */}
            <div className="glass-panel p-6 border-red-500/20 bg-red-500/5 space-y-3 text-left">
              <h4 className="text-sm font-bold text-red-400 text-outfit">Danger Zone — Delete Account</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Self-service account deletion is available starting 24 hours after account registration. Permanently erases your credentials.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <ShieldAlert className="h-4 w-4" /> Delete Account Permanently
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
