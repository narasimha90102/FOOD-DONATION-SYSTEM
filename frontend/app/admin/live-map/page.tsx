"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { Landmark, ArrowLeft, RefreshCw, Layers, Users, MapPin, Truck } from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN';
  address?: string;
  ngoVerificationStatus?: string;
  volunteerAvailability?: string;
  location?: {
    coordinates: [number, number];
  };
}

interface DonationItem {
  _id: string;
  foodName: string;
  quantity: number;
  unit: string;
  status: string;
  pickupAddress: string;
  location?: {
    coordinates: [number, number];
  };
  donor?: {
    name: string;
    _id: string;
  };
  ngo?: {
    name: string;
    location?: {
      coordinates: [number, number];
    };
  };
  volunteer?: {
    name: string;
    location?: {
      coordinates: [number, number];
    };
  };
}

export default function AdminLiveMap() {
  const { user, isAuthenticated } = useAppStore();
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LState, setLState] = useState<any>(null);
  const [leafletMap, setLeafletMap] = useState<any>(null);

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [donationsList, setDonationsList] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [showDonors, setShowDonors] = useState(true);
  const [showNGOs, setShowNGOs] = useState(true);
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Track map marker instances to clean up
  const markersRef = useRef<any[]>([]);
  const polylineInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'ADMIN') {
      router.push('/auth/login');
    }
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [usersRes, donationsRes] = await Promise.all([
        ApiService.get('/admin/users'),
        ApiService.get('/donations?status='),
      ]);
      setUsersList(usersRes.users || []);
      setDonationsList(donationsRes.donations || []);
    } catch (err) {
      console.error("Error loading live map data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let mapObj: any = null;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;
        setLState(L);

        // Start at neutral world view \u2014 will center on GPS once available
        mapObj = L.map(mapRef.current!, {
          zoomControl: true,
          attributionControl: false,
        }).setView([20, 0], 2);

        // Try to center on admin's real GPS location
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (mapObj) {
                mapObj.setView([pos.coords.latitude, pos.coords.longitude], 11);
              }
            },
            () => {
              // GPS unavailable \u2014 keep neutral world view, do NOT fall back to Bangalore
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(mapObj);

        setLeafletMap(mapObj);
        setLeafletLoaded(true);
      } catch (err) {
        console.error("Failed to initialize Leaflet on Admin Live Map:", err);
      }
    };

    initMap();

    return () => {
      if (mapObj) {
        mapObj.remove();
      }
    };
  }, []);

  // Sync / render markers on map
  useEffect(() => {
    const mapObj = leafletMap;
    if (!mapObj || !leafletLoaded || !LState) return;

    // 1. Cleanup existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (polylineInstanceRef.current) {
      polylineInstanceRef.current.remove();
      polylineInstanceRef.current = null;
    }

    const boundsPoints: any[] = [];

    // 2. Plot registered Donors (Green)
    if (showDonors) {
      const donors = usersList.filter(u => u.role === 'DONOR');
      donors.forEach(donor => {
        const coords = donor.location?.coordinates;
        if (coords && coords.length === 2 && coords[0] !== 0) {
          const latLng = [coords[1], coords[0]] as [number, number];
          const donorIcon = LState.divIcon({
            html: `<div class="relative flex items-center justify-center"><div class="w-3.5 h-3.5 bg-emerald-500 border border-white rounded-full shadow-lg"></div></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const marker = LState.marker(latLng, { icon: donorIcon }).addTo(mapObj);
          marker.bindPopup(`<div style="color: #000; font-size: 11px; padding: 4px;">
            <strong>Surplus Donor</strong><br/>
            <strong>Name:</strong> ${donor.name}<br/>
            <strong>Email:</strong> ${donor.email}
          </div>`);

          markersRef.current.push(marker);
          boundsPoints.push(latLng);
        }
      });
    }

    // 3. Plot active NGOs (Blue)
    if (showNGOs) {
      const ngos = usersList.filter(u => u.role === 'NGO');
      ngos.forEach(ngo => {
        const coords = ngo.location?.coordinates;
        if (coords && coords.length === 2 && coords[0] !== 0) {
          const latLng = [coords[1], coords[0]] as [number, number];
          const ngoIcon = LState.divIcon({
            html: `<div class="relative flex items-center justify-center"><div class="w-3.5 h-3.5 bg-blue-500 border border-white rounded-full shadow-lg"></div></div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const marker = LState.marker(latLng, { icon: ngoIcon }).addTo(mapObj);
          marker.bindPopup(`<div style="color: #000; font-size: 11px; padding: 4px;">
            <strong>NGO Hub Partner</strong><br/>
            <strong>Name:</strong> ${ngo.name}<br/>
            <strong>Verification:</strong> ${ngo.ngoVerificationStatus}
          </div>`);

          markersRef.current.push(marker);
          boundsPoints.push(latLng);
        }
      });
    }

    // 4. Plot Active Volunteers (Yellow Cars)
    if (showVolunteers) {
      const volunteers = usersList.filter(u => u.role === 'VOLUNTEER');
      volunteers.forEach(vol => {
        const coords = vol.location?.coordinates;
        if (coords && coords.length === 2 && coords[0] !== 0 && vol.volunteerAvailability === 'BUSY') {
          const latLng = [coords[1], coords[0]] as [number, number];
          const volunteerIcon = LState.divIcon({
            html: `<div class="relative flex items-center justify-center"><div class="absolute w-6 h-6 bg-amber-500/20 rounded-full animate-pulse"></div><div class="w-5 h-5 bg-amber-500 border border-white rounded-full shadow-lg flex items-center justify-center text-[8px] text-white">🚗</div></div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          const marker = LState.marker(latLng, { icon: volunteerIcon }).addTo(mapObj);
          marker.bindPopup(`<div style="color: #000; font-size: 11px; padding: 4px;">
            <strong>Delivery Courier</strong><br/>
            <strong>Name:</strong> ${vol.name}<br/>
            <strong>Status:</strong> Busy on Route
          </div>`);

          markersRef.current.push(marker);
          boundsPoints.push(latLng);
        }
      });
    }

    // 5. Plot Active Deliveries routing lines (filter by selected status)
    const activeRuns = donationsList.filter(d => {
      const isStatusMatch = statusFilter === 'ALL' || d.status === statusFilter;
      const isTrackingActive = ['GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status);
      return isStatusMatch && isTrackingActive;
    });

    const drawRouteAndFit = async () => {
      if (activeRuns.length > 0) {
        const activeRun = activeRuns[0];
        const startCoords = activeRun.location?.coordinates;
        const endCoords = activeRun.ngo?.location?.coordinates;
        const volCoords = activeRun.volunteer?.location?.coordinates;

        if (startCoords && endCoords) {
          let routeStart = startCoords;
          let routeEnd = endCoords;
          if (volCoords && volCoords[0] !== 0) {
            routeStart = volCoords;
            routeEnd = activeRun.status === 'GOING_TO_PICKUP' ? startCoords : endCoords;
          }

          if (routeStart && routeEnd && (routeStart[0] !== routeEnd[0] || routeStart[1] !== routeEnd[1])) {
            try {
              const url = `https://router.project-osrm.org/route/v1/driving/${routeStart[0]},${routeStart[1]};${routeEnd[0]},${routeEnd[1]}?overview=full&geometries=geojson`;
              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                  const route = data.routes[0];
                  const flippedCoords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
                  const polyline = LState.polyline(flippedCoords, {
                    color: '#3b82f6',
                    weight: 5,
                    opacity: 0.7,
                  }).addTo(mapObj);
                  polylineInstanceRef.current = polyline;
                }
              }
            } catch (err) {
              console.error("OSRM call in Admin Live Map failed:", err);
            }
          }
        }
      }

      // Auto fit bounds
      if (boundsPoints.length > 0) {
        const latLngBounds = LState.latLngBounds(boundsPoints);
        mapObj.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 15 });
      }
    };

    drawRouteAndFit();

  }, [leafletMap, leafletLoaded, usersList, donationsList, showDonors, showNGOs, showVolunteers, statusFilter, LState]);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading system tracking radar...</p>
      </div>
    );
  }

  const activeDeliveriesList = donationsList.filter(d => ['GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status));

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
          onClick={fetchData}
          disabled={refreshing}
          className="border border-white/10 hover:border-white/20 p-2.5 rounded-lg text-slate-300 hover:text-white transition-all hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="border-b border-white/5 pb-4">
        <h1 className="text-3xl font-bold text-white text-outfit">Live System Activity Map</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time road maps showing active listings, NGO hubs, and courier dispatch routes.</p>
      </div>

      {/* Main split layout (Filters/List on left, Leaflet Map on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Control Panel */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border-white/5 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Layers className="h-4 w-4 text-brand-500" /> Map Filters
            </h3>

            {/* Entity toggles */}
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDonors}
                  onChange={(e) => setShowDonors(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-500 focus:ring-brand-500/20"
                />
                <span>Show Donor Hubs</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNGOs}
                  onChange={(e) => setShowNGOs(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-500 focus:ring-brand-500/20"
                />
                <span>Show NGO Partners</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVolunteers}
                  onChange={(e) => setShowVolunteers(e.target.checked)}
                  className="rounded border-white/10 bg-white/5 text-brand-500 focus:ring-brand-500/20"
                />
                <span>Show Dispatch Couriers</span>
              </label>
            </div>

            {/* Status select */}
            <div className="space-y-1.5 border-t border-white/5 pt-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 block">Filter Active Route Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full glass-input text-xs"
              >
                <option value="ALL">All Active Stages</option>
                <option value="GOING_TO_PICKUP">En Route to Pickup</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
              </select>
            </div>
          </div>

          {/* Active deliveries quick logs list */}
          <div className="glass-panel p-6 border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">
              Active Courier Tasks ({activeDeliveriesList.length})
            </h4>

            {activeDeliveriesList.length === 0 ? (
              <p className="text-[10px] text-slate-500">No active delivery routes are currently running.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {activeDeliveriesList.map(item => (
                  <div key={item._id} className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1 text-[11px]">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white truncate max-w-[120px]">{item.foodName}</span>
                      <span className="text-[9px] uppercase font-bold text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-slate-400">Driver: <strong>{item.volunteer?.name || 'Awaiting'}</strong></p>
                    <p className="text-slate-500 truncate">From: {item.pickupAddress}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Map Column (takes 3 cols) */}
        <div className="lg:col-span-3 relative">
          <div ref={mapRef} className="w-full h-[550px] rounded-xl border border-white/10 overflow-hidden shadow-2xl z-0" />
        </div>

      </div>

    </div>
  );
}
