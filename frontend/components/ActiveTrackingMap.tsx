"use client";

import { useEffect, useRef, useState } from 'react';
import { Truck, RefreshCw, Navigation, MapPin } from 'lucide-react';

interface ActiveTrackingMapProps {
  donorCoords: [number, number]; // [lng, lat]  ← pickup point
  ngoCoords?: [number, number];   // [lng, lat]  ← final destination
  volunteerCoords?: [number, number] | null; // [lng, lat] ← volunteer current
  status: string; // e.g. 'GOING_TO_PICKUP', 'IN_TRANSIT', etc.
  donorAddress?: string;
  ngoName?: string;
  ngoAddress?: string;
  volunteerName?: string;
}

interface RouteLeg {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng] pairs for Leaflet
}

// Fetch a single OSRM road route between two [lng, lat] points
async function fetchOsrmLeg(
  from: [number, number],
  to: [number, number]
): Promise<RouteLeg | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) return null;

  const route = data.routes[0];
  const geometry: [number, number][] = (route.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng]
  );
  return {
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
    geometry,
  };
}

export default function ActiveTrackingMap({
  donorCoords,
  ngoCoords,
  volunteerCoords,
  status,
  donorAddress = 'Donor Hub',
  ngoName = 'NGO Center',
  ngoAddress = 'NGO Hub Address',
  volunteerName = 'Volunteer Partner',
}: ActiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  // Route state
  const [leg1, setLeg1] = useState<RouteLeg | null>(null); // vol → pickup
  const [leg2, setLeg2] = useState<RouteLeg | null>(null); // pickup → NGO
  const [mapInitialized, setMapInitialized] = useState(false);
  const [routeState, setRouteState] = useState<'loading' | 'success' | 'no_coords' | 'failed'>('loading');

  const markersRef = useRef<{ donor?: any; ngo?: any; volunteer?: any }>({});
  const poly1Ref = useRef<any>(null); // vol → pickup polyline
  const poly2Ref = useRef<any>(null); // pickup → NGO polyline

  const isDeliveryActive = ['GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(status);
  const hasVolunteer = !!(volunteerCoords && volunteerCoords[0] !== 0 && isDeliveryActive);
  const hasNgo = !!(ngoCoords && ngoCoords[0] !== 0);

  // ─── Effect 1: Initialize Leaflet map once ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    if ((mapRef.current as any)._leaflet_id) {
      try {
        if (leafletMapRef.current) leafletMapRef.current.remove();
        else delete (mapRef.current as any)._leaflet_id;
      } catch (_) { delete (mapRef.current as any)._leaflet_id; }
      leafletMapRef.current = null;
      markersRef.current = {};
      poly1Ref.current = null;
      poly2Ref.current = null;
    }

    let active = true;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!active || !mapRef.current) return;
        if ((mapRef.current as any)._leaflet_id) return;

        const mapInstance = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([donorCoords[1], donorCoords[0]], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);

        if (active) {
          leafletMapRef.current = mapInstance;
          setMapInitialized(true);
        } else {
          mapInstance.remove();
        }
      } catch (err) {
        console.error('[ActiveTrackingMap] Leaflet init failed:', err);
      }
    })();

    return () => {
      active = false;
      markersRef.current = {};
      poly1Ref.current = null;
      poly2Ref.current = null;
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch (_) { }
        leafletMapRef.current = null;
      }
      setMapInitialized(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Effect 2: Update markers + multi-stop route whenever props change ────────
  useEffect(() => {
    if (!mapInitialized) return;

    let active = true;
    const mapAlive = () => active && leafletMapRef.current !== null;

    (async () => {
      try {
        setRouteState('loading');
        setLeg1(null);
        setLeg2(null);

        const L = (await import('leaflet')).default;
        if (!mapAlive()) return;

        const mapObj = leafletMapRef.current!;
        const markers = markersRef.current;

        // ── Tear down previous layers ──────────────────────────────────────────
        try { if (markers.donor) markers.donor.remove(); } catch (_) { }
        try { if (markers.ngo) markers.ngo.remove(); } catch (_) { }
        try { if (markers.volunteer) markers.volunteer.remove(); } catch (_) { }
        try { if (poly1Ref.current) poly1Ref.current.remove(); } catch (_) { }
        try { if (poly2Ref.current) poly2Ref.current.remove(); } catch (_) { }
        markersRef.current = {};
        poly1Ref.current = null;
        poly2Ref.current = null;

        if (!mapAlive()) return;

        const boundsPoints: [number, number][] = [];

        // ── 1. Volunteer marker (amber pulsing car) ───────────────────────────
        let volLatLng: [number, number] | null = null;
        if (hasVolunteer && volunteerCoords) {
          const volIcon = L.divIcon({
            html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;">
                     <div style="position:absolute;width:36px;height:36px;background:rgba(245,158,11,0.25);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                     <div style="width:28px;height:28px;background:#f59e0b;border:3px solid white;border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;">🚗</div>
                   </div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });
          volLatLng = [volunteerCoords[1], volunteerCoords[0]];
          const volMarker = L.marker(volLatLng, { icon: volIcon }).addTo(mapObj);
          volMarker.bindPopup(
            `<div style="color:#000;font-size:11px;padding:4px;"><strong>🏍️ You (Volunteer)</strong><br/>${volunteerName}</div>`
          );
          markersRef.current.volunteer = volMarker;
          boundsPoints.push(volLatLng);
        }

        if (!mapAlive()) return;

        // ── 2. Donor/Pickup marker (green pulsing pin) ────────────────────────
        const isDonorValid = donorCoords && (donorCoords[0] !== 0 || donorCoords[1] !== 0);
        let donorLatLng: [number, number] | null = null;
        if (isDonorValid) {
          const donorIcon = L.divIcon({
            html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
                     <div style="position:absolute;width:28px;height:28px;background:rgba(16,185,129,0.3);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                     <div style="width:16px;height:16px;background:#10b981;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
                   </div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          donorLatLng = [donorCoords[1], donorCoords[0]];
          const donorMarker = L.marker(donorLatLng, { icon: donorIcon }).addTo(mapObj);
          donorMarker.bindPopup(
            `<div style="color:#000;font-size:11px;padding:4px;"><strong>📦 Pickup Stop</strong><br/>${donorAddress}</div>`
          );
          markersRef.current.donor = donorMarker;
          boundsPoints.push(donorLatLng);
        }

        if (!mapAlive()) return;

        // ── 3. NGO / Destination marker (blue flag) ───────────────────────────
        let ngoLatLng: [number, number] | null = null;
        if (hasNgo && ngoCoords) {
          const ngoIcon = L.divIcon({
            html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
                     <div style="width:16px;height:16px;background:#3b82f6;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
                   </div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          ngoLatLng = [ngoCoords[1], ngoCoords[0]];
          const ngoMarker = L.marker(ngoLatLng, { icon: ngoIcon }).addTo(mapObj);
          ngoMarker.bindPopup(
            `<div style="color:#000;font-size:11px;padding:4px;"><strong>🏢 Final Destination</strong><br/><strong>${ngoName}</strong><br/>${ngoAddress}</div>`
          );
          markersRef.current.ngo = ngoMarker;
          boundsPoints.push(ngoLatLng);
        }

        if (!mapAlive()) return;

        // ── 4. Fetch multi-stop routes ────────────────────────────────────────
        // When volunteer is active: fetch LEG1 (vol→pickup) + LEG2 (pickup→NGO)
        // When no volunteer but both donor+NGO: fetch LEG2 only (pickup→NGO)
        let fetchedLeg1: RouteLeg | null = null;
        let fetchedLeg2: RouteLeg | null = null;
        let routeSucceeded = false;

        try {
          if (hasVolunteer && volunteerCoords && donorLatLng) {
            // Always fetch leg1: volunteer → pickup
            fetchedLeg1 = await fetchOsrmLeg(volunteerCoords, donorCoords);
            if (!mapAlive()) return;

            // Leg 2: pickup → NGO (only if NGO coords known)
            if (hasNgo && ngoCoords) {
              fetchedLeg2 = await fetchOsrmLeg(donorCoords, ngoCoords);
              if (!mapAlive()) return;
            }
          } else if (hasNgo && ngoCoords && isDonorValid) {
            // No volunteer yet — just show pickup → NGO
            fetchedLeg2 = await fetchOsrmLeg(donorCoords, ngoCoords);
            if (!mapAlive()) return;
          }

          if (fetchedLeg1 || fetchedLeg2) {
            setLeg1(fetchedLeg1);
            setLeg2(fetchedLeg2);
            setRouteState('success');
            routeSucceeded = true;

            // Draw leg 1 (volunteer → pickup) in amber
            if (fetchedLeg1 && mapAlive()) {
              const p1 = L.polyline(fetchedLeg1.geometry, {
                color: '#f59e0b',
                weight: 6,
                opacity: 0.9,
                dashArray: '10, 5',
              }).addTo(mapObj);
              poly1Ref.current = p1;
            }

            // Draw leg 2 (pickup → NGO) in blue
            if (fetchedLeg2 && mapAlive()) {
              const p2 = L.polyline(fetchedLeg2.geometry, {
                color: '#3b82f6',
                weight: 6,
                opacity: 0.9,
              }).addTo(mapObj);
              poly2Ref.current = p2;
            }

            // Fit to the combined route
            if (mapAlive()) {
              const allPoints: [number, number][] = [
                ...(fetchedLeg1?.geometry || []),
                ...(fetchedLeg2?.geometry || []),
              ];
              if (allPoints.length > 0) {
                const bounds = L.latLngBounds(allPoints);
                mapObj.fitBounds(bounds, { padding: [40, 40] });
              }
            }
          } else {
            setRouteState(boundsPoints.length === 0 ? 'no_coords' : 'failed');
          }
        } catch (osmErr: any) {
          if (osmErr?.name !== 'AbortError') {
            console.warn('[ActiveTrackingMap] OSRM routing failed:', osmErr?.message);
          }
          if (mapAlive()) setRouteState('failed');
        }

        // ── 5. Fallback: fit to marker bounds ─────────────────────────────────
        if (!routeSucceeded && boundsPoints.length > 0 && mapAlive()) {
          const latLngBounds = L.latLngBounds(boundsPoints);
          mapObj.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 15 });
        }

      } catch (err) {
        console.error('[ActiveTrackingMap] updateMapElements error:', err);
      }
    })();

    return () => { active = false; };
  }, [donorCoords, ngoCoords, volunteerCoords, status, mapInitialized]);

  // ── Computed totals ────────────────────────────────────────────────────────────
  const totalKm = (leg1?.distanceKm ?? 0) + (leg2?.distanceKm ?? 0);
  const totalMin = (leg1?.durationMin ?? 0) + (leg2?.durationMin ?? 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Interactive Leaflet Map */}
      <div className="relative w-full h-80 rounded-xl border border-white/10 overflow-hidden shadow-lg z-0">
        <div ref={mapRef} className="w-full h-full" />
        {!mapInitialized && (
          <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
            <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
            <span className="text-xs text-slate-500">Loading interactive routing systems...</span>
          </div>
        )}
        {/* Map legend overlay */}
        {mapInitialized && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 bg-dark-900/85 backdrop-blur-sm border border-white/10 p-2 rounded-lg text-[9px] font-bold uppercase tracking-wider">
            {hasVolunteer && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <div className="w-3 h-0.5 bg-amber-400 rounded" style={{ borderTop: '2px dashed' }}></div>
                <span>Leg 1: You → Pickup</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-blue-400">
              <div className="w-3 h-0.5 bg-blue-400 rounded"></div>
              <span>Leg 2: Pickup → NGO</span>
            </div>
          </div>
        )}
      </div>

      {/* Route breakdown cards */}
      {routeState === 'loading' && (
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-2 text-slate-400 text-xs">
          <RefreshCw className="h-4 w-4 text-brand-500 animate-spin shrink-0" />
          <span>Computing multi-stop route...</span>
        </div>
      )}

      {routeState === 'success' && (
        <div className="flex flex-col gap-2">
          {/* Leg 1 card — volunteer to pickup */}
          {leg1 && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Navigation className="h-4 w-4 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/60">Leg 1</span>
                  <span className="text-xs font-bold">You → Pickup Stop</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Distance</span>
                  <span className="text-sm font-bold text-white">{leg1.distanceKm.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">ETA</span>
                  <span className="text-sm font-bold text-amber-400">{leg1.durationMin} min</span>
                </div>
              </div>
            </div>
          )}

          {/* Leg 2 card — pickup to NGO */}
          {leg2 && (
            <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-blue-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500/60">Leg 2</span>
                  <span className="text-xs font-bold">Pickup → NGO Destination</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Distance</span>
                  <span className="text-sm font-bold text-white">{leg2.distanceKm.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">ETA</span>
                  <span className="text-sm font-bold text-blue-400">{leg2.durationMin} min</span>
                </div>
              </div>
            </div>
          )}

          {/* Total summary row */}
          {(leg1 || leg2) && (
            <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-slate-300">
                <div className="bg-brand-500/10 p-2 rounded-lg text-brand-400 shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Journey</span>
                  <span className="text-xs font-semibold text-white mt-0.5">
                    {status === 'GOING_TO_PICKUP'
                      ? 'You → Pickup → NGO'
                      : status === 'IN_TRANSIT'
                        ? 'Pickup → NGO'
                        : 'Full Route'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-right">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block tracking-wider">Total KM</span>
                  <span className="text-base font-extrabold text-white">{totalKm.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block tracking-wider">Total ETA</span>
                  <span className="text-base font-extrabold text-brand-400">{totalMin} min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {routeState === 'no_coords' && (
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <span className="text-xs text-amber-400 font-semibold">Route unavailable — location data missing.</span>
        </div>
      )}

      {routeState === 'failed' && (
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <span className="text-xs text-slate-400 font-semibold">Road route unavailable — showing marker view.</span>
        </div>
      )}
    </div>
  );
}
