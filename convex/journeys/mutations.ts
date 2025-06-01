import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import {
  createJourneyValidator,
  journeyIdValidator,
  updateJourneyValidator,
} from "../lib/validators";
import { getCurrentUserOrThrow } from "../users";

/**
 * Creates a new journey for the authenticated user
 * @param args - Journey creation parameters
 * @returns The ID of the created journey
 * @throws Error if user is not authenticated
 */
export const create = mutation({
  args: createJourneyValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const journeyData = {
      userId: user._id,
      title: args.title,
      description: args.description,
      visibility: args.visibility,
      defaultMapStyle: args.defaultMapStyle,
      defaultColorPalette: args.defaultColorPalette,
      defaultActivityType: args.defaultActivityType,
      coverImageId: args.coverImageId,

      // Default values for new journey
      totalDistance: 0,
      totalElevationGain: 0,
      totalDuration: 0,
      activityCount: 0,
      status: "active" as const,

      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const journeyId = await ctx.db.insert("journeys", journeyData);
    return journeyId;
  },
});

/**
 * Updates an existing journey (owner only)
 * @param args - Journey update parameters including journeyId
 * @returns The ID of the updated journey
 * @throws Error if user is not authenticated or doesn't own the journey
 */
export const update = mutation({
  args: updateJourneyValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found or access denied");
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.visibility !== undefined) updateData.visibility = args.visibility;
    if (args.defaultMapStyle !== undefined) updateData.defaultMapStyle = args.defaultMapStyle;
    if (args.defaultColorPalette !== undefined)
      updateData.defaultColorPalette = args.defaultColorPalette;
    if (args.defaultActivityType !== undefined)
      updateData.defaultActivityType = args.defaultActivityType;
    if (args.coverImageId !== undefined) updateData.coverImageId = args.coverImageId;
    if (args.status !== undefined) updateData.status = args.status;

    await ctx.db.patch(args.journeyId, updateData);
    return args.journeyId;
  },
});

/**
 * Deletes a journey and all associated data (owner only)
 * @param args - Journey ID to delete
 * @returns Success status
 * @throws Error if user is not authenticated or doesn't own the journey
 */
export const deleteJourney = mutation({
  args: journeyIdValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found or access denied");
    }

    // Get all activities for this journey
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Delete all activities and their associated data
    for (const activity of activities) {
      // Delete activity points
      const activityPoints = await ctx.db
        .query("activityPoints")
        .withIndex("by_activity_id", (q) => q.eq("activityId", activity._id))
        .collect();

      for (const point of activityPoints) {
        await ctx.db.delete(point._id);
      }

      // Delete GPX file from storage if it exists
      if (activity.gpxFileId) {
        await ctx.storage.delete(activity.gpxFileId);
      }

      // Delete the activity
      await ctx.db.delete(activity._id);
    }

    // Delete journey cover image if it exists
    if (journey.coverImageId) {
      await ctx.storage.delete(journey.coverImageId);
    }

    // Delete the journey itself
    await ctx.db.delete(args.journeyId);

    return true;
  },
});

/**
 * Duplicates an existing journey (owner only)
 * @param args - Journey duplication parameters
 * @returns The ID of the new duplicated journey
 * @throws Error if user is not authenticated or doesn't own the original journey
 */
export const duplicate = mutation({
  args: {
    journeyId: v.id("journeys"),
    newTitle: v.string(),
    includeActivities: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const originalJourney = await ctx.db.get(args.journeyId);
    if (!originalJourney || originalJourney.userId !== user._id) {
      throw new Error("Journey not found or access denied");
    }

    // Create new journey with same settings but new title
    const newJourneyData = {
      userId: user._id,
      title: args.newTitle,
      description: originalJourney.description,
      coverImageId: originalJourney.coverImageId,
      visibility: "private" as const, // Always start as private
      defaultMapStyle: originalJourney.defaultMapStyle,
      defaultColorPalette: originalJourney.defaultColorPalette,
      defaultActivityType: originalJourney.defaultActivityType,

      // Reset stats for new journey
      totalDistance: 0,
      totalElevationGain: 0,
      totalDuration: 0,
      activityCount: 0,
      status: "active" as const,

      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newJourneyId = await ctx.db.insert("journeys", newJourneyData);

    // Duplicate activities if requested
    if (args.includeActivities) {
      const activities = await ctx.db
        .query("activities")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
        .collect();

      for (const activity of activities) {
        const newActivityData = {
          journeyId: newJourneyId,
          userId: user._id,
          name: activity.name,
          description: activity.description,
          activityType: activity.activityType,
          originalFileName: activity.originalFileName,
          gpxFileId: activity.gpxFileId, // Reference same file
          processedGeoJson: activity.processedGeoJson,

          // Copy statistics
          distance: activity.distance,
          duration: activity.duration,
          elevationGain: activity.elevationGain,
          elevationLoss: activity.elevationLoss,
          maxElevation: activity.maxElevation,
          minElevation: activity.minElevation,
          avgSpeed: activity.avgSpeed,
          maxSpeed: activity.maxSpeed,
          avgPace: activity.avgPace,
          estimatedCalories: activity.estimatedCalories,

          // Copy visual properties
          color: activity.color,
          strokeWidth: activity.strokeWidth,
          opacity: activity.opacity,

          // Copy route data
          boundingBox: activity.boundingBox,
          centerLat: activity.centerLat,
          centerLng: activity.centerLng,

          // Copy dates and status
          activityDate: activity.activityDate,
          processingStatus: activity.processingStatus,
          processingError: activity.processingError,

          // New timestamps
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const newActivityId = await ctx.db.insert("activities", newActivityData);

        // Copy activity points if they exist
        const activityPoints = await ctx.db
          .query("activityPoints")
          .withIndex("by_activity_id", (q) => q.eq("activityId", activity._id))
          .collect();

        for (const point of activityPoints) {
          await ctx.db.insert("activityPoints", {
            activityId: newActivityId,
            pointIndex: point.pointIndex,
            latitude: point.latitude,
            longitude: point.longitude,
            elevation: point.elevation,
            timestamp: point.timestamp,
            speed: point.speed,
            heartRate: point.heartRate,
            cadence: point.cadence,
            power: point.power,
            temperature: point.temperature,
          });
        }
      }

      // Recalculate journey statistics after duplicating activities
      await recalculateJourneyStats(ctx, newJourneyId);
    }

    return newJourneyId;
  },
});

/**
 * Archives multiple journeys (bulk operation)
 * @param args - Array of journey IDs to archive
 * @returns Number of journeys successfully archived
 */
export const bulkArchive = mutation({
  args: {
    journeyIds: v.array(v.id("journeys")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    let archivedCount = 0;

    for (const journeyId of args.journeyIds) {
      const journey = await ctx.db.get(journeyId);
      if (journey && journey.userId === user._id) {
        await ctx.db.patch(journeyId, {
          status: "archived",
          updatedAt: Date.now(),
        });
        archivedCount++;
      }
    }

    return archivedCount;
  },
});

/**
 * Deletes multiple journeys (bulk operation)
 * @param args - Array of journey IDs to delete
 * @returns Number of journeys successfully deleted
 */
export const bulkDelete = mutation({
  args: {
    journeyIds: v.array(v.id("journeys")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    let deletedCount = 0;

    for (const journeyId of args.journeyIds) {
      try {
        const journey = await ctx.db.get(journeyId);
        if (journey && journey.userId === user._id) {
          // Get all activities for this journey
          const activities = await ctx.db
            .query("activities")
            .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
            .collect();

          // Delete all activities and their associated data
          for (const activity of activities) {
            // Delete activity points
            const activityPoints = await ctx.db
              .query("activityPoints")
              .withIndex("by_activity_id", (q) => q.eq("activityId", activity._id))
              .collect();

            for (const point of activityPoints) {
              await ctx.db.delete(point._id);
            }

            // Delete GPX file from storage if it exists
            if (activity.gpxFileId) {
              await ctx.storage.delete(activity.gpxFileId);
            }

            // Delete the activity
            await ctx.db.delete(activity._id);
          }

          // Delete journey cover image if it exists
          if (journey.coverImageId) {
            await ctx.storage.delete(journey.coverImageId);
          }

          // Delete the journey itself
          await ctx.db.delete(journeyId);
          deletedCount++;
        }
      } catch (error) {
        // Continue with other journeys if one fails
        console.error(`Failed to delete journey ${journeyId}:`, error);
      }
    }

    return deletedCount;
  },
});

/**
 * Recalculates journey statistics based on its activities
 * @param ctx - Convex context
 * @param journeyId - Journey ID to recalculate
 */
async function recalculateJourneyStats(ctx: MutationCtx, journeyId: Id<"journeys">) {
  const activities = await ctx.db
    .query("activities")
    .withIndex("by_journey_id", (q) => q.eq("journeyId", journeyId))
    .collect();

  const stats = activities.reduce(
    (acc, activity) => ({
      totalDistance: acc.totalDistance + (activity.distance || 0),
      totalElevationGain: acc.totalElevationGain + (activity.elevationGain || 0),
      totalDuration: acc.totalDuration + (activity.duration || 0),
      activityCount: acc.activityCount + 1,
    }),
    { totalDistance: 0, totalElevationGain: 0, totalDuration: 0, activityCount: 0 }
  );

  // Find the latest activity date
  const latestActivityDate =
    activities.length > 0 ? Math.max(...activities.map((a) => a.activityDate)) : undefined;

  await ctx.db.patch(journeyId, {
    ...stats,
    lastActivityDate: latestActivityDate,
    updatedAt: Date.now(),
  });

  return stats;
}

/**
 * Recalculates journey statistics (public mutation)
 * @param args - Journey ID to recalculate
 * @returns Updated statistics
 */
export const recalculateStatistics = mutation({
  args: journeyIdValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found or access denied");
    }

    return await recalculateJourneyStats(ctx, args.journeyId);
  },
});
