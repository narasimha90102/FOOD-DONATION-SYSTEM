import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

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
  onRegionChange?: (region: Region) => void;
}

export const LiveMap: React.FC<LiveMapProps> = ({ initialLocation, markers = [], onRegionChange }) => {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && initialLocation) {
      mapRef.current.animateToRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [initialLocation]);

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'donor': return 'green';
      case 'ngo': return 'blue';
      case 'volunteer': return 'orange';
      default: return 'red';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onRegionChangeComplete={onRegionChange}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={getMarkerColor(marker.type)}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
