"use client";

import { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { Compass, MapPin, MessageSquare, RefreshCw, CheckSquare, Star, Map, Navigation, AlertTriangle, Landmark, XCircle } from 'lucide-react';
import NextLink from 'next/link';
import LocationPicker from '../../components/LocationPicker';

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
  const [locationKnown, setLocationKnown] = useState(true);
  const [gpsCoords, setGpsCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Ratings overlay state
  const [ratingTarget, setRatingTarget] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);

  // Claim modal state (NGO Receiver Destination Location — map-based only)
  const [claimModalTarget, setClaimModalTarget] = useState<string | null>(null);
  const [claimLocationData, setClaimLocationData] = useState<{ address: string; coordinates: [number, number] } | null>(null);

  const fetchNgoData = async (coords?: { lng: number; lat: number }) => {
    if (user?.role === 'NGO' && user?.ngoVerificationStatus !== 'APPROVED') {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);

      // Build query — pass GPS coords if available for accurate proximity
      const activeCoords = coords || gpsCoords;
      const locationQuery = activeCoords
        ? `&longitude=${activeCoords.lng}&latitude=${activeCoords.lat}`
        : '';

      const nearbyRes = await ApiService.get(`/donations/nearby?radius=${radius}${locationQuery}`);
      const pipelineRes = await ApiService.get('/donations?status=');

      setNearby(nearbyRes.donations || []);
      setLocationKnown(nearbyRes.locationKnown !== false);
      setPipeline((pipelineRes.donations || []).filter((d: any) => d.status !== 'COMPLETED'));
    } catch (err) {
      console.error('[NgoDashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-detect browser GPS and refetch
  const useGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Your browser does not support location services.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setGpsCoords(coords);
        setGpsLoading(false);
        fetchNgoData(coords);
      },
      (err) => {
        setGpsLoading(false);
        let errorMsg = 'Unable to get your current location.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Showing results from your registered address.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.';
        }
        setGpsError(errorMsg);
        fetchNgoData();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!user) return;

    // If we already have GPS coords in state, just fetch with them
    if (gpsCoords) {
      fetchNgoData(gpsCoords);
      return;
    }

    // Otherwise, attempt to detect GPS once on mount
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
          setGpsCoords(coords);
          setGpsError(null);
          console.log('[NgoDashboard] Auto-detected coords:', coords);
          fetchNgoData(coords);
        },
        (err) => {
          console.warn('[NgoDashboard] GPS failed:', err.message);
          // Do NOT silently ignore — inform user
          if (err.code === err.PERMISSION_DENIED) {
            setGpsError('Location permission denied. Showing results from your registered address.');
          }
          fetchNgoData();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      fetchNgoData();
    }
  }, [user, radius]);

  // Synchronize with real-time updates via Socket.io broadcast CustomEvents
  useEffect(() => {
    const handleDonationUpdate = () => {
      console.log('[NgoDashboard] Real-time donation update triggered. Refetching...');
      fetchNgoData(gpsCoords || undefined);
    };
    window.addEventListener('donation_update', handleDonationUpdate);
    return () => {
      window.removeEventListener('donation_update', handleDonationUpdate);
    };
  }, [gpsCoords, radius]);

  const openClaimModal = (donationId: string) => {
    setClaimModalTarget(donationId);
    // Seed with NGO profile location if available, so the map opens at their hub
    if (user?.location?.coordinates && user.location.coordinates.length === 2 && (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0)) {
      setClaimLocationData({
        address: user.address || '',
        coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
      });
    } else {
      setClaimLocationData(null);
    }
  };

  const submitClaimWithDestination = async () => {
    if (!claimModalTarget) return;
    if (!claimLocationData || !claimLocationData.coordinates) {
      alert('Please select your NGO destination on the map before claiming.');
      return;
    }
    try {
      setStatusLoading(claimModalTarget);
      await ApiService.put(`/donations/${claimModalTarget}/accept`, {
        destinationAddress: claimLocationData.address,
        destinationCoordinates: claimLocationData.coordinates,
      });
      setClaimModalTarget(null);
      setClaimLocationData(null);
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

  if (user?.role === 'NGO' && (user?.approvalStatus !== 'approved' || user?.ngoVerificationStatus !== 'APPROVED')) {
    if (user?.approvalStatus === 'rejected' || user?.ngoVerificationStatus === 'REJECTED') {
      return (
        <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-6">
          <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 text-red-500 animate-pulse">
            <XCircle className="h-16 w-16" />
          </div>
          <h2 className="text-2xl font-bold text-white text-outfit">Your NGO account has not been approved by the administrator.</h2>
          <p className="text-slate-400 text-sm max-w-md">
            Please contact administration if you believe this is a mistake.
          </p>
        </div>
      );
    }
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-6">
        <div className="bg-amber-500/10 p-6 rounded-full border border-amber-500/20 text-amber-500 animate-pulse">
          <Landmark className="h-16 w-16" />
        </div>
        <h2 className="text-2xl font-bold text-white text-outfit">Your account is waiting for admin approval.</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Your NGO organization registration is currently undergoing administrative review. Access to surplus food posts, maps, and tracking coordinates will unlock once verification is APPROVED by the system administrator.
        </p>
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs text-left max-w-md text-slate-300 leading-normal">
          <strong>Need immediate approval?</strong> <br />
          For local testing and demonstration purposes, please log in as an administrator at <strong className="text-brand-500">admin@foodbridge.ai</strong> (Password: <strong>Admin@FoodBridge2026</strong>) and click **"Accept"** in the Pending Approvals Queue.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <Compass className="h-8 w-8 text-brand-500 animate-spin mb-4" />
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
          {/* Use My GPS button */}
          <button
            onClick={useGPS}
            disabled={gpsLoading}
            title="Use my current GPS location for accurate nearby search"
            className="flex items-center gap-1.5 border border-brand-500/30 hover:border-brand-500 bg-brand-500/5 hover:bg-brand-500/10 px-3 py-1.5 rounded-lg text-brand-500 text-xs font-bold transition-all"
          >
            {gpsLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
            {gpsLoading ? 'Detecting...' : gpsCoords ? 'GPS Active' : 'Use My GPS'}
          </button>

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
            </select>
          </div>

          <button
            onClick={() => fetchNgoData()}
            disabled={refreshing}
            className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Location warning banner */}
      {!locationKnown && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-bold">Location Not Set</p>
            <p className="text-amber-300/70 text-xs mt-0.5 leading-relaxed">
              Your NGO hub GPS coordinates are not configured. Showing <strong>all available listings</strong> without distance filtering.
              Click <strong>"Use My GPS"</strong> above to enable accurate proximity scanning, or update your coordinates in your Profile.
            </p>
          </div>
        </div>
      )}

      {/* GPS Permission Error banner */}
      {gpsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <Navigation className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-bold">GPS Error</p>
            <p className="text-red-300/70 text-xs mt-0.5 leading-relaxed">{gpsError}</p>
          </div>
        </div>
      )}

      {/* 2. Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Now */}
        <div className="glass-panel p-3 sm:p-5 border-white/5 flex items-center gap-3 min-w-0">
          <div className="bg-brand-500/10 p-2 rounded-lg shrink-0">
            <Compass className="h-5 w-5 text-brand-500" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Active Now</span>
            <span className="text-2xl font-bold text-white text-outfit leading-tight">{nearby.length}</span>
            <span className="text-slate-500 text-[9px] truncate">All donor listings</span>
          </div>
        </div>

        {/* In Pipeline */}
        <div className="glass-panel p-3 sm:p-5 border-white/5 flex items-center gap-3 min-w-0">
          <div className="bg-amber-500/10 p-2 rounded-lg shrink-0">
            <RefreshCw className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">In Pipeline</span>
            <span className="text-2xl font-bold text-white text-outfit leading-tight">{pipeline.length}</span>
            <span className="text-slate-500 text-[9px] truncate">Claimed & active</span>
          </div>
        </div>

        {/* Scan Radius */}
        <div className="glass-panel p-3 sm:p-5 border-white/5 flex items-center gap-3 min-w-0">
          <div className="bg-teal-500/10 p-2 rounded-lg shrink-0">
            <MapPin className="h-5 w-5 text-teal-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">Scan Radius</span>
            <span className="text-2xl font-bold text-white text-outfit leading-tight">{radius} <span className="text-sm">KM</span></span>
            <span className="text-slate-500 text-[9px] truncate">Current filter</span>
          </div>
        </div>

        {/* GPS Status */}
        <div className="glass-panel p-3 sm:p-5 border-white/5 flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${gpsCoords ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
            <Navigation className={`h-5 w-5 ${gpsCoords ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider truncate">GPS Status</span>
            <span className={`text-sm font-bold leading-tight mt-0.5 ${gpsCoords ? 'text-emerald-400' : 'text-slate-400'}`}>
              {gpsCoords ? 'Active' : 'Not Set'}
            </span>
            <span className="text-slate-500 text-[9px] truncate">{gpsCoords ? 'Location known' : 'Click Use My GPS'}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Layout (Unclaimed Radar on left, Claimed Pipeline on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Proximity unclaimed scan list (takes 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white text-outfit">Scan Radius</h3>
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

                  {/* Prominent Distance Badge */}
                  <div className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                    item.distance === -1
                      ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      : item.distance <= 5
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-brand-500/10 border-brand-500/20 text-brand-500'
                  }`}>
                    <MapPin className="h-3 w-3" />
                    {item.distance === -1 ? 'Unknown' : `${item.distance} KM`}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1 pr-20">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">{item.foodCategory}</span>
                      <h4 className="text-lg font-bold text-white text-outfit leading-tight">{item.foodName}</h4>
                    </div>

                    {/* Pickup address */}
                    {item.pickupAddress && (
                      <div className="flex items-start gap-1.5 text-[10px] text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
                        <span className="truncate">{item.pickupAddress}</span>
                      </div>
                    )}

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
                        {(item.donor?.name || 'Donor').charAt(0)}
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-bold text-slate-300">{item.donor?.name || 'Donor'}</span>
                        <span className="text-[8px] text-slate-500 uppercase mt-0.5">Trust score: {item.donor?.trustScore || 85}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openClaimModal(item._id)}
                    disabled={statusLoading === item._id}
                    className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {statusLoading === item._id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5" />
                    )}
                    <span>Claim Surplus Food</span>
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
                  <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3 items-center justify-between w-full">
                    
                    <div className="flex gap-2">
                      {item.status === 'DELIVERED' && (
                        <NextLink
                          href={`/ngo/distribution/${item._id}`}
                          className="bg-emerald-500 hover:bg-emerald-600 text-dark-900 font-bold px-3 py-1.5 rounded text-[10px] transition-all"
                        >
                          Log Distribution
                        </NextLink>
                      )}

                      {['ACCEPTED', 'NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status) && (
                        <span className="text-[10px] text-slate-400 font-semibold bg-white/5 px-2.5 py-1.5 rounded border border-white/5 uppercase">
                          🚚 Action Pending
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <NextLink href="/ngo/chat" className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded text-xs text-slate-300 flex items-center justify-center">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </NextLink>

                      <NextLink href={`/donations/${item._id}`} className="bg-brand-500/10 hover:bg-brand-500/25 border border-brand-500/20 p-2 rounded text-xs text-brand-500 flex items-center justify-center gap-1 font-bold">
                        Track Details
                      </NextLink>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* NGO RECEIVER DESTINATION LOCATION MODAL DIALOG */}
      {claimModalTarget && (
        <div className="fixed inset-0 z-50 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 border-white/10 max-w-2xl w-full flex flex-col gap-5 text-left max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-xl font-bold text-white text-outfit flex items-center gap-2">
                <Compass className="h-5 w-5 text-brand-500" /> Set NGO Destination on Map
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pin your NGO's exact receiving location on the map. This will be used for live tracking and volunteer navigation. <strong className="text-brand-500">You must select on the map — no manual typing.</strong>
              </p>
            </div>

            {/* Map-based location picker (same component as donor pickup) */}
            <LocationPicker
              label="Destination Location"
              initialAddress={claimLocationData?.address || ''}
              initialCoordinates={claimLocationData?.coordinates}
              onChange={(data) => setClaimLocationData(data)}
            />

            {/* Selected location summary */}
            {claimLocationData?.coordinates && (
              <div className="bg-brand-500/5 border border-brand-500/20 p-3 rounded-xl text-xs text-slate-300 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-400 block">Destination Coordinates Locked:</strong>
                  <span className="font-mono text-[10px] text-slate-400">[{claimLocationData.coordinates[0].toFixed(5)}, {claimLocationData.coordinates[1].toFixed(5)}]</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => { setClaimModalTarget(null); setClaimLocationData(null); }}
                className="px-4 py-2 rounded-lg text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitClaimWithDestination}
                disabled={statusLoading === claimModalTarget || !claimLocationData}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/40 disabled:cursor-not-allowed text-dark-900 font-bold px-5 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-lg"
              >
                {statusLoading === claimModalTarget && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{claimLocationData ? 'Confirm Destination & Claim' : 'Select Location on Map First'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
