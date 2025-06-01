// ============================================================================
// Core Library Exports
// ============================================================================

// Types
export type * from "./types";

// Validators
export * from "./validators";

// Utilities
export * from "./utils";

// Constants
export * from "../../lib/constants";

// Re-export commonly used types for convenience
export type {
  ActivityPoint,
  ActivityStats,
  BoundingBox,
  Coordinates,
  GPXData,
  GPXPoint,
  GPXTrack,
  GPXSegment,
  GPXWaypoint,
  ProcessedGPXData,
  ElevationProfile,
  SpeedProfile,
  ActivitySummary,
  RouteSimplificationOptions,
  DistanceCalculationMethod,
} from "./types";

// Re-export commonly used constants
export {
  ACTIVITY_TYPES,
  MAP_STYLES,
  COLOR_PALETTES,
  VISIBILITY_LEVELS,
  PROCESSING_STATUS,
  EXPORT_FORMATS,
  AI_ANALYSIS_TYPES,
  EARTH_RADIUS,
  DEFAULT_SIMPLIFICATION,
  DEFAULTS,
} from "../../lib/constants";

// Re-export commonly used utilities
export {
  calculateDistance,
  calculateRouteDistance,
  calculateBoundingBox,
  calculateCenter,
  simplifyRoute,
  calculateElevationStats,
  generateElevationProfile,
  calculateSpeed,
  calculateAverageSpeed,
  generateSpeedProfile,
  calculateActivityStats,
  extractActivityPoints,
  generateActivitySummary,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatPace,
  generateActivityColor,
  isValidCoordinate,
  clamp,
  generateSlug,
  deepClone,
  debounce,
  throttle,
} from "./utils";

// Re-export commonly used validators
export {
  createJourneyValidator,
  updateJourneyValidator,
  createActivityValidator,
  updateActivityValidator,
  processGPXValidator,
  searchJourneysValidator,
  searchActivitiesValidator,
  createExportValidator,
  requestAIAnalysisValidator,
  paginationValidator,
  journeyIdValidator,
  activityIdValidator,
  userIdValidator,
} from "./validators";
