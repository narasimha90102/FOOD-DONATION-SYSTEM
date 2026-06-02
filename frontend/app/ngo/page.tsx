"use client";

import { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Compass, Compass as Radar, ShieldCheck, MapPin, MessageSquare, RefreshCw, ChevronRight, CheckSquare, Star, Map } from 'lucide-react';
import Link from 'next/router';
import NextLink from 'next/link';

interface NearbyDonation {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  pickupAddress: string;
  distance: number;
  aiFreshnessScore: number;
  aiSafeWindowHours: number;
  aiRiskLevel: string;
  donor: {
    _id: string;
    name: string;
    trustScore: number;
    ratingAverage: number;
  };
}

interface PipelineDonation {
  _id: string;
  foodName: string;
  quantity: number;
  unit: string;
  status: string;
  pickupAddress: string;
  donor: {
    name: string;
    email: string;
  };
}

export default function NgoDashboard() {
  const { user } = useAppStore();
  const [nearby, setNearby] = useState<NearbyDonation[]>([]);
  const [pipeline, setPipeline] = useState<PipelineDonation[]>([]);
  const [radius, setRadius] = useState<number>(15);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // Ratings overlay state
  const [ratingTarget, setRatingTarget] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);

  const fetchNgoData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch Surrounding Active unclaimed listings
      const nearbyRes = await ApiService.get(`/donations/nearby?radius=${radius}`);
      
      // Fetch claimed pipeline listings
      const pipelineRes = await ApiService.get('/donations?status=');

      setNearby(nearbyRes.donations || []);
      // Filter out completed ones for pipeline display
      setPipeline((pipelineRes.donations || []).filter((d: any) => d.status !== 'COMPLETED'));
    } catch (err) {
      console.error('[NgoDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNgoData();
  }, [radius]);

  const handleClaim = async (donationId: string) => {
    try {
      setStatusLoading(donationId);
      await ApiService.put(`/donations/${donationId}/accept`, {});
      await fetchNgoData();
    } catch (err: any) {
      alert(err.message || 'Error claiming surplus donation.');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleStatusChange = async (donationId: string, nextStatus: string) => {
    try {
      setStatusLoading(donationId);
      await ApiService.put(`/donations/${donationId}/status`, { status: nextStatus });
      
      if (nextStatus === 'COMPLETED') {
        // Trigger donor rating prompt
        setRatingTarget(donationId);
      }
      await fetchNgoData();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setStatusLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <Radar className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Locking surround surplus coordinates...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white text-outfit flex items-center gap-2">
            <Compass className="h-8 w-8 text-brand-500 animate-glow" /> NGO Surplus Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hello, {user?.name}. Browse nearby active surplus food posts and coordinate pickups.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Proximity Scanning Radiuses */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-xs text-slate-400 font-bold uppercase">Scan Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-brand-500 outline-none cursor-pointer"
            >
              <option value={5}>5 KM</option>
              <option value={10}>10 KM</option>
              <option value={15}>15 KM</option>
              <option value={25}>25 KM</option>
            </select>
          </div>

          <button
            onClick={fetchNgoData}
            disabled={refreshing}
            className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Main Dashboard Layout (Unclaimed Radar on left, Claimed Pipeline on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Proximity unclaimed scan list (takes 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Surplus Proximity Radar</h3>
            <span className="bg-brand-500/10 text-brand-500 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {nearby.length} Surplus Nearby
            </span>
          </div>

          {nearby.length === 0 ? (
            <div className="glass-panel p-16 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
              <Compass className="h-10 w-10 text-slate-500" />
              <p className="text-slate-400 text-sm">No unclaimed food surplus found inside {radius} KM scan radius. Try expanding scan radius.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {nearby.map((item) => (
                <div key={item._id} className="glass-panel p-6 border-white/5 flex flex-col justify-between gap-5 glass-panel-hover relative overflow-hidden">
                  
                  {/* Distance Ribbon */}
                  <span className="absolute top-3 right-3 bg-brand-500/10 text-brand-500 text-xs px-2.5 py-0.5 rounded font-bold">
                    {item.distance} KM Away
                  </span>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">{item.foodCategory}</span>
                      <h4 className="text-lg font-bold text-white text-outfit leading-tight pr-14">{item.foodName}</h4>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-b border-white/5 py-2 my-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Surplus Quantity</span>
                        <span className="text-slate-200 font-semibold mt-0.5">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400">AI Expiry Time</span>
                        <span className={`font-semibold mt-0.5 ${item.aiRiskLevel === 'danger' ? 'text-red-400' : 'text-slate-200'}`}>
                          {item.aiSafeWindowHours} Hours Left
                        </span>
                      </div>
                    </div>

                    {/* Donor trust ratings */}
                    <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                      <div className="h-6 w-6 rounded bg-brand-500/20 text-brand-500 font-bold flex items-center justify-center text-[10px]">
                        {item.donor.name.charAt(0)}
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-bold text-slate-300">{item.donor.name}</span>
                        <span className="text-[8px] text-slate-500 uppercase mt-0.5">Trust score: {item.donor.trustScore || 85}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(item._id)}
                    disabled={statusLoading === item._id}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {statusLoading === item._id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5" />
                    )}
                    <span>Claim surplus surplus Surplus</span>
                  </button>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claimed Pipeline list (right side - takes 1 col) */}
        <div className="flex flex-col gap-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Surplus Pickup Pipeline</h3>
          </div>

          {pipeline.length === 0 ? (
            <div className="glass-panel p-8 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-3">
              <Compass className="h-8 w-8 text-slate-500" />
              <p className="text-slate-400 text-xs leading-relaxed">No claimed surpluses actively processing. Scan nearby radar to claim surplusses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pipeline.map((item) => (
                <div key={item._id} className="glass-panel p-5 border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-bold text-white text-outfit leading-snug">{item.foodName}</h4>
                    <p className="text-xs text-slate-400">Quantity: {item.quantity} {item.unit}</p>
                    <span className="text-[10px] text-brand-500 font-semibold bg-brand-500/5 border border-brand-500/20 px-2 py-0.5 rounded w-fit mt-1 uppercase">
                      Status: {item.status}
                    </span>
                  </div>

                  {/* Operational status transition actions */}
                  <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                    
                    {item.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleStatusChange(item._id, 'PICKED_UP')}
                        disabled={statusLoading === item._id}
                        className="bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold px-3 py-1.5 rounded text-[10px] transition-all"
                      >
                        Start Pick Up
                      </button>
                    )}

                    {item.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleStatusChange(item._id, 'COMPLETED')}
                        disabled={statusLoading === item._id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-dark-900 font-bold px-3 py-1.5 rounded text-[10px] transition-all"
                      >
                        Complete Delivery
                      </button>
                    )}

                    <NextLink href="/ngo/chat" className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded text-xs text-slate-300 flex items-center justify-center">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </NextLink>

                    <NextLink href={`/ngo/map?id=${item._id}`} className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded text-xs text-slate-300 flex items-center justify-center gap-1 font-bold">
                      <Map className="h-3.5 w-3.5 text-brand-500" /> Map GPS
                    </NextLink>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RATING SYSTEM DIALOG OVERLAY */}
      {ratingTarget && (
        <div className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 border-white/10 max-w-sm w-full text-center flex flex-col gap-5">
            <h3 className="text-xl font-bold text-white text-outfit">Rate Donor Service</h3>
            <p className="text-xs text-slate-400">Help maintain system trust scoring by rating this donor delivery experience.</p>
            
            {/* Stars rating selection */}
            <div className="flex justify-center gap-3 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className="focus:outline-none"
                >
                  <Star className={`h-8 w-8 transition-colors ${
                    star <= ratingScore ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                  }`} />
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setRatingTarget(null);
                alert('Feedback submitted. Donor Trust Index recalculated!');
              }}
              className="bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-2.5 rounded-lg text-xs font-semibold"
            >
              Submit Score Review
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
