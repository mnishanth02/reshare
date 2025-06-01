import type { Id } from "../_generated/dataModel";

// ============================================================================
// Core Entity Types (will be properly typed after schema generation)
// ============================================================================

// These will be properly typed once the schema is generated
export type User = Record<string, unknown>;
export type Journey = Record<string, unknown>;
export type Activity = Record<string, unknown>;
export type ExportTemplate = Record<string, unknown>;
export type GeneratedExport = Record<string, unknown>;
export type AIAnalysis = Record<string, unknown>;
export type UserSession = Record<string, unknown>;
export type SystemLog = Record<string, unknown>;

// ActivityPoint needs proper typing for calculations
export interface ActivityPoint {
  activityId: Id<"activities">;
  pointIndex: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: number;
  speed?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
}

// Extended types with relationships
export type JourneyWithActivities = Journey & {
  activities: Activity[];
  activityCount: number;
};

export type ActivityWithPoints = Activity & {
  points: ActivityPoint[];
};

// ============================================================================
// GPX and Geospatial Types
// ============================================================================

export interface GPXPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: number;
  extensions?: {
    speed?: number;
    heartRate?: number;
    cadence?: number;
    power?: number;
    temperature?: number;
  };
}

export interface GPXTrack {
  name?: string;
  points: GPXPoint[];
  segments: GPXSegment[];
}

export interface GPXSegment {
  points: GPXPoint[];
}

export interface GPXWaypoint {
  latitude: number;
  longitude: number;
  name?: string;
  description?: string;
  elevation?: number;
  timestamp?: number;
  symbol?: string;
}

export interface ProcessedGPXData {
  tracks: GPXTrack[];
  waypoints: GPXWaypoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalDistance: number;
  totalTime?: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
}

export interface GPXData {
  tracks: GPXTrack[];
  waypoints: GPXWaypoint[];
  metadata?: GPXMetadata;
}

export interface GPXTrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: number;
  extensions?: {
    speed?: number;
    heartRate?: number;
    cadence?: number;
    power?: number;
    temperature?: number;
  };
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RouteSimplificationOptions {
  tolerance?: number;
  maxPoints?: number;
  preserveElevation?: boolean;
  preserveTimestamps?: boolean;
}

export type DistanceCalculationMethod = "haversine" | "euclidean";

export interface ElevationProfile {
  points: Array<{
    distance: number;
    elevation: number;
    grade: number;
  }>;
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
    pace: number;
    timestamp: number;
  }>;
  averageSpeed: number;
  maxSpeed: number;
  totalTime: number;
}

export interface ActivitySummary {
  name: string;
  description?: string;
  activityType: string;
  startTime?: number;
  endTime?: number;
  totalPoints: number;
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPace: number;
  estimatedCalories: number;
  boundingBox: BoundingBox;
  centerLat: number;
  centerLng: number;
}

export interface GPXMetadata {
  name?: string;
  description?: string;
  activityType?: string;
  totalDistance: number;
  totalDuration: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  avgSpeed: number;
  maxSpeed: number;
  boundingBox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  centerLat: number;
  centerLng: number;
  activityDate: number;
  pointCount: number;
}

export interface ElevationPoint {
  distance: number;
  elevation: number;
  time?: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

// ============================================================================
// Activity and Statistics Types
// ============================================================================

export interface ActivityStats {
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPace: number;
  estimatedCalories: number;
  boundingBox: BoundingBox;
  centerLat: number;
  centerLng: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  icon: string;
}

export type ActivityType =
  | "hiking"
  | "running"
  | "cycling"
  | "walking"
  | "skiing"
  | "snowboarding"
  | "climbing"
  | "kayaking"
  | "sailing"
  | "motorcycle"
  | "driving"
  | "other";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

// ============================================================================
// Map and Visualization Types
// ============================================================================

export type MapStyle = "light" | "dark" | "outdoors" | "terrain" | "satellite" | "custom";

export type ColorPalette =
  | "default"
  | "vibrant"
  | "pastel"
  | "monochrome"
  | "colorblind-friendly"
  | "custom";

export interface MapConfig {
  style: MapStyle;
  center: [number, number];
  zoom: number;
  bounds?: [[number, number], [number, number]];
  pitch?: number;
  bearing?: number;
}

export interface LayerStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
  dashArray?: number[];
}

// ============================================================================
// Canvas and Design Types
// ============================================================================

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  dpi?: number;
}

export interface LayerPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface CanvasLayer {
  id: string;
  type: "map" | "text" | "image" | "shape" | "chart";
  properties: Record<string, string | number | boolean>;
  position: LayerPosition;
  style: Record<string, string | number | boolean>;
  visible: boolean;
  locked: boolean;
}

export interface TemplateData {
  canvas: CanvasConfig;
  layers: CanvasLayer[];
}

export type ExportFormat = "png" | "jpeg" | "webp" | "svg" | "pdf";

export interface ExportDimensions {
  width: number;
  height: number;
  dpi: number;
}

export interface ExportOptions {
  format: ExportFormat;
  dimensions: ExportDimensions;
  quality?: number;
  compression?: number;
}

export interface ExportConfig {
  mapStyle: string;
  showActivities: Id<"activities">[];
  dimensions: {
    width: number;
    height: number;
  };
  dpi: number;
  format: "png" | "jpeg" | "webp" | "svg" | "pdf";
  layers: ExportLayer[];
}

export interface ExportLayer {
  type: "text" | "image" | "shape" | "chart";
  id: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number;
  data: Record<string, string | number | boolean>;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export type AIAnalysisType =
  | "route_categorization"
  | "difficulty_assessment"
  | "poi_identification"
  | "performance_insights"
  | "content_generation";

export interface AIAnalysisResult {
  type: AIAnalysisType;
  confidence: number;
  data: Record<string, string | number | boolean>;
  suggestions?: string[];
  insights?: string[];
}

export interface RouteAnalysis {
  difficulty: "easy" | "moderate" | "hard" | "expert";
  terrain: string[];
  surfaceType: string[];
  technicalRating?: number;
  scenicRating?: number;
  popularityScore?: number;
}

export interface PointOfInterest {
  name: string;
  type: string;
  coordinates: [number, number];
  description?: string;
  rating?: number;
  distance?: number;
}

// ============================================================================
// Sharing and Privacy Types
// ============================================================================

export type VisibilityLevel = "public" | "unlisted" | "private";
export type ShareType = "public" | "unlisted" | "password";

export interface SharePermissions {
  canView: boolean;
  canDownload: boolean;
  canComment: boolean;
  canEdit: boolean;
}

export interface ShareConfig {
  type: ShareType;
  password?: string;
  permissions: SharePermissions;
  expiresAt?: number;
}

// ============================================================================
// User Settings and Preferences Types
// ============================================================================

export interface UserDefaultSettings {
  mapStyle: MapStyle;
  colorPalette: ColorPalette;
  activityType?: ActivityType;
  privacyLevel: VisibilityLevel;
  units: "metric" | "imperial";
  timezone: string;
}

export interface SubscriptionInfo {
  plan: "free" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due";
  expiresAt?: number;
}

export interface JourneySettings {
  defaultMapStyle: MapStyle;
  defaultColorPalette: ColorPalette;
  defaultActivityType?: ActivityType;
  visibility: VisibilityLevel;
  allowComments: boolean;
  allowDownloads: boolean;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface JourneyFilters {
  status?: "active" | "archived";
  activityType?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  minDistance?: number;
  maxDistance?: number;
  searchQuery?: string;
}

export interface ActivityFilters {
  activityType?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  minDistance?: number;
  maxDistance?: number;
  minDuration?: number;
  maxDuration?: number;
}

// ============================================================================
// API and Validation Types
// ============================================================================

export interface APIResponse<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  offset?: number;
}

export interface PaginatedResult<TData> {
  items: TData[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, string | number | boolean>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Error Types
// ============================================================================

export interface ConvexError {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: string | number | boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Database Query Types
// ============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface FilterOptions {
  userId?: Id<"users">;
  journeyId?: Id<"journeys">;
  activityType?: ActivityType;
  dateRange?: {
    start: number;
    end: number;
  };
  status?: ProcessingStatus;
}

// ============================================================================
// File Storage Types
// ============================================================================

export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  userId: Id<"users">;
}

export interface StorageResult {
  fileId: Id<"_storage">;
  url: string;
  metadata: FileMetadata;
}
