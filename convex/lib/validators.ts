import { v } from "convex/values";

// ============================================================================
// Journey Validators
// ============================================================================

export const createJourneyValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  visibility: v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
  defaultMapStyle: v.optional(v.string()),
  defaultColorPalette: v.optional(v.string()),
  defaultActivityType: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
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
  status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
});

export const duplicateJourneyValidator = v.object({
  journeyId: v.id("journeys"),
  newTitle: v.string(),
  includeActivities: v.optional(v.boolean()),
});

export const bulkJourneyActionValidator = v.object({
  journeyIds: v.array(v.id("journeys")),
});

// ============================================================================
// Activity Validators
// ============================================================================

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

export const processGPXValidator = v.object({
  journeyId: v.id("journeys"),
  gpxFileId: v.id("_storage"),
  name: v.optional(v.string()),
  activityType: v.optional(v.string()),
  customColor: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const batchUploadValidator = v.object({
  journeyId: v.id("journeys"),
  uploads: v.array(
    v.object({
      gpxFileId: v.id("_storage"),
      name: v.optional(v.string()),
      activityType: v.optional(v.string()),
      customColor: v.optional(v.string()),
    })
  ),
});

export const trimActivityValidator = v.object({
  activityId: v.id("activities"),
  startIndex: v.number(),
  endIndex: v.number(),
});

export const splitActivityValidator = v.object({
  activityId: v.id("activities"),
  splitIndex: v.number(),
  newActivityName: v.string(),
});

export const mergeActivitiesValidator = v.object({
  activityIds: v.array(v.id("activities")),
  mergedName: v.string(),
  keepOriginals: v.optional(v.boolean()),
});

// ============================================================================
// User Validators
// ============================================================================

export const upsertUserValidator = v.object({
  clerkId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
});

export const updateUserPreferencesValidator = v.object({
  defaultMapStyle: v.optional(v.string()),
  defaultColorPalette: v.optional(v.string()),
  defaultPrivacy: v.optional(
    v.union(v.literal("private"), v.literal("unlisted"), v.literal("public"))
  ),
  defaultActivityType: v.optional(v.string()),
});

// ============================================================================
// Export Validators
// ============================================================================

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

export const createTemplateValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  category: v.string(),
  config: v.string(),
  isPublic: v.optional(v.boolean()),
});

export const updateTemplateValidator = v.object({
  templateId: v.id("exportTemplates"),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  config: v.optional(v.string()),
  isPublic: v.optional(v.boolean()),
});

// ============================================================================
// Search and Filter Validators
// ============================================================================

export const searchJourneysValidator = v.object({
  query: v.optional(v.string()),
  status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  activityType: v.optional(v.string()),
  dateRange: v.optional(
    v.object({
      start: v.number(),
      end: v.number(),
    })
  ),
  sortBy: v.optional(
    v.union(v.literal("created"), v.literal("updated"), v.literal("title"), v.literal("distance"))
  ),
  sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

export const searchActivitiesValidator = v.object({
  journeyId: v.id("journeys"),
  query: v.optional(v.string()),
  activityType: v.optional(v.string()),
  dateRange: v.optional(
    v.object({
      start: v.number(),
      end: v.number(),
    })
  ),
  sortBy: v.optional(
    v.union(v.literal("date"), v.literal("distance"), v.literal("name"), v.literal("type"))
  ),
  sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  minDistance: v.optional(v.number()),
  maxDistance: v.optional(v.number()),
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

// ============================================================================
// AI Analysis Validators
// ============================================================================

export const requestAIAnalysisValidator = v.object({
  targetId: v.string(),
  targetType: v.union(v.literal("journey"), v.literal("activity")),
  analysisType: v.string(),
  options: v.optional(
    v.object({
      includeInsights: v.optional(v.boolean()),
      includeSuggestions: v.optional(v.boolean()),
      detailLevel: v.optional(
        v.union(v.literal("basic"), v.literal("detailed"), v.literal("comprehensive"))
      ),
    })
  ),
});

// ============================================================================
// File Upload Validators
// ============================================================================

export const generateUploadUrlValidator = v.object({
  fileType: v.string(),
  fileName: v.string(),
  fileSize: v.number(),
});

// ============================================================================
// Session Validators
// ============================================================================

export const updateSessionValidator = v.object({
  sessionId: v.string(),
  journeyId: v.optional(v.id("journeys")),
  currentView: v.optional(v.string()),
  editorState: v.optional(v.string()),
});

// ============================================================================
// System Log Validators
// ============================================================================

export const createLogValidator = v.object({
  level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
  category: v.string(),
  message: v.string(),
  userId: v.optional(v.id("users")),
  journeyId: v.optional(v.id("journeys")),
  activityId: v.optional(v.id("activities")),
  metadata: v.optional(v.string()),
  stack: v.optional(v.string()),
});

// ============================================================================
// Pagination Validators
// ============================================================================

export const paginationValidator = v.object({
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

// ============================================================================
// Common ID Validators
// ============================================================================

export const userIdValidator = v.object({
  userId: v.id("users"),
});

export const journeyIdValidator = v.object({
  journeyId: v.id("journeys"),
});

export const activityIdValidator = v.object({
  activityId: v.id("activities"),
});

export const templateIdValidator = v.object({
  templateId: v.id("exportTemplates"),
});

export const exportIdValidator = v.object({
  exportId: v.id("generatedExports"),
});

// ============================================================================
// Utility Validators
// ============================================================================

export const clerkIdValidator = v.object({
  clerkId: v.string(),
});

export const fileIdValidator = v.object({
  fileId: v.id("_storage"),
});

export const dateRangeValidator = v.object({
  start: v.number(),
  end: v.number(),
});

export const coordinatesValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

export const boundingBoxValidator = v.object({
  north: v.number(),
  south: v.number(),
  east: v.number(),
  west: v.number(),
});

// ============================================================================
// Complex Validators
// ============================================================================

export const activityPointValidator = v.object({
  activityId: v.id("activities"),
  pointIndex: v.number(),
  latitude: v.number(),
  longitude: v.number(),
  elevation: v.optional(v.number()),
  timestamp: v.optional(v.number()),
  speed: v.optional(v.number()),
  heartRate: v.optional(v.number()),
  cadence: v.optional(v.number()),
  power: v.optional(v.number()),
  temperature: v.optional(v.number()),
});

export const batchActivityPointsValidator = v.object({
  activityId: v.id("activities"),
  points: v.array(
    v.object({
      pointIndex: v.number(),
      latitude: v.number(),
      longitude: v.number(),
      elevation: v.optional(v.number()),
      timestamp: v.optional(v.number()),
      speed: v.optional(v.number()),
      heartRate: v.optional(v.number()),
      cadence: v.optional(v.number()),
      power: v.optional(v.number()),
      temperature: v.optional(v.number()),
    })
  ),
});

export const updateActivityStatsValidator = v.object({
  activityId: v.id("activities"),
  distance: v.optional(v.number()),
  duration: v.optional(v.number()),
  elevationGain: v.optional(v.number()),
  elevationLoss: v.optional(v.number()),
  maxElevation: v.optional(v.number()),
  minElevation: v.optional(v.number()),
  avgSpeed: v.optional(v.number()),
  maxSpeed: v.optional(v.number()),
  avgPace: v.optional(v.number()),
  estimatedCalories: v.optional(v.number()),
  boundingBox: v.optional(boundingBoxValidator),
  centerLat: v.optional(v.number()),
  centerLng: v.optional(v.number()),
});
