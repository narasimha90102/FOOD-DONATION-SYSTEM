"use client";

import { useState, useCallback, useRef } from 'react';

export interface GpsLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
  timestamp: number | null;
  loading: boolean;
  error: string | null;
}

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0, // Never use cached position — always get fresh GPS
};

// Helper to format Nominatim address response into a readable string
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

/**
 * Centralized GPS location hook.
 *
 * - Uses navigator.geolocation.getCurrentPosition() with maximumAge: 0 for fresh reads.
 * - Never falls back to IP geolocation, hardcoded city, or cached stale coordinates.
 * - On GPS failure: sets error message — does NOT show a guessed location.
 * - Reverse geocoding uses the exact GPS lat/lng — never different coordinates.
 * - Race condition safe: a request counter ensures only the latest result wins.
 */
export function useGpsLocation() {
  const [location, setLocation] = useState<GpsLocation>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: '',
    timestamp: null,
    loading: false,
    error: null,
  });

  // Request counter: prevents stale GPS/geocode responses from overwriting newer ones
  const requestCounterRef = useRef(0);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number, requestId: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'FoodBridge-AI/1.0 (contact: support@foodbridge.local)',
            },
          }
        );

        // Stale check — if a newer request came in, discard this result
        if (requestId !== requestCounterRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const formatted = formatNominatimAddress(data.address) || data.display_name || '';
            setLocation((prev) => ({
              ...prev,
              address: formatted,
              loading: false,
            }));
            return;
          }
        }

        // Geocode response failed — show coordinates as fallback, NOT a guessed location
        setLocation((prev) => ({
          ...prev,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          loading: false,
        }));
      } catch {
        if (requestId !== requestCounterRef.current) return;
        setLocation((prev) => ({
          ...prev,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          loading: false,
        }));
      }
    },
    []
  );

  const requestGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        address: '',
        timestamp: null,
        loading: false,
        error: 'Your browser does not support location services.',
      });
      return;
    }

    // Increment the request counter — any prior pending response is now stale
    requestCounterRef.current += 1;
    const thisRequestId = requestCounterRef.current;

    setLocation((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Stale check
        if (thisRequestId !== requestCounterRef.current) return;

        const { latitude, longitude, accuracy } = position.coords;

        setLocation({
          latitude,
          longitude,
          accuracy,
          address: '', // Will be filled by reverse geocode below
          timestamp: Date.now(),
          loading: true, // Still loading while reverse geocoding
          error: null,
        });

        // Reverse geocode the EXACT same coordinates returned by GPS
        reverseGeocode(latitude, longitude, thisRequestId);
      },
      (err) => {
        if (thisRequestId !== requestCounterRef.current) return;

        let errorMsg: string;
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg =
              'Location permission was denied. Please enable location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg =
              'Current location is unavailable. Please check your GPS/location services.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Unable to get your current location. Please try again.';
            break;
          default:
            errorMsg = 'Unable to determine your current location. Please try again.';
        }

        // On error: show error message — do NOT show a fallback city
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
      },
      GPS_OPTIONS
    );
  }, [reverseGeocode]);

  return {
    location,
    requestGps,
  };
}
