import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  PermissionsAndroid,
  Modal,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
const WebViewComp: any = WebView;
import Geolocation from '@react-native-community/geolocation';
import { LocationService } from '../services/locationService';
import { MapPin, Compass, Navigation, AlertTriangle, CheckCircle2, Maximize2, X } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface LocationPickerProps {
  initialAddress?: string;
  initialCoordinates?: [number, number]; // [lng, lat]
  label?: string; // e.g. "Pickup Location" or "Destination Location"
  onChange: (data: { address: string; coordinates: [number, number] }) => void;
}

const isLocationInIndia = (data: any, lat: number, lng: number): boolean => {
  const countryCode = (data?.address?.country_code || '').toLowerCase();
  const country = (data?.address?.country || '').toLowerCase();
  if (countryCode === 'in' || country.includes('india')) {
    return true;
  }
  return lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
};

const NOM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'FoodBridge-AI/1.0 (contact: support@foodbridge.local)',
};

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

const getLeafletHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #0f172a; }
    .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; }
    .leaflet-control-zoom a { background: #1e293b !important; color: #10b981 !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; width: 32px !important; height: 32px !important; line-height: 32px !important; font-size: 16px !important; font-weight: bold !important; }
    .leaflet-container { background: #0f172a !important; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    var marker = L.marker([${lat}, ${lng}], { draggable: true, icon: customIcon }).addTo(map);

    function notifyMarkerMove(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_MOVED', lat: lat, lng: lng }));
      }
    }

    marker.on('dragend', function() {
      var pos = marker.getLatLng();
      notifyMarkerMove(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      notifyMarkerMove(e.latlng.lat, e.latlng.lng);
    });

    function setMapLocation(newLat, newLng, zoomLevel) {
      map.setView([newLat, newLng], zoomLevel || 15);
      marker.setLatLng([newLat, newLng]);
    }
  </script>
</body>
</html>
`;

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialAddress = '',
  initialCoordinates,
  label = 'Pickup Location',
  onChange,
}) => {
  const hasInitialCoords =
    Array.isArray(initialCoordinates) &&
    initialCoordinates.length === 2 &&
    (initialCoordinates[0] !== 0 || initialCoordinates[1] !== 0);

  const startLat = hasInitialCoords ? initialCoordinates[1] : 20.5937;
  const startLng = hasInitialCoords ? initialCoordinates[0] : 78.9629;

  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(hasInitialCoords);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [markerCoords, setMarkerCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: startLat,
    longitude: startLng,
  });

  const mainWebViewRef = useRef<WebView>(null);
  const fullWebViewRef = useRef<WebView>(null);
  const geocodeRequestRef = useRef(0);

  // Sync initial values
  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  useEffect(() => {
    if (hasInitialCoords) {
      const lat = initialCoordinates[1];
      const lng = initialCoordinates[0];
      setMarkerCoords({ latitude: lat, longitude: lng });
      setLocationConfirmed(true);
      updateWebViewLocation(lat, lng);
    }
  }, [initialCoordinates]);

  const updateWebViewLocation = (lat: number, lng: number, zoom = 15) => {
    const js = `if (window.setMapLocation) { window.setMapLocation(${lat}, ${lng}, ${zoom}); } true;`;
    mainWebViewRef.current?.injectJavaScript(js);
    fullWebViewRef.current?.injectJavaScript(js);
  };

  // Debounced Nominatim Search (Restricted to India)
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || searchQuery === address) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=jsonv2&addressdetails=1&limit=6&countrycodes=in`;

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

  // Reverse Geocode
  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    setGeocodingError(null);
    const thisId = ++geocodeRequestRef.current;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: NOM_HEADERS }
      );

      if (thisId < geocodeRequestRef.current) return;

      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          if (!isLocationInIndia(data, lat, lng)) {
            setGeocodingError(
              'The selected location is outside India. Please select a location within India.'
            );
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

      const fallbackAddr = 'Detected Location (Please enter address manually)';
      setAddress(fallbackAddr);
      setSearchQuery(fallbackAddr);
      setLocationConfirmed(true);
      onChange({ address: fallbackAddr, coordinates: [lng, lat] });
    } catch (err) {
      if (thisId < geocodeRequestRef.current) return;
      const fallbackAddr = 'Detected Location (Please enter address manually)';
      setAddress(fallbackAddr);
      setSearchQuery(fallbackAddr);
      setLocationConfirmed(true);
      onChange({ address: fallbackAddr, coordinates: [lng, lat] });
    } finally {
      if (thisId >= geocodeRequestRef.current) setGeocoding(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MARKER_MOVED' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setMarkerCoords({ latitude: data.lat, longitude: data.lng });
        reverseGeocode(data.lat, data.lng);
      }
    } catch (err) {
      console.warn('[LocationPicker] WebView message parse error:', err);
    }
  };

  // "Use My Current Location" - Acquires real device GPS coordinates
  const handleUseCurrentLocation = async () => {
    setGeocoding(true);
    setGeocodingError(null);
    setLocationStatus('Acquiring actual device GPS location...');

    try {
      const location = await LocationService.getCurrentLocation();
      const { latitude, longitude } = location;

      setMarkerCoords({ latitude, longitude });
      updateWebViewLocation(latitude, longitude, 16);

      setLocationStatus('Resolving location address...');
      await reverseGeocode(latitude, longitude);
      setLocationStatus('📍 Current Location Detected');
      setTimeout(() => setLocationStatus(null), 4000);
    } catch (err: any) {
      console.warn('[LocationPicker] GPS fetch error:', err);
      setGeocodingError(err?.message || 'Unable to detect your current location. Please turn on Location Services and Precise Location.');
      setLocationStatus(null);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const formattedAddr = formatNominatimAddress(item.address) || item.display_name;

    setShowDropdown(false);
    setSuggestions([]);

    if (!isLocationInIndia(item, lat, lng)) {
      setGeocodingError('Location is outside India. Please select a location inside India.');
      return;
    }

    setAddress(formattedAddr);
    setSearchQuery(formattedAddr);
    setGeocodingError(null);
    setLocationConfirmed(true);

    setMarkerCoords({ latitude: lat, longitude: lng });
    updateWebViewLocation(lat, lng, 16);

    onChange({ address: formattedAddr, coordinates: [lng, lat] });
  };

  return (
    <View style={styles.container}>
      {/* Search Input & Dropdown */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MapPin size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search place, street, area... (India only)"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setShowDropdown(true);
              setLocationConfirmed(false);
              setGeocodingError(null);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {(searchLoading || geocoding) && (
            <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 200 }}>
              {suggestions.map((item, idx) => {
                const formattedAddr = formatNominatimAddress(item.address) || item.display_name;
                const state = item.address?.state || '';
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text style={styles.dropdownTitle} numberOfLines={1}>
                      {item.display_name.split(',')[0]}
                    </Text>
                    <Text style={styles.dropdownSub} numberOfLines={2}>
                      {formattedAddr}
                    </Text>
                    {state ? <Text style={styles.dropdownState}>{state}, India</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Location Status Badge */}
      {locationStatus && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{locationStatus}</Text>
        </View>
      )}

      {/* Map Box Container */}
      <View style={styles.mapFrame}>
        {/* Top-Right "View" Full Page Button inside Map Header */}
        <View style={styles.mapHeaderOverlay}>
          <Text style={styles.mapHeaderTitle}>Interactive Pickup Map</Text>
          <TouchableOpacity
            style={styles.viewFullBtn}
            onPress={() => setIsFullScreen(true)}
            activeOpacity={0.8}
          >
            <Maximize2 size={13} color="#0F172A" style={{ marginRight: 5 }} />
            <Text style={styles.viewFullBtnText}>View Full Page</Text>
          </TouchableOpacity>
        </View>

        {/* Keyless OpenStreetMap + Leaflet interactive WebView Map */}
        <WebViewComp
          ref={mainWebViewRef}
          originWhitelist={['*']}
          source={{ html: getLeafletHtml(markerCoords.latitude, markerCoords.longitude) }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
          scrollEnabled={false}
        />
      </View>

      {/* Action Buttons Below Map */}
      <View style={styles.mapActionsContainer}>
        <TouchableOpacity style={styles.mapBtnPrimary} onPress={handleUseCurrentLocation} activeOpacity={0.8}>
          <Compass size={16} color="#10B981" style={{ marginRight: 8 }} />
          <Text style={styles.mapBtnTextPrimary}>Use My Current Location</Text>
        </TouchableOpacity>
      </View>

      {/* Geocoding Error Banner */}
      {geocodingError && (
        <View style={styles.errorBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={14} color="#F87171" />
            <Text style={styles.errorTitle}>Location Validation Issue</Text>
          </View>
          <Text style={styles.errorText}>{geocodingError}</Text>
        </View>
      )}

      {/* Confirmed Location Display */}
      {address && locationConfirmed && !geocodingError && (
        <View style={styles.confirmedBox}>
          <CheckCircle2 size={16} color="#10B981" style={{ marginTop: 2, marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmedTitle}>📍 {label} Confirmed:</Text>
            <Text style={styles.confirmedAddress}>{address}</Text>
          </View>
        </View>
      )}

      {/* Full Page Leaflet Interactive Modal */}
      <Modal visible={isFullScreen} animationType="slide" onRequestClose={() => setIsFullScreen(false)}>
        <SafeAreaView style={styles.fullScreenContainer}>
          {/* Full Screen Header */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity onPress={() => setIsFullScreen(false)} style={styles.closeFullBtn}>
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <View style={styles.fullSearchBar}>
                <MapPin size={16} color="#10B981" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.fullSearchInput}
                  placeholder="Search location in India..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.fullDoneBtn} onPress={() => setIsFullScreen(false)}>
              <Text style={styles.fullDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Autocomplete Dropdown in Full Mode */}
          {showDropdown && suggestions.length > 0 && (
            <View style={styles.fullDropdown}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                {suggestions.map((item, idx) => {
                  const formattedAddr = formatNominatimAddress(item.address) || item.display_name;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleSelectSuggestion(item);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownTitle} numberOfLines={1}>
                        {item.display_name.split(',')[0]}
                      </Text>
                      <Text style={styles.dropdownSub} numberOfLines={2}>
                        {formattedAddr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Full Screen Leaflet WebView Map */}
          <WebViewComp
            ref={fullWebViewRef}
            originWhitelist={['*']}
            source={{ html: getLeafletHtml(markerCoords.latitude, markerCoords.longitude) }}
            style={styles.fullMap}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
          />

          {/* Bottom Card in Full Page View */}
          <View style={styles.fullBottomCard}>
            <Text style={styles.fullCardTitle}>📍 Selected Pickup Point:</Text>
            <Text style={styles.fullCardAddress}>{address || 'Tap anywhere on map or search to place pin'}</Text>
            
            <View style={styles.fullCardActionsContainer}>
              <TouchableOpacity style={styles.fullActionBtn} onPress={handleUseCurrentLocation}>
                <Compass size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.fullActionText}>Locate Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullConfirmBtn}
                onPress={() => setIsFullScreen(false)}
              >
                <CheckCircle2 size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.fullConfirmBtnText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dropdownSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  dropdownState: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mapFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    height: 240,
    marginBottom: 12,
  },
  mapHeaderOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapHeaderTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewFullBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },
  mapActionsContainer: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  mapBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  mapBtnTextPrimary: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mapBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  mapBtnTextSecondary: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 12,
    borderRadius: 10,
  },
  confirmedTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmedAddress: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },

  /* Full Screen Map Styles */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeFullBtn: {
    padding: 6,
  },
  fullSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fullSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  fullDoneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  fullDoneBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullDropdown: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 300,
  },
  fullMap: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  fullBottomCard: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  fullCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fullCardAddress: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  fullCardActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  fullActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  fullActionText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  fullConfirmBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

