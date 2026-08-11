"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Heart, Compass, ShieldCheck, Award, Zap, RefreshCw, BarChart2, PlusCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatDateOnly } from '../../utils/formatDate';

interface DonationItem {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  status: string;
  createdAt: string;
  aiFreshnessScore: number;
  aiRiskLevel: string;
}

export default function DonorDashboard() {
  const { user, isAuthenticated } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Auth guard: redirect to login if not authenticated after hydration
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      // Fetch Stats & Listings
      const statsRes = await ApiService.get('/donations/donor-stats');
      const historyRes = await ApiService.get('/donations?status=');

      setStats(statsRes.stats);
      setHistory(historyRes.donations);
    } catch (err) {
      console.error('[DonorDashboard] Fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelDonation = async (donationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this donation?")) {
      return;
    }
    try {
      setRefreshing(true);
      await ApiService.put(`/donations/${donationId}/status`, { status: 'CANCELLED' });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel donation.");
    } finally {
      setRefreshing(false);
    }
  };

  // Only fetch once mounted (so localStorage token is available) and authenticated
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchDashboardData();
    }
  }, [mounted, isAuthenticated]);

  // Synchronize with real-time updates via Socket.io broadcast CustomEvents
  useEffect(() => {
    const handleDonationUpdate = () => {
      console.log('[DonorDashboard] Real-time donation update triggered. Refetching...');
      fetchDashboardData();
    };
    window.addEventListener('donation_update', handleDonationUpdate);
    return () => {
      window.removeEventListener('donation_update', handleDonationUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Compiling surplus analytics...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Listings',
      value: stats?.totalDonationsPosted ?? 0,
      sub: 'All time posts',
      icon: Heart,
      color: 'text-brand-500',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Active Now',
      value: stats?.activeDonationsCount ?? 0,
      sub: 'Awaiting / In transit',
      icon: Compass,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Completed',
      value: stats?.completedDonationsCount ?? 0,
      sub: 'Successfully delivered',
      icon: BarChart2,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
    },
    {
      label: 'Trust Index',
      value: `${stats?.trustScore ?? 85}%`,
      sub: 'Donor reliability score',
      icon: ShieldCheck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  // Human-friendly label + color map for donation statuses
  const statusDisplay: Record<string, { label: string; color: string }> = {
    PENDING:   { label: '🟢 Available',       color: 'bg-brand-500/10 text-brand-500 border-brand-500/25' },
    ACCEPTED:  { label: '✅ Accepted by NGO', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    PICKED_UP: { label: '🚚 En Route',         color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    COMPLETED: { label: '🎉 Completed',        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    CANCELLED: { label: '❌ Cancelled',        color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white text-outfit">Surplus Donor Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Hello, {user?.name}. Review your active surplus contributions and impact metrics.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/donor/donate" className="bg-brand-500 hover:bg-brand-600 text-dark-900 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-brand-500/15 flex items-center gap-1.5">
            <PlusCircle className="h-4.5 w-4.5" /> Post Surplus Food
          </Link>
        </div>
      </div>

      {/* 2. Operational Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-panel p-3 sm:p-6 border-white/5 flex items-center gap-2 sm:gap-4 min-w-0">
              <div className={`${card.bg} p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[10px] sm:text-xs font-semibold truncate">{card.label}</span>
                <span className="text-lg sm:text-2xl font-bold text-white text-outfit mt-0.5 leading-tight">{card.value}</span>
                <span className="text-slate-500 text-[9px] sm:text-[11px] mt-0.5 truncate">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Main Area Grid (Certificates, History) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Donation listings (Left side - takes 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Surplus History</h3>
            <span className="bg-white/5 text-slate-400 text-xs px-2 py-0.5 rounded border border-white/5">{history.length} Total Logs</span>
          </div>

          {history.length === 0 ? (
            <div className="glass-panel p-12 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
              <Compass className="h-10 w-10 text-slate-500" />
              <p className="text-slate-400 text-sm">No food surplus listed yet. Tap the button above to upload a listing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item._id} className="glass-panel p-5 border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white text-outfit">{item.foodName}</h4>
                      <span className="text-xs bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-300">{item.foodCategory}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Quantity: <strong>{item.quantity} {item.unit}</strong> | Uploaded: {formatDateOnly(item.createdAt)}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-brand-500 font-semibold">
                        <span>AI Freshness Index:</span>
                        <span className="bg-brand-500/10 border border-brand-500/25 px-1.5 py-0.5 rounded text-[10px]">{item.aiFreshnessScore || 90}%</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        item.aiRiskLevel === 'danger' ? 'bg-red-500/10 text-red-400' :
                        item.aiRiskLevel === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {item.aiRiskLevel || 'safe'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold tracking-wide border ${
                      (statusDisplay[item.status] || { color: 'bg-white/5 text-slate-300 border-white/5' }).color
                    }`}>
                      {(statusDisplay[item.status] || { label: item.status }).label}
                    </span>

                    {!['COMPLETED', 'DELIVERED', 'DISTRIBUTED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/donor/donate?id=${item._id}`}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold transition-all"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleCancelDonation(item._id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {(item.status === 'ACCEPTED' || item.status === 'PICKED_UP') && (
                      <Link href="/donor/chat" className="bg-white/5 hover:bg-white/10 text-slate-300 p-2 rounded-lg transition-colors border border-white/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certificate panel (Right side - takes 1 col) */}
        <div className="flex flex-col gap-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Verification & Certificates</h3>
          </div>

          <div className="glass-panel p-6 border-white/5 bg-gradient-to-br from-brand-500/5 to-teal-500/5 flex flex-col gap-4 text-center justify-between h-fit">
            <div className="bg-brand-500/10 border border-brand-500/25 p-4 rounded-full w-fit mx-auto">
              <Award className="h-10 w-10 text-brand-500 fill-brand-500/25" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white text-outfit">Carbon Offset Certificate</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Unlock your verified Carbon Offset Certificate demonstrating direct savings generated by food surplus redirection. Suitable for ESG audit requirements.
              </p>
            </div>
            
            <Link href="/donor/certificates" className="w-full bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2">
              <Award className="h-4 w-4" />
              <span>Download SVG/PDF Certificate</span>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
