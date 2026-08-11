"use client";

import { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Landmark, Users, ShieldAlert, BarChart3, RefreshCw, CheckCircle2, XCircle, Trash2, ShieldClose, Lock, Unlock, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { formatDateOnly } from '../../utils/formatDate';

export default function AdminPanel() {
  const { user } = useAppStore();
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [aiStatus, setAiStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [analyticRes, usersRes, aiStatusRes] = await Promise.all([
        ApiService.get('/admin/analytics'),
        ApiService.get('/admin/users'),
        ApiService.get('/ai/status').catch(() => ({ status: 'Disconnected' }))
      ]);

      setAnalytics(analyticRes.analytics);
      setUsers(usersRes.users || []);
      setAiStatus(aiStatusRes.status || 'Disconnected');
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

  const handleApproveUser = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      if (!window.confirm("Are you sure you want to reject this user's registration?")) {
        return;
      }
    }
    try {
      setActionLoading(userId);
      await ApiService.put(`/admin/users/${userId}/approve`, { action });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Approval action failed.');
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

  const handleMakeAdmin = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to promote this user to Administrator?")) {
      return;
    }
    try {
      setActionLoading(targetUserId);
      await ApiService.put(`/admin/users/${targetUserId}/make-admin`, {});
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Make Admin action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this user account?")) {
      return;
    }
    try {
      setActionLoading(targetUserId);
      await ApiService.delete(`/admin/users/${targetUserId}`);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Delete user failed.');
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
    { label: 'Volunteers', value: analytics?.users?.volunteers || 0, icon: Users, color: 'text-amber-400' },
    { label: 'Redistributed Servings', value: analytics?.impact?.mealsSaved || 0, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'CO₂ Prevention Offset', value: `${analytics?.impact?.co2Reduction || 0} kg`, icon: BarChart3, color: 'text-teal-400' },
  ];

  // Map database aggregations for Recharts
  const chartData = (analytics?.categories || []).map((c: any) => ({
    name: c.category,
    Count: c.count,
  }));

  // Filter NGO and Volunteer pending verification requests
  const pendingNgosList = users.filter(u => u.role === 'NGO' && (u.approvalStatus === 'pending' || u.ngoVerificationStatus === 'PENDING'));
  const pendingVolunteersList = users.filter(u => u.role === 'VOLUNTEER' && u.approvalStatus === 'pending');

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
        
        <div className="flex items-center gap-3">
          <Link href="/admin/live-map" className="bg-brand-500 hover:bg-brand-600 text-dark-900 px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-all shadow-lg hover:shadow-brand-500/15">
            Live Activity Map
          </Link>
          <Link href="/admin/donations" className="border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-all shadow hover:text-white">
            Audit Registry
          </Link>
          <button
            onClick={fetchAdminData}
            disabled={refreshing}
            className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Numeric Statistics row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* AI System Status Banner */}
      <div className="glass-panel p-6 border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 p-2.5 rounded-lg text-brand-500 animate-glow shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">AI System Health</span>
            <span className="text-sm font-semibold text-white mt-0.5">Ollama local microservices verification</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-xs text-slate-300">
            <strong>Provider:</strong> <span className="text-white ml-1">Ollama</span>
          </div>
          <div className="text-xs text-slate-300">
            <strong>Model:</strong> <span className="text-white ml-1">qwen3:1.7b</span>
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-1.5">
            <strong>Status:</strong>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              aiStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {aiStatus}
            </span>
          </div>
        </div>
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
        <div className="flex flex-col gap-6 text-left">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-lg font-bold text-white text-outfit">Pending Approvals Queue</h3>
          </div>

          {/* NGOs Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending NGOs ({pendingNgosList.length})</h4>
            {pendingNgosList.length === 0 ? (
              <div className="glass-panel p-4 border-dashed border-white/10 text-center text-slate-500 text-xs">
                No pending NGO applications.
              </div>
            ) : (
              pendingNgosList.map((ngo) => (
                <div key={ngo._id} className="glass-panel p-5 border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-xs text-left">
                    <h5 className="text-sm font-bold text-white leading-tight">{ngo.name}</h5>
                    <p className="text-slate-400">Email: <strong>{ngo.email}</strong></p>
                    <p className="text-slate-400">Phone: <strong>{ngo.phoneNumber || 'N/A'}</strong></p>
                    {ngo.businessRegistrationNumber && (
                      <p className="text-slate-400">Reg No: <strong>{ngo.businessRegistrationNumber}</strong></p>
                    )}
                    <p className="text-slate-400">Reg Date: <span>{formatDateOnly(ngo.createdAt)}</span></p>
                    <p className="text-slate-400">Address: <span>{ngo.address || 'N/A'}</span></p>
                    {ngo.ngoDocumentUrl && (
                      <a
                        href={ngo.ngoDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-500 underline font-bold mt-1 block"
                      >
                        Inspect Legal Document PDF
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleApproveUser(ngo._id, 'approve')}
                      disabled={actionLoading === ngo._id}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Accept
                    </button>
                    
                    <button
                      onClick={() => handleApproveUser(ngo._id, 'reject')}
                      disabled={actionLoading === ngo._id}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Volunteers Section */}
          <div className="space-y-4 mt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Volunteers ({pendingVolunteersList.length})</h4>
            {pendingVolunteersList.length === 0 ? (
              <div className="glass-panel p-4 border-dashed border-white/10 text-center text-slate-500 text-xs">
                No pending Volunteer applications.
              </div>
            ) : (
              pendingVolunteersList.map((vol) => (
                <div key={vol._id} className="glass-panel p-5 border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 text-xs text-left">
                    <h5 className="text-sm font-bold text-white leading-tight">{vol.name}</h5>
                    <p className="text-slate-400">Email: <strong>{vol.email}</strong></p>
                    <p className="text-slate-400">Phone: <strong>{vol.phoneNumber || 'N/A'}</strong></p>
                    <p className="text-slate-400">Reg Date: <span>{formatDateOnly(vol.createdAt)}</span></p>
                    <p className="text-slate-400">Address: <span>{vol.address || 'N/A'}</span></p>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleApproveUser(vol._id, 'approve')}
                      disabled={actionLoading === vol._id}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Accept
                    </button>
                    
                    <button
                      onClick={() => handleApproveUser(vol._id, 'reject')}
                      disabled={actionLoading === vol._id}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 rounded text-[10px] transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
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
                    {item.role === 'NGO' || item.role === 'VOLUNTEER' 
                      ? `${item.approvalStatus || 'approved'} / ${item.status || 'active'}`
                      : 'N/A'}
                  </td>
                  <td className="py-4 px-4 text-right flex items-center justify-end gap-2">
                    {item.role !== 'ADMIN' && (
                      <>
                        <button
                          onClick={() => handleMakeAdmin(item._id)}
                          disabled={actionLoading === item._id}
                          className="px-2.5 py-1 rounded font-bold transition-all bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[10px]"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() => handleToggleBlock(item._id)}
                          disabled={actionLoading === item._id}
                          className={`px-2.5 py-1 rounded font-bold transition-all inline-flex items-center gap-1 text-[10px] ${
                            item.isBlocked
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                          }`}
                        >
                          {item.isBlocked ? (
                            <>
                              <Unlock className="h-3 w-3" /> Unblock
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" /> Block
                            </>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteUser(item._id)}
                      disabled={actionLoading === item._id}
                      className="px-2.5 py-1 rounded font-bold transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
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
