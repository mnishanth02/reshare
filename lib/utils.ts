import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A type representing any function with typed parameters and return value
 * @typeParam T - Tuple type representing the function arguments
 * @typeParam R - The return type of the function
 * @example
 * ```typescript
 * const fn: AnyFunction<[string, number], boolean> = (s: string, n: number) => s.length > n;
 * ```
 */
type AnyFunction<T extends unknown[] = [], R = void> = {
  (...args: T): R;
  // Additional properties
  [key: string | number | symbol]: unknown;
};

type Id<T> = string & { __type: T };

export interface Coordinates {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
  pointIndex?: number;
}

type DistanceCalculationMethod = "haversine" | "euclidean";

export interface RouteSimplificationOptions {
  tolerance?: number;
  highQuality?: boolean;
  maxPoints?: number;
  preserveElevation?: boolean;
  preserveTimestamps?: boolean;
}

export interface ElevationProfile {
  points: Array<{
    distance: number;
    elevation: number;
    grade?: number;
  }>;
  gain: number;
  loss: number;
  max: number;
  min: number;
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
}

export interface SpeedProfile {
  points: Array<{
    distance: number;
    speed: number;
    pace?: number;
  }>;
  average: number;
  max: number;
  min: number;
  averageSpeed: number;
  maxSpeed: number;
  totalTime: number;
}

export interface ActivityStats {
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  avgSpeed: number;
  maxSpeed: number;
  startTime?: string;
  endTime?: string;
  avgPace: number;
  [key: string]: unknown; // Allow additional properties
}

export interface ActivitySummary {
  id?: string;
  type: string;
  distance: number;
  duration: number;
  startTime?: string;
  endTime?: string;
}

export interface GPXData {
  tracks: Array<{
    points: ActivityPoint[];
    distance: number;
    startTime?: string;
    endTime?: string;
    segments?: Array<{
      points: Array<{
        latitude: number;
        longitude: number;
        elevation?: number;
        timestamp?: number;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
  }>;
  metadata?: {
    name?: string;
    [key: string]: unknown;
  };
}

export interface ActivityPoint extends Coordinates {
  elevation?: number;
  timestamp?: string;
  pointIndex?: number;
  speed?: number;
  cadence?: number;
  heartRate?: number;
  temperature?: number;
  power?: number;
  grade?: number;
  distance?: number;
  cumulativeDistance?: number;
  time?: string;
  [key: string]: unknown;
}

export interface SpeedPoint {
  distance: number;
  speed: number;
  pace?: number;
  timestamp?: string;
}

export interface BoundingBox {
  south: number;
  east: number;
  west: number;
  north: number;
}

// ============================================================================
// Constants
// ============================================================================

const EARTH_RADIUS_KM = 6371;
const DEFAULT_SIMPLIFICATION_TOLERANCE = 0.0001;
const DEFAULT_MAX_POINTS = 1000;

export const ACTIVITY_TYPES = {
  RUNNING: "running",
  CYCLING: "cycling",
  WALKING: "walking",
  HIKING: "hiking",
  SWIMMING: "swimming",
  SKIING: "skiing",
  OTHER: "other",
} as const;

export const MAP_STYLES = {
  STREET: "street",
  SATELLITE: "satellite",
  TERRAIN: "terrain",
  OUTDOORS: "outdoors",
  DARK: "dark",
  LIGHT: "light",
} as const;

export const COLOR_PALETTES = {
  DEFAULT: "default",
  VIBRANT: "vibrant",
  PASTEL: "pastel",
  MONOCHROME: "monochrome",
  NATURE: "nature",
  SUNSET: "sunset",
} as const;

// ============================================================================
// UI Utilities
// ============================================================================

/**
 * Combines multiple class names and merges Tailwind CSS classes
 * @param inputs - Class values to be combined
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Client-side Storage
// ============================================================================

/**
 * Safely get an item from localStorage
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or default value
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely set an item in localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

// ============================================================================
// Client-side Utilities
// ============================================================================

/**
 * Debounce a function call
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttle a function call
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends AnyFunction>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle = false;
  let lastResult: ReturnType<T> | undefined;

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(this, args) as ReturnType<T>;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format distance for display
 * @param distance - Distance in kilometers
 * @param unit - Unit to display (km or miles)
 * @returns Formatted distance string
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
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string (HH:MM:SS or MM:SS)
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
 * @param speed - Speed in km/h
 * @param unit - Unit to display (kmh or mph)
 * @returns Formatted speed string
 */
export function formatSpeed(speed: number, unit: "kmh" | "mph" = "kmh"): string {
  const convertedSpeed = unit === "mph" ? speed * 0.621371 : speed;
  return `${convertedSpeed.toFixed(1)} ${unit}`;
}

/**
 * Format pace for display
 * @param pace - Pace in min/km
 * @param unit - Unit to display (min/km or min/mile)
 * @returns Formatted pace string
 */
export function formatPace(pace: number, unit: "min/km" | "min/mile" = "min/km"): string {
  const convertedPace = unit === "min/mile" ? pace / 0.621371 : pace;
  const minutes = Math.floor(convertedPace);
  const seconds = Math.round((convertedPace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} ${unit}`;
}

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Generate a unique color for an activity
 * @param index - Index of the activity
 * @param palette - Color palette to use
 * @returns CSS color string
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

// ============================================================================
// Geospatial Utilities (Client-side only)
// ============================================================================

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Validate coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Boolean indicating if coordinates are valid
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculate the distance between two geographic points using the specified method
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @param method - Distance calculation method (default: "haversine")
 * @returns Distance in kilometers
 * @throws {Error} If coordinates are invalid
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates,
  method: DistanceCalculationMethod = "haversine"
): number {
  // Ensure we have valid coordinates with proper type checking
  const lat1 = typeof point1.latitude === "number" ? point1.latitude : 0;
  const lon1 = typeof point1.longitude === "number" ? point1.longitude : 0;
  const lat2 = typeof point2.latitude === "number" ? point2.latitude : 0;
  const lon2 = typeof point2.longitude === "number" ? point2.longitude : 0;

  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error("Invalid coordinates provided");
  }

  if (method === "euclidean") {
    return calculateEuclideanDistance(point1, point2);
  }

  // Type-safe coordinate validation with explicit number type
  const toValidCoordinate = (value: unknown): number => {
    // Handle number type
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    // Handle string type
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    // Handle boolean, null, undefined, or any other type
    return 0;
  };

  // Convert and validate all coordinates with explicit number type
  const lat1Num = toValidCoordinate(lat1);
  const lon1Num = toValidCoordinate(lon1);
  const lat2Num = toValidCoordinate(lat2);
  const lon2Num = toValidCoordinate(lon2);

  // Type-safe number operations with explicit type assertions
  const dLatNum: number = Number(lat2Num) - Number(lat1Num);
  const dLonNum: number = Number(lon2Num) - Number(lon1Num);

  // Convert to radians with type safety
  const dLatRad: number = toRadians(dLatNum);
  const dLonRad: number = toRadians(dLonNum);
  const lat1Rad: number = toRadians(lat1Num);
  const lat2Rad: number = toRadians(lat2Num);

  // Calculate intermediate values
  const halfDLat = dLatRad / 2;
  const halfDLon = dLonRad / 2;
  const sinDLat = Math.sin(halfDLat);
  const sinDLon = Math.sin(halfDLon);
  const cosLat1 = Math.cos(lat1Rad);
  const cosLat2 = Math.cos(lat2Rad);

  // Ensure all values are finite before calculations
  if (
    !Number.isFinite(sinDLat) ||
    !Number.isFinite(sinDLon) ||
    !Number.isFinite(cosLat1) ||
    !Number.isFinite(cosLat2)
  ) {
    return 0;
  }

  // Calculate 'a' with type-safe operations
  const sinDLatSq = sinDLat * sinDLat;
  const sinDLonSq = sinDLon * sinDLon;
  const cosProduct = cosLat1 * cosLat2;
  const a = sinDLatSq + cosProduct * sinDLonSq;

  if (!Number.isFinite(a)) {
    return 0;
  }

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Number.isFinite(distance) ? distance : 0;
}

/**
 * Calculate Euclidean distance between two points (for small distances)
 * @param point1 - First coordinate point
 * @param point2 - Second coordinate point
 * @returns Distance in kilometers
 */
function calculateEuclideanDistance(point1: Coordinates, point2: Coordinates): number {
  try {
    // Type-safe coordinate extraction with validation
    const getValidCoordinate = (value: unknown, defaultValue: number): number => {
      return typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
    };

    const lat1 = getValidCoordinate(point1.latitude, 0);
    const lon1 = getValidCoordinate(point1.longitude, 0);
    const lat2 = getValidCoordinate(point2.latitude, 0);
    const lon2 = getValidCoordinate(point2.longitude, 0);

    // Validate coordinates
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      return 0;
    }

    // Calculate differences in degrees
    const latDiff = lat2 - lat1;
    const lonDiff = lon2 - lon1;

    // Use Haversine formula for better accuracy
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(latDiff);
    const dLon = toRadians(lonDiff);

    // Ensure all values are finite before calculations
    if (!Number.isFinite(dLat) || !Number.isFinite(dLon)) {
      return 0;
    }

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const cosLat1 = Math.cos(toRadians(lat1));
    const cosLat2 = Math.cos(toRadians(lat2));

    if (
      !Number.isFinite(sinDLat) ||
      !Number.isFinite(sinDLon) ||
      !Number.isFinite(cosLat1) ||
      !Number.isFinite(cosLat2)
    ) {
      return 0;
    }

    const a = sinDLat * sinDLat + cosLat1 * cosLat2 * sinDLon * sinDLon;

    if (!Number.isFinite(a)) {
      return 0;
    }

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Number.isFinite(distance) ? distance : 0;
  } catch (error) {
    console.error("Error calculating Euclidean distance:", error);
    return 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a slug from a string
 * @param text - Text to convert to slug
 * @returns URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculate the total distance of a route
 * @param points - Array of activity points
 * @returns Total distance in kilometers
 */
export function calculateRouteDistance(points: ActivityPoint[]): number {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  // Use reduce for better performance with large arrays
  return points.reduce<number>((total, current, index, array) => {
    if (index === 0) return 0; // Skip first iteration

    const prev = array[index - 1];
    return (
      total +
      calculateDistance(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: current.latitude, longitude: current.longitude }
      )
    );
  }, 0);
}

/**
 * Calculate the bounding box for a set of coordinates
 */
/**
 * Calculate the bounding box that contains all given points
 * @param points - Array of activity points
 * @returns Bounding box with north, south, east, and west boundaries
 * @throws {Error} If points array is empty
 */
export function calculateBoundingBox(points: ActivityPoint[]): BoundingBox {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("Cannot calculate bounding box for empty points array");
  }

  // Initialize with first point's coordinates
  const initial = {
    south: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
  };

  // Use reduce for better performance with large arrays
  return points.reduce<BoundingBox>(
    (bounds, point) => ({
      north: Math.max(bounds.north, point.latitude),
      south: Math.min(bounds.south, point.latitude),
      east: Math.max(bounds.east, point.longitude),
      west: Math.min(bounds.west, point.longitude),
    }),
    initial
  );
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
/**
 * Preserve important points during simplification based on elevation or timestamp changes
 * @param original - Original array of activity points
 * @param simplified - Simplified array of activity points
 * @param options - Options for preserving specific point attributes
 * @returns Array of activity points with important points preserved
 * @private
 */
function preserveImportantPoints(
  original: ActivityPoint[],
  simplified: ActivityPoint[],
  options: { preserveElevation: boolean; preserveTimestamps: boolean }
): ActivityPoint[] {
  if (original.length === 0 || simplified.length === 0) {
    return simplified;
  }

  const { preserveElevation, preserveTimestamps } = options;

  // If no preservation needed, return simplified as is
  if (!preserveElevation && !preserveTimestamps) {
    return simplified;
  }

  // Create a Set of simplified point indices for O(1) lookups
  const simplifiedIndices = new Set(simplified.map((point) => point.pointIndex));

  // Find important points that were removed during simplification
  const importantPoints = original.filter((point, index) => {
    // Always keep first and last points
    if (index === 0 || index === original.length - 1) {
      return false; // Already included in simplified set
    }

    // Check if this point is already in the simplified set
    if (simplifiedIndices.has(point.pointIndex)) {
      return false;
    }

    // Check if this point is important based on options
    if (preserveElevation) {
      const prev = original[index - 1];
      const next = original[index + 1];

      // Check for local maxima/minima in elevation
      const isPeak =
        (point.elevation || 0) > (prev.elevation || 0) &&
        (point.elevation || 0) > (next.elevation || 0);

      const isValley =
        (point.elevation || 0) < (prev.elevation || 0) &&
        (point.elevation || 0) < (next.elevation || 0);

      if (isPeak || isValley) {
        return true;
      }
    }

    if (preserveTimestamps && point.timestamp) {
      // Add points with significant time gaps
      const prev = original[index - 1];
      if (
        prev.timestamp &&
        point.timestamp &&
        new Date(point.timestamp).getTime() - new Date(prev.timestamp).getTime() > 60000
      ) {
        // 1 minute gap
        return true;
      }
    }

    return false;
  });

  // Merge and sort the points while maintaining order
  const merged = [...simplified, ...importantPoints].sort((a, b) => {
    const aIndex = a.pointIndex ?? 0;
    const bIndex = b.pointIndex ?? 0;
    return Number(aIndex) - Number(bIndex);
  });

  return merged;
}

// ============================================================================
// Elevation Calculations
// ============================================================================

/**
 * Calculate elevation gain and loss for a route
 * @param points - Array of activity points with elevation data
 * @returns Object containing elevation statistics
 */
export function calculateElevationStats(points: ActivityPoint[]): {
  gain: number;
  loss: number;
  max: number;
  min: number;
} {
  // Handle empty or invalid input
  if (!Array.isArray(points) || points.length === 0) {
    return { gain: 0, loss: 0, max: 0, min: 0 };
  }

  // Initialize with safe defaults
  let gain = 0;
  let loss = 0;

  // Safely get initial elevation with type checking
  const firstPoint = points[0];
  const firstElevation =
    firstPoint && typeof firstPoint.elevation === "number" && Number.isFinite(firstPoint.elevation)
      ? firstPoint.elevation
      : 0;

  let max = firstElevation;
  let min = firstElevation;
  let previousElevation = firstElevation;

  // Process points starting from the second one
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;

    // Safely get current elevation with type checking
    const currentElevation =
      point && typeof point.elevation === "number" && Number.isFinite(point.elevation)
        ? point.elevation
        : previousElevation; // Use previous elevation if current is invalid

    // Update min/max
    max = Math.max(max, currentElevation);
    min = Math.min(min, currentElevation);

    // Calculate elevation difference
    const elevationDiff = currentElevation - previousElevation;
    if (elevationDiff > 0) {
      gain += elevationDiff;
    } else if (elevationDiff < 0) {
      loss += Math.abs(elevationDiff);
    }

    // Update previous elevation for next iteration
    previousElevation = currentElevation;
  }

  // Ensure all return values are valid numbers
  return {
    gain: Number.isFinite(gain) ? gain : 0,
    loss: Number.isFinite(loss) ? loss : 0,
    max: Number.isFinite(max) ? max : 0,
    min: Number.isFinite(min) ? min : 0,
  };
}

/**
 * Generate elevation profile data for visualization
 */
export function generateElevationProfile(points: ActivityPoint[]): ElevationProfile {
  const emptyProfile: ElevationProfile = {
    points: [],
    gain: 0,
    loss: 0,
    max: 0,
    min: 0,
    totalDistance: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxElevation: 0,
    minElevation: 0,
  };

  // Validate input
  if (!Array.isArray(points) || points.length === 0) {
    return emptyProfile;
  }

  // Calculate elevation statistics with type safety
  const elevationStats = calculateElevationStats(points);
  const profilePoints: Array<{ distance: number; elevation: number; grade?: number }> = [];

  // Initialize with safe defaults
  let cumulativeDistance = 0;

  // Safely get initial elevation with type checking
  const firstElevation =
    typeof points[0]?.elevation === "number" && Number.isFinite(points[0].elevation)
      ? Number(points[0].elevation)
      : 0;

  // Add first point with validation
  profilePoints.push({
    distance: 0,
    elevation: firstElevation,
    grade: 0,
  });

  // Process remaining points
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];
    if (!prevPoint || !currPoint) continue;

    // Type-safe coordinate extraction
    const prevLat = typeof prevPoint.latitude === "number" ? prevPoint.latitude : 0;
    const prevLon = typeof prevPoint.longitude === "number" ? prevPoint.longitude : 0;
    const currLat = typeof currPoint.latitude === "number" ? currPoint.latitude : 0;
    const currLon = typeof currPoint.longitude === "number" ? currPoint.longitude : 0;

    // Calculate distance between points with validation
    const distance = calculateDistance(
      { latitude: prevLat, longitude: prevLon },
      { latitude: currLat, longitude: currLon }
    );

    // Skip invalid distances
    if (!Number.isFinite(distance) || distance < 0) continue;

    // Update cumulative distance with validation
    const newCumulativeDistance = cumulativeDistance + distance;
    if (!Number.isFinite(newCumulativeDistance)) continue;
    cumulativeDistance = newCumulativeDistance;

    // Calculate grade with type safety and validation
    const currentElevation =
      typeof currPoint.elevation === "number" && Number.isFinite(currPoint.elevation)
        ? Number(currPoint.elevation)
        : 0;
    const prevElevation =
      typeof prevPoint.elevation === "number" && Number.isFinite(prevPoint.elevation)
        ? Number(prevPoint.elevation)
        : 0;

    const elevationDiff = currentElevation - prevElevation;
    const grade =
      distance > 0 && Number.isFinite(elevationDiff) ? (elevationDiff / distance) * 100 : 0;

    profilePoints.push({
      distance: Number(cumulativeDistance.toFixed(2)),
      elevation: Number(currentElevation.toFixed(1)),
      grade: Number(grade.toFixed(1)),
    });
  }

  return {
    points: profilePoints,
    gain: Number(elevationStats.gain.toFixed(1)),
    loss: Number(elevationStats.loss.toFixed(1)),
    max: Number(elevationStats.max.toFixed(1)),
    min: Number(elevationStats.min.toFixed(1)),
    totalDistance: Number(cumulativeDistance.toFixed(2)),
    elevationGain: Number(elevationStats.gain.toFixed(1)),
    elevationLoss: Number(elevationStats.loss.toFixed(1)),
    maxElevation: Number(elevationStats.max.toFixed(1)),
    minElevation: Number(elevationStats.min.toFixed(1)),
  };
}

/**
 * Calculate grade between two points as a percentage
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Grade as a percentage (positive for ascent, negative for descent)
 */
function _calculateGrade(point1: ActivityPoint, point2: ActivityPoint): number {
  try {
    // Ensure we have valid points
    if (!point1 || !point2) return 0;

    // Type-safe coordinate extraction with validation
    const lat1 =
      typeof point1.latitude === "number" && Number.isFinite(point1.latitude) ? point1.latitude : 0;
    const lon1 =
      typeof point1.longitude === "number" && Number.isFinite(point1.longitude)
        ? point1.longitude
        : 0;
    const ele1 =
      typeof point1.elevation === "number" && Number.isFinite(point1.elevation)
        ? point1.elevation
        : 0;
    const lat2 =
      typeof point2.latitude === "number" && Number.isFinite(point2.latitude) ? point2.latitude : 0;
    const lon2 =
      typeof point2.longitude === "number" && Number.isFinite(point2.longitude)
        ? point2.longitude
        : 0;
    const ele2 =
      typeof point2.elevation === "number" && Number.isFinite(point2.elevation)
        ? point2.elevation
        : 0;

    // Calculate elevation difference
    const elevationDiff = ele2 - ele1;

    // Calculate horizontal distance in meters
    const horizontalDistanceMeters =
      calculateEuclideanDistance(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
      ) * 1000; // Convert km to m

    // Avoid division by zero
    if (horizontalDistanceMeters <= 0) return 0;

    // Calculate grade (rise/run * 100)
    const grade = (elevationDiff / horizontalDistanceMeters) * 100;

    // Handle potential floating point precision issues and ensure we return a number
    const roundedGrade = Number(grade.toFixed(1));
    return Number.isFinite(roundedGrade) ? roundedGrade : 0;
  } catch (error) {
    console.warn("Error calculating grade:", error);
    return 0;
  }
}

// ============================================================================
// Speed and Pace Calculations
// ============================================================================

/**
 * Calculate speed between two points in kilometers per hour (km/h)
 * @param point1 - First activity point with coordinates and timestamp
 * @param point2 - Second activity point with coordinates and timestamp
 * @returns Speed in km/h, or 0 if calculation is not possible
 */
export function calculateSpeed(point1: ActivityPoint, point2: ActivityPoint): number {
  try {
    // Validate timestamps
    const timestamp1 = point1?.timestamp;
    const timestamp2 = point2?.timestamp;

    if (!timestamp1 || !timestamp2) return 0;

    // Type-safe number extraction with explicit type checking
    const getValidNumber = (value: unknown, defaultValue: number): number => {
      // Handle null/undefined
      if (value === null || value === undefined) return defaultValue;

      // Handle number type directly
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }

      // Handle string type with parsing
      if (typeof value === "string") {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : defaultValue;
      }

      // For any other type, return default
      return defaultValue;
    };

    // Extract and validate coordinates
    const lat1 = getValidNumber(point1.latitude, 0);
    const lon1 = getValidNumber(point1.longitude, 0);
    const lat2 = getValidNumber(point2.latitude, 0);
    const lon2 = getValidNumber(point2.longitude, 0);

    // Skip if points are the same
    if (lat1 === lat2 && lon1 === lon2) return 0;

    // Create type-safe coordinate objects
    const pointA = {
      latitude: lat1,
      longitude: lon1,
    };
    const pointB = {
      latitude: lat2,
      longitude: lon2,
    };

    // Calculate distance with validation
    const distanceKm = calculateDistance(pointA, pointB);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;

    // Convert timestamps to numbers safely with validation
    const time1 = timestamp1 ? new Date(timestamp1).getTime() : Number.NaN;
    const time2 = timestamp2 ? new Date(timestamp2).getTime() : Number.NaN;

    // Convert to numbers explicitly
    const time1Num = Number(time1);
    const time2Num = Number(time2);

    // Validate timestamps and ensure time2 is after time1
    if (!Number.isFinite(time1Num) || !Number.isFinite(time2Num) || time1Num >= time2Num) {
      return 0;
    }

    // Calculate time difference in hours with type safety
    const timeDiffMs = time2Num - time1Num;
    const msPerHour = 1000 * 60 * 60;
    const timeDiffHours = timeDiffMs / msPerHour;

    // Validate time difference
    if (timeDiffHours <= 0 || !Number.isFinite(timeDiffHours)) {
      return 0;
    }

    // Calculate speed in km/h with type-safe division
    const speedKph = Number(distanceKm) / Number(timeDiffHours);

    // Return 0 for any invalid or unrealistic speeds
    return Number.isFinite(speedKph) && speedKph >= 0 ? speedKph : 0;
  } catch (error) {
    console.error("Error calculating speed:", error);
    return 0;
  }
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
  const totalTime =
    (new Date(lastPoint.timestamp).getTime() - new Date(firstPoint.timestamp).getTime()) / 1000; // Convert to seconds

  if (totalTime === 0) return 0;

  return (totalDistance / totalTime) * 3.6; // Convert m/s to km/h
}

/**
 * Generate speed profile for visualization
 */
export function generateSpeedProfile(points: ActivityPoint[]): SpeedProfile {
  // Initialize result with default values and type safety
  const result: SpeedProfile = {
    points: [],
    average: 0,
    max: 0,
    min: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    totalTime: 0,
  };

  // Early return for insufficient points
  if (!Array.isArray(points) || points.length < 2) {
    return result;
  }

  // Initialize variables with proper type safety
  let totalSpeed = 0;
  let speedCount = 0;
  let minSpeed = Number.POSITIVE_INFINITY;
  let maxSpeed = 0;
  let cumulativeDistance = 0;
  const validPoints: SpeedPoint[] = [];

  // Process points to calculate speeds and distances
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];

    // Skip invalid points
    if (!prevPoint || !currPoint) continue;

    // Type-safe coordinate extraction
    const prevLat = typeof prevPoint.latitude === "number" ? prevPoint.latitude : 0;
    const prevLon = typeof prevPoint.longitude === "number" ? prevPoint.longitude : 0;
    const currLat = typeof currPoint.latitude === "number" ? currPoint.latitude : 0;
    const currLon = typeof currPoint.longitude === "number" ? currPoint.longitude : 0;

    // Calculate distance between points with type safety
    const distance = calculateDistance(
      { latitude: prevLat, longitude: prevLon },
      { latitude: currLat, longitude: currLon }
    );

    // Skip invalid distances
    if (!Number.isFinite(distance) || distance < 0) continue;

    // Update cumulative distance with validation
    const newCumulativeDistance = cumulativeDistance + distance;
    if (!Number.isFinite(newCumulativeDistance)) continue;
    cumulativeDistance = newCumulativeDistance;

    // Calculate speed with validation
    const speed = calculateSpeed(prevPoint, currPoint);
    if (!Number.isFinite(speed) || speed < 0) continue;

    // Update statistics with validation
    const newTotalSpeed = totalSpeed + speed;
    if (!Number.isFinite(newTotalSpeed)) continue;

    totalSpeed = newTotalSpeed;
    speedCount++;
    maxSpeed = Math.max(maxSpeed, speed);
    minSpeed = Math.min(minSpeed, speed);

    // Calculate pace with validation (minutes per km)
    const pace = speed > 0 ? 60 / speed : 0;

    // Add valid speed point
    validPoints.push({
      distance: Number(cumulativeDistance.toFixed(2)),
      speed: Number(speed.toFixed(2)),
      pace: Number(pace.toFixed(2)),
    });
  }

  // Calculate time difference between first and last point with validation
  let totalTime = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (firstPoint?.timestamp && lastPoint?.timestamp) {
    try {
      const startMs = new Date(firstPoint.timestamp).getTime();
      const endMs = new Date(lastPoint.timestamp).getTime();

      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        totalTime = (endMs - startMs) / 1000; // Convert to seconds
      }
    } catch (e) {
      console.warn("Error calculating total time:", e);
    }
  }

  // Calculate averages with validation
  const averageSpeed = speedCount > 0 && Number.isFinite(totalSpeed) ? totalSpeed / speedCount : 0;

  // Ensure minSpeed is a valid number
  const safeMinSpeed =
    Number.isFinite(minSpeed) && minSpeed !== Number.POSITIVE_INFINITY ? minSpeed : 0;

  // Return result with validated values
  return {
    points: validPoints,
    average: Number(averageSpeed.toFixed(2)),
    max: Number(maxSpeed.toFixed(2)),
    min: Number(safeMinSpeed.toFixed(2)),
    averageSpeed: Number(averageSpeed.toFixed(2)),
    maxSpeed: Number(maxSpeed.toFixed(2)),
    totalTime: Number(totalTime.toFixed(2)),
  };
}

// ============================================================================
// Activity Statistics
// ============================================================================

/**
 * Calculate comprehensive activity statistics
 */
export function calculateActivityStats(points: ActivityPoint[]): ActivityStats {
  if (!points?.length) {
    throw new Error("No points provided");
  }

  // Initialize variables with type safety
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxSpeed = 0;

  // Safe elevation initialization with type checking
  const initialElevation = typeof points[0]?.elevation === "number" ? points[0].elevation : 0;
  let minElevation = initialElevation;
  let maxElevation = initialElevation;

  let startTime: string | undefined;
  let endTime: string | undefined;

  // Calculate basic stats
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;

    // Calculate distance between points with type safety
    const distance = calculateDistance(prev, curr);
    if (Number.isFinite(distance)) {
      totalDistance += distance;
    }

    // Calculate elevation changes with type safety
    const prevElevation = typeof prev.elevation === "number" ? prev.elevation : 0;
    const currElevation = typeof curr.elevation === "number" ? curr.elevation : 0;

    if (Number.isFinite(prevElevation) && Number.isFinite(currElevation)) {
      const elevationDiff = currElevation - prevElevation;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      } else {
        elevationLoss += Math.abs(elevationDiff);
      }

      minElevation = Math.min(minElevation, currElevation);
      maxElevation = Math.max(maxElevation, currElevation);
    }

    // Track start and end times with type safety
    if (typeof curr.timestamp === "string") {
      if (!startTime || curr.timestamp < startTime) startTime = curr.timestamp;
      if (!endTime || curr.timestamp > endTime) endTime = curr.timestamp;
    }

    // Calculate speed (if timestamps are available)
    if (prev.timestamp && curr.timestamp) {
      try {
        const prevTime = new Date(prev.timestamp).getTime();
        const currTime = new Date(curr.timestamp).getTime();

        if (Number.isFinite(prevTime) && Number.isFinite(currTime) && prevTime < currTime) {
          const timeDiff = currTime - prevTime;
          if (timeDiff > 0) {
            const speed = (distance * 1000) / timeDiff; // km/s
            if (Number.isFinite(speed)) {
              maxSpeed = Math.max(maxSpeed, speed);
            }
          }
        }
      } catch (error) {
        console.warn("Error calculating speed:", error);
      }
    }
  }

  // Calculate duration in seconds with validation
  let duration = 0;
  if (startTime && endTime) {
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
        duration = (end - start) / 1000;
      }
    } catch (error) {
      console.warn("Error calculating duration:", error);
    }
  }

  // Calculate average speed (km/h) with validation
  const avgSpeed =
    duration > 0 && Number.isFinite(totalDistance) ? (totalDistance * 3600) / duration : 0;

  // Calculate average pace (min/km) with validation
  const avgPace = totalDistance > 0 && duration > 0 ? duration / 60 / totalDistance : 0;

  // Ensure all numeric values are finite and non-negative
  const safeMaxSpeed = Math.max(0, Number.isFinite(maxSpeed) ? maxSpeed * 3.6 : 0); // Convert to km/h
  const safeTotalDistance = Math.max(0, Number.isFinite(totalDistance) ? totalDistance : 0);
  const safeDuration = Math.max(0, Number.isFinite(duration) ? duration : 0);
  const safeElevationGain = Math.max(0, Number.isFinite(elevationGain) ? elevationGain : 0);
  const safeElevationLoss = Math.max(0, Number.isFinite(elevationLoss) ? elevationLoss : 0);
  const safeMaxElevation = Number.isFinite(maxElevation) ? maxElevation : 0;
  const safeMinElevation = Number.isFinite(minElevation) ? minElevation : 0;

  return {
    distance: safeTotalDistance,
    duration: safeDuration,
    elevationGain: safeElevationGain,
    elevationLoss: safeElevationLoss,
    avgSpeed: Math.max(0, Number.isFinite(avgSpeed) ? avgSpeed : 0),
    maxSpeed: safeMaxSpeed,
    maxElevation: safeMaxElevation,
    minElevation: safeMinElevation,
    avgPace: Math.max(0, Number.isFinite(avgPace) ? avgPace : 0),
    startTime,
    endTime,
  };
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
    // Skip tracks with no segments or undefined segments
    if (!track.segments || !Array.isArray(track.segments)) {
      continue;
    }

    for (const segment of track.segments) {
      // Skip segments with no points or undefined points
      if (!segment?.points || !Array.isArray(segment.points)) {
        continue;
      }

      for (const point of segment.points) {
        if (!point || typeof point.latitude !== "number" || typeof point.longitude !== "number") {
          continue; // Skip invalid points
        }

        // Create a point with required properties
        const activityPoint: ActivityPoint = {
          _id: "" as Id<"activityPoints">,
          _creationTime: 0,
          activityId: "" as Id<"activities">,
          pointIndex: pointIndex++,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          extensions: { ...(point.extensions || {}) },
        };

        // Add optional properties if they exist and are valid
        if (typeof point.elevation === "number") {
          activityPoint.elevation = point.elevation;
        }
        if (typeof point.timestamp === "string") {
          activityPoint.timestamp = point.timestamp;
        }
        if (typeof point.speed === "number") {
          activityPoint.speed = point.speed;
        }
        if (typeof point.heartRate === "number") {
          activityPoint.heartRate = point.heartRate;
        }
        if (typeof point.cadence === "number") {
          activityPoint.cadence = point.cadence;
        }
        if (typeof point.power === "number") {
          activityPoint.power = point.power;
        }
        if (typeof point.temperature === "number") {
          activityPoint.temperature = point.temperature;
        }

        points.push(activityPoint);
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

  // Get start and end times from points with timestamps
  const startTime = points.find((p) => p.timestamp)?.timestamp;
  const endTime = points
    .slice()
    .reverse()
    .find((p) => p.timestamp)?.timestamp;

  // Calculate duration in seconds if we have both start and end times
  let duration = 0;
  if (startTime && endTime) {
    duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
  }

  // Return only the properties defined in the ActivitySummary interface
  return {
    id: gpxData.metadata?.id as string | undefined,
    type: inferActivityType(gpxData, stats),
    distance: stats.distance,
    duration: Math.round(duration),
    startTime,
    endTime,
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
// GPX Processing Utilities End
// ============================================================================
