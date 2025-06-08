import type { Id } from "../_generated/dataModel";
import type { DataModel } from "../_generated/dataModel";

// ============================================================================
// Database Table Names
// ============================================================================

/** All valid table names in the database */
export type TableName = keyof DataModel;

// ============================================================================
// Core Document Types
// ============================================================================

type Schema = DataModel;

/** Utility to extract document type from table name */
type DocumentType<T extends TableName> = Schema[T]["document"] & { _id: Id<T> };

// Core document types
export type User = DocumentType<"users">;
export type Journey = DocumentType<"journeys">;
export type Activity = DocumentType<"activities">;
export type ActivityPoint = DocumentType<"activityPoints">;

// ============================================================================
// Document Types (with IDs) - Using DocumentType utility
// ============================================================================

// All document types are now defined above using DocumentType<T>
// Example: export type User = DocumentType<"users">;

// Remove duplicate type declarations and use the ones from above

// ============================================================================
// Utility Types
// ============================================================================

/** A document with its ID */
export type DocumentWithId<T extends TableName> = DocumentType<T>;

/** Type for document creation (omits system fields) */
export type CreateInput<T extends TableName> = Omit<Schema[T]["document"], "_id" | "_creationTime">;

/** Type for document updates (makes all fields optional and omits system fields) */
export type UpdateInput<T extends TableName> = Partial<CreateInput<T>> & {
  _id: Id<T>;
};

/** Type for document fields that can be updated */
export type UpdatableFields<T extends TableName> = Omit<UpdateInput<T>, "_id">;

// ============================================================================
// Input Types (for mutations)
// ============================================================================

/** Input type for creating a new user */
export type CreateUserInput = CreateInput<"users">;

/** Input type for updating a user */
export type UpdateUserInput = UpdateInput<"users">;

/** Input type for creating a new journey */
export type CreateJourneyInput = Omit<
  CreateInput<"journeys">,
  "createdAt" | "updatedAt" | "lastActivityDate"
>;

/** Input type for updating a journey */
export type UpdateJourneyInput = UpdateInput<"journeys"> & {
  lastActivityDate?: number;
};

/** Input type for creating a new activity */
export type CreateActivityInput = Omit<
  CreateInput<"activities">,
  "createdAt" | "updatedAt" | "processingStatus" | "processingError"
>;

/** Input type for updating an activity */
export type UpdateActivityInput = UpdateInput<"activities"> & {
  processingStatus?: ProcessingStatus;
  processingError?: string;
};

/** Input type for creating activity points */
export type CreateActivityPointInput = Omit<CreateInput<"activityPoints">, "pointIndex">;

// ============================================================================
// Query Result Types
// ============================================================================

/** Journey with its activities */
export type JourneyWithActivities = Journey & {
  activities: Activity[];
  activityCount: number;
};

/** Activity with its points */
export type ActivityWithPoints = Activity & {
  points: ActivityPoint[];
};

// ============================================================================
// Enums and Constants
// ============================================================================

/** Visibility levels for journeys and activities */
export const VisibilityLevel = {
  PRIVATE: "private",
  UNLISTED: "unlisted",
  PUBLIC: "public",
} as const;

export type VisibilityLevel = (typeof VisibilityLevel)[keyof typeof VisibilityLevel];

/** Activity types */
export const ActivityType = {
  HIKING: "hiking",
  RUNNING: "running",
  CYCLING: "cycling",
  WALKING: "walking",
  SWIMMING: "swimming",
  SKIING: "skiing",
  SNOWBOARDING: "snowboarding",
  KAYAKING: "kayaking",
  PADDLING: "paddling",
  OTHER: "other",
} as const;

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

/** Processing status for async operations */
export const ProcessingStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ProcessingStatus = (typeof ProcessingStatus)[keyof typeof ProcessingStatus];

/** Export template categories */
export const ExportTemplateCategory = {
  SOCIAL: "social",
  PRINT: "print",
  CUSTOM: "custom",
} as const;

export type ExportTemplateCategory =
  (typeof ExportTemplateCategory)[keyof typeof ExportTemplateCategory];

// ============================================================================
// Utility Functions
// ============================================================================

/** Type guard to check if a value is a valid table name */
export function isTableName(value: string): value is TableName {
  return [
    "users",
    "journeys",
    "activities",
    "activityPoints",
    "exportTemplates",
    "generatedExports",
  ].includes(value);
}

/** Type guard to check if a document has an ID */
export function hasId<T>(doc: T | { _id: Id<TableName> }): doc is { _id: Id<TableName> } {
  return doc !== null && typeof doc === "object" && "_id" in doc && doc._id !== undefined;
}

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

export const DistanceCalculationMethod = {
  HAVERSINE: "haversine",
  EUCLIDEAN: "euclidean",
} as const;

export type DistanceCalculationMethod =
  (typeof DistanceCalculationMethod)[keyof typeof DistanceCalculationMethod];

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

// ActivityType and ProcessingStatus are now defined in the Enums and Constants section
// Remove these duplicate declarations to use the ones with string literals from the enums

// ============================================================================
// Map and Visualization Types
// ============================================================================

export const MapStyle = {
  LIGHT: "light",
  DARK: "dark",
  OUTDOORS: "outdoors",
  TERRAIN: "terrain",
  SATELLITE: "satellite",
  CUSTOM: "custom",
} as const;

export type MapStyle = (typeof MapStyle)[keyof typeof MapStyle];

export const ColorPalette = {
  DEFAULT: "default",
  VIBRANT: "vibrant",
  PASTEL: "pastel",
  MONOCHROME: "monochrome",
  COLORBLIND_FRIENDLY: "colorblind-friendly",
  CUSTOM: "custom",
} as const;

export type ColorPalette = (typeof ColorPalette)[keyof typeof ColorPalette];

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

export const ExportFormat = {
  PNG: "png",
  JPEG: "jpeg",
  WEBP: "webp",
  SVG: "svg",
  PDF: "pdf",
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

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

// VisibilityLevel is defined in the Enums and Constants section
// Remove this duplicate declaration to use the one with string literals from the enum
// Reuse VisibilityLevel for sharing types
export type ShareType = VisibilityLevel | "password";

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
