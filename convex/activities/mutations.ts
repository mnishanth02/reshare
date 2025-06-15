import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { getCurrentUserOrThrow } from "../users";

// =================================================================
// 1. CREATE PLACEHOLDER
// Called immediately from the client when files are selected.
// =================================================================
export const createPlaceholder = mutation({
  args: {
    journeyId: v.id("journeys"),
    originalFileName: v.string(),
    activityType: v.string(),
  },
  returns: v.id("activities"),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const activityId = await ctx.db.insert("activities", {
      journeyId: args.journeyId,
      userId: user._id,
      name: args.originalFileName.replace(/\.(gpx|tcx|kml|fit)$/i, ""),
      originalFileName: args.originalFileName,
      activityType: args.activityType,
      activityDate: Date.now(),
      processingStatus: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return activityId;
  },
});

// =================================================================
// 2. UPDATE WITH PROCESSED DATA (THE "MONOLITHIC" UPDATE)
// Called from the action after processing is complete - internal only.
// =================================================================
export const saveProcessedActivity = internalMutation({
  args: {
    activityId: v.id("activities"),
    gpxStorageId: v.id("_storage"),
    processedData: v.object({
      name: v.string(),
      geoJson: v.any(), // GeoJSON Feature object
      stats: v.object({
        distance: v.number(),
        duration: v.number(),
        elevationGain: v.number(),
        elevationLoss: v.number(),
        maxElevation: v.number(),
        minElevation: v.number(),
        avgSpeed: v.number(),
        maxSpeed: v.number(),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
        boundingBox: v.object({
          north: v.number(),
          south: v.number(),
          east: v.number(),
          west: v.number(),
        }),
        center: v.object({
          lat: v.number(),
          lng: v.number(),
        }),
      }),
      points: v.array(
        v.object({
          latitude: v.number(),
          longitude: v.number(),
          elevation: v.optional(v.number()),
          timestamp: v.optional(v.number()),
        })
      ),
    }),
  },
  returns: v.id("activities"),
  handler: async (ctx, args) => {
    const { activityId, gpxStorageId, processedData } = args;
    const { geoJson, stats, name, points } = processedData;

    // Validate that the activity exists and is still in processing state
    const activity = await ctx.db.get(activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    // Update the activity with processed data
    await ctx.db.patch(activityId, {
      gpxStorageId: gpxStorageId,
      processedGeoJson: JSON.stringify(geoJson),
      name: name, // Update name from file content if available
      distance: stats.distance,
      duration: stats.duration,
      elevationGain: stats.elevationGain,
      elevationLoss: stats.elevationLoss,
      maxElevation: stats.maxElevation,
      minElevation: stats.minElevation,
      avgSpeed: stats.avgSpeed,
      maxSpeed: stats.maxSpeed,
      boundingBox: stats.boundingBox,
      center: stats.center,
      startTime: stats.startTime,
      endTime: stats.endTime,
      // If the track has a valid start time, use it as the activity date
      activityDate: stats.startTime ?? activity.activityDate ?? Date.now(),
      processingStatus: "completed",
      updatedAt: Date.now(),
    });

    // Store activity points if provided
    if (points && points.length > 0) {
      // Delete existing points if any (for reprocessing scenarios)
      const existingPoints = await ctx.db
        .query("activityPoints")
        .withIndex("by_activity_id", (q) => q.eq("activityId", activityId))
        .collect();

      for (const point of existingPoints) {
        await ctx.db.delete(point._id);
      }

      // Insert new points
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        await ctx.db.insert("activityPoints", {
          activityId,
          pointIndex: i,
          latitude: point.latitude,
          longitude: point.longitude,
          elevation: point.elevation,
          timestamp: point.timestamp,
        });
      }
    }

    // Update journey-level stats in the background
    await ctx.scheduler.runAfter(0, internal.journeys.mutations.recalculateStatistics, {
      journeyId: activity.journeyId,
    });

    return activityId;
  },
});

// =================================================================
// 3. FAIL PROCESSING (PUBLIC WRAPPER)
// Public wrapper for failProcessing to be called from client
// =================================================================
export const markProcessingFailed = mutation({
  args: {
    activityId: v.id("activities"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get current user to ensure they can update this activity
    const user = await getCurrentUserOrThrow(ctx);

    // Check if the user owns this activity
    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== user._id) {
      throw new Error("Activity not found or access denied");
    }

    await ctx.db.patch(args.activityId, {
      processingStatus: "failed",
      processingError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// =================================================================
// 4. FAIL PROCESSING (INTERNAL)
// Called from server-side actions if any step in the process fails.
// =================================================================
export const failProcessing = internalMutation({
  args: {
    activityId: v.id("activities"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.activityId, {
      processingStatus: "failed",
      processingError: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// =================================================================
// 5. GET ACTIVITIES (REACTIVE QUERY)
// The UI component will use this to get a live-updating list.
// =================================================================
export const getActivitiesByJourney = query({
  args: { journeyId: v.id("journeys") },
  returns: v.array(v.any()), // Activity documents from DB
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
      .order("desc")
      .collect();
  },
});

// Delete activity
export const deleteActivity = mutation({
  args: { activityId: v.id("activities") },
  returns: v.id("activities"),
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    // Delete activity points
    const points = await ctx.db
      .query("activityPoints")
      .withIndex("by_activity_id", (q) => q.eq("activityId", args.activityId))
      .collect();

    for (const point of points) {
      await ctx.db.delete(point._id);
    }

    // Delete the activity
    await ctx.db.delete(args.activityId);

    // Update journey stats
    await ctx.scheduler.runAfter(0, internal.journeys.mutations.recalculateStatistics, {
      journeyId: activity.journeyId,
    });

    return args.activityId;
  },
});
