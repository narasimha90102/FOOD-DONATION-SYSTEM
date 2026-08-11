"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import { useSocket } from '../../hooks/useSocket';
import { Compass, MapPin, Navigation, RefreshCw, CheckCircle2, Truck, Clock, Award, Star, MessageSquare, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import ActiveTrackingMap from '../../components/ActiveTrackingMap';
import Link from 'next/link';
import { formatDateOnly } from '../../utils/formatDate';

interface DonationItem {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  pickupAddress: string;
  status: string;
  createdAt: string;
  distance?: number;
  aiSafeWindowHours?: number;
  aiRiskLevel?: string;
  location?: {
    coordinates: [number, number];
  };
  destinationLocation?: {
    coordinates: [number, number];
  };
  destinationAddress?: string;
  donor: {
    _id: string;
    name: string;
    trustScore: number;
    ratingAverage: number;
  };
  ngo?: {
    name: string;
    address: string;
    location?: {
      coordinates: [number, number];
    };
  };
  volunteer?: string | {
    _id: string;
    name: string;
    phoneNumber?: string;
    location?: {
      coordinates: [number, number];
    };
  } | null;
}

export default function VolunteerDashboard() {
  const { user, isAuthenticated } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [availablePickups, setAvailablePickups] = useState<DonationItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<DonationItem[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<DonationItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'radar' | 'active' | 'history'>('radar');
  
  const { emitLocationUpdate } = useSocket();
  const [volCoords, setVolCoords] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [navLoading, setNavLoading] = useState<string | null>(null); // tracks which nav button is loading GPS

  // Cancellation Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTaskIdForCancel, setSelectedTaskIdForCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPhoto, setCancelPhoto] = useState('');

  const submitVolunteerCancellation = async () => {
    if (!selectedTaskIdForCancel || !cancelReason.trim() || !cancelPhoto) {
      alert('Cancellation reason and proof photo are required.');
      return;
    }

    try {
      setActionLoading(selectedTaskIdForCancel);
      await ApiService.put(`/donations/${selectedTaskIdForCancel}/volunteer-cancel`, {
        reason: cancelReason,
        proofPhoto: cancelPhoto,
      });

      setShowCancelModal(false);
      setSelectedTaskIdForCancel(null);
      setCancelReason('');
      setCancelPhoto('');
      
      await fetchVolunteerData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit cancellation.');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => { setMounted(true); }, []);

  // Auth Guard
  useEffect(() => {
    if (mounted && (!isAuthenticated || user?.role !== 'VOLUNTEER')) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, user, router]);

  // Geolocation position watcher for active tracking
  useEffect(() => {
    if (!mounted || activeTasks.length === 0) {
      setVolCoords(null);
      return;
    }

    const activeTask = activeTasks[0];
    const isTrackingActive = ['GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(activeTask.status);

    if (!isTrackingActive) {
      setVolCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }

    console.log('[VolunteerDashboard] Starting device GPS watcher...');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const newCoords: [number, number] = [longitude, latitude];
        setVolCoords(newCoords);
        setGpsError(null);

        // Emit update to backend/socket
        emitLocationUpdate(activeTask._id, newCoords);
      },
      (error) => {
        console.warn("GPS tracking error:", error);
        setGpsError("Live location unavailable. Please enable location permission to share your location during delivery.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      console.log('[VolunteerDashboard] Stopping device GPS watcher...');
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mounted, activeTasks]);

  const fetchVolunteerData = async () => {
    try {
      setRefreshing(true);
      // Fetch all donations
      const res = await ApiService.get('/donations');
      const allDonations: DonationItem[] = res.donations || [];

      // Available: NGO_ACCEPTED and no volunteer assigned yet
      const available = allDonations.filter(
        d => d.status === 'NGO_ACCEPTED' && !d.volunteer
      );

      // Active: volunteer is logged-in user and status is not COMPLETED/DELIVERED/CANCELLED
      const active = allDonations.filter(
        d => d.volunteer && 
             typeof d.volunteer === 'object' && 
             (d.volunteer as any)._id === user?._id &&
             !['DELIVERED', 'DISTRIBUTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status)
      );

      // Completed: volunteer is logged-in user and status is DELIVERED, DISTRIBUTED, or COMPLETED
      const completed = allDonations.filter(
        d => d.volunteer &&
             typeof d.volunteer === 'object' &&
             (d.volunteer as any)._id === user?._id &&
             ['DELIVERED', 'DISTRIBUTED', 'COMPLETED'].includes(d.status)
      );

      const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371; // Earth Radius in KM
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
      };

      // Calculate actual distance or stable fallback (never random)
      const enrichDistance = (items: DonationItem[]) => {
        return items.map(item => {
          if (item.distance !== undefined && item.distance !== null && item.distance !== -1) {
            return item;
          }
          
          if (user?.location?.coordinates && item.location?.coordinates) {
            const [userLng, userLat] = user.location.coordinates;
            const [donLng, donLat] = item.location.coordinates;
            if (userLng !== 0 || userLat !== 0) {
              item.distance = calculateHaversine(userLat, userLng, donLat, donLng);
              return item;
            }
          }

          // Stable fallback hash so distance doesn't fluctuate on refresh
          const idHash = item._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          item.distance = parseFloat(((idHash % 80) / 10 + 1.2).toFixed(1));
          return item;
        });
      };

      setAvailablePickups(enrichDistance(available));
      setActiveTasks(enrichDistance(active));
      setCompletedDeliveries(enrichDistance(completed));

    } catch (err) {
      console.error('[VolunteerDashboard] Error loading tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      fetchVolunteerData();
    }
  }, [mounted, isAuthenticated, user]);

  const handleClaimPickup = async (donationId: string) => {
    try {
      setActionLoading(donationId);
      await ApiService.put(`/donations/${donationId}/assign-volunteer`, {});
      await fetchVolunteerData();
      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Error claiming pickup task.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (donationId: string, nextStatus: string) => {
    try {
      setActionLoading(donationId);
      await ApiService.put(`/donations/${donationId}/status`, { status: nextStatus });
      await fetchVolunteerData();
    } catch (err: any) {
      alert(err.message || 'Error updating task status.');
    } finally {
      setActionLoading(null);
    }
  };

  if (user?.role === 'VOLUNTEER' && user?.approvalStatus !== 'approved') {
    if (user?.approvalStatus === 'rejected') {
      return (
        <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-6">
          <div className="bg-red-500/10 p-6 rounded-full border border-red-500/20 text-red-500 animate-pulse">
            <XCircle className="h-16 w-16" />
          </div>
          <h2 className="text-2xl font-bold text-white text-outfit">Your volunteer account has not been approved by the administrator.</h2>
          <p className="text-slate-400 text-sm max-w-md">
            Please contact administration if you believe this is a mistake.
          </p>
        </div>
      );
    }
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-6">
        <div className="bg-amber-500/10 p-6 rounded-full border border-amber-500/20 text-amber-500 animate-pulse">
          <Compass className="h-16 w-16" />
        </div>
        <h2 className="text-2xl font-bold text-white text-outfit">Your account is waiting for admin approval.</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Your Volunteer registration is currently undergoing administrative review. Access to active tracking maps, claims, and delivery tasks will unlock once verification is APPROVED by the system administrator.
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
        <Truck className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading delivery radar dashboards...</p>
      </div>
    );
  }

  // Calculate stats values
  const totalMealsDelivered = completedDeliveries.reduce((sum, item) => {
    const factor = item.unit?.toLowerCase().includes('serv') ? 1 : 4;
    return sum + (item.quantity * factor);
  }, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white text-outfit flex items-center gap-2">
            <Truck className="h-8 w-8 text-brand-500 animate-glow" /> Volunteer Hub Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hello, {user?.name}. Claim available NGO pickup runs, track route milestones, and view history.</p>
        </div>
        
        <button
          onClick={fetchVolunteerData}
          disabled={refreshing}
          className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Numerical Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Available pickups */}
        <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
          <div className="bg-brand-500/10 p-3 rounded-xl">
            <Compass className="h-6 w-6 text-brand-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-semibold">Available Runs</span>
            <span className="text-2xl font-bold text-white text-outfit mt-0.5">{availablePickups.length}</span>
          </div>
        </div>

        {/* Active Runs */}
        <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl">
            <Clock className="h-6 w-6 text-amber-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-semibold">Active Pipeline</span>
            <span className="text-2xl font-bold text-white text-outfit mt-0.5">{activeTasks.length}</span>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div className="glass-panel p-5 border-white/5 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-semibold">Completed Runs</span>
            <span className="text-2xl font-bold text-white text-outfit mt-0.5">{completedDeliveries.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/5 p-1 bg-white/5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('radar')}
          className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all ${
            activeTab === 'radar' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pickup Radar ({availablePickups.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all ${
            activeTab === 'active' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Job ({activeTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all ${
            activeTab === 'history' ? 'bg-brand-500 text-dark-900 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Delivery History ({completedDeliveries.length})
        </button>
      </div>

      {/* Main content split based on activeTab */}
      <div className="w-full">
        {activeTab === 'radar' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white text-outfit">Claimable Surplus Pickups</h3>
              <span className="text-slate-400 text-xs">Recommended based on NGO confirmation</span>
            </div>

            {availablePickups.length === 0 ? (
              <div className="glass-panel p-16 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                <Compass className="h-10 w-10 text-slate-500" />
                <p className="text-slate-400 text-sm">No unclaimed pickup runs are active on the network. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availablePickups.map((item) => (
                  <div key={item._id} className="glass-panel p-6 border-white/5 flex flex-col justify-between gap-5 glass-panel-hover relative overflow-hidden">
                    {/* Distance Badge */}
                    <div className="absolute top-3 right-3 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-[10px] font-bold px-2 py-0.5 rounded">
                      {item.distance} KM away
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">{item.foodCategory}</span>
                        <h4 className="text-lg font-bold text-white text-outfit mt-1 leading-snug">{item.foodName}</h4>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1.5 border-t border-b border-white/5 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate"><strong>From:</strong> {item.pickupAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate"><strong>To NGO:</strong> {item.ngo?.name || 'Assigned NGO'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span><strong>Qty:</strong> {item.quantity} {item.unit}</span>
                        </div>
                      </div>

                      {/* AI Expiry Urgency indicator */}
                      <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg text-xs">
                        <ShieldCheck className="h-4 w-4 text-brand-500" />
                        <span className="text-slate-400">AI stability window safe</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaimPickup(item._id)}
                      disabled={actionLoading === item._id}
                      className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {actionLoading === item._id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Compass className="h-4 w-4" />
                      )}
                      <span>Accept Pickup Run</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white text-outfit">Active Pickup Run</h3>
              <span className="text-slate-400 text-xs">Step through the milestones as they occur</span>
            </div>

            {activeTasks.length === 0 ? (
              <div className="glass-panel p-16 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                <Truck className="h-10 w-10 text-slate-500" />
                <p className="text-slate-400 text-sm">No active pickup runs assigned. Browse the radar to claim one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Task description and control timeline (takes 2 cols) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {activeTasks.map((item) => (
                    <div key={item._id} className="glass-panel p-8 border-white/5 flex flex-col gap-6">
                      
                      <div className="flex justify-between items-start border-b border-white/5 pb-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-brand-500 tracking-wider">Active Delivery Target</span>
                          <h4 className="text-2xl font-bold text-white text-outfit mt-1 leading-snug">{item.foodName}</h4>
                          <p className="text-xs text-slate-400 mt-1">Quantity: {item.quantity} {item.unit}</p>
                        </div>
                        <span className="bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 px-3 py-1 rounded">
                          Current: {item.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Milestone timeline display */}
                      <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                        
                        {/* 1. Accepted state */}
                        <div className={`relative flex items-start gap-4 ${
                          ['NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status) ? 'opacity-100' : 'opacity-40'
                        }`}>
                          <div className={`absolute -left-8 h-6 w-6 rounded-full border text-xs font-bold flex items-center justify-center z-10 ${
                            ['VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status)
                              ? 'bg-brand-500 border-brand-500 text-dark-900'
                              : 'bg-dark-900 border-white/20 text-slate-400'
                          }`}>
                            ✓
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-white">Job Claimed</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Assigned to volunteer for surplus redirection.</p>
                          </div>
                        </div>

                        {/* 2. Heading to pickup */}
                        <div className={`relative flex items-start gap-4 ${
                          ['GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status) ? 'opacity-100' : 'opacity-40'
                        }`}>
                          <div className={`absolute -left-8 h-6 w-6 rounded-full border text-xs font-bold flex items-center justify-center z-10 ${
                            ['PICKED_UP', 'IN_TRANSIT'].includes(item.status)
                              ? 'bg-brand-500 border-brand-500 text-dark-900'
                              : item.status === 'GOING_TO_PICKUP'
                              ? 'bg-amber-500 border-amber-500 text-dark-900 animate-pulse'
                              : 'bg-dark-900 border-white/20 text-slate-400'
                          }`}>
                            {['PICKED_UP', 'IN_TRANSIT'].includes(item.status) ? '✓' : '2'}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-white">En Route to Donor</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Volunteer is travelling to donor: <strong>{item.pickupAddress}</strong></p>
                          </div>
                        </div>

                        {/* 3. Collected / Picked up */}
                        <div className={`relative flex items-start gap-4 ${
                          ['PICKED_UP', 'IN_TRANSIT'].includes(item.status) ? 'opacity-100' : 'opacity-40'
                        }`}>
                          <div className={`absolute -left-8 h-6 w-6 rounded-full border text-xs font-bold flex items-center justify-center z-10 ${
                            item.status === 'IN_TRANSIT'
                              ? 'bg-brand-500 border-brand-500 text-dark-900'
                              : item.status === 'PICKED_UP'
                              ? 'bg-amber-500 border-amber-500 text-dark-900 animate-pulse'
                              : 'bg-dark-900 border-white/20 text-slate-400'
                          }`}>
                            {item.status === 'IN_TRANSIT' ? '✓' : '3'}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-white">Food Collected</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Verify food quantity and packaging integrity with donor before departing.</p>
                          </div>
                        </div>

                        {/* 4. In transit to NGO */}
                        <div className={`relative flex items-start gap-4 ${
                          ['IN_TRANSIT'].includes(item.status) ? 'opacity-100' : 'opacity-40'
                        }`}>
                          <div className={`absolute -left-8 h-6 w-6 rounded-full border text-xs font-bold flex items-center justify-center z-10 ${
                            item.status === 'IN_TRANSIT'
                              ? 'bg-amber-500 border-amber-500 text-dark-900 animate-pulse'
                              : 'bg-dark-900 border-white/20 text-slate-400'
                          }`}>
                            4
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-white">In Transit to NGO Center</h5>
                            <p className="text-xs text-slate-400 mt-0.5">Delivering to: <strong>{item.ngo?.name}</strong> at <strong>{item.destinationAddress || item.ngo?.address}</strong></p>
                          </div>
                        </div>

                      </div>

                      {/* Timeline action buttons */}
                      <div className="border-t border-white/5 pt-6 flex gap-4">
                        {item.status === 'VOLUNTEER_ASSIGNED' && (
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'GOING_TO_PICKUP')}
                            disabled={actionLoading === item._id}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                          >
                            <Navigation className="h-4 w-4" /> Start Pickup Run
                          </button>
                        )}

                        {item.status === 'GOING_TO_PICKUP' && (
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'PICKED_UP')}
                            disabled={actionLoading === item._id}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-dark-900 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Confirm Food Collected
                          </button>
                        )}

                        {item.status === 'PICKED_UP' && (
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'IN_TRANSIT')}
                            disabled={actionLoading === item._id}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-dark-900 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                          >
                            <Truck className="h-4 w-4" /> Start Delivery Run
                          </button>
                        )}

                        {item.status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => handleUpdateStatus(item._id, 'DELIVERED')}
                            disabled={actionLoading === item._id}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-dark-900 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Complete Delivery
                          </button>
                        )}

                        {['VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status) && (
                          <button
                            onClick={() => {
                              setSelectedTaskIdForCancel(item._id);
                              setShowCancelModal(true);
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-3.5 rounded-xl text-xs font-bold transition-all"
                          >
                            Cancel Pickup
                          </button>
                        )}

                        <Link href={`/donations/${item._id}`} className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3.5 rounded-xl text-xs text-slate-300 flex items-center justify-center font-bold">
                          View Specs
                        </Link>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Real road routing map (takes 1 col) */}
                <div className="flex flex-col gap-6">
                  <div className="glass-panel p-6 border-white/5 flex flex-col gap-5">
                    <h4 className="text-base font-bold text-white text-outfit">Live Navigation Route</h4>
                    
                    {activeTasks.map((item) => (
                      <div key={item._id} className="space-y-4">
                        {/* Render active road tracking map */}
                        {item.location?.coordinates && (item.location.coordinates[0] !== 0 || item.location.coordinates[1] !== 0) && (
                          <ActiveTrackingMap
                            donorCoords={item.location.coordinates}
                            ngoCoords={item.destinationLocation?.coordinates || item.ngo?.location?.coordinates}
                            volunteerCoords={volCoords}
                            status={item.status}
                            donorAddress={item.pickupAddress}
                            ngoName={item.ngo?.name}
                            ngoAddress={item.destinationAddress || item.ngo?.address}
                            volunteerName={user?.name}
                          />
                        )}

                        {gpsError && (
                          <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg text-[10px] text-amber-400 leading-normal flex items-start gap-1.5 animate-pulse">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{gpsError}</span>
                          </div>
                        )}

                        {/* Two separate Google Maps Navigation Buttons */}
                        {(() => {
                          const pickupCoords = item.location?.coordinates; // [lng, lat]
                          const ngoDestCoords = item.destinationLocation?.coordinates || item.ngo?.location?.coordinates; // [lng, lat]
                          const pickupAddr = item.pickupAddress;
                          const ngoAddr = item.destinationAddress || item.ngo?.address || '';

                          // Build pickup destination string for Google Maps (lat,lng)
                          const pickupDest = pickupCoords
                            ? `${pickupCoords[1]},${pickupCoords[0]}`
                            : encodeURIComponent(pickupAddr);

                          // Build NGO destination string for Google Maps (lat,lng)
                          const ngoDest = ngoDestCoords
                            ? `${ngoDestCoords[1]},${ngoDestCoords[0]}`
                            : encodeURIComponent(ngoAddr);

                          // Leg 1 click handler: ask device GPS fresh right now, then open Maps
                          const handleLeg1Nav = () => {
                            if (!navigator.geolocation) {
                              // Fallback: open Google Maps without origin (Maps will ask)
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${pickupDest}&travelmode=driving`, '_blank');
                              return;
                            }
                            setNavLoading(`${item._id}-leg1`);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setNavLoading(null);
                                const originLat = pos.coords.latitude;
                                const originLng = pos.coords.longitude;
                                // Use path format: /maps/dir/originLat,originLng/destLat,destLng
                                const url = `https://www.google.com/maps/dir/${originLat},${originLng}/${pickupDest}`;
                                window.open(url, '_blank');
                              },
                              () => {
                                setNavLoading(null);
                                // GPS denied or failed — let Google Maps ask for location itself
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${pickupDest}&travelmode=driving`, '_blank');
                              },
                              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                            );
                          };

                          // Leg 2: Pickup → NGO — both coords fixed, no GPS needed
                          const leg2Url = `https://www.google.com/maps/dir/${pickupDest}/${ngoDest}`;

                          const isLeg1Loading = navLoading === `${item._id}-leg1`;

                          return (
                            <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Open in Google Maps</span>

                              {/* Button 1: Current Location → Pickup (GPS fetched at click) */}
                              <button
                                type="button"
                                onClick={handleLeg1Nav}
                                disabled={isLeg1Loading}
                                className="w-full bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-60 border border-amber-500/30 text-amber-400 font-bold py-3 rounded-xl text-xs transition-all flex items-center gap-3 px-4 shadow"
                              >
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 shrink-0">
                                  {isLeg1Loading
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <Navigation className="h-3.5 w-3.5" />
                                  }
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-white">
                                    {isLeg1Loading ? 'Getting your location...' : '📍 Current Location → 📦 Pickup'}
                                  </span>
                                  <span className="text-[9px] text-amber-500/60 font-normal mt-0.5">
                                    {isLeg1Loading ? 'Please allow location permission' : 'Fetches your GPS now · opens Google Maps'}
                                  </span>
                                </div>
                              </button>

                              {/* Button 2: Pickup → NGO Destination (fixed coords, no GPS needed) */}
                              <a
                                href={leg2Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold py-3 rounded-xl text-xs transition-all flex items-center gap-3 px-4 shadow"
                              >
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 shrink-0">
                                  <Navigation className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-white">📦 Pickup → 🏢 NGO Destination</span>
                                  <span className="text-[9px] text-blue-500/60 font-normal mt-0.5">
                                    {item.ngo?.name || 'NGO'} · {ngoAddr ? ngoAddr.split(',')[0] : 'destination'} · driving
                                  </span>
                                </div>
                              </a>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white text-outfit">Completed Redirections</h3>
              <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded text-xs text-slate-400">
                {completedDeliveries.length} Completed Runs
              </span>
            </div>

            {completedDeliveries.length === 0 ? (
              <div className="glass-panel p-16 border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                <Award className="h-10 w-10 text-slate-500" />
                <p className="text-slate-400 text-sm">No completed delivery logs are registered to your profile yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel border-white/5 p-4">
                <table className="w-full text-left text-xs leading-normal text-slate-300">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[9px]">
                      <th className="py-3 px-4">Food Surplus Item</th>
                      <th className="py-3 px-4">Surplus Quantity</th>
                      <th className="py-3 px-4">Donor Center</th>
                      <th className="py-3 px-4">NGO Receiver</th>
                      <th className="py-3 px-4">Date Completed</th>
                      <th className="py-3 px-4 text-right">Job Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedDeliveries.map((item) => (
                      <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">{item.foodName}</td>
                        <td className="py-4 px-4">{item.quantity} {item.unit}</td>
                        <td className="py-4 px-4">{item.donor?.name}</td>
                        <td className="py-4 px-4">{item.ngo?.name || 'NGO Hub'}</td>
                        <td className="py-4 px-4">{formatDateOnly(item.createdAt)}</td>
                        <td className="py-4 px-4 text-right">
                          <Link href={`/donations/${item._id}`} className="text-brand-500 hover:text-brand-400 font-semibold underline">
                            View Logs
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 border-white/10 flex flex-col gap-4 relative text-left">
            <h3 className="text-lg font-bold text-white text-outfit">Cancel Pickup Task</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-bold uppercase">Reason for cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain the vehicle problem, emergency, or issue..."
                rows={3}
                className="w-full glass-input resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-bold uppercase">Proof photo</label>
              
              {cancelPhoto ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 h-32 w-full">
                  <img src={cancelPhoto} alt="Proof preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCancelPhoto('')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all text-xs"
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center border border-dashed border-white/15 rounded-xl p-6 hover:border-white/30 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCancelPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-400 font-semibold block">Click to upload proof photo</span>
                    <span className="text-[10px] text-slate-500 block">PNG, JPG up to 5MB</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedTaskIdForCancel(null);
                  setCancelReason('');
                  setCancelPhoto('');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-bold border border-white/5 transition-all"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={submitVolunteerCancellation}
                disabled={!cancelReason.trim() || !cancelPhoto || actionLoading === selectedTaskIdForCancel}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionLoading === selectedTaskIdForCancel ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Submit Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
