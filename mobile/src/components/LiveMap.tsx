import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
const WebViewComp: any = WebView;

interface Location {
  latitude: number;
  longitude: number;
}

interface LiveMapProps {
  initialLocation: Location;
  markers?: Array<{
    id: string;
    coordinate: Location;
    title: string;
    description: string;
    type: 'donor' | 'ngo' | 'volunteer';
  }>;
  onRegionChange?: (region: any) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ initialLocation, markers = [] }) => {
  const lat = initialLocation?.latitude || 13.028344;
  const lng = initialLocation?.longitude || 80.016108;

  const markersJson = JSON.stringify(
    markers.map((m) => ({
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      title: m.title || '',
      desc: m.description || '',
      type: m.type || 'donor',
    }))
  );

  const html = `
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
    .leaflet-control-zoom a { background: #1e293b !important; color: #10b981 !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
    .leaflet-container { background: #0f172a !important; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${lat}, ${lng}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var rawMarkers = ${markersJson};
    var colorMap = { donor: '#10B981', ngo: '#3B82F6', volunteer: '#F59E0B' };

    rawMarkers.forEach(function(m) {
      var color = colorMap[m.type] || '#EF4444';
      var circle = L.circleMarker([m.lat, m.lng], {
        radius: 9,
        fillColor: color,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);
      
      if (m.title) {
        circle.bindPopup('<b>' + m.title + '</b><br>' + m.desc);
      }
    });

    if (rawMarkers.length > 0) {
      var group = L.featureGroup(rawMarkers.map(function(m) { return L.marker([m.lat, m.lng]); }));
      map.fitBounds(group.getBounds().pad(0.2));
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebViewComp
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
});

