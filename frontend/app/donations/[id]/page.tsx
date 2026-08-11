"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { useSocket } from '../../../hooks/useSocket';
import { MapPin, Navigation, Compass, Clock, Award, ShieldCheck, Heart, Truck, CheckCircle2, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import ActiveTrackingMap from '../../../components/ActiveTrackingMap';
import Link from 'next/link';
import { formatDateTime } from '../../../utils/formatDate';

interface Props {
  params: Promise<{ id: string }>;
}

export default function DonationDetailsPage({ params }: Props) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { user } = useAppStore();
  useSocket(); // Initialize socket connections globally

  const [donation, setDonation] = useState<any>(null);
  const [volCoords, setVolCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await ApiService.get(`/donations/${id}`);
      setDonation(res.donation);
    } catch (err: any) {
      setError(err.message || 'Error fetching details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDonation = async () => {
    if (!window.confirm("Are you sure you want to cancel this donation?")) {
      return;
    }
    try {
      setLoading(true);
      await ApiService.put(`/donations/${id}/status`, { status: 'CANCELLED' });
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Failed to cancel donation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Real-time expiry countdown timer
  useEffect(() => {
    if (!donation || !donation.estimatedExpiryTime) return;

    const expiryTime = new Date(donation.estimatedExpiryTime).getTime();

    const updateCountdown = () => {
      const diff = expiryTime - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('Expired');
        setIsExpired(true);
        if (donation.status !== 'EXPIRED' && donation.status !== 'COMPLETED' && donation.status !== 'CANCELLED' && donation.status !== 'DELIVERED') {
          setDonation((prev: any) => prev ? { ...prev, status: 'EXPIRED' } : null);
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${hours}h ${minutes}m ${seconds}s`);
        setIsExpired(false);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [donation?.estimatedExpiryTime]);

  // Handle updates when other roles update the pipeline
  useEffect(() => {
    window.addEventListener('donation_update', fetchDetails);
    return () => {
      window.removeEventListener('donation_update', fetchDetails);
    };
  }, []);

  // Load volunteer initial location coordinates if assigned
  useEffect(() => {
    if (donation && donation.volunteer && typeof donation.volunteer === 'object') {
      const vLoc = (donation.volunteer as any).location;
      if (vLoc && vLoc.coordinates && vLoc.coordinates.length === 2 && vLoc.coordinates[0] !== 0) {
        setVolCoords(vLoc.coordinates);
      }
    }
  }, [donation]);

  // Bind real-time GPS telemetry updates for the active run
  useEffect(() => {
    if (!id) return;
    const handleLocationChanged = (e: Event) => {
      const coords = (e as CustomEvent).detail;
      if (coords) {
        setVolCoords(coords);
      }
    };

    window.addEventListener(`volunteer_location_${id}`, handleLocationChanged);
    return () => {
      window.removeEventListener(`volunteer_location_${id}`, handleLocationChanged);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading donation telemetry...</p>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-red-400 text-sm font-semibold">{error || 'Donation details not found.'}</p>
        <button onClick={() => router.back()} className="text-brand-500 underline font-bold flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  // Tracking milestones setup based on status
  const statusesList = [
    { key: 'PENDING', label: 'Donation Posted', desc: 'Surplus registered by donor' },
    { key: 'NGO_ACCEPTED', label: 'NGO Accepted', desc: 'Organization claimed donation' },
    { key: 'VOLUNTEER_ASSIGNED', label: 'Volunteer Assigned', desc: 'Driver linked to task' },
    { key: 'GOING_TO_PICKUP', label: 'Going to Pickup', desc: 'Volunteer en route to donor' },
    { key: 'PICKED_UP', label: 'Food Collected', desc: 'Surplus picked up from donor' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'En route to organization' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Food arrived at NGO centre' },
    { key: 'COMPLETED', label: 'Completed', desc: 'Redistributed to beneficiaries' },
  ];

  // Helper to determine status index in the tracking timeline.
  // Maps ALL possible backend status values to a 0-7 index in statusesList.
  const getStatusIndex = (currentStatus: string) => {
    switch (currentStatus) {
      // Map legacy / intermediate states to their effective position
      case 'AI_SCREENING':
      case 'APPROVED':
      case 'NGO_MATCHED':          return 0;  // Still at PENDING stage
      case 'PENDING':              return 0;
      case 'NGO_ACCEPTED':         return 1;
      case 'VOLUNTEER_ASSIGNED':   return 2;
      case 'GOING_TO_PICKUP':      return 3;
      case 'PICKED_UP':            return 4;
      case 'IN_TRANSIT':           return 5;
      case 'DELIVERED':            return 6;
      case 'DISTRIBUTED':
      case 'REDISTRIBUTED_TO_BENEFICIARIES':
      case 'COMPLETED':            return 7;
      // Terminal failure states — show all steps dimmed except step 0
      case 'REJECTED':
      case 'CANCELLED':
      case 'EXPIRED':              return -1;
      default:                     return 0;
    }
  };

  const currentIndex = getStatusIndex(donation.status);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-10">
      
      {/* Header back button */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 hover:bg-white/5 px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-all text-xs font-bold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>
      </div>

      {/* Main Layout (Info detail on left, Timeline tracking on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Info panel */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="glass-panel p-8 border-white/5 flex flex-col gap-6 relative overflow-hidden">
            {/* Background glowing sphere */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/5 pb-5">
              <div>
                <span className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">Donation ID: {donation._id.substring(12)}</span>
                <h2 className="text-3xl font-extrabold text-white text-outfit mt-1 leading-tight">{donation.foodName}</h2>
                <span className="bg-white/5 text-slate-300 border border-white/5 px-3 py-1 rounded text-xs mt-2 inline-block font-bold">
                  {donation.foodCategory}
                </span>
              </div>

              <div className="flex items-center gap-3.5 flex-wrap">
                {!['COMPLETED', 'DELIVERED', 'DISTRIBUTED', 'CANCELLED', 'EXPIRED'].includes(donation.status) && 
                 (donation.donor?._id === user?._id || user?.role === 'ADMIN') && (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/donor/donate?id=${donation._id}`}
                      className="bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-2 rounded-lg border border-white/10 text-xs font-bold transition-all"
                    >
                      Edit Listing
                    </Link>
                    <button
                      onClick={handleCancelDonation}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      Cancel Listing
                    </button>
                  </div>
                )}
                <span className="bg-brand-500 text-dark-900 font-extrabold px-4 py-2.5 rounded-xl text-lg shadow-md">
                  {donation.quantity} {donation.unit}
                </span>
              </div>
            </div>

            {/* General specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-2">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Storage</span>
                <span className="text-sm font-semibold text-white mt-1 block capitalize">{donation.storageCondition}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Freshness Score</span>
                <span className="text-sm font-semibold text-brand-500 mt-1 block font-bold">{donation.aiFreshnessScore || 90}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Safe Window</span>
                <span className="text-sm font-semibold text-white mt-1 block">{donation.aiSafeWindowHours || 8} hours</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Expiry Time</span>
                <span className="text-xs text-white mt-1 block">{formatDateTime(donation.estimatedExpiryTime)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Time Remaining</span>
                <span className={`text-xs mt-1 block font-bold ${isExpired ? 'text-red-400' : 'text-yellow-400 animate-pulse'}`}>
                  {timeLeftStr}
                </span>
              </div>
            </div>

            {/* Addresses and coordinates */}
            <div className="border-t border-white/5 pt-5 space-y-4 text-sm text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Pickup Location</span>
                  <span className="font-semibold text-white block mt-0.5">{donation.pickupAddress}</span>
                </div>
              </div>

              {(donation.destinationAddress || donation.ngo?.address) && (
                <div className="flex items-start gap-2.5 border-t border-white/5 pt-3">
                  <Compass className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-brand-400 font-bold uppercase block">NGO Receiver Destination Location</span>
                    <span className="font-semibold text-white block mt-0.5">
                      {donation.destinationAddress || donation.ngo?.address}
                    </span>
                  </div>
                </div>
              )}

              {donation.specialInstructions && (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs leading-relaxed text-slate-400">
                  <strong>Special Instructions:</strong> <br />
                  <span className="block mt-1">{donation.specialInstructions}</span>
                </div>
              )}
            </div>
          </div>

          {donation.status === 'CANCELLED' && (
            <div className="glass-panel p-6 border-red-500/20 bg-red-500/5 space-y-4">
              <h3 className="text-lg font-bold text-red-400 text-outfit border-b border-red-500/10 pb-2">Donation Cancelled ❌</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Cancelled By</span>
                  <strong className="text-white text-sm block mt-0.5 capitalize font-mono">
                    {donation.cancelledByRole || 'System'} {donation.cancelledBy ? `(${donation.cancelledBy.name || donation.cancelledBy.email || donation.cancelledBy})` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Cancellation Date</span>
                  <strong className="text-white text-sm block mt-0.5">
                    {donation.cancelledAt ? new Date(donation.cancelledAt).toLocaleString() : 'N/A'}
                  </strong>
                </div>
              </div>

              {donation.cancellationReason && (
                <div className="text-xs text-slate-300 bg-white/5 p-4 rounded-lg leading-relaxed mt-2 border border-white/5 text-left">
                  <strong className="text-slate-400">Reason for Cancellation:</strong>
                  <p className="mt-1">{donation.cancellationReason}</p>
                </div>
              )}

              {donation.cancellationProof && (
                <div className="space-y-2 mt-2 text-left">
                  <span className="text-slate-500 block uppercase font-bold text-[10px]">Cancellation Proof Photo</span>
                  <div className="rounded-xl overflow-hidden border border-white/10 max-w-md">
                    <img src={donation.cancellationProof} alt="Cancellation Proof" className="w-full max-h-64 object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          {donation.status === 'REJECTED' && (
            <div className="glass-panel p-6 border-red-500/20 bg-red-500/5 space-y-3">
              <h3 className="text-lg font-bold text-red-400 text-outfit border-b border-red-500/10 pb-2">Donation Rejected ❌</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This donation was reviewed and rejected. It is no longer active in the system.
              </p>
            </div>
          )}

          {donation.status === 'EXPIRED' && (
            <div className="glass-panel p-6 border-amber-500/20 bg-amber-500/5 space-y-3">
              <h3 className="text-lg font-bold text-amber-400 text-outfit border-b border-amber-500/10 pb-2">Donation Expired ⏰</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This donation passed its estimated expiry time before it could be collected. The listing has been automatically closed.
              </p>
            </div>
          )}

          {/* Connected Profiles (Donor, NGO, Volunteer info cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Donor */}
            <div className="glass-panel p-6 border-white/5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Surplus Donor</span>
                <h4 className="text-base font-bold text-white text-outfit mt-1.5 leading-snug">{donation.donor?.name || 'Donor'}</h4>
                <p className="text-xs text-slate-400 mt-1 truncate">{donation.donor?.email}</p>
              </div>
              <div className="border-t border-white/5 pt-3 text-xs text-brand-500 font-semibold">
                Trust Score: {donation.donor?.trustScore || 85}%
              </div>
            </div>

            {/* NGO */}
            <div className="glass-panel p-6 border-white/5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Claiming NGO</span>
                {donation.ngo ? (
                  <>
                    <h4 className="text-base font-bold text-white text-outfit mt-1.5 leading-snug">{donation.ngo.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 truncate">{donation.ngo.email}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 mt-3">Awaiting organization acceptance.</p>
                )}
              </div>
              {donation.ngo && (
                <div className="border-t border-white/5 pt-3 text-xs text-slate-400">
                  Verified Status: Approved
                </div>
              )}
            </div>

            {/* Volunteer */}
            <div className="glass-panel p-6 border-white/5 flex flex-col justify-between gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Assigned Driver</span>
                {donation.volunteer ? (
                  <>
                    <h4 className="text-base font-bold text-white text-outfit mt-1.5 leading-snug">{donation.volunteer.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 truncate">{donation.volunteer.phoneNumber || 'No phone'}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 mt-3">Awaiting volunteer assignment.</p>
                )}
              </div>
              {donation.volunteer && (
                <div className="border-t border-white/5 pt-3 text-xs text-slate-400">
                  Status: Active Delivery
                </div>
              )}
            </div>

          </div>

          {/* Food Distribution Summary details */}
          {donation.distribution && (
            <div className="glass-panel p-6 border-white/5 space-y-4">
              <h3 className="text-lg font-bold text-white text-outfit border-b border-white/5 pb-2">Food Distribution Logs</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Distributed Quantity</span>
                  <strong className="text-white text-sm block mt-0.5">{donation.distribution.distributedQuantity} {donation.unit}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Beneficiaries Served</span>
                  <strong className="text-white text-sm block mt-0.5">{donation.distribution.beneficiariesCount} people</strong>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-bold">Distribution Location</span>
                  <strong className="text-white text-sm block mt-0.5">{donation.distribution.location}</strong>
                </div>
              </div>

              {donation.distribution.notes && (
                <div className="text-xs text-slate-400 bg-white/5 p-4 rounded-lg leading-relaxed mt-2">
                  <strong>Notes:</strong> {donation.distribution.notes}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Real-time status timeline tracking (Takes 1 col) */}
        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-bold text-white text-outfit border-b border-white/5 pb-2">Donation Tracking Status</h3>

          {/* Active road routing map */}
          {donation.location?.coordinates && (donation.location.coordinates[0] !== 0 || donation.location.coordinates[1] !== 0) && (
            <ActiveTrackingMap
              donorCoords={donation.location.coordinates}
              ngoCoords={donation.destinationLocation?.coordinates || donation.ngo?.location?.coordinates}
              volunteerCoords={volCoords}
              status={donation.status}
              donorAddress={donation.pickupAddress}
              ngoName={donation.ngo?.name}
              ngoAddress={donation.destinationAddress || donation.ngo?.address}
              volunteerName={donation.volunteer?.name}
            />
          )}

          <div className="glass-panel p-6 border-white/5 relative pl-10 space-y-8 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
            {/* Terminal state label at top of timeline */}
            {currentIndex === -1 && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border mb-2 ${
                donation.status === 'CANCELLED'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : donation.status === 'EXPIRED'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              }`}>
                Current Status: {donation.status}
              </div>
            )}

            {statusesList.map((step, idx) => {
              // For terminal states, no step is "active" or "current"
              const active = currentIndex >= 0 && idx <= currentIndex;
              const current = currentIndex >= 0 && idx === currentIndex;

              return (
                <div key={step.key} className={`relative flex items-start gap-4 transition-all duration-300 ${
                  active ? 'opacity-100' : 'opacity-30'
                }`}>
                  {/* Indicator bullet */}
                  <div className={`absolute -left-9 h-6 w-6 rounded-full border text-[10px] font-bold flex items-center justify-center z-10 transition-colors ${
                    current
                      ? 'bg-amber-500 border-amber-500 text-dark-900 animate-pulse'
                      : active
                      ? 'bg-brand-500 border-brand-500 text-dark-900'
                      : 'bg-dark-900 border-white/20 text-slate-500'
                  }`}>
                    {active && !current ? '✓' : idx + 1}
                  </div>

                  <div>
                    <h5 className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-500'}`}>{step.label}</h5>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
