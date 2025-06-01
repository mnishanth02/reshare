// convex/journeys.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new journey
export const createJourney = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    visibility: v.union(v.literal("public"), v.literal("unlisted"), v.literal("private")),
    defaultMapStyle: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),
    defaultColorPalette: v.optional(v.array(v.string())),
    templateId: v.optional(v.id("journey_templates")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to create journey");
    }

    // Apply template settings if templateId is provided
    let templateSettings = {};
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        templateSettings = {
          defaultMapStyle: template.defaultMapStyle,
          defaultActivityType: template.defaultActivityType,
          defaultColorPalette: template.defaultColorPalette,
        };
      }
    }

    const journeyId = await ctx.db.insert("journeys", {
      userId: identity.subject,
      title: args.title,
      description: args.description || "",
      coverImageId: args.coverImageId,
      visibility: args.visibility,
      defaultMapStyle: args.defaultMapStyle || templateSettings.defaultMapStyle || "outdoors",
      defaultActivityType:
        args.defaultActivityType || templateSettings.defaultActivityType || "hiking",
      defaultColorPalette: args.defaultColorPalette ||
        templateSettings.defaultColorPalette || [
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
          "#96CEB4",
          "#FECA57",
        ],
      status: "active",
      totalDistance: 0,
      totalElevationGain: 0,
      totalDuration: 0,
      activityCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return journeyId;
  },
});

// Update journey details
export const updateJourney = mutation({
  args: {
    journeyId: v.id("journeys"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    visibility: v.optional(
      v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))
    ),
    defaultMapStyle: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),
    defaultColorPalette: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    // Only update provided fields
    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.coverImageId !== undefined) updateData.coverImageId = args.coverImageId;
    if (args.visibility !== undefined) updateData.visibility = args.visibility;
    if (args.defaultMapStyle !== undefined) updateData.defaultMapStyle = args.defaultMapStyle;
    if (args.defaultActivityType !== undefined)
      updateData.defaultActivityType = args.defaultActivityType;
    if (args.defaultColorPalette !== undefined)
      updateData.defaultColorPalette = args.defaultColorPalette;
    if (args.status !== undefined) updateData.status = args.status;

    await ctx.db.patch(args.journeyId, updateData);
    return args.journeyId;
  },
});

// Duplicate journey
export const duplicateJourney = mutation({
  args: {
    journeyId: v.id("journeys"),
    newTitle: v.string(),
    includeActivities: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const originalJourney = await ctx.db.get(args.journeyId);
    if (!originalJourney || originalJourney.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    // Create new journey with same settings
    const newJourneyId = await ctx.db.insert("journeys", {
      userId: identity.subject,
      title: args.newTitle,
      description: originalJourney.description,
      coverImageId: originalJourney.coverImageId,
      visibility: "private", // Always start as private
      defaultMapStyle: originalJourney.defaultMapStyle,
      defaultActivityType: originalJourney.defaultActivityType,
      defaultColorPalette: originalJourney.defaultColorPalette,
      status: "active",
      totalDistance: 0,
      totalElevationGain: 0,
      totalDuration: 0,
      activityCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Duplicate activities if requested
    if (args.includeActivities) {
      const activities = await ctx.db
        .query("activities")
        .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
        .collect();

      for (const activity of activities) {
        await ctx.db.insert("activities", {
          journeyId: newJourneyId,
          userId: identity.subject,
          name: activity.name,
          description: activity.description,
          activityType: activity.activityType,
          gpxFileId: activity.gpxFileId,
          routeData: activity.routeData,
          elevationProfile: activity.elevationProfile,
          statistics: activity.statistics,
          customColor: activity.customColor,
          notes: activity.notes,
          tags: activity.tags,
          weatherData: activity.weatherData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Recalculate journey statistics
      await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
        journeyId: newJourneyId,
      });
    }

    return newJourneyId;
  },
});

// Delete journey and all associated activities
export const deleteJourney = mutation({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    // Delete all activities in this journey
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    for (const activity of activities) {
      // Delete associated files
      if (activity.gpxFileId) {
        await ctx.storage.delete(activity.gpxFileId);
      }
      await ctx.db.delete(activity._id);
    }

    // Delete journey cover image if exists
    if (journey.coverImageId) {
      await ctx.storage.delete(journey.coverImageId);
    }

    // Delete the journey
    await ctx.db.delete(args.journeyId);
  },
});

// Bulk operations for journeys
export const bulkArchiveJourneys = mutation({
  args: {
    journeyIds: v.array(v.id("journeys")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    for (const journeyId of args.journeyIds) {
      const journey = await ctx.db.get(journeyId);
      if (journey && journey.userId === identity.subject) {
        await ctx.db.patch(journeyId, {
          status: "archived",
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const bulkDeleteJourneys = mutation({
  args: {
    journeyIds: v.array(v.id("journeys")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    for (const journeyId of args.journeyIds) {
      // Use the existing deleteJourney logic
      const journey = await ctx.db.get(journeyId);
      if (journey && journey.userId === identity.subject) {
        // Delete all activities in this journey
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_journey", (q) => q.eq("journeyId", journeyId))
          .collect();

        for (const activity of activities) {
          if (activity.gpxFileId) {
            await ctx.storage.delete(activity.gpxFileId);
          }
          await ctx.db.delete(activity._id);
        }

        if (journey.coverImageId) {
          await ctx.storage.delete(journey.coverImageId);
        }

        await ctx.db.delete(journeyId);
      }
    }
  },
});

// Get user's journeys with filtering and pagination
export const getUserJourneys = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    searchTerm: v.optional(v.string()),
    sortBy: v.optional(
      v.union(v.literal("created"), v.literal("updated"), v.literal("title"), v.literal("distance"))
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { journeys: [], nextCursor: null };
    }

    const query = ctx.db
      .query("journeys")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    // Apply filters
    let journeys = await query.collect();

    if (args.status) {
      journeys = journeys.filter((j) => j.status === args.status);
    }

    if (args.searchTerm) {
      const searchTerm = args.searchTerm.toLowerCase();
      journeys = journeys.filter(
        (j) =>
          j.title.toLowerCase().includes(searchTerm) ||
          j.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "updated";
    const sortOrder = args.sortOrder || "desc";

    journeys.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "created":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "updated":
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "distance":
          aValue = a.totalDistance;
          bValue = b.totalDistance;
          break;
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const limit = args.limit || 20;
    const startIndex = args.cursor ? Number.parseInt(args.cursor) : 0;
    const endIndex = startIndex + limit;
    const paginatedJourneys = journeys.slice(startIndex, endIndex);
    const nextCursor = endIndex < journeys.length ? endIndex.toString() : null;

    return {
      journeys: paginatedJourneys,
      nextCursor,
      totalCount: journeys.length,
    };
  },
});

// Get single journey with activities
export const getJourney = query({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      return null;
    }

    // Check access permissions
    if (journey.visibility === "private" && (!identity || journey.userId !== identity.subject)) {
      return null;
    }

    // Get activities for this journey
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    return {
      ...journey,
      activities: activities.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

// Recalculate journey statistics
export const recalculateStatistics = mutation({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    const stats = activities.reduce(
      (acc, activity) => ({
        totalDistance: acc.totalDistance + (activity.statistics?.distance || 0),
        totalElevationGain: acc.totalElevationGain + (activity.statistics?.elevationGain || 0),
        totalDuration: acc.totalDuration + (activity.statistics?.duration || 0),
        activityCount: acc.activityCount + 1,
      }),
      { totalDistance: 0, totalElevationGain: 0, totalDuration: 0, activityCount: 0 }
    );

    await ctx.db.patch(args.journeyId, {
      ...stats,
      updatedAt: Date.now(),
    });

    return stats;
  },
});

// Get journey analytics
export const getJourneyAnalytics = query({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Calculate analytics
    const activityTypes = activities.reduce(
      (acc, activity) => {
        acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const monthlyStats = activities.reduce(
      (acc, activity) => {
        const date = new Date(activity.createdAt);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!acc[monthKey]) {
          acc[monthKey] = { distance: 0, count: 0, elevationGain: 0 };
        }

        acc[monthKey].distance += activity.statistics?.distance || 0;
        acc[monthKey].count += 1;
        acc[monthKey].elevationGain += activity.statistics?.elevationGain || 0;

        return acc;
      },
      {} as Record<string, { distance: number; count: number; elevationGain: number }>
    );

    return {
      totalActivities: activities.length,
      totalDistance: journey.totalDistance,
      totalElevationGain: journey.totalElevationGain,
      totalDuration: journey.totalDuration,
      activityTypes,
      monthlyStats,
      averages: {
        distancePerActivity: activities.length > 0 ? journey.totalDistance / activities.length : 0,
        elevationPerActivity:
          activities.length > 0 ? journey.totalElevationGain / activities.length : 0,
        durationPerActivity: activities.length > 0 ? journey.totalDuration / activities.length : 0,
      },
    };
  },
});
