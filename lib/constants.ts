// ============================================================================
// Database Constants
// ============================================================================

export const TABLE_NAMES = {
  USERS: "users",
  JOURNEYS: "journeys",
  ACTIVITIES: "activities",
  ACTIVITY_POINTS: "activityPoints",
  EXPORT_TEMPLATES: "exportTemplates",
  GENERATED_EXPORTS: "generatedExports",
  AI_ANALYSIS: "aiAnalysis",
  USER_SESSIONS: "userSessions",
  SYSTEM_LOGS: "systemLogs",
} as const;

// ============================================================================
// Activity Type Constants
// ============================================================================

export const ACTIVITY_TYPES = {
  HIKING: "hiking",
  RUNNING: "running",
  CYCLING: "cycling",
  WALKING: "walking",
  SKIING: "skiing",
  SNOWBOARDING: "snowboarding",
  CLIMBING: "climbing",
  KAYAKING: "kayaking",
  SAILING: "sailing",
  MOTORCYCLE: "motorcycle",
  DRIVING: "driving",
  OTHER: "other",
} as const;

export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPES.HIKING]: "Hiking",
  [ACTIVITY_TYPES.RUNNING]: "Running",
  [ACTIVITY_TYPES.CYCLING]: "Cycling",
  [ACTIVITY_TYPES.WALKING]: "Walking",
  [ACTIVITY_TYPES.SKIING]: "Skiing",
  [ACTIVITY_TYPES.SNOWBOARDING]: "Snowboarding",
  [ACTIVITY_TYPES.CLIMBING]: "Climbing",
  [ACTIVITY_TYPES.KAYAKING]: "Kayaking",
  [ACTIVITY_TYPES.SAILING]: "Sailing",
  [ACTIVITY_TYPES.MOTORCYCLE]: "Motorcycle",
  [ACTIVITY_TYPES.DRIVING]: "Driving",
  [ACTIVITY_TYPES.OTHER]: "Other",
} as const;

// ============================================================================
// Map Style Constants
// ============================================================================

export const MAP_STYLES = {
  LIGHT: "light",
  DARK: "dark",
  OUTDOORS: "outdoors",
  TERRAIN: "terrain",
  SATELLITE: "satellite",
  CUSTOM: "custom",
} as const;

export const MAP_STYLE_LABELS = {
  [MAP_STYLES.LIGHT]: "Light",
  [MAP_STYLES.DARK]: "Dark",
  [MAP_STYLES.OUTDOORS]: "Outdoors",
  [MAP_STYLES.TERRAIN]: "Terrain",
  [MAP_STYLES.SATELLITE]: "Satellite",
  [MAP_STYLES.CUSTOM]: "Custom",
} as const;

// ============================================================================
// Color Palette Constants
// ============================================================================

export const COLOR_PALETTES = {
  DEFAULT: "default",
  VIBRANT: "vibrant",
  PASTEL: "pastel",
  MONOCHROME: "monochrome",
  COLORBLIND_FRIENDLY: "colorblind-friendly",
  NATURE: "nature",
  SUNSET: "sunset",
  OCEAN: "ocean",
  CUSTOM: "custom",
} as const;

export const COLOR_PALETTE_COLORS = {
  [COLOR_PALETTES.DEFAULT]: [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#84CC16", // Lime
  ],
  [COLOR_PALETTES.VIBRANT]: [
    "#FF6B6B", // Coral
    "#4ECDC4", // Turquoise
    "#45B7D1", // Sky Blue
    "#96CEB4", // Mint
    "#FFEAA7", // Light Yellow
    "#DDA0DD", // Plum
    "#98D8C8", // Seafoam
    "#F7DC6F", // Banana
  ],
  [COLOR_PALETTES.PASTEL]: [
    "#FFB3BA", // Light Pink
    "#BAFFC9", // Light Green
    "#BAE1FF", // Light Blue
    "#FFFFBA", // Light Yellow
    "#FFD1DC", // Light Rose
    "#E0BBE4", // Light Purple
    "#C7CEEA", // Light Lavender
    "#FFDAB9", // Peach
  ],
  [COLOR_PALETTES.MONOCHROME]: [
    "#1F2937", // Dark Gray
    "#374151", // Gray 700
    "#4B5563", // Gray 600
    "#6B7280", // Gray 500
    "#9CA3AF", // Gray 400
    "#D1D5DB", // Gray 300
    "#E5E7EB", // Gray 200
    "#F3F4F6", // Gray 100
  ],
  [COLOR_PALETTES.COLORBLIND_FRIENDLY]: [
    "#1f77b4", // Blue
    "#ff7f0e", // Orange
    "#2ca02c", // Green
    "#d62728", // Red
    "#9467bd", // Purple
    "#8c564b", // Brown
    "#e377c2", // Pink
    "#7f7f7f", // Gray
  ],
  [COLOR_PALETTES.NATURE]: [
    "#2E8B57", // Sea Green
    "#8FBC8F", // Dark Sea Green
    "#228B22", // Forest Green
    "#32CD32", // Lime Green
    "#9ACD32", // Yellow Green
    "#6B8E23", // Olive Drab
    "#556B2F", // Dark Olive Green
    "#8B4513", // Saddle Brown
  ],
  [COLOR_PALETTES.SUNSET]: [
    "#FF6B35", // Orange Red
    "#F7931E", // Orange
    "#FFD23F", // Gold
    "#EE4B2B", // Red
    "#C21807", // Dark Red
    "#8B0000", // Dark Red
    "#FF69B4", // Hot Pink
    "#DA70D6", // Orchid
  ],
  [COLOR_PALETTES.OCEAN]: [
    "#006994", // Deep Blue
    "#0085C3", // Blue
    "#00A8CC", // Light Blue
    "#7FCDCD", // Aqua
    "#B8E6B8", // Light Green
    "#40E0D0", // Turquoise
    "#48CAE4", // Sky Blue
    "#023047", // Dark Blue
  ],
} as const;

// ============================================================================
// Visibility and Privacy Constants
// ============================================================================

export const VISIBILITY_LEVELS = {
  PUBLIC: "public",
  UNLISTED: "unlisted",
  PRIVATE: "private",
} as const;

export const VISIBILITY_LABELS = {
  [VISIBILITY_LEVELS.PUBLIC]: "Public",
  [VISIBILITY_LEVELS.UNLISTED]: "Unlisted",
  [VISIBILITY_LEVELS.PRIVATE]: "Private",
} as const;

export const VISIBILITY_DESCRIPTIONS = {
  [VISIBILITY_LEVELS.PUBLIC]: "Anyone can find and view this journey",
  [VISIBILITY_LEVELS.UNLISTED]: "Only people with the link can view this journey",
  [VISIBILITY_LEVELS.PRIVATE]: "Only you can view this journey",
} as const;

// ============================================================================
// Processing Status Constants
// ============================================================================

export const PROCESSING_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const PROCESSING_STATUS_LABELS = {
  [PROCESSING_STATUS.PENDING]: "Pending",
  [PROCESSING_STATUS.PROCESSING]: "Processing",
  [PROCESSING_STATUS.COMPLETED]: "Completed",
  [PROCESSING_STATUS.FAILED]: "Failed",
} as const;

// ============================================================================
// Export Format Constants
// ============================================================================

export const EXPORT_FORMATS = {
  PNG: "png",
  JPEG: "jpeg",
  WEBP: "webp",
  SVG: "svg",
  PDF: "pdf",
} as const;

export const EXPORT_FORMAT_LABELS = {
  [EXPORT_FORMATS.PNG]: "PNG",
  [EXPORT_FORMATS.JPEG]: "JPEG",
  [EXPORT_FORMATS.WEBP]: "WebP",
  [EXPORT_FORMATS.SVG]: "SVG",
  [EXPORT_FORMATS.PDF]: "PDF",
} as const;

export const EXPORT_QUALITY_PRESETS = {
  LOW: { quality: 0.6, dpi: 72 },
  MEDIUM: { quality: 0.8, dpi: 150 },
  HIGH: { quality: 0.9, dpi: 300 },
  ULTRA: { quality: 1.0, dpi: 600 },
} as const;

// ============================================================================
// AI Analysis Constants
// ============================================================================

export const AI_ANALYSIS_TYPES = {
  ROUTE_CATEGORIZATION: "route_categorization",
  DIFFICULTY_ASSESSMENT: "difficulty_assessment",
  POI_IDENTIFICATION: "poi_identification",
  PERFORMANCE_INSIGHTS: "performance_insights",
  CONTENT_GENERATION: "content_generation",
} as const;

export const AI_ANALYSIS_LABELS = {
  [AI_ANALYSIS_TYPES.ROUTE_CATEGORIZATION]: "Route Categorization",
  [AI_ANALYSIS_TYPES.DIFFICULTY_ASSESSMENT]: "Difficulty Assessment",
  [AI_ANALYSIS_TYPES.POI_IDENTIFICATION]: "Points of Interest",
  [AI_ANALYSIS_TYPES.PERFORMANCE_INSIGHTS]: "Performance Insights",
  [AI_ANALYSIS_TYPES.CONTENT_GENERATION]: "Content Generation",
} as const;

// ============================================================================
// File and Upload Constants
// ============================================================================

export const SUPPORTED_FILE_TYPES = {
  GPX: "application/gpx+xml",
  TCX: "application/tcx+xml",
  FIT: "application/fit",
  KML: "application/vnd.google-earth.kml+xml",
  KMZ: "application/vnd.google-earth.kmz",
} as const;

export const MAX_FILE_SIZE = {
  GPX: 50 * 1024 * 1024, // 50MB
  IMAGE: 10 * 1024 * 1024, // 10MB
  EXPORT: 100 * 1024 * 1024, // 100MB
} as const;

export const FILE_EXTENSIONS = {
  GPX: [".gpx"],
  TCX: [".tcx"],
  FIT: [".fit"],
  KML: [".kml"],
  KMZ: [".kmz"],
  IMAGE: [".jpg", ".jpeg", ".png", ".webp"],
} as const;

// ============================================================================
// Geospatial Constants
// ============================================================================

export const EARTH_RADIUS = {
  KM: 6371,
  MILES: 3959,
  METERS: 6371000,
} as const;

export const COORDINATE_PRECISION = {
  HIGH: 6, // ~0.1 meters
  MEDIUM: 5, // ~1 meter
  LOW: 4, // ~10 meters
} as const;

export const DEFAULT_SIMPLIFICATION = {
  TOLERANCE: 0.0001, // ~11 meters
  MAX_POINTS: 1000,
  MIN_POINTS: 10,
} as const;

// ============================================================================
// Units and Measurements
// ============================================================================

export const UNITS = {
  METRIC: "metric",
  IMPERIAL: "imperial",
} as const;

export const DISTANCE_UNITS = {
  KILOMETERS: "km",
  MILES: "miles",
  METERS: "m",
  FEET: "ft",
} as const;

export const SPEED_UNITS = {
  KMH: "km/h",
  MPH: "mph",
  MS: "m/s",
} as const;

export const PACE_UNITS = {
  MIN_KM: "min/km",
  MIN_MILE: "min/mile",
} as const;

// ============================================================================
// Subscription and Limits
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export const PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.FREE]: {
    maxJourneys: 5,
    maxActivitiesPerJourney: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxExportsPerMonth: 10,
    aiAnalysisPerMonth: 5,
  },
  [SUBSCRIPTION_PLANS.PRO]: {
    maxJourneys: 100,
    maxActivitiesPerJourney: 100,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxExportsPerMonth: 100,
    aiAnalysisPerMonth: 50,
  },
  [SUBSCRIPTION_PLANS.ENTERPRISE]: {
    maxJourneys: -1, // Unlimited
    maxActivitiesPerJourney: -1, // Unlimited
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxExportsPerMonth: -1, // Unlimited
    aiAnalysisPerMonth: -1, // Unlimited
  },
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // File Processing
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE",
  FILE_PROCESSING_FAILED: "FILE_PROCESSING_FAILED",

  // Database
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  DUPLICATE_RECORD: "DUPLICATE_RECORD",
  DATABASE_ERROR: "DATABASE_ERROR",

  // Limits
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // External Services
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  EXPORT_SERVICE_ERROR: "EXPORT_SERVICE_ERROR",

  // General
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

// ============================================================================
// Cache and Performance
// ============================================================================

export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURE_FLAGS = {
  AI_ANALYSIS: "ai_analysis",
  ADVANCED_EXPORTS: "advanced_exports",
  COLLABORATION: "collaboration",
  REAL_TIME_TRACKING: "real_time_tracking",
  SOCIAL_FEATURES: "social_features",
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  MAP_STYLE: MAP_STYLES.OUTDOORS,
  COLOR_PALETTE: COLOR_PALETTES.DEFAULT,
  VISIBILITY: VISIBILITY_LEVELS.PRIVATE,
  ACTIVITY_TYPE: ACTIVITY_TYPES.HIKING,
  UNITS: UNITS.METRIC,
  EXPORT_FORMAT: EXPORT_FORMATS.PNG,
  EXPORT_QUALITY: "HIGH",
  TIMEZONE: "UTC",
} as const;

// ============================================================================
// Regular Expressions
// ============================================================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  COORDINATES: /^-?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
} as const;
