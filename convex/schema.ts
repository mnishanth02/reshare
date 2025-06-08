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
    gpxStorageId: v.optional(v.id("_storage")),
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
    center: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),

    // Timestamps and dates
    activityDate: v.number(), // Date from GPX or user input
    startTime: v.optional(v.number()), // ms timestamp
    endTime: v.optional(v.number()), // ms timestamp

    createdAt: v.number(),
    updatedAt: v.number(),

    // Processing status
    processingStatus: v.union(
      v.literal("pending"), // Waiting to be processed
      v.literal("uploading"), // Placeholder created, file is uploading
      v.literal("processing"), // File uploaded, worker is parsing
      v.literal("completed"), // All data is present and saved
      v.literal("failed") // An error occurred
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
});
