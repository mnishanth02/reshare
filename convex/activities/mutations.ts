import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
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
// Called from the client hook after both upload and worker are done.
// =================================================================
export const saveProcessedActivity = mutation({
  args: {
    activityId: v.id("activities"),
    gpxStorageId: v.id("_storage"),
    processedData: v.object({
      name: v.string(),
      geoJson: v.any(), // GeoJSON is a complex object, v.any() is easiest
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
    }),
  },
  handler: async (ctx, args) => {
    const { activityId, gpxStorageId, processedData } = args;
    const { geoJson, stats, name } = processedData;

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
      activityDate: stats.startTime ?? (await ctx.db.get(activityId))?.activityDate ?? Date.now(),
      processingStatus: "completed",
      updatedAt: Date.now(),
    });

    // Update journey-level stats in the background
    const activity = await ctx.db.get(activityId);
    if (activity) {
      await ctx.scheduler.runAfter(0, internal.journeys.mutations.recalculateStatistics, {
        journeyId: activity.journeyId,
      });
    }

    return activityId;
  },
});

// =================================================================
// 3. MARK AS FAILED
// Called from the client if any step in the process fails.
// =================================================================
export const failProcessing = mutation({
  args: {
    activityId: v.id("activities"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.activityId, {
      processingStatus: "failed",
      processingError: args.error,
      updatedAt: Date.now(),
    });
  },
});

// =================================================================
// 4. GET ACTIVITIES (REACTIVE QUERY)
// The UI component will use this to get a live-updating list.
// =================================================================
export const getActivitiesByJourney = query({
  args: { journeyId: v.id("journeys") },
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
    ctx.runMutation(internal.journeys.mutations.recalculateStatistics, {
      journeyId: activity.journeyId,
    });

    return args.activityId;
  },
});
