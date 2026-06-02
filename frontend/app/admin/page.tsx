"use client";

import { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Landmark, Users, ShieldAlert, BarChart3, RefreshCw, CheckCircle2, XCircle, Trash2, ShieldClose, Lock, Unlock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminPanel() {
  const { user } = useAppStore();
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const analyticRes = await ApiService.get('/admin/analytics');
      const usersRes = await ApiService.get('/admin/users');

      setAnalytics(analyticRes.analytics);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error('[AdminPanel] Error fetching metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyNgo = async (ngoId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(ngoId);
      await ApiService.put(`/admin/ngos/${ngoId}/verify`, { status });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Verification update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);
      await ApiService.put(`/admin/users/${targetUserId}/block`, {});
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Block update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <Landmark className="h-8 w-8 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400">Mounting admin telemetry boards...</p>
      </div>
    );
  }

  const numericStats = [
    { label: 'Total Donors', value: analytics?.users?.donors || 0, icon: Users, color: 'text-brand-500' },
    { label: 'Active NGOs', value: analytics?.users?.ngos || 0, icon: Landmark, color: 'text-cyan-400' },
    { label: 'Redistributed Servings', value: analytics?.impact?.mealsSaved || 0, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'CO₂ Prevention Offset', value: `${analytics?.impact?.co2Reduction || 0} kg`, icon: BarChart3, color: 'text-teal-400' },
  ];

  // Map database aggregations for Recharts
  const chartData = (analytics?.categories || []).map((c: any) => ({
    name: c.category,
    Count: c.count,
  }));

  // Filter NGO verification requests
  const pendingNgosList = users.filter(u => u.role === 'NGO' && u.ngoVerificationStatus === 'PENDING');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* 1. Panel Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white text-outfit flex items-center gap-2">
            <Landmark className="h-8 w-8 text-amber-500" /> Admin Console Panel
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure global parameters, manage credentials, verify NGO documents, and audit telemetry metrics.</p>
        </div>
        
        <button
          onClick={fetchAdminData}
          disabled={refreshing}
          className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2. Numeric Statistics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {numericStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-6 border-white/5 flex items-center gap-4">
              <div className="bg-white/5 p-3 rounded-xl">
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-semibold">{stat.label}</span>
                <span className="text-xl sm:text-2xl font-bold text-white text-outfit mt-0.5">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Recharts Surplus Categories Chart & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Category distribution charts (Takes 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 border-white/5 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white text-outfit">Surplus Categories Frequency Chart</h3>
          
          <div className="w-full h-80">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                No active listing categorizations recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981', fontSize: '12px' }}
                  />
                  <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pending approvals drawer (Takes 1 col) */}
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white text-outfit border-b border-white/5 pb-2">NGO Verification Queue</h3>

          {pendingNgosList.length === 0 ? (
            <div className="glass-panel p-8 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-brand-500" />
              <p className="text-slate-400 text-xs">All NGO registration applications verified. Secure network is clean.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingNgosList.map((ngo) => (
                <div key={ngo._id} className="glass-panel p-5 border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <h4 className="text-sm font-bold text-white leading-tight">{ngo.name}</h4>
                    <p className="text-slate-400">Reg No: <strong>{ngo.businessRegistrationNumber}</strong></p>
                    <p className="text-slate-400">Address: <span>{ngo.address}</span></p>
                    
                    <a
                      href={ngo.ngoDocumentUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 underline font-bold mt-1 block"
                    >
                      Inspect Legal Document PDF
                    </a>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleVerifyNgo(ngo._id, 'APPROVED')}
                      disabled={actionLoading === ngo._id}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve NGO
                    </button>
                    
                    <button
                      onClick={() => handleVerifyNgo(ngo._id, 'REJECTED')}
                      disabled={actionLoading === ngo._id}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Reject NGO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Complete accounts blocking grid */}
      <div className="flex flex-col gap-4 border-t border-white/5 pt-10">
        <h3 className="text-lg font-bold text-white text-outfit">Surplus Account Controller</h3>
        
        <div className="overflow-x-auto glass-panel border-white/5 p-4">
          <table className="w-full text-left text-xs leading-normal text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Surplus Coordinator</th>
                <th className="py-3 px-4">Registry Email</th>
                <th className="py-3 px-4">Active Role</th>
                <th className="py-3 px-4">Trust Scoring</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-bold text-white">{item.name}</td>
                  <td className="py-4 px-4">{item.email}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                      item.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400' :
                      item.role === 'NGO' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-brand-500/10 text-brand-500'
                    }`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-semibold text-brand-500">{item.trustScore || 85}%</td>
                  <td className="py-4 px-4 uppercase text-[10px] font-bold">
                    {item.role === 'NGO' ? item.ngoVerificationStatus : 'N/A'}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {item.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleToggleBlock(item._id)}
                        disabled={actionLoading === item._id}
                        className={`px-3 py-1.5 rounded font-bold transition-all inline-flex items-center gap-1.5 ${
                          item.isBlocked
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {item.isBlocked ? (
                          <>
                            <Unlock className="h-3 w-3" /> Activate Account
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" /> Suspend Account
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
