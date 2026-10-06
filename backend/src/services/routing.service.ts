export interface RouteResponse {
  success: boolean;
  distanceKm: number;
  durationMinutes: number;
  geometry: [number, number][]; // [[lng, lat], ...]
  routeType: 'Road' | 'StraightLine';
  cached?: boolean;
}

class RoutingServiceClass {
  private routeCache = new Map<string, { data: RouteResponse; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  /**
   * Fetch road route from OSRM with lowest-distance route selection
   */
  public async getRoadRoute(origin: [number, number], destination: [number, number]): Promise<RouteResponse> {
    if (!this.isValidCoords(origin) || !this.isValidCoords(destination)) {
      throw new Error('Invalid location coordinates.');
    }

    const cacheKey = `${origin[0].toFixed(4)},${origin[1].toFixed(4)}->${destination[0].toFixed(4)},${destination[1].toFixed(4)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.data, cached: true };
    }

    // OSRM driving route request with alternatives=true
    const url = `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson&alternatives=true`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'FoodBridge-App/1.0 (Contact: foodbridge@app.com)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`OSRM service returned HTTP ${res.status}`);
      }
      const data: any = await res.json();
      if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error('No valid road route found between these locations.');
      }

      // Lowest-Distance Route Selection (Section 12):
      // Sort routes by distance ascending to select lowest road distance
      const sortedRoutes = [...data.routes].sort((a: any, b: any) => a.distance - b.distance);
      const bestRoute = sortedRoutes[0];

      const distanceKm = parseFloat((bestRoute.distance / 1000).toFixed(2));
      const durationMinutes = Math.round(bestRoute.duration / 60);
      const geometry: [number, number][] = bestRoute.geometry.coordinates || [];

      const result: RouteResponse = {
        success: true,
        distanceKm,
        durationMinutes,
        geometry,
        routeType: 'Road',
      };

      this.routeCache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return result;
    } catch (err: any) {
      console.warn(`[RoutingService] OSRM routing warning: ${err.message}. Falling back to Haversine estimate.`);
      const distKm = this.calculateHaversine(origin[1], origin[0], destination[1], destination[0]);
      const result: RouteResponse = {
        success: true,
        distanceKm: distKm,
        durationMinutes: Math.round((distKm / 30) * 60),
        geometry: [origin, destination],
        routeType: 'StraightLine',
      };
      return result;
    }
  }

  public isValidCoords(coords: [number, number]): boolean {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const [lng, lat] = coords;
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) return false;
    if (lng === 0 && lat === 0) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  public calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
}

export const RoutingService = new RoutingServiceClass();
