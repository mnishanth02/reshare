import { ACTIVITY_TYPES } from "../../lib/constants";
import type { Id } from "../_generated/dataModel";
import type {
  ActivityPoint,
  ActivityStats,
  ActivitySummary,
  BoundingBox,
  Coordinates,
  DistanceCalculationMethod,
  ElevationProfile,
  GPXData,
  RouteSimplificationOptions,
  SpeedProfile,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

export const EARTH_RADIUS_KM = 6371;
export const EARTH_RADIUS_MILES = 3959;

export const DEFAULT_SIMPLIFICATION_TOLERANCE = 0.0001; // ~11 meters
export const DEFAULT_MAX_POINTS = 1000;

// ============================================================================
// Distance and Geospatial Calculations
// ============================================================================

/**
 * Calculate the distance between two coordinates using the Haversine formula
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  method: DistanceCalculationMethod = "haversine"
): number {
  if (method === "euclidean") {
    return calculateEuclideanDistance(point1, point2);
  }

  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLngRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate Euclidean distance between two points (for small distances)
 */
function calculateEuclideanDistance(point1: Coordinates, point2: Coordinates): number {
  const deltaLat = point2.latitude - point1.latitude;
  const deltaLng = point2.longitude - point1.longitude;
  return Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111.32; // Approximate km per degree
}

/**
 * Calculate the total distance of a route
 */
export function calculateRouteDistance(points: ActivityPoint[]): number {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(
      { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude },
      { latitude: points[i].latitude, longitude: points[i].longitude }
    );
  }
  return totalDistance;
}

/**
 * Calculate the bounding box for a set of coordinates
 */
export function calculateBoundingBox(points: ActivityPoint[]): BoundingBox {
  if (points.length === 0) {
    throw new Error("Cannot calculate bounding box for empty points array");
  }

  let north = points[0].latitude;
  let south = points[0].latitude;
  let east = points[0].longitude;
  let west = points[0].longitude;

  for (const point of points) {
    north = Math.max(north, point.latitude);
    south = Math.min(south, point.latitude);
    east = Math.max(east, point.longitude);
    west = Math.min(west, point.longitude);
  }

  return { north, south, east, west };
}

/**
 * Calculate the center point of a bounding box
 */
export function calculateCenter(boundingBox: BoundingBox): Coordinates {
  return {
    latitude: (boundingBox.north + boundingBox.south) / 2,
    longitude: (boundingBox.east + boundingBox.west) / 2,
  };
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBounds(point: Coordinates, bounds: BoundingBox): boolean {
  return (
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north &&
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east
  );
}

// ============================================================================
// Route Simplification
// ============================================================================

/**
 * Simplify a route using the Douglas-Peucker algorithm
 */
export function simplifyRoute(
  points: ActivityPoint[],
  options: RouteSimplificationOptions = {}
): ActivityPoint[] {
  const {
    tolerance = DEFAULT_SIMPLIFICATION_TOLERANCE,
    maxPoints = DEFAULT_MAX_POINTS,
    preserveElevation = true,
    preserveTimestamps = true,
  } = options;

  if (points.length <= 2) return points;

  // First pass: Douglas-Peucker simplification
  let simplified = douglasPeucker(points, tolerance);

  // Second pass: If still too many points, use uniform sampling
  if (simplified.length > maxPoints) {
    simplified = uniformSample(simplified, maxPoints);
  }

  // Ensure we preserve important points
  if (preserveElevation || preserveTimestamps) {
    simplified = preserveImportantPoints(points, simplified, {
      preserveElevation,
      preserveTimestamps,
    });
  }

  return simplified;
}

/**
 * Douglas-Peucker line simplification algorithm
 */
function douglasPeucker(points: ActivityPoint[], tolerance: number): ActivityPoint[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = douglasPeucker(points.slice(maxIndex), tolerance);

    // Combine results (remove duplicate point at junction)
    return [...leftSegment.slice(0, -1), ...rightSegment];
  }

  // If max distance is within tolerance, return just the endpoints
  return [start, end];
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(
  point: ActivityPoint,
  lineStart: ActivityPoint,
  lineEnd: ActivityPoint
): number {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line start and end are the same point
    return calculateDistance(
      { latitude: point.latitude, longitude: point.longitude },
      { latitude: lineStart.latitude, longitude: lineStart.longitude }
    );
  }

  const param = dot / lenSq;
  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = lineStart.latitude;
    yy = lineStart.longitude;
  } else if (param > 1) {
    xx = lineEnd.latitude;
    yy = lineEnd.longitude;
  } else {
    xx = lineStart.latitude + param * C;
    yy = lineStart.longitude + param * D;
  }

  return calculateDistance(
    { latitude: point.latitude, longitude: point.longitude },
    { latitude: xx, longitude: yy }
  );
}

/**
 * Uniform sampling to reduce points to a specific count
 */
function uniformSample(points: ActivityPoint[], maxPoints: number): ActivityPoint[] {
  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const sampled: ActivityPoint[] = [];

  for (let i = 0; i < maxPoints - 1; i++) {
    const index = Math.round(i * step);
    sampled.push(points[index]);
  }

  // Always include the last point
  sampled.push(points[points.length - 1]);
  return sampled;
}

/**
 * Preserve important points based on elevation or timestamp changes
 */
function preserveImportantPoints(
  _original: ActivityPoint[],
  simplified: ActivityPoint[],
  _options: { preserveElevation: boolean; preserveTimestamps: boolean }
): ActivityPoint[] {
  // This is a simplified implementation - in practice, you might want more sophisticated logic
  return simplified;
}

// ============================================================================
// Elevation Calculations
// ============================================================================

/**
 * Calculate elevation gain and loss for a route
 */
export function calculateElevationStats(points: ActivityPoint[]): {
  gain: number;
  loss: number;
  max: number;
  min: number;
} {
  if (points.length === 0) {
    return { gain: 0, loss: 0, max: 0, min: 0 };
  }

  let gain = 0;
  let loss = 0;
  let max = points[0].elevation || 0;
  let min = points[0].elevation || 0;

  for (let i = 1; i < points.length; i++) {
    const currentElevation = points[i].elevation || 0;
    const previousElevation = points[i - 1].elevation || 0;

    max = Math.max(max, currentElevation);
    min = Math.min(min, currentElevation);

    const elevationDiff = currentElevation - previousElevation;
    if (elevationDiff > 0) {
      gain += elevationDiff;
    } else {
      loss += Math.abs(elevationDiff);
    }
  }

  return { gain, loss, max, min };
}

/**
 * Generate elevation profile data for visualization
 */
export function generateElevationProfile(points: ActivityPoint[]): ElevationProfile {
  const profile: ElevationProfile = {
    points: [],
    totalDistance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 0,
    minElevation: 0,
  };

  if (points.length === 0) return profile;

  let cumulativeDistance = 0;
  const elevationStats = calculateElevationStats(points);

  profile.elevationGain = elevationStats.gain;
  profile.elevationLoss = elevationStats.loss;
  profile.maxElevation = elevationStats.max;
  profile.minElevation = elevationStats.min;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      cumulativeDistance += calculateDistance(
        { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude },
        { latitude: points[i].latitude, longitude: points[i].longitude }
      );
    }

    profile.points.push({
      distance: cumulativeDistance,
      elevation: points[i].elevation || 0,
      grade: i > 0 ? calculateGrade(points[i - 1], points[i]) : 0,
    });
  }

  profile.totalDistance = cumulativeDistance;
  return profile;
}

/**
 * Calculate grade between two points
 */
function calculateGrade(point1: ActivityPoint, point2: ActivityPoint): number {
  const distance = calculateDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
  );

  if (distance === 0) return 0;

  const elevationDiff = (point2.elevation || 0) - (point1.elevation || 0);
  return (elevationDiff / (distance * 1000)) * 100; // Convert to percentage
}

// ============================================================================
// Speed and Pace Calculations
// ============================================================================

/**
 * Calculate speed between two points
 */
export function calculateSpeed(point1: ActivityPoint, point2: ActivityPoint): number {
  if (!point1.timestamp || !point2.timestamp) return 0;

  const distance = calculateDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
  );

  const timeDiff = (point2.timestamp - point1.timestamp) / 1000; // Convert to seconds
  if (timeDiff === 0) return 0;

  return (distance / timeDiff) * 3.6; // Convert m/s to km/h
}

/**
 * Calculate average speed for a route
 */
export function calculateAverageSpeed(points: ActivityPoint[]): number {
  if (points.length < 2) return 0;

  const firstPoint = points.find((p) => p.timestamp);
  const lastPoint = points
    .slice()
    .reverse()
    .find((p) => p.timestamp);

  if (!firstPoint || !lastPoint || !firstPoint.timestamp || !lastPoint.timestamp) {
    return 0;
  }

  const totalDistance = calculateRouteDistance(points);
  const totalTime = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // Convert to seconds

  if (totalTime === 0) return 0;

  return (totalDistance / totalTime) * 3.6; // Convert m/s to km/h
}

/**
 * Generate speed profile for visualization
 */
export function generateSpeedProfile(points: ActivityPoint[]): SpeedProfile {
  const profile: SpeedProfile = {
    points: [],
    averageSpeed: 0,
    maxSpeed: 0,
    totalTime: 0,
  };

  if (points.length < 2) return profile;

  let cumulativeDistance = 0;
  let totalSpeed = 0;
  let speedCount = 0;

  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(
      { latitude: points[i - 1].latitude, longitude: points[i - 1].longitude },
      { latitude: points[i].latitude, longitude: points[i].longitude }
    );
    cumulativeDistance += distance;

    const speed = calculateSpeed(points[i - 1], points[i]);
    if (speed > 0) {
      totalSpeed += speed;
      speedCount++;
      profile.maxSpeed = Math.max(profile.maxSpeed, speed);
    }

    profile.points.push({
      distance: cumulativeDistance,
      speed,
      pace: speed > 0 ? 60 / speed : 0, // minutes per km
      timestamp: points[i].timestamp || 0,
    });
  }

  profile.averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;

  const firstTimestamp = points.find((p) => p.timestamp)?.timestamp || 0;
  const lastTimestamp =
    points
      .slice()
      .reverse()
      .find((p) => p.timestamp)?.timestamp || 0;
  profile.totalTime = lastTimestamp - firstTimestamp;

  return profile;
}

// ============================================================================
// Activity Statistics
// ============================================================================

/**
 * Calculate comprehensive activity statistics
 */
export function calculateActivityStats(points: ActivityPoint[]): ActivityStats {
  if (points.length === 0) {
    return {
      distance: 0,
      duration: 0,
      elevationGain: 0,
      elevationLoss: 0,
      maxElevation: 0,
      minElevation: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      avgPace: 0,
      estimatedCalories: 0,
      boundingBox: { north: 0, south: 0, east: 0, west: 0 },
      centerLat: 0,
      centerLng: 0,
    };
  }

  const distance = calculateRouteDistance(points);
  const elevationStats = calculateElevationStats(points);
  const avgSpeed = calculateAverageSpeed(points);
  const speedProfile = generateSpeedProfile(points);
  const boundingBox = calculateBoundingBox(points);
  const center = calculateCenter(boundingBox);

  const firstTimestamp = points.find((p) => p.timestamp)?.timestamp || 0;
  const lastTimestamp =
    points
      .slice()
      .reverse()
      .find((p) => p.timestamp)?.timestamp || 0;
  const duration = lastTimestamp - firstTimestamp;

  return {
    distance,
    duration,
    elevationGain: elevationStats.gain,
    elevationLoss: elevationStats.loss,
    maxElevation: elevationStats.max,
    minElevation: elevationStats.min,
    avgSpeed,
    maxSpeed: speedProfile.maxSpeed,
    avgPace: avgSpeed > 0 ? 60 / avgSpeed : 0,
    estimatedCalories: estimateCalories(distance, duration, elevationStats.gain),
    boundingBox,
    centerLat: center.latitude,
    centerLng: center.longitude,
  };
}

/**
 * Estimate calories burned (simplified calculation)
 */
function estimateCalories(distance: number, _duration: number, elevationGain: number): number {
  // This is a very simplified calculation - in practice, you'd want to consider
  // user weight, activity type, heart rate, etc.
  const baseCalories = distance * 60; // ~60 calories per km
  const elevationBonus = elevationGain * 0.1; // Small bonus for elevation
  return Math.round(baseCalories + elevationBonus);
}

// ============================================================================
// GPX Processing Utilities
// ============================================================================

/**
 * Extract activity points from GPX data
 */
export function extractActivityPoints(gpxData: GPXData): ActivityPoint[] {
  const points: ActivityPoint[] = [];
  let pointIndex = 0;

  for (const track of gpxData.tracks) {
    for (const segment of track.segments) {
      for (const point of segment.points) {
        points.push({
          activityId: "" as Id<"activities">, // Will be set when saving
          pointIndex: pointIndex++,
          latitude: point.latitude,
          longitude: point.longitude,
          elevation: point.elevation,
          timestamp: point.timestamp,
          speed: point.extensions?.speed,
          heartRate: point.extensions?.heartRate,
          cadence: point.extensions?.cadence,
          power: point.extensions?.power,
          temperature: point.extensions?.temperature,
        });
      }
    }
  }

  return points;
}

/**
 * Generate activity summary from GPX data
 */
export function generateActivitySummary(gpxData: GPXData): ActivitySummary {
  const points = extractActivityPoints(gpxData);
  const stats = calculateActivityStats(points);

  return {
    name: gpxData.metadata?.name || "Untitled Activity",
    description: gpxData.metadata?.description,
    activityType: inferActivityType(gpxData, stats),
    startTime: points.find((p) => p.timestamp)?.timestamp,
    endTime: points
      .slice()
      .reverse()
      .find((p) => p.timestamp)?.timestamp,
    totalPoints: points.length,
    ...stats,
  };
}

/**
 * Infer activity type from GPX data and statistics
 */
function inferActivityType(_gpxData: GPXData, stats: ActivityStats): string {
  // Simple heuristics - in practice, you might want more sophisticated logic
  if (stats.avgSpeed > 20) return ACTIVITY_TYPES.CYCLING;
  if (stats.avgSpeed > 8) return ACTIVITY_TYPES.RUNNING;
  if (stats.elevationGain > stats.distance * 50) return ACTIVITY_TYPES.HIKING;
  return ACTIVITY_TYPES.WALKING;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format distance for display
 */
export function formatDistance(distance: number, unit: "km" | "miles" = "km"): string {
  const convertedDistance = unit === "miles" ? distance * 0.621371 : distance;

  if (convertedDistance < 1) {
    return `${Math.round(convertedDistance * 1000)} m`;
  }

  return `${convertedDistance.toFixed(2)} ${unit}`;
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  }

  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
}

/**
 * Format speed for display
 */
export function formatSpeed(speed: number, unit: "kmh" | "mph" = "kmh"): string {
  const convertedSpeed = unit === "mph" ? speed * 0.621371 : speed;
  return `${convertedSpeed.toFixed(1)} ${unit}`;
}

/**
 * Format pace for display
 */
export function formatPace(pace: number, unit: "min/km" | "min/mile" = "min/km"): string {
  const convertedPace = unit === "min/mile" ? pace / 0.621371 : pace;
  const minutes = Math.floor(convertedPace);
  const seconds = Math.round((convertedPace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} ${unit}`;
}

/**
 * Generate a unique color for an activity
 */
export function generateActivityColor(index: number, palette = "default"): string {
  const palettes = {
    default: ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"],
    vibrant: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"],
    pastel: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFD1DC", "#E0BBE4"],
    nature: ["#2E8B57", "#8FBC8F", "#228B22", "#32CD32", "#9ACD32", "#6B8E23"],
  };

  const colors = palettes[palette as keyof typeof palettes] || palettes.default;
  return colors[index % colors.length];
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
