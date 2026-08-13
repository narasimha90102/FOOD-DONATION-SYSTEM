"use client";

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { History, Compass, CheckCircle2, PackageCheck, Users, ExternalLink, Calendar, MapPin, Building, AlertCircle } from 'lucide-react';
import { formatISTDateTime } from '../../../utils/formatDate';

interface HistoryItem {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  pickupAddress: string;
  specialInstructions?: string;
  estimatedExpiryTime?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  distributedQuantity?: number;
  beneficiariesCount?: number;
  distributionLocation?: string;
  donor?: {
    _id?: string;
    name?: string;
    trustScore?: number;
  };
  volunteer?: {
    name?: string;
    phoneNumber?: string;
  };
}

export default function NgoHistoryPage() {
  const { user } = useAppStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DISTRIBUTED' | 'DELIVERED' | 'CANCELLED_EXPIRED'>('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await ApiService.get('/donations?status=');
      if (res.success && res.donations) {
        setHistory(res.donations);
      }
    } catch (err) {
      console.error('[NgoHistory] Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return formatISTDateTime(dateStr);
  };

  // Filter items based on active tab
  const filteredHistory = history.filter((item) => {
    if (filter === 'DISTRIBUTED') {
      return ['DISTRIBUTED', 'REDISTRIBUTED_TO_BENEFICIARIES', 'COMPLETED'].includes(item.status);
    }
    if (filter === 'DELIVERED') {
      return item.status === 'DELIVERED';
    }
    if (filter === 'CANCELLED_EXPIRED') {
      return ['CANCELLED', 'EXPIRED', 'REJECTED'].includes(item.status);
    }
    return true; // ALL
  });

  // Calculate summary stats
  const totalClaimed = history.length;
  const totalDistributed = history.filter((h) => ['DISTRIBUTED', 'REDISTRIBUTED_TO_BENEFICIARIES', 'COMPLETED'].includes(h.status)).length;
  const totalBeneficiaries = history.reduce((sum, h) => sum + (h.beneficiariesCount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISTRIBUTED':
      case 'REDISTRIBUTED_TO_BENEFICIARIES':
      case 'COMPLETED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">✅ Distributed</span>;
      case 'DELIVERED':
        return <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">🚚 Delivered to NGO</span>;
      case 'IN_TRANSIT':
      case 'PICKED_UP':
      case 'GOING_TO_PICKUP':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">⏱️ In Pipeline</span>;
      case 'ACCEPTED':
      case 'NGO_ACCEPTED':
      case 'VOLUNTEER_ASSIGNED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">📌 Claimed</span>;
      case 'CANCELLED':
      case 'REJECTED':
      case 'EXPIRED':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">❌ {status}</span>;
      default:
        return <span className="bg-white/5 text-slate-300 border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 border border-brand-500/20 rounded-xl">
              <History className="h-6 w-6 text-brand-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-outfit tracking-tight">
              NGO Claim & Distribution History
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Historical logs of all food surplus items claimed, received, distributed, or processed by {user?.name || 'your NGO'}.
          </p>
        </div>

        <NextLink
          href="/ngo"
          className="bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shrink-0"
        >
          <Compass className="h-4 w-4" />
          <span>Active Radar & Pipeline</span>
        </NextLink>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl shrink-0">
              <PackageCheck className="h-6 w-6 text-brand-500" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Claimed</span>
              <span className="text-2xl font-bold text-white text-outfit leading-tight mt-0.5 block">{totalClaimed}</span>
              <span className="text-slate-500 text-[10px]">Surplus listings accepted</span>
            </div>
          </div>

          <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Distributed</span>
              <span className="text-2xl font-bold text-white text-outfit leading-tight mt-0.5 block">{totalDistributed}</span>
              <span className="text-slate-500 text-[10px]">Successfully served</span>
            </div>
          </div>

          <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl shrink-0">
              <Users className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Beneficiaries Served</span>
              <span className="text-2xl font-bold text-white text-outfit leading-tight mt-0.5 block">{totalBeneficiaries}</span>
              <span className="text-slate-500 text-[10px]">Meals / people reached</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 pb-3 scrollbar-none">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'ALL'
                ? 'bg-brand-500 text-dark-900 shadow-lg'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            All Logs ({history.length})
          </button>
          <button
            onClick={() => setFilter('DISTRIBUTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'DISTRIBUTED'
                ? 'bg-emerald-500 text-dark-900 shadow-lg'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Distributed / Completed ({history.filter((h) => ['DISTRIBUTED', 'REDISTRIBUTED_TO_BENEFICIARIES', 'COMPLETED'].includes(h.status)).length})
          </button>
          <button
            onClick={() => setFilter('DELIVERED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'DELIVERED'
                ? 'bg-teal-500 text-dark-900 shadow-lg'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Delivered — Pending Log ({history.filter((h) => h.status === 'DELIVERED').length})
          </button>
          <button
            onClick={() => setFilter('CANCELLED_EXPIRED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'CANCELLED_EXPIRED'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Cancelled / Expired ({history.filter((h) => ['CANCELLED', 'EXPIRED', 'REJECTED'].includes(h.status)).length})
          </button>
        </div>

        {/* History Item Cards */}
        {loading ? (
          <div className="glass-panel p-12 text-center text-slate-400 text-xs">
            Loading NGO history records...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="glass-panel p-12 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
            <History className="h-10 w-10 text-slate-500" />
            <p className="text-slate-400 text-sm">No history logs found for the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <div key={item._id} className="glass-panel p-5 border-white/5 hover:border-white/10 transition-all flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white text-outfit">{item.foodName}</h3>
                    <span className="text-xs bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-300">
                      {item.foodCategory}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[9px] block">Surplus Quantity</span>
                    <strong className="text-white text-sm block mt-0.5">{item.quantity} {item.unit}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[9px] block">Donor Center</span>
                    <strong className="text-white block mt-0.5">{item.donor?.name || 'Private Donor'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[9px] block">Consume By / Expiry</span>
                    <strong className="text-amber-400 block mt-0.5">
                      {item.estimatedExpiryTime ? formatISTDateTime(item.estimatedExpiryTime) : 'N/A'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 uppercase font-bold text-[9px] block">Pickup Location</span>
                    <div className="flex items-start gap-1 text-slate-300 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{item.pickupAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Building / Location Instructions display */}
                {item.specialInstructions && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200">
                    <span className="font-bold text-amber-400 text-[10px] uppercase flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" /> Building / Location Pickup Instructions:
                    </span>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">{item.specialInstructions}</p>
                  </div>
                )}

                {/* Distribution details if distributed */}
                {(item.beneficiariesCount || item.distributionLocation) && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-emerald-400 block text-[10px] uppercase">Distribution Beneficiaries:</span>
                      <span className="text-white font-semibold">{item.beneficiariesCount || 0} People Served</span>
                    </div>
                    {item.distributionLocation && (
                      <div>
                        <span className="font-bold text-emerald-400 block text-[10px] uppercase">Distribution Site:</span>
                        <span className="text-slate-300">{item.distributionLocation}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                  {item.status === 'DELIVERED' && (
                    <NextLink
                      href={`/ngo/distribution/${item._id}`}
                      className="bg-emerald-500 hover:bg-emerald-600 text-dark-900 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5"
                    >
                      <span>Log Distribution</span>
                    </NextLink>
                  )}

                  <NextLink
                    href={`/donations/${item._id}`}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>View Track Details</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </NextLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
