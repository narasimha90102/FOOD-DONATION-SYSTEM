"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { Landmark, RefreshCw, ArrowLeft, Search, Filter, Compass, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatDateOnly } from '../../../utils/formatDate';

interface DonationItem {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  status: string;
  createdAt: string;
  donor?: {
    name: string;
    email: string;
  };
  ngo?: {
    name: string;
  };
  volunteer?: {
    name: string;
  };
}

export default function AdminDonationsPanel() {
  const { user, isAuthenticated } = useAppStore();
  const router = useRouter();
  
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [filtered, setFiltered] = useState<DonationItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search/Filters states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Guard
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'ADMIN') {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  const fetchDonations = async () => {
    try {
      setRefreshing(true);
      const res = await ApiService.get('/donations?status=');
      setDonations(res.donations || []);
      setFiltered(res.donations || []);
    } catch (err) {
      console.error('[AdminDonations] Fetch error:', err);
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
      await fetchDonations();
    } catch (err: any) {
      alert(err.message || "Failed to cancel donation.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // Run filtering logic whenever filter states update
  useEffect(() => {
    let result = [...donations];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        d => d.foodName.toLowerCase().includes(q) ||
             (d.donor && d.donor.name.toLowerCase().includes(q)) ||
             (d.ngo && d.ngo.name.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(d => d.foodCategory === categoryFilter);
    }

    setFiltered(result);
  }, [search, statusFilter, categoryFilter, donations]);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <Landmark className="h-8 w-8 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading donation registries...</p>
      </div>
    );
  }

  const foodCategoriesList = ['Veg Meal', 'Non-Veg Meal', 'Dry Rations', 'Bakery', 'Fruits', 'Vegetables', 'Other'];
  const donationStatusesList = ['PENDING', 'APPROVED', 'NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED'];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      
      {/* Header back button */}
      <div className="flex items-center gap-4 justify-between">
        <button
          onClick={() => router.push('/admin')}
          className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 hover:bg-white/5 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Console
        </button>

        <button
          onClick={fetchDonations}
          disabled={refreshing}
          className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="border-b border-white/5 pb-4">
        <h1 className="text-3xl font-bold text-white text-outfit">Donation Registry Auditor</h1>
        <p className="text-slate-400 text-sm mt-1">Audit, search, and monitor every surplus donation posted inside the system.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search by Food Name, Donor, or NGO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full glass-input"
          >
            <option value="ALL">All Statuses</option>
            {donationStatusesList.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full glass-input"
          >
            <option value="ALL">All Categories</option>
            {foodCategoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Donations list table */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-16 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-10 w-10 text-slate-500" />
          <p className="text-slate-400 text-sm">No donations match your selected filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-panel border-white/5 p-4">
          <table className="w-full text-left text-xs leading-normal text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[9px]">
                <th className="py-3 px-4">Donation ID</th>
                <th className="py-3 px-4">Surplus Item</th>
                <th className="py-3 px-4">Donor Profile</th>
                <th className="py-3 px-4">Assigned NGO</th>
                <th className="py-3 px-4">Assigned Driver</th>
                <th className="py-3 px-4">Date Uploaded</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-mono text-[10px] text-slate-400">#{item._id.substring(12)}</td>
                  <td className="py-4 px-4 font-bold text-white">
                    <span className="block">{item.foodName}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{item.quantity} {item.unit} | {item.foodCategory}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="block font-medium">{item.donor?.name || 'Deleted Donor'}</span>
                    <span className="text-[10px] text-slate-500">{item.donor?.email}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-200">{item.ngo?.name || '—'}</td>
                  <td className="py-4 px-4 text-slate-200">{item.volunteer?.name || '—'}</td>
                  <td className="py-4 px-4">{formatDateOnly(item.createdAt)}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${
                      item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      item.status === 'PENDING' ? 'bg-brand-500/10 text-brand-500 border-brand-500/25' :
                      ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(item.status) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right flex items-center justify-end gap-3.5">
                    <Link href={`/donations/${item._id}`} className="text-brand-500 hover:text-brand-400 font-semibold underline">
                      Audit Logs
                    </Link>
                    {!['COMPLETED', 'DELIVERED', 'DISTRIBUTED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
                      <>
                        <Link
                          href={`/donor/donate?id=${item._id}`}
                          className="bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded border border-white/10 text-[10px] font-bold transition-all"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleCancelDonation(item._id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 px-2 py-1 rounded text-[10px] font-bold transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
