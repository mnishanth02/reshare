import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    // Clerk integration
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),

    // User preferences
    defaultMapStyle: v.optional(v.string()),
    defaultColorPalette: v.optional(v.string()),
    defaultPrivacy: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // Journeys table
  journeys: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),

    // Journey settings
    visibility: v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
    defaultMapStyle: v.optional(v.string()),
    defaultColorPalette: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),

    // Journey metadata
    totalDistance: v.optional(v.number()),
    totalElevationGain: v.optional(v.number()),
    totalDuration: v.optional(v.number()),
    activityCount: v.optional(v.number()),

    // Status
    status: v.union(v.literal("active"), v.literal("archived")),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityDate: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_visibility", ["visibility"])
    .index("by_created_at", ["createdAt"])
    .index("by_updated_at", ["updatedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: [
        "userId",
        "status",
        "defaultActivityType",
        "visibility",
        "createdAt",
        "updatedAt",
        "lastActivityDate",
      ],
    }),

  // Activities table
  activities: defineTable({
    journeyId: v.id("journeys"),
    userId: v.id("users"),

    // Activity metadata
    name: v.string(),
    description: v.optional(v.string()),
    activityType: v.string(), // hiking, running, cycling, etc.

    // GPX data
    originalFileName: v.string(),
    gpxFileId: v.id("_storage"),
    processedGeoJson: v.optional(v.string()), // Stringified GeoJSON

    // Activity statistics
    distance: v.optional(v.number()), // in meters
    duration: v.optional(v.number()), // in seconds
    elevationGain: v.optional(v.number()), // in meters
    elevationLoss: v.optional(v.number()), // in meters
    maxElevation: v.optional(v.number()),
    minElevation: v.optional(v.number()),
    avgSpeed: v.optional(v.number()), // m/s
    maxSpeed: v.optional(v.number()), // m/s
    avgPace: v.optional(v.number()), // seconds per km
    estimatedCalories: v.optional(v.number()),

    // Visual properties
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    opacity: v.optional(v.number()),

    // Route bounds
    boundingBox: v.optional(
      v.object({
        north: v.number(),
        south: v.number(),
        east: v.number(),
        west: v.number(),
      })
    ),

    // Center point
    centerLat: v.optional(v.number()),
    centerLng: v.optional(v.number()),

    // Timestamps and dates
    activityDate: v.number(), // Date from GPX or user input
    createdAt: v.number(),
    updatedAt: v.number(),

    // Processing status
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processingError: v.optional(v.string()),
  })
    .index("by_journey_id", ["journeyId"])
    .index("by_user_id", ["userId"])
    .index("by_activity_date", ["activityDate"])
    .index("by_processing_status", ["processingStatus"])
    .index("by_journey_date", ["journeyId", "activityDate"]),

  // Activity points table (for detailed route data)
  activityPoints: defineTable({
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
  })
    .index("by_activity_id", ["activityId"])
    .index("by_activity_point", ["activityId", "pointIndex"]),

  // Export templates table
  exportTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // social, print, custom

    // Template configuration
    config: v.string(), // Stringified JSON configuration
    previewImageId: v.optional(v.id("_storage")),

    // Template metadata
    isPublic: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"]),

  // Generated exports table
  generatedExports: defineTable({
    userId: v.id("users"),
    journeyId: v.id("journeys"),
    activityIds: v.array(v.id("activities")),

    // Export metadata
    exportType: v.string(), // image, pdf, svg
    format: v.string(), // png, jpeg, webp, pdf, svg
    resolution: v.string(), // 1x, 2x, 3x, etc.
    dimensions: v.object({
      width: v.number(),
      height: v.number(),
    }),

    // Template and styling
    templateId: v.optional(v.id("exportTemplates")),
    customConfig: v.optional(v.string()), // Stringified JSON

    // Generated file
    fileId: v.id("_storage"),
    fileSize: v.optional(v.number()),

    // Processing status
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_journey_id", ["journeyId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // AI analysis results
  aiAnalysis: defineTable({
    userId: v.id("users"),
    targetId: v.string(), // Can be journeyId or activityId
    targetType: v.union(v.literal("journey"), v.literal("activity")),

    // Analysis type and results
    analysisType: v.string(), // route_analysis, difficulty_assessment, poi_detection, etc.
    results: v.string(), // Stringified JSON results
    confidence: v.optional(v.number()),

    // AI model information
    model: v.string(),
    version: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // For caching
  })
    .index("by_target", ["targetId", "targetType"])
    .index("by_analysis_type", ["analysisType"])
    .index("by_user_id", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // User sessions for tracking active editing sessions
  userSessions: defineTable({
    userId: v.id("users"),
    journeyId: v.optional(v.id("journeys")),

    // Session data
    sessionId: v.string(),
    lastActivity: v.number(),
    currentView: v.optional(v.string()), // dashboard, journey, editor

    // Editor state (if applicable)
    editorState: v.optional(v.string()), // Stringified JSON

    // Device information
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_session_id", ["sessionId"])
    .index("by_last_activity", ["lastActivity"]),

  // System logs for monitoring
  systemLogs: defineTable({
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    category: v.string(), // gpx_processing, ai_analysis, export_generation, etc.
    message: v.string(),

    // Context data
    userId: v.optional(v.id("users")),
    journeyId: v.optional(v.id("journeys")),
    activityId: v.optional(v.id("activities")),

    // Additional metadata
    metadata: v.optional(v.string()), // Stringified JSON
    stack: v.optional(v.string()),

    // Timestamps
    timestamp: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_id", ["userId"]),
});
