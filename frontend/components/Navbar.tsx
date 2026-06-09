"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '../store/useAppStore';
import { LogOut, Bell, Heart, Menu, X, Landmark, Compass, Award } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import UserAvatar from './UserAvatar';
import ProfileDropdown from './ProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import { ApiService } from '../services/api';

export default function Navbar() {
  const { user, logout, isAuthenticated, notifications, setNotifications } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Prevent React hydration mismatch: Zustand reads localStorage only on client,
  // so server renders isAuthenticated=false. We defer auth-dependent UI until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Fetch existing notifications on mount
  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      ApiService.get('/notifications')
        .then((res) => {
          if (res.success && res.notifications) {
            setNotifications(res.notifications);
          }
        })
        .catch((err) => console.error('[Navbar] Error fetching notifications:', err));
    }
  }, [mounted, isAuthenticated, user, setNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const desktopNavRef = useRef<HTMLDivElement>(null);
  const mobileNavRef  = useRef<HTMLDivElement>(null);

  const [desktopCoords, setDesktopCoords] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const [mobileCoords,  setMobileCoords]  = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  // Recalculate sliding indicator position whenever route or auth state changes
  useEffect(() => {
    const updateCoords = () => {
      // Desktop
      if (desktopNavRef.current) {
        const el = desktopNavRef.current.querySelector(`[data-nav-item="${pathname}"]`) as HTMLElement | null;
        if (el) {
          const cr = desktopNavRef.current.getBoundingClientRect();
          const er = el.getBoundingClientRect();
          setDesktopCoords({ left: er.left - cr.left, top: er.top - cr.top, width: er.width, height: er.height, opacity: 1 });
        } else {
          setDesktopCoords(p => ({ ...p, opacity: 0 }));
        }
      }
      // Mobile
      if (mobileNavRef.current) {
        const el = mobileNavRef.current.querySelector(`[data-nav-item="${pathname}"]`) as HTMLElement | null;
        if (el) {
          const cr = mobileNavRef.current.getBoundingClientRect();
          const er = el.getBoundingClientRect();
          setMobileCoords({ left: er.left - cr.left, top: er.top - cr.top, width: er.width, height: er.height, opacity: 1 });
        } else {
          setMobileCoords(p => ({ ...p, opacity: 0 }));
        }
      }
    };

    updateCoords();
    // Safety net for async DOM paint
    const t1 = setTimeout(updateCoords, 60);
    const t2 = setTimeout(updateCoords, 350);
    window.addEventListener('resize', updateCoords);
    return () => { window.removeEventListener('resize', updateCoords); clearTimeout(t1); clearTimeout(t2); };
  }, [pathname, isAuthenticated, user, mobileOpen, mounted]);

  // Close panels on navigation
  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); setBellOpen(false); }, [pathname]);

  // ── Class helpers ────────────────────────────────────────────────────────────
  // Plain text nav link that the slider slides behind (Home / About / Contact / Dashboard / Chats)
  const navLink = (href: string, extra = '') => {
    const active = pathname === href;
    return `relative z-10 text-sm font-medium px-4 py-2 rounded-2xl transition-colors duration-200 ${extra} ${
      active ? 'text-[#000000] font-semibold' : 'text-slate-300 hover:text-white'
    }`;
  };

  // Ghost outline pill – Login button (slider can also move behind it)
  const loginLink = (href: string) => {
    const active = pathname === href;
    return `relative z-10 text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
      active
        ? 'border-brand-500 text-[#000000] font-bold'         // slider is behind it
        : 'border-white/25 text-slate-200 hover:border-brand-500/60 hover:text-white'
    }`;
  };

  // Solid filled pill – Sign Up CTA (slider moves under it; its own bg is always visible)
  const signUpLink = () =>
    `relative z-10 text-sm font-bold px-5 py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-[#000000] shadow-lg hover:shadow-brand-500/30 transition-all duration-200`;

  // Mobile nav link
  const mobileNavLink = (href: string) => {
    const active = pathname === href;
    return `relative z-10 block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
      active ? 'text-[#000000] font-semibold' : 'text-slate-300 hover:text-white'
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-dark-900/80 border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ────────────────────────────────────────────────────────── */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-brand-500/10 p-2 rounded-lg border border-brand-500/25 group-hover:scale-105 transition-transform duration-300">
                <Heart className="h-6 w-6 text-brand-500 fill-brand-500/20" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white text-outfit">
                FoodBridge<span className="text-brand-500">.AI</span>
              </span>
            </Link>
          </div>

          {/* ── Desktop Nav ─────────────────────────────────────────────────── */}
          <div ref={desktopNavRef} className="hidden md:flex items-center gap-1 relative">

            {/* Premium sliding pill indicator */}
            <div
              className="absolute pointer-events-none rounded-2xl bg-brand-500 transition-all duration-[400ms] ease-in-out"
              style={{
                left:    desktopCoords.left,
                top:     desktopCoords.top,
                width:   desktopCoords.width,
                height:  desktopCoords.height,
                opacity: desktopCoords.opacity,
                zIndex:  0,
                boxShadow: desktopCoords.opacity ? '0 0 16px 2px rgba(16,185,129,0.35)' : 'none',
              }}
            />

            {/* Public links — only shown when logged OUT */}
            {(!mounted || !isAuthenticated) && (
              <>
                <Link href="/"        data-nav-item="/"        className={navLink('/')}>Home</Link>
                <Link href="/about"   data-nav-item="/about"   className={navLink('/about')}>About</Link>
                <Link href="/contact" data-nav-item="/contact" className={navLink('/contact')}>Contact</Link>
              </>
            )}

            {/* ── Authenticated section ── */}
            {mounted && isAuthenticated && user && (
              <div className="flex items-center gap-1 ml-2 pl-4 border-l border-white/10">

                {/* Donor */}
                {user.role === 'DONOR' && (
                  <>
                    <Link href="/donor/donate"
                      className="relative z-10 text-sm font-semibold px-4 py-2 rounded-full border border-brand-500 text-brand-500 hover:bg-brand-500/10 transition-all">
                      Donate Food
                    </Link>
                    <Link href="/donor"              data-nav-item="/donor"              className={navLink('/donor')}>Dashboard</Link>
                    <Link href="/donor/certificates" data-nav-item="/donor/certificates" className={navLink('/donor/certificates', 'flex items-center gap-1')}>
                      <Award className="h-3.5 w-3.5" /> Certificates
                    </Link>
                  </>
                )}

                {/* NGO */}
                {user.role === 'NGO' && (
                  <>
                    <Link href="/ngo"
                      className="relative z-10 text-sm font-semibold px-4 py-2 rounded-full border border-brand-500 text-brand-500 hover:bg-brand-500/10 transition-all flex items-center gap-1.5">
                      <Compass className="h-4 w-4" /> Nearby Radar
                    </Link>
                  </>
                )}

                {/* Admin */}
                {user.role === 'ADMIN' && (
                  <Link href="/admin"
                    className="relative z-10 text-sm font-semibold px-4 py-2 rounded-full border border-amber-500 text-amber-400 hover:bg-amber-500/10 transition-all flex items-center gap-1">
                    <Landmark className="h-4 w-4" /> Admin Console
                  </Link>
                )}

                {/* Bell */}
                <div className="relative z-10 ml-1">
                  <button
                    onClick={() => setBellOpen(!bellOpen)}
                    className="bell-toggle-btn text-slate-300 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={bellOpen}
                    onClose={() => setBellOpen(false)}
                  />
                </div>

                {/* Avatar dropdown */}
                <div className="relative z-10">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="avatar-toggle-btn flex items-center gap-2 hover:bg-white/5 px-2.5 py-1.5 rounded-xl transition-all border border-white/10">
                    <UserAvatar
                      src={user.profilePicture}
                      name={user.name}
                      size="xs"
                      className="border border-brand-500/50"
                    />
                    <span className="text-sm font-medium text-slate-200">{user.name.split(' ')[0]}</span>
                  </button>
                  <ProfileDropdown
                    isOpen={dropdownOpen}
                    onClose={() => setDropdownOpen(false)}
                    user={user}
                    onLogout={handleLogout}
                  />
                </div>
              </div>
            )}

            {/* ── Unauthenticated: Login + Sign Up ── */}
            {mounted && !isAuthenticated && (
              <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
                {/* Login – ghost outline pill, slider moves behind it */}
                <Link
                  href="/auth/login"
                  data-nav-item="/auth/login"
                  className={loginLink('/auth/login')}
                >
                  Login
                </Link>
                {/* Sign Up – plain nav link, slider moves to it on /auth/register */}
                <Link
                  href="/auth/register"
                  data-nav-item="/auth/register"
                  className={loginLink('/auth/register')}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile toggle ───────────────────────────────────────────────── */}
          <div className="md:hidden flex items-center gap-3">
            {mounted && isAuthenticated && (
              <div className="relative">
                <Bell className="h-5 w-5 text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-3.5 w-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-300 hover:text-white p-1 hover:bg-white/5 rounded-lg">
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu Panel ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div ref={mobileNavRef} className="md:hidden glass-panel border-t border-white/5 px-3 pt-3 pb-5 space-y-0.5 mx-3 my-2 relative">

          {/* Mobile sliding pill indicator */}
          <div
            className="absolute pointer-events-none rounded-xl bg-brand-500 transition-all duration-[400ms] ease-in-out"
            style={{
              left:    mobileCoords.left,
              top:     mobileCoords.top,
              width:   mobileCoords.width,
              height:  mobileCoords.height,
              opacity: mobileCoords.opacity,
              zIndex:  0,
              boxShadow: mobileCoords.opacity ? '0 0 12px 2px rgba(16,185,129,0.3)' : 'none',
            }}
          />

          {/* Public links — only shown when logged OUT */}
          {(!mounted || !isAuthenticated) && (
            <>
              <Link href="/"        data-nav-item="/"        className={mobileNavLink('/')}>Home</Link>
              <Link href="/about"   data-nav-item="/about"   className={mobileNavLink('/about')}>About</Link>
              <Link href="/contact" data-nav-item="/contact" className={mobileNavLink('/contact')}>Contact</Link>
            </>
          )}

          {mounted && isAuthenticated && user && (
            <div className="border-t border-white/5 pt-3 mt-2 space-y-0.5">
              <p className="px-4 text-xs font-semibold text-brand-500 uppercase tracking-wider pb-1">Dashboard</p>

              {user.role === 'DONOR' && (
                <>
                  <Link href="/donor/donate"        className="relative z-10 block px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-500 hover:bg-brand-500/10 transition-colors">Donate Food</Link>
                  <Link href="/donor"              data-nav-item="/donor"              className={mobileNavLink('/donor')}>Dashboard</Link>
                  <Link href="/donor/certificates" data-nav-item="/donor/certificates" className={mobileNavLink('/donor/certificates')}>Impact Certificates</Link>
                </>
              )}

              {user.role === 'NGO' && (
                <>
                  <Link href="/ngo"      className="relative z-10 block px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-500 hover:bg-brand-500/10 transition-colors">Nearby Radar</Link>
                </>
              )}

              {user.role === 'ADMIN' && (
                <Link href="/admin" className="relative z-10 block px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">Admin Control</Link>
              )}

              <Link href="/profile" data-nav-item="/profile" className={mobileNavLink('/profile')}>Edit Profile</Link>

              <button onClick={handleLogout} className="relative z-10 w-full text-left flex items-center gap-2 px-4 py-2.5 mt-1 text-red-400 hover:bg-white/5 rounded-xl text-sm font-medium transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}

          {mounted && !isAuthenticated && (
            <div className="border-t border-white/5 pt-4 mt-2 flex flex-col gap-2">
              <Link href="/auth/login"
                data-nav-item="/auth/login"
                className="relative z-10 text-center px-4 py-2.5 rounded-full border border-white/20 text-slate-200 hover:border-brand-500/60 hover:text-white text-sm font-semibold transition-all">
                Login
              </Link>
              <Link href="/auth/register"
                data-nav-item="/auth/register"
                className="relative z-10 text-center px-4 py-2.5 rounded-full border border-white/25 text-slate-200 hover:border-brand-500/60 hover:text-white text-sm font-semibold transition-all">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
