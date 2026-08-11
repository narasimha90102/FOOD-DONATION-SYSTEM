"use client";

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface LocationPickerProps {
  initialAddress?: string;
  initialCoordinates?: [number, number]; // [lng, lat]
  label?: string; // Label shown in "Confirmed" display. Defaults to "Pickup Location"
  onChange: (data: { address: string; coordinates: [number, number] }) => void;
}

// ─── Fixed Permanent Location ────────────────────────────────────────────────
const FIXED_COORDS = { lat: 13.028344, lng: 80.016108 };
const FIXED_ADDRESS_DEFAULT = "Saveetha College of Architecture and Design (SCAD), Thandalam, Sriperumbudur, Tamil Nadu, India";

// India bounding box (conservative)
const INDIA_BOUNDS = { latMin: 6.5, latMax: 37.1, lngMin: 68.1, lngMax: 97.4 };

// ─── Helper: format Nominatim address into human-readable string ──────────────
const formatNominatimAddress = (addressObj: any): string => {
  if (!addressObj) return '';
  const parts: string[] = [];

  const placeName =
    addressObj.amenity ||
    addressObj.shop ||
    addressObj.tourism ||
    addressObj.leisure ||
    addressObj.building ||
    addressObj.railway ||
    addressObj.office ||
    addressObj.historic ||
    addressObj.place;
  if (placeName) parts.push(placeName);
  if (addressObj.house_number) parts.push(addressObj.house_number);
  if (addressObj.road) parts.push(addressObj.road);

  const localArea =
    addressObj.suburb ||
    addressObj.neighbourhood ||
    addressObj.village ||
    addressObj.subdistrict;
  if (localArea) parts.push(localArea);

  const city =
    addressObj.city ||
    addressObj.town ||
    addressObj.city_district ||
    addressObj.municipality;
  if (city) parts.push(city);

  if (addressObj.county) parts.push(addressObj.county);
  if (addressObj.state) parts.push(addressObj.state);
  if (addressObj.postcode) parts.push(addressObj.postcode);
  if (addressObj.country) parts.push(addressObj.country);

  return parts.filter(Boolean).join(', ');
};

// ─── Helper: check if coordinates are within India ────────────────────────────
const isWithinIndia = (lat: number, lng: number): boolean => {
  return (
    lat >= INDIA_BOUNDS.latMin &&
    lat <= INDIA_BOUNDS.latMax &&
    lng >= INDIA_BOUNDS.lngMin &&
    lng <= INDIA_BOUNDS.lngMax
  );
};

// ─── Helper: check if coordinates are within Tamil Nadu ──────────────────────
const isWithinTamilNadu = (lat: number, lng: number): boolean => {
  return (
    lat >= TN_BOUNDS.latMin &&
    lat <= TN_BOUNDS.latMax &&
    lng >= TN_BOUNDS.lngMin &&
    lng <= TN_BOUNDS.lngMax
  );
};

// Tamil Nadu approximate bounding box
const TN_BOUNDS = { latMin: 8.0, latMax: 13.6, lngMin: 76.2, lngMax: 80.4 };

// Keywords that indicate a Tamil Nadu context in the typed address
const TN_KEYWORDS = [
  'tamil nadu', 'sriperumbudur', 'kanchipuram', 'chennai', 'coimbatore',
  'madurai', 'trichy', 'tiruchirappalli', 'salem', 'vellore', 'tirunelveli',
  'thandalam', 'tambaram', 'ambattur', 'avadi', 'poonamallee', 'thiruvallur',
];

// ─── Helper: detect if the typed address mentions Tamil Nadu ──────────────────
const addressMentionsTamilNadu = (addr: string): boolean => {
  const lower = addr.toLowerCase();
  return TN_KEYWORDS.some((kw) => lower.includes(kw));
};

// ─── Helper: validate geocoded result against the typed address ───────────────
interface ValidationResult {
  valid: boolean;
  warning: string | null;
}

const validateGeocodedResult = (
  typedAddress: string,
  nominatimAddr: any,
  lat: number,
  lng: number
): ValidationResult => {
  // 1. Must be within India at minimum
  if (!isWithinIndia(lat, lng)) {
    return {
      valid: false,
      warning: `The geocoder returned a location outside India (${lat.toFixed(4)}, ${lng.toFixed(4)}). This location cannot be used.`,
    };
  }

  // 2. If the typed address mentions Tamil Nadu, validate against TN bounding box and state field
  if (addressMentionsTamilNadu(typedAddress)) {
    const returnedState = (nominatimAddr?.state || '').toLowerCase();
    const isTNState =
      returnedState.includes('tamil') ||
      returnedState.includes('tn') ||
      returnedState === 'tamilnadu';

    if (!isTNState && !isWithinTamilNadu(lat, lng)) {
      return {
        valid: false,
        warning: `Your address mentions Tamil Nadu but the map location is in "${nominatimAddr?.state || 'another state'}". This is likely the wrong location. Please search with the full address or pin the exact location on the map.`,
      };
    }
  }

  return { valid: true, warning: null };
};

// ─── Nominatim headers ────────────────────────────────────────────────────────
const NOM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'FoodBridge-AI/1.0 (contact: support@foodbridge.local)',
};

export default function LocationPicker({
  initialAddress = '',
  initialCoordinates,
  label = 'Pickup Location',
  onChange,
}: LocationPickerProps) {
  const hasInitialCoords =
    Array.isArray(initialCoordinates) &&
    initialCoordinates.length === 2 &&
    (initialCoordinates[0] !== 0 || initialCoordinates[1] !== 0);

  const mapRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const mapInitializingRef = useRef(false);

  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [gpsTriggered, setGpsTriggered] = useState(false);
  const geocodeRequestRef = useRef(0);

  // ── Sync searchQuery when address changes (e.g. after reverse geocode) ───────
  useEffect(() => {
    setSearchQuery(address);
  }, [address]);

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ── Debounced Nominatim search (restricted to India) ─────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || searchQuery === address) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // countrycodes=in restricts results to India only
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(searchQuery)}` +
          `&format=jsonv2&addressdetails=1&limit=7&countrycodes=in`;
        const res = await fetch(url, { headers: NOM_HEADERS });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
        }
      } catch (err) {
        console.error('[LocationPicker] Nominatim search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, address]);

  // ── Sync when initialAddress prop changes (edit mode) ────────────────────────
  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  // ── Sync map marker when initialCoordinates prop changes (edit mode) ─────────
  useEffect(() => {
    if (
      leafletMapRef.current &&
      leafletMarkerRef.current &&
      initialCoordinates &&
      initialCoordinates.length === 2 &&
      (initialCoordinates[0] !== 0 || initialCoordinates[1] !== 0)
    ) {
      leafletMapRef.current.setView([initialCoordinates[1], initialCoordinates[0]], 14);
      leafletMarkerRef.current.setOpacity(1);
      leafletMarkerRef.current.setLatLng([initialCoordinates[1], initialCoordinates[0]]);
      setLocationConfirmed(true);
    }
  }, [initialCoordinates]);

  // ── Initialize Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (leafletMapRef.current || mapInitializingRef.current || (mapRef.current as any)._leaflet_id) return;

    let active = true;

    const initMap = async () => {
      if (leafletMapRef.current || mapInitializingRef.current || (mapRef.current as any)?._leaflet_id) return;
      mapInitializingRef.current = true;

      try {
        const L = (await import('leaflet')).default;
        if (!active) { mapInitializingRef.current = false; return; }
        if (leafletMapRef.current || (mapRef.current as any)?._leaflet_id) { mapInitializingRef.current = false; return; }

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        // Start centered on India if no initial coordinates
        const startLat = hasInitialCoords ? initialCoordinates![1] : 20.5937;
        const startLng = hasInitialCoords ? initialCoordinates![0] : 78.9629;
        const startZoom = hasInitialCoords ? 14 : 5;

        const mapInstance = L.map(mapRef.current!, {
          zoomControl: true,
          attributionControl: false,
        }).setView([startLat, startLng], startZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);

        let markerInstance: any;
        if (hasInitialCoords) {
          markerInstance = L.marker([startLat, startLng], { draggable: true }).addTo(mapInstance);
        } else {
          // Hidden marker at India center — will snap to GPS coordinates when triggered
          markerInstance = L.marker([startLat, startLng], { draggable: true, opacity: 0 }).addTo(mapInstance);
        }

        if (active) {
          leafletMapRef.current = mapInstance;
          leafletMarkerRef.current = markerInstance;
          setLeafletLoaded(true);
          if (hasInitialCoords) setLocationConfirmed(true);
        } else {
          mapInstance.remove();
        }
        mapInitializingRef.current = false;

        if (active) {
          markerInstance.on('dragend', () => {
            const { lat, lng } = markerInstance.getLatLng();
            reverseGeocode(lat, lng);
          });

          mapInstance.on('click', (e: any) => {
            markerInstance.setLatLng(e.latlng);
            markerInstance.setOpacity(1);
            reverseGeocode(e.latlng.lat, e.latlng.lng);
          });
        }
      } catch (err) {
        console.error('[LocationPicker] Leaflet init failed:', err);
        mapInitializingRef.current = false;
      }
    };

    initMap();

    return () => {
      active = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
      }
      mapInitializingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-trigger GPS on mount if no real initial coordinates ─────────────────
  useEffect(() => {
    if (!hasInitialCoords && !gpsTriggered && leafletLoaded) {
      setGpsTriggered(true);
      handleUseCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded]);

  // ── Reverse geocode: lat/lng → address string ─────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number, requestId?: number) => {
    setGeocoding(true);
    setGeocodingError(null);
    const thisId = requestId ?? ++geocodeRequestRef.current;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: NOM_HEADERS }
      );

      if (thisId < geocodeRequestRef.current) return;

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          // Validate the returned location is within India
          if (!isWithinIndia(lat, lng)) {
            setGeocodingError('The selected location is outside India. Please select a location within India.');
            setGeocoding(false);
            return;
          }

          const formatted = formatNominatimAddress(data.address) || data.display_name;
          setAddress(formatted);
          setSearchQuery(formatted);
          setLocationConfirmed(true);
          onChange({ address: formatted, coordinates: [lng, lat] });
          return;
        }
      }

      // Fallback: show raw coordinates if geocode failed
      const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(coordStr);
      setSearchQuery(coordStr);
      setLocationConfirmed(true);
      onChange({ address: coordStr, coordinates: [lng, lat] });
      setGeocodingError('Could not resolve address. Coordinates saved — please verify the pin is correct.');
    } catch (err) {
      if (thisId < geocodeRequestRef.current) return;
      console.error('[LocationPicker] Reverse geocode failed:', err);
      const coordStr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(coordStr);
      setSearchQuery(coordStr);
      setLocationConfirmed(true);
      onChange({ address: coordStr, coordinates: [lng, lat] });
      setGeocodingError('Unable to resolve address. Please check your network connection.');
    } finally {
      if (thisId >= geocodeRequestRef.current) setGeocoding(false);
    }
  };

  // ── "Use My Current Location": Uses FIXED Project Coordinates (1-click, no device GPS) ──
  const handleUseCurrentLocation = () => {
    const lat = FIXED_COORDS.lat;
    const lng = FIXED_COORDS.lng;

    const map = leafletMapRef.current;
    const marker = leafletMarkerRef.current;
    if (map && marker) {
      marker.setOpacity(1);
      map.setView([lat, lng], 16);
      marker.setLatLng([lat, lng]);
    }

    setLocationStatus('Location selected');
    setTimeout(() => setLocationStatus(null), 3000);

    // Set fixed location immediately
    const fixedAddr = FIXED_ADDRESS_DEFAULT;
    setAddress(fixedAddr);
    setSearchQuery(fixedAddr);
    setLocationConfirmed(true);
    setGeocodingError(null);
    onChange({ address: fixedAddr, coordinates: [lng, lat] });
  };

  // ── Select a Nominatim suggestion from dropdown ───────────────────────────────
  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const formattedAddr = formatNominatimAddress(item.address) || item.display_name;

    setShowDropdown(false);
    setSuggestions([]);

    // ── Validate the geocoded result against the typed address ────────────────
    const validation = validateGeocodedResult(searchQuery, item.address, lat, lng);

    if (!validation.valid) {
      setGeocodingError(validation.warning);
      // Do NOT update coordinates or call onChange — the result is geographically wrong
      // Just show the error and let the user try again
      return;
    }

    // ── Result is valid — update map and notify parent ────────────────────────
    setAddress(formattedAddr);
    setSearchQuery(formattedAddr);
    setGeocodingError(null);
    setLocationConfirmed(true);

    onChange({ address: formattedAddr, coordinates: [lng, lat] });

    const map = leafletMapRef.current;
    const marker = leafletMarkerRef.current;
    if (map && marker) {
      map.setView([lat, lng], 16);
      marker.setOpacity(1);
      marker.setLatLng([lat, lng]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input & Autocomplete Dropdown */}
      <div ref={dropdownRef} className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none z-10 flex items-center">
          <MapPin className="h-4.5 w-4.5" />
        </div>
        <input
          type="text"
          placeholder="Search place, street, area... (India only)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
            setLocationConfirmed(false);
            setGeocodingError(null);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full glass-input pr-10 min-h-[46px]"
          style={{ paddingLeft: '2.75rem' }}
        />
        {(geocoding || searchLoading) && (
          <div className="absolute right-3.5 z-10 flex items-center">
            <RefreshCw className="h-4 w-4 text-brand-500 animate-spin" />
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-dark-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-white/5 text-left"
            style={{ top: '100%' }}
          >
            {suggestions.map((item, idx) => {
              const state = item.address?.state || '';
              const country = item.address?.country || '';
              const formattedAddr = formatNominatimAddress(item.address) || item.display_name;
              const placeName =
                item.address?.amenity ||
                item.address?.shop ||
                item.address?.tourism ||
                item.address?.leisure ||
                item.address?.building ||
                item.address?.railway ||
                item.address?.office ||
                item.address?.historic ||
                item.address?.road ||
                item.address?.village ||
                'Location';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex flex-col gap-0.5"
                >
                  <span className="text-xs font-bold text-white leading-tight">{placeName}</span>
                  <span className="text-[10px] text-slate-400 leading-normal line-clamp-2">{formattedAddr}</span>
                  <span className="text-[9px] text-slate-500">{state}{state && country ? ', ' : ''}{country}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Location Status (GPS active) */}
      {locationStatus && (
        <div className="bg-brand-500/10 border border-brand-500/20 px-3 py-2 rounded-lg text-xs text-brand-400 font-bold animate-pulse text-left">
          {locationStatus}
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-64 rounded-xl border border-white/10 overflow-hidden shadow-inner z-0" />

        {/* Action Buttons Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="bg-dark-900/90 border border-white/10 hover:bg-dark-900 text-brand-500 p-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs font-bold"
          >
            <Compass className="h-4 w-4" />
            <span>Use My Current Location</span>
          </button>

          {/* Navigate to Google Maps Button */}
          {hasInitialCoords || locationConfirmed ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${initialCoordinates && (initialCoordinates[0] !== 0 || initialCoordinates[1] !== 0)
                  ? `${initialCoordinates[1]},${initialCoordinates[0]}`
                  : `${FIXED_COORDS.lat},${FIXED_COORDS.lng}`
                }`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-dark-900/90 border border-brand-500/30 hover:bg-dark-900 text-brand-400 p-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all text-xs font-bold"
            >
              <Navigation className="h-4 w-4" />
              <span>Navigate to Google Maps</span>
            </a>
          ) : null}
        </div>
      </div>

      {/* Geocoding Error */}
      {geocodingError && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col gap-2 text-slate-300 text-xs leading-normal">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Location Validation Issue</span>
          </div>
          <p>{geocodingError}</p>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            💡 <strong>Tip:</strong> For best results, include the full address: village/area, taluk, district, state, and PIN code (e.g. "Thandalam, Sriperumbudur, Kanchipuram, Tamil Nadu 602 105, India").
          </p>
        </div>
      )}

      {/* Confirmed Location Display */}
      {address && locationConfirmed && !geocodingError && (
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs text-slate-300 leading-normal flex items-start gap-2 text-left">
          <CheckCircle2 className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">📍 {label} Confirmed:</strong>
            <p className="mt-0.5">{address}</p>
          </div>
        </div>
      )}

      {/* Unconfirmed/pending location */}
      {address && !locationConfirmed && !geocodingError && (
        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs text-slate-300 leading-normal flex items-start gap-2 text-left">
          <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">📍 {label}:</strong>
            <p className="mt-0.5">{address}</p>
          </div>
        </div>
      )}
    </div>
  );
}
