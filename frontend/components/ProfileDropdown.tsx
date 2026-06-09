import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Calendar, Shield, Settings, LogOut, Award } from 'lucide-react';
import UserAvatar from './UserAvatar';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  profilePicture?: string;
  isVerified: boolean;
  impactPoints: number;
  mealsSaved: number;
  co2Reduction: number;
  activeStreak: number;
  trustScore: number;
  ngoVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
  ngoCapacity?: number;
  ngoAcceptedCategories?: string[];
  address?: string;
  phoneNumber?: string;
  createdAt?: Date | string;
}

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
}

export default function ProfileDropdown({
  isOpen,
  onClose,
  user,
  onLogout,
}: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside of the dropdown container
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if we didn't click on the toggling avatar button
        const target = event.target as HTMLElement;
        if (!target.closest('.avatar-toggle-btn')) {
          onClose();
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format creation date
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'June 2026';

  // Role badges colors
  const roleColors = {
    ADMIN: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    NGO: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    DONOR: 'bg-brand-500/10 text-brand-400 border border-brand-500/20',
  };

  const currentRoleColor = roleColors[user.role] || roleColors.DONOR;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel p-4 shadow-2xl z-50 border border-white/10 animate-in fade-in slide-in-from-top-3 duration-200"
      style={{
        background: 'rgba(17, 24, 39, 0.9)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header Profile Section */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-white/5">
        <UserAvatar
          src={user.profilePicture}
          name={user.name}
          size="lg"
          className="mb-3 border-2 border-brand-500"
        />
        <h4 className="text-base font-bold text-white tracking-wide truncate max-w-full">
          {user.name}
        </h4>
        <span className={`mt-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${currentRoleColor}`}>
          {user.role}
        </span>
      </div>

      {/* User Info Details */}
      <div className="py-4 space-y-3.5 border-b border-white/5 text-xs">
        {/* Email */}
        <div className="flex items-center gap-3 text-slate-300">
          <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
            <Mail className="h-4.5 w-4.5 text-brand-500" />
          </div>
          <div className="truncate min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Email Address</p>
            <p className="text-white truncate font-medium">{user.email}</p>
          </div>
        </div>

        {/* Mobile Number */}
        <div className="flex items-center gap-3 text-slate-300">
          <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
            <Phone className="h-4.5 w-4.5 text-brand-500" />
          </div>
          <div className="truncate min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Mobile Number</p>
            <p className="text-white font-medium">
              {user.phoneNumber || <span className="text-slate-500 italic">Not provided</span>}
            </p>
          </div>
        </div>

        {/* Joined Date */}
        <div className="flex items-center gap-3 text-slate-300">
          <div className="p-1.5 rounded-lg bg-white/5 text-slate-400">
            <Calendar className="h-4.5 w-4.5 text-brand-500" />
          </div>
          <div className="truncate min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Account Created</p>
            <p className="text-white font-medium">{joinedDate}</p>
          </div>
        </div>

        {/* Trust Score */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-brand-500" /> Trust Score
            </span>
            <span className="text-brand-400 font-bold">{user.trustScore || 85}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              style={{ width: `${user.trustScore || 85}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dropdown Action Buttons */}
      <div className="pt-3 flex flex-col gap-1.5">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 hover:text-brand-400 transition-all border border-white/5 hover:border-brand-500/20"
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-brand-500" /> Edit Profile
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-brand-400">View</span>
        </Link>

        <button
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 w-full text-left"
        >
          <LogOut className="h-4 w-4" /> Logout Account
        </button>
      </div>
    </div>
  );
}
