// Common types used across both client and server

export interface Coordinates {
  lat: number;
  lng: number;
  elevation?: number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export type DistanceCalculationMethod = "haversine" | "euclidean";

export interface RouteSimplificationOptions {
  tolerance?: number;
  highestQuality?: boolean;
  maxPoints?: number;
  preserveStartEnd?: boolean;
  preserveElevation?: boolean;
  preserveTimestamps?: boolean;
}

export interface ElevationProfile {
  points: Array<{ distance: number; elevation: number }>;
  gain: number;
  loss: number;
  min: number;
  max: number;
  avg: number;
}

export interface SpeedProfile {
  points: Array<{ distance: number; speed: number }>;
  avg: number;
  max: number;
  min: number;
}

export interface ActivityPoint extends Coordinates {
  distance?: number;
  speed?: number;
  elevation?: number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface ActivityStats {
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPace: number;
  startTime?: number;
  endTime?: number;
  boundingBox?: BoundingBox;
}
