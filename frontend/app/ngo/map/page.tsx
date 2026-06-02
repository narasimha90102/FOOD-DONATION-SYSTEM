"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { MapPin, Navigation, Compass, ArrowLeft, RefreshCw, Truck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAppStore();

  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<number>(0);
  const [eta, setEta] = useState<string>('Calculated on status update');
  const [routeProgress, setRouteProgress] = useState<number>(0);

  useEffect(() => {
    const donationId = searchParams.get('id');
    if (!donationId) {
      setLoading(false);
      return;
    }

    const fetchDonation = async () => {
      try {
        const res = await ApiService.get(`/donations/${donationId}`);
        setDonation(res.donation);

        // Determine dynamic route parameters
        const donorCoords = res.donation.location.coordinates;
        const ngoCoords = user?.location?.coordinates || [77.5946, 12.9716];

        // Haversine Distance computation
        const computedDist = calculateHaversine(
          donorCoords[1], donorCoords[0],
          ngoCoords[1], ngoCoords[0]
        );
        setDistance(computedDist);

        // ETA Estimation
        const computedEta = Math.round(computedDist * 4 + 8); // ~4 mins per km + buffer
        setEta(`${computedEta} Minutes`);

        // Route animation progress based on pipeline status
        let progress = 0;
        if (res.donation.status === 'ACCEPTED') progress = 10;
        else if (res.donation.status === 'PICKED_UP') progress = 60;
        else if (res.donation.status === 'DELIVERED' || res.donation.status === 'COMPLETED') progress = 100;
        setRouteProgress(progress);

      } catch (err) {
        console.error('[MapScreen] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonation();
  }, [searchParams, user]);

  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth Radius
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Plotting vector transit maps...</p>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center gap-4">
        <Compass className="h-10 w-10 text-slate-500" />
        <p className="text-slate-400">No active surplus target selected. Please open from pipeline console.</p>
        <Link href="/ngo" className="bg-brand-500 text-dark-900 px-4 py-2 rounded-lg font-bold text-xs">
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">
      
      {/* Back button */}
      <div className="print:hidden">
        <Link href="/ngo" className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-semibold transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Dynamic Vector Map Plot (Left side - takes 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Active Pickup Route</h3>
            <span className="bg-brand-500/10 text-brand-500 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {donation.status} Stage
            </span>
          </div>

          {/* Interactive SVG Vector Map Visualizer */}
          <div className="w-full h-[400px] bg-dark-900/60 border border-white/5 rounded-xl relative overflow-hidden flex items-center justify-center">
            
            {/* Grid coordinates line layers */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.02] pointer-events-none">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="border border-white" />
              ))}
            </div>

            {/* Custom SVG canvas plotting Donor -> NGO */}
            <svg className="w-full h-full p-10" viewBox="0 0 500 300">
              
              {/* Neon Green Dash connecting route */}
              <path
                d="M 100,200 Q 250,50 400,200"
                fill="none"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth="6"
              />
              <path
                id="route-line"
                d="M 100,200 Q 250,50 400,200"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="8,6"
              />

              {/* Glowing animated path fill based on progress */}
              <path
                d="M 100,200 Q 250,50 400,200"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeDasharray={400}
                strokeDashoffset={400 - (400 * routeProgress) / 100}
                className="transition-all duration-1000 ease-in-out opacity-75"
              />

              {/* Donor Marker Dot (Source) */}
              <g transform="translate(100,200)">
                <circle r="12" fill="rgba(16, 185, 129, 0.2)" className="animate-ping" />
                <circle r="6" fill="#10b981" />
                <text y="-12" textAnchor="middle" fill="#10b981" className="text-[10px] font-bold">Surplus Donor</text>
              </g>

              {/* NGO Marker Dot (Destination) */}
              <g transform="translate(400,200)">
                <circle r="14" fill="rgba(6, 182, 212, 0.2)" />
                <circle r="7" fill="#06b6d4" />
                <text y="-15" textAnchor="middle" fill="#06b6d4" className="text-[10px] font-bold">NGO Center Hub</text>
              </g>

              {/* Collection Vehicle (Animated truck follows route progress) */}
              <g transform="translate(250, 100)" className="transition-all duration-1000">
                {/* Truck icon placement approximation */}
                <circle r="16" fill="rgba(245, 158, 11, 0.2)" />
                <circle r="8" fill="#f59e0b" />
              </g>

            </svg>

            {/* Bottom Floating Info panel */}
            <div className="absolute bottom-4 left-4 right-4 bg-dark-800/90 border border-white/10 p-3 rounded-lg backdrop-blur flex justify-between text-xs items-center">
              <span className="text-slate-400">GPS Proximity Scan:</span>
              <span className="text-brand-500 font-bold">{distance} Kilometers</span>
              <span className="text-slate-400">Surplus Category:</span>
              <span className="text-white font-bold">{donation.foodCategory}</span>
            </div>

          </div>
        </div>

        {/* Dispatch details drawer (takes 1 col) */}
        <div className="flex flex-col gap-6">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-lg font-bold text-white text-outfit">Transit Dashboard</h3>
          </div>

          <div className="glass-panel p-6 border-white/5 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="bg-brand-500/10 p-2.5 rounded-lg border border-brand-500/20 text-brand-500">
                <Truck className="h-6 w-6" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Transit ETA</span>
                <span className="text-xl font-bold text-white text-outfit mt-1">{eta}</span>
              </div>
            </div>

            <div className="space-y-4 border-t border-white/5 pt-4">
              <span className="text-brand-500 text-xs font-bold uppercase tracking-wider block">Route Details</span>
              
              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div>
                  <strong className="text-slate-400 block mb-0.5">Surplus Address:</strong>
                  <span>{donation.pickupAddress}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block mb-0.5">NGO Hub Destination:</strong>
                  <span>{user?.address || 'Verified NGO Hub Sector'}</span>
                </div>
                <div>
                  <strong className="text-slate-400 block mb-0.5">Surplus Details:</strong>
                  <span>{donation.quantity} {donation.unit} of {donation.foodName}</span>
                </div>
              </div>
            </div>

            {/* Simulated Live Routing steps */}
            <div className="space-y-3 border-t border-white/5 pt-4 text-xs">
              <span className="text-brand-500 text-xs font-bold uppercase tracking-wider block">Live Routing logs</span>
              
              <div className="flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Pickup coordinate mapped: [{donation.location.coordinates.join(', ')}]</span>
              </div>
              <div className="flex items-start gap-2 text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                <span>Haversine distance verified: {distance} KM</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading map environment...</p>
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}
