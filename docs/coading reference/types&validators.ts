
import { Doc, Id } from "./_generated/dataModel";

// Journey types
export type Journey = Doc<"journeys">;
export type JourneyWithActivities = Journey & {
  activities: Activity[];
  activityCount: number;
};

// Activity types
export type Activity = Doc<"activities">;
export type ActivityWithPoints = Activity & {
  points: ActivityPoint[];
};

export type ActivityPoint = Doc<"activityPoints">;

// User types
export type User = Doc<"users">;

// Export types
export type ExportTemplate = Doc<"exportTemplates">;
export type GeneratedExport = Doc<"generatedExports">;

// Processing status types
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

// GPX processing types
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

export interface GPXPoint {
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

// Export configuration types
export interface ExportConfig {
  mapStyle: string;
  showActivities: Id<"activities">[];
  dimensions: {
    width: number;
    height: number;
  };
  dpi: number;
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf';
  layers: ExportLayer[];
}

export interface ExportLayer {
  type: 'text' | 'image' | 'shape' | 'chart';
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
  data: Record<string, any>;
}

// AI analysis types
export interface RouteAnalysis {
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  terrainType: string[];
  pointsOfInterest: PointOfInterest[];
  recommendations: string[];
  estimatedTime: number;
  technicalRating: number;
}

export interface PointOfInterest {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
  confidence: number;
}

// Search and filter types
export interface JourneyFilters {
  status?: 'active' | 'archived';
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

// Pagination types
export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}



// version 2

// convex/types.ts - Comprehensive type definitions for ReShare application
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// Core Entity Types
// ============================================================================

export type User = Doc<"users">;
export type Journey = Doc<"journeys">;
export type Activity = Doc<"activities">;
export type Template = Doc<"templates">;
export type Export = Doc<"exports">;
export type AIAnalysis = Doc<"aiAnalysis">;
export type Share = Doc<"shares">;
export type Comment = Doc<"comments">;
export type BackgroundJob = Doc<"backgroundJobs">;
export type Notification = Doc<"notifications">;

// ============================================================================
// GPX and Geospatial Types
// ============================================================================

export interface GPXPoint {
  lat: number;
  lng: number;
  elevation?: number;
  time?: number;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
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
  lat: number;
  lng: number;
  name?: string;
  description?: string;
  elevation?: number;
  time?: number;
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
  duration?: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  averageSpeed?: number;
  maxSpeed?: number;
  calories?: number;
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

export type MapStyle = 
  | "light"
  | "dark"
  | "outdoors"
  | "terrain"
  | "satellite"
  | "custom";

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
  properties: Record<string, any>;
  position: LayerPosition;
  style: Record<string, any>;
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
  data: Record<string, any>;
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
// Background Job Types
// ============================================================================

export type JobType = 
  | "gpx_processing"
  | "image_generation"
  | "ai_analysis"
  | "cleanup"
  | "export";

export type JobStatus = 
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export interface JobData {
  type: JobType;
  entityId?: string;
  userId?: Id<"users">;
  priority: number;
  data: Record<string, any>;
  maxAttempts: number;
}

// ============================================================================
// API and Validation Types
// ============================================================================

export interface APIResponse<TData = any> {
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

export interface PaginatedResponse<TData> {
  data: TData[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, any>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  referrer?: string;
  timestamp: number;
}

export interface UsageStats {
  totalJourneys: number;
  totalActivities: number;
  totalDistance: number;
  totalExports: number;
  averageActivitiesPerJourney: number;
  mostUsedActivityType: ActivityType;
  favoriteMapStyle: MapStyle;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ConvexError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
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
// Rate Limiting Types
// ============================================================================

export interface RateLimit {
  requests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
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

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  signature?: string;
}

// ============================================================================
// Integration Types
// ============================================================================

export interface IntegrationConfig {
  provider: string;
  apiKey?: string;
  settings: Record<string, any>;
  isActive: boolean;
}

export interface WeatherProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
  rateLimit: RateLimit;
}





// ## 3. Input Validators (lib/validators.ts)

import { v } from "convex/values";

// Journey validators
export const createJourneyValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  visibility: v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
  defaultMapStyle: v.optional(v.string()),
  defaultColorPalette: v.optional(v.string()),
  defaultActivityType: v.optional(v.string()),
});

export const updateJourneyValidator = v.object({
  journeyId: v.id("journeys"),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  visibility: v.optional(v.union(v.literal("private"), v.literal("unlisted"), v.literal("public"))),
  defaultMapStyle: v.optional(v.string()),
  defaultColorPalette: v.optional(v.string()),
  defaultActivityType: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
});

// Activity validators
export const createActivityValidator = v.object({
  journeyId: v.id("journeys"),
  name: v.string(),
  description: v.optional(v.string()),
  activityType: v.string(),
  gpxFileId: v.id("_storage"),
  originalFileName: v.string(),
  activityDate: v.optional(v.number()),
  color: v.optional(v.string()),
});

export const updateActivityValidator = v.object({
  activityId: v.id("activities"),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  activityType: v.optional(v.string()),
  color: v.optional(v.string()),
  strokeWidth: v.optional(v.number()),
  opacity: v.optional(v.number()),
});

// GPX processing validators
export const processGPXValidator = v.object({
  fileId: v.id("_storage"),
  fileName: v.string(),
  journeyId: v.id("journeys"),
  activityName: v.optional(v.string()),
  activityType: v.optional(v.string()),
  customActivityDate: v.optional(v.number()),
});

// Export validators
export const createExportValidator = v.object({
  journeyId: v.id("journeys"),
  activityIds: v.array(v.id("activities")),
  exportType: v.string(),
  format: v.string(),
  resolution: v.string(),
  dimensions: v.object({
    width: v.number(),
    height: v.number(),
  }),
  templateId: v.optional(v.id("exportTemplates")),
  customConfig: v.optional(v.string()),
});

// Search validators
export const searchJourneysValidator = v.object({
  query: v.optional(v.string()),
  status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  activityType: v.optional(v.string()),
  dateRange: v.optional(v.object({
    start: v.number(),
    end: v.number(),
  })),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

export const searchActivitiesValidator = v.object({
  journeyId: v.id("journeys"),
  query: v.optional(v.string()),
  activityType: v.optional(v.string()),
  dateRange: v.optional(v.object({
    start: v.number(),
    end: v.number(),
  })),
  minDistance: v.optional(v.number()),
  maxDistance: v.optional(v.number()),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});