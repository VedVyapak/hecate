import { DBSCAN } from "density-clustering";

// Place interface shared with the API route
export interface Place {
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string;
  category: string;
}

// What a cluster looks like after DBSCAN groups places together
export interface Cluster {
  places: Place[];
  center: { lat: number; lng: number };
  dominantCategory: string;
  categoryCounts: Record<string, number>;
}

// Result of clustering: grouped clusters + leftover places
export interface ClusteringResult {
  clusters: Cluster[];
  unclustered: Place[];
}

// Convert meters to degrees (for DBSCAN's epsilon parameter)
// At the equator, 1 degree ≈ 111,000 meters
// DBSCAN works with raw numbers, not geographic units,
// so we convert our "800 meters" radius into degrees
function metersToDegrees(meters: number): number {
  return meters / 111000;
}

// Find the most common category in a list of places
function findDominantCategory(places: Place[]): string {
  const counts: Record<string, number> = {};
  for (const place of places) {
    counts[place.category] = (counts[place.category] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// Count how many places belong to each category
function countCategories(places: Place[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const place of places) {
    counts[place.category] = (counts[place.category] || 0) + 1;
  }
  return counts;
}

// Calculate the geographic center of a group of places
function calculateCenter(places: Place[]): { lat: number; lng: number } {
  const sumLat = places.reduce((sum, p) => sum + p.lat, 0);
  const sumLng = places.reduce((sum, p) => sum + p.lng, 0);
  return {
    lat: sumLat / places.length,
    lng: sumLng / places.length,
  };
}

/**
 * Cluster places using DBSCAN
 *
 * @param places - All places fetched from Google Places API
 * @param radiusMeters - How close places need to be to form a cluster (default: 800m)
 * @param minPlaces - Minimum places needed to form a cluster (default: 3)
 */
export function clusterPlaces(
  places: Place[],
  radiusMeters: number = 800,
  minPlaces: number = 3,
): ClusteringResult {
  const dbscan = new DBSCAN();

  // DBSCAN needs a 2D array of coordinates: [[lat, lng], [lat, lng], ...]
  const coordinates = places.map((p) => [p.lat, p.lng]);

  // Convert our radius from meters to degrees (what coordinates use)
  const epsilon = metersToDegrees(radiusMeters);

  // Run DBSCAN — returns array of arrays, each inner array is indices of places in that cluster
  // e.g. [[0, 3, 7], [1, 4], [2, 5, 6, 8]] means 3 clusters
  const clusterIndices: number[][] = dbscan.run(
    coordinates,
    epsilon,
    minPlaces,
  );

  // Track which places got clustered
  const clusteredIndices = new Set(clusterIndices.flat());

  // Build cluster objects
  const clusters: Cluster[] = clusterIndices.map((indices) => {
    const clusterPlaces = indices.map((i) => places[i]);
    return {
      places: clusterPlaces,
      center: calculateCenter(clusterPlaces),
      dominantCategory: findDominantCategory(clusterPlaces),
      categoryCounts: countCategories(clusterPlaces),
    };
  });

  // Find unclustered places (noise points DBSCAN couldn't group)
  const unclustered = places.filter((_, index) => !clusteredIndices.has(index));

  return { clusters, unclustered };
}
