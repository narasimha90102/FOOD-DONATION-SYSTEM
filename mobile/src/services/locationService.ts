import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationPermissionResult {
  granted: boolean;
  fineLocation: boolean;
  coarseLocation: boolean;
  message: string;
}

class LocationServiceClass {
  private watchId: number | null = null;

  /**
   * Request Android Fine & Coarse Location Permissions dynamically when requested by user action.
   */
  public async requestLocationPermission(): Promise<LocationPermissionResult> {
    if (Platform.OS !== 'android') {
      return { granted: true, fineLocation: true, coarseLocation: true, message: 'Granted' };
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fine = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
      const coarse = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

      const isGranted = fine || coarse;

      return {
        granted: isGranted,
        fineLocation: fine,
        coarseLocation: coarse,
        message: isGranted ? 'Location permission granted.' : 'Location permission denied by user.',
      };
    } catch (err: any) {
      console.error('[LocationService] Permission request failed:', err);
      return {
        granted: false,
        fineLocation: false,
        coarseLocation: false,
        message: `Failed to request location permission: ${err?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if location permission is granted
   */
  public async checkLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const fine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const coarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      return fine || coarse;
    } catch (err) {
      return false;
    }
  }

  /**
   * Obtain fresh, accurate GPS coordinates from device using bounded watcher retry
   */
  public async getCurrentLocation(): Promise<LocationCoordinates> {
    const permResult = await this.requestLocationPermission();
    if (!permResult.granted) {
      throw new Error('Location permission is required to acquire GPS coordinates.');
    }
    if (!permResult.fineLocation) {
      throw new Error('Please enable Precise Location (Fine GPS) for FoodBridge to detect your actual current location.');
    }

    return new Promise((resolve, reject) => {
      let watchId: number | null = null;
      let timerId: NodeJS.Timeout | null = null;
      let bestFix: LocationCoordinates | null = null;

      const cleanup = () => {
        if (watchId !== null) {
          Geolocation.clearWatch(watchId);
          watchId = null;
        }
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
      };

      // Bounded timer to wait for GPS position refinement up to 15 seconds
      timerId = setTimeout(() => {
        cleanup();
        if (bestFix && bestFix.accuracy <= 250) {
          resolve(bestFix);
        } else {
          reject(
            new Error(
              `GPS location accuracy is low${bestFix ? ` (~${Math.round(bestFix.accuracy)}m)` : ''}. Please enable Precise Location Services and ensure clear GPS reception.`
            )
          );
        }
      }, 15000);

      watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = position.timestamp || Date.now();

          console.log(
            `[LOCATION DEBUG] Lat: ${latitude}, Lng: ${longitude}, Accuracy: ${accuracy}m, Timestamp: ${new Date(timestamp).toISOString()}, Provider: android.location`
          );

          if (!this.isValidCoordinates(latitude, longitude)) {
            return;
          }

          const currentFix: LocationCoordinates = {
            latitude,
            longitude,
            accuracy: accuracy || 10,
            timestamp,
          };

          if (!bestFix || (accuracy && accuracy < bestFix.accuracy)) {
            bestFix = currentFix;
          }

          // Validate accuracy threshold (target <= 250m)
          if (accuracy && accuracy <= 250) {
            cleanup();
            resolve(currentFix);
          }
        },
        (error) => {
          cleanup();
          console.error('[LocationService] GPS acquisition failed:', error.message);
          let userMsg = 'Unable to detect your current location. Please check your device location settings.';
          if (error.code === 1) userMsg = 'Location permission denied. Please allow location access to detect current location.';
          else if (error.code === 2) userMsg = 'GPS / Location services are turned off on your device. Please turn on Location Services.';
          else if (error.code === 3) userMsg = 'Location detection timed out. Please check your GPS signal and try again.';

          reject(new Error(userMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 25000,
          maximumAge: 0,
          distanceFilter: 0,
          interval: 1000,
          fastestInterval: 500,
        }
      );
    });
  }

  /**
   * Start live GPS tracking for volunteer pickups
   */
  public async startLocationTracking(
    onLocationUpdate: (coords: LocationCoordinates) => void,
    onError?: (err: Error) => void
  ): Promise<void> {
    this.stopLocationTracking();

    const hasPermission = await this.checkLocationPermission();
    if (!hasPermission) {
      const permResult = await this.requestLocationPermission();
      if (!permResult.granted) {
        if (onError) onError(new Error('Location permission denied for live tracking.'));
        return;
      }
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (this.isValidCoordinates(latitude, longitude)) {
          onLocationUpdate({
            latitude,
            longitude,
            accuracy: accuracy || 10,
            timestamp: position.timestamp || Date.now(),
          });
        }
      },
      (error) => {
        console.error('[LocationService] Watch position error:', error);
        if (onError) onError(new Error(`Live tracking error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
      }
    );
  }

  /**
   * Stop active GPS tracking watcher
   */
  public stopLocationTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('[LocationService] Live location tracking stopped.');
    }
  }

  /**
   * Validate latitude and longitude range
   */
  public isValidCoordinates(lat: number, lng: number): boolean {
    if (typeof lat !== 'number' || typeof lng !== 'number') return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

export const LocationService = new LocationServiceClass();
