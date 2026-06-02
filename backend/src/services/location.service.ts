import { IUser } from '../types';

export class LocationService {
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculates the distance between two GPS coordinates using the Haversine Formula.
   */
  public static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c; // Distance in KM

    return parseFloat(distance.toFixed(2));
  }

  /**
   * Ranks and matches active NGOs with a donation based on distance, NGO capacities, and food categories.
   */
  public static filterAndMatchNGOs(
    donationLoc: [number, number], // [lng, lat]
    foodCategory: string,
    ngos: IUser[],
    maxDistanceKm: number = 15
  ): Array<{ ngo: IUser; distance: number }> {
    const [donLng, donLat] = donationLoc;
    const matches: Array<{ ngo: IUser; distance: number }> = [];

    for (const ngo of ngos) {
      if (ngo.role !== 'NGO' || ngo.ngoVerificationStatus !== 'APPROVED' || ngo.isBlocked) {
        continue;
      }

      // Check if NGO accepts this food category
      const acceptsCategory = ngo.ngoAcceptedCategories.some(
        (cat) => cat.toLowerCase() === foodCategory.toLowerCase()
      );
      if (!acceptsCategory && ngo.ngoAcceptedCategories.length > 0) {
        continue;
      }

      const [ngoLng, ngoLat] = ngo.location.coordinates;
      const distance = this.calculateDistance(donLat, donLng, ngoLat, ngoLng);

      if (distance <= maxDistanceKm) {
        matches.push({ ngo, distance });
      }
    }

    // Sort by nearest distance first
    return matches.sort((a, b) => a.distance - b.distance);
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
