import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
const WebViewComp: any = WebView;
import { apiClient } from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';

export const AdminLiveMapScreen = () => {
  const [donations, setDonations] = useState<any[]>([]);

  const fetchMapData = async () => {
    try {
      const res = await apiClient.get('/admin/donations');
      const activeDonations = (res.data.donations || []).filter((d: any) => 
        d.status !== 'COMPLETED' && d.status !== 'CANCELLED' && d.status !== 'EXPIRED' && d.status !== 'DELIVERED'
      );
      setDonations(activeDonations);
    } catch (err) {
      console.error('[AdminLiveMap] Fetch failed:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMapData();
    }, [])
  );

  const markersJson = JSON.stringify(
    donations
      .filter((d: any) => d.location?.coordinates && d.location.coordinates.length === 2)
      .map((d: any) => ({
        lat: d.location.coordinates[1],
        lng: d.location.coordinates[0],
        title: d.foodName || 'Food Surplus',
        desc: `Status: ${d.status || 'AVAILABLE'}`,
        status: d.status,
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
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([13.0827, 80.2707], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    var rawMarkers = ${markersJson};

    if (rawMarkers.length > 0) {
      var bounds = [];
      rawMarkers.forEach(function(m) {
        var color = m.status === 'IN_TRANSIT' ? '#F59E0B' : '#10B981';
        var circle = L.circleMarker([m.lat, m.lng], {
          radius: 10,
          fillColor: color,
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);
        circle.bindPopup('<b>' + m.title + '</b><br>' + m.desc);
        bounds.push([m.lat, m.lng]);
      });
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <Header title="Live Activity Map" showBack={true} />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Live Activity Map</Text>
            <Text style={styles.subtitle}>{donations.length} active surplus routes in transit</Text>
          </View>
        </View>
      </View>
      <WebViewComp
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      <BottomNavbar activeTab="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.dark900,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.slate400,
    fontSize: 12,
    marginTop: 4,
  },
  map: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});

