// convex/activities.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";

// Generate upload URL for GPX files
export const generateGPXUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to upload files");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Process and create activity from uploaded GPX
export const createActivityFromGPX = mutation({
  args: {
    journeyId: v.id("journeys"),
    gpxFileId: v.id("_storage"),
    name: v.optional(v.string()),
    activityType: v.optional(v.string()),
    customColor: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    // Verify journey ownership
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    // Get the uploaded file
    const gpxFile = await ctx.storage.get(args.gpxFileId);
    if (!gpxFile) {
      throw new Error("GPX file not found");
    }

    // Schedule GPX processing (this will be handled by an action)
    const processingJobId = await ctx.scheduler.runAfter(0, "activities:processGPXFile", {
      journeyId: args.journeyId,
      gpxFileId: args.gpxFileId,
      name: args.name,
      activityType: args.activityType || journey.defaultActivityType,
      customColor: args.customColor,
      notes: args.notes,
      userId: identity.subject,
    });

    // Create a pending activity record
    const activityId = await ctx.db.insert("activities", {
      journeyId: args.journeyId,
      userId: identity.subject,
      name: args.name || "Processing...",
      description: "",
      activityType: args.activityType || journey.defaultActivityType,
      gpxFileId: args.gpxFileId,
      routeData: null,
      elevationProfile: null,
      statistics: null,
      customColor: args.customColor,
      notes: args.notes || "",
      tags: [],
      weatherData: null,
      processingStatus: "pending",
      processingJobId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return activityId;
  },
});

// Process GPX file action (runs server-side with full Node.js environment)
export const processGPXFile = action({
  args: {
    journeyId: v.id("journeys"),
    gpxFileId: v.id("_storage"),
    name: v.optional(v.string()),
    activityType: v.string(),
    customColor: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the GPX file content
      const gpxFile = await ctx.storage.get(args.gpxFileId);
      if (!gpxFile) {
        throw new Error("GPX file not found");
      }

      // Convert to text
      const gpxText = await gpxFile.text();

      // Parse GPX data (using a hypothetical GPX parsing utility)
      const parsedData = await parseGPXData(gpxText);

      // Generate activity name if not provided
      const activityName = args.name || generateActivityName(parsedData, args.activityType);

      // Calculate statistics
      const statistics = calculateActivityStatistics(parsedData);

      // Generate elevation profile
      const elevationProfile = generateElevationProfile(parsedData);

      // Simplify route data for efficient storage and rendering
      const simplifiedRoute = simplifyRouteData(parsedData);

      // Find the activity record and update it
      const activities = await ctx.runQuery("activities:findByGPXFile", {
        gpxFileId: args.gpxFileId,
        userId: args.userId,
      });

      if (activities.length > 0) {
        const activityId = activities[0]._id;

        await ctx.runMutation("activities:updateProcessedActivity", {
          activityId,
          name: activityName,
          routeData: simplifiedRoute,
          elevationProfile,
          statistics,
          processingStatus: "completed",
        });

        // Update journey statistics
        await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
          journeyId: args.journeyId,
        });
      }
    } catch (error) {
      console.error("GPX processing failed:", error);

      // Update activity with error status
      const activities = await ctx.runQuery("activities:findByGPXFile", {
        gpxFileId: args.gpxFileId,
        userId: args.userId,
      });

      if (activities.length > 0) {
        await ctx.runMutation("activities:updateProcessedActivity", {
          activityId: activities[0]._id,
          processingStatus: "failed",
          processingError: error.message,
        });
      }
    }
  },
});

// Helper query to find activity by GPX file
export const findByGPXFile = query({
  args: {
    gpxFileId: v.id("_storage"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .withIndex("by_gpx_file", (q) => q.eq("gpxFileId", args.gpxFileId).eq("userId", args.userId))
      .collect();
  },
});

// Update processed activity
export const updateProcessedActivity = mutation({
  args: {
    activityId: v.id("activities"),
    name: v.optional(v.string()),
    routeData: v.optional(v.any()),
    elevationProfile: v.optional(v.any()),
    statistics: v.optional(v.any()),
    processingStatus: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      processingStatus: args.processingStatus,
      updatedAt: Date.now(),
    };

    if (args.name) updateData.name = args.name;
    if (args.routeData) updateData.routeData = args.routeData;
    if (args.elevationProfile) updateData.elevationProfile = args.elevationProfile;
    if (args.statistics) updateData.statistics = args.statistics;
    if (args.processingError) updateData.processingError = args.processingError;

    await ctx.db.patch(args.activityId, updateData);
  },
});

// Update activity details
export const updateActivity = mutation({
  args: {
    activityId: v.id("activities"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    activityType: v.optional(v.string()),
    customColor: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== identity.subject) {
      throw new Error("Activity not found or unauthorized");
    }

    const updateData: any = { updatedAt: Date.now() };

    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.activityType !== undefined) updateData.activityType = args.activityType;
    if (args.customColor !== undefined) updateData.customColor = args.customColor;
    if (args.notes !== undefined) updateData.notes = args.notes;
    if (args.tags !== undefined) updateData.tags = args.tags;

    await ctx.db.patch(args.activityId, updateData);
    return args.activityId;
  },
});

// Delete activity
export const deleteActivity = mutation({
  args: {
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== identity.subject) {
      throw new Error("Activity not found or unauthorized");
    }

    // Delete the GPX file
    if (activity.gpxFileId) {
      await ctx.storage.delete(activity.gpxFileId);
    }

    // Delete the activity
    await ctx.db.delete(args.activityId);

    // Recalculate journey statistics
    await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
      journeyId: activity.journeyId,
    });
  },
});

// Duplicate activity
export const duplicateActivity = mutation({
  args: {
    activityId: v.id("activities"),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const originalActivity = await ctx.db.get(args.activityId);
    if (!originalActivity || originalActivity.userId !== identity.subject) {
      throw new Error("Activity not found or unauthorized");
    }

    // Create duplicate activity
    const newActivityId = await ctx.db.insert("activities", {
      journeyId: originalActivity.journeyId,
      userId: identity.subject,
      name: args.newName || `${originalActivity.name} (Copy)`,
      description: originalActivity.description,
      activityType: originalActivity.activityType,
      gpxFileId: originalActivity.gpxFileId, // Reference the same GPX file
      routeData: originalActivity.routeData,
      elevationProfile: originalActivity.elevationProfile,
      statistics: originalActivity.statistics,
      customColor: originalActivity.customColor,
      notes: originalActivity.notes,
      tags: [...(originalActivity.tags || [])],
      weatherData: originalActivity.weatherData,
      processingStatus: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Recalculate journey statistics
    await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
      journeyId: originalActivity.journeyId,
    });

    return newActivityId;
  },
});

// Get activity details
export const getActivity = query({
  args: {
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      return null;
    }

    // Check if user has access to this activity
    const identity = await ctx.auth.getUserIdentity();
    const journey = await ctx.db.get(activity.journeyId);

    if (!journey) {
      return null;
    }

    // Check access permissions
    if (journey.visibility === "private" && (!identity || journey.userId !== identity.subject)) {
      return null;
    }

    return activity;
  },
});

// Get activities for a journey
export const getJourneyActivities = query({
  args: {
    journeyId: v.id("journeys"),
    sortBy: v.optional(
      v.union(v.literal("date"), v.literal("distance"), v.literal("name"), v.literal("type"))
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    activityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Check journey access
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      return [];
    }

    if (journey.visibility === "private" && (!identity || journey.userId !== identity.subject)) {
      return [];
    }

    let activities = await ctx.db
      .query("activities")
      .withIndex("by_journey", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Filter by activity type if specified
    if (args.activityType) {
      activities = activities.filter((a) => a.activityType === args.activityType);
    }

    // Apply sorting
    const sortBy = args.sortBy || "date";
    const sortOrder = args.sortOrder || "desc";

    activities.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "date":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "distance":
          aValue = a.statistics?.distance || 0;
          bValue = b.statistics?.distance || 0;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "type":
          aValue = a.activityType;
          bValue = b.activityType;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply limit if specified
    if (args.limit) {
      activities = activities.slice(0, args.limit);
    }

    return activities;
  },
});

// Batch upload multiple GPX files
export const batchUploadGPX = mutation({
  args: {
    journeyId: v.id("journeys"),
    uploads: v.array(
      v.object({
        gpxFileId: v.id("_storage"),
        name: v.optional(v.string()),
        activityType: v.optional(v.string()),
        customColor: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    // Verify journey ownership
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or unauthorized");
    }

    const activityIds = [];

    for (const upload of args.uploads) {
      // Create activity record
      const activityId = await ctx.db.insert("activities", {
        journeyId: args.journeyId,
        userId: identity.subject,
        name: upload.name || "Processing...",
        description: "",
        activityType: upload.activityType || journey.defaultActivityType,
        gpxFileId: upload.gpxFileId,
        routeData: null,
        elevationProfile: null,
        statistics: null,
        customColor: upload.customColor,
        notes: "",
        tags: [],
        weatherData: null,
        processingStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Schedule processing
      await ctx.scheduler.runAfter(0, "activities:processGPXFile", {
        journeyId: args.journeyId,
        gpxFileId: upload.gpxFileId,
        name: upload.name,
        activityType: upload.activityType || journey.defaultActivityType,
        customColor: upload.customColor,
        notes: "",
        userId: identity.subject,
      });

      activityIds.push(activityId);
    }

    return activityIds;
  },
});

// Trim activity route data
export const trimActivity = mutation({
  args: {
    activityId: v.id("activities"),
    startIndex: v.number(),
    endIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity || activity.userId !== identity.subject) {
      throw new Error("Activity not found or unauthorized");
    }

    if (!activity.routeData || !activity.routeData.coordinates) {
      throw new Error("Activity has no route data to trim");
    }

    // Trim the coordinates
    const originalCoords = activity.routeData.coordinates;
    const trimmedCoords = originalCoords.slice(args.startIndex, args.endIndex + 1);

    // Recalculate statistics for trimmed route
    const newStats = calculateTrimmedStatistics(trimmedCoords, activity.elevationProfile);

    // Update activity
    await ctx.db.patch(args.activityId, {
      routeData: {
        ...activity.routeData,
        coordinates: trimmedCoords,
      },
      statistics: newStats,
      updatedAt: Date.now(),
    });

    // Recalculate journey statistics
    await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
      journeyId: activity.journeyId,
    });

    return args.activityId;
  },
});

// Split activity at a specific point
export const splitActivity = mutation({
  args: {
    activityId: v.id("activities"),
    splitIndex: v.number(),
    newActivityName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const originalActivity = await ctx.db.get(args.activityId);
    if (!originalActivity || originalActivity.userId !== identity.subject) {
      throw new Error("Activity not found or unauthorized");
    }

    if (!originalActivity.routeData || !originalActivity.routeData.coordinates) {
      throw new Error("Activity has no route data to split");
    }

    const coords = originalActivity.routeData.coordinates;

    // Split coordinates
    const firstPart = coords.slice(0, args.splitIndex + 1);
    const secondPart = coords.slice(args.splitIndex);

    // Calculate statistics for both parts
    const firstStats = calculateTrimmedStatistics(firstPart, originalActivity.elevationProfile);
    const secondStats = calculateTrimmedStatistics(secondPart, originalActivity.elevationProfile);

    // Update original activity with first part
    await ctx.db.patch(args.activityId, {
      routeData: {
        ...originalActivity.routeData,
        coordinates: firstPart,
      },
      statistics: firstStats,
      updatedAt: Date.now(),
    });

    // Create new activity with second part
    const newActivityId = await ctx.db.insert("activities", {
      journeyId: originalActivity.journeyId,
      userId: identity.subject,
      name: args.newActivityName,
      description: originalActivity.description,
      activityType: originalActivity.activityType,
      gpxFileId: originalActivity.gpxFileId,
      routeData: {
        ...originalActivity.routeData,
        coordinates: secondPart,
      },
      elevationProfile: originalActivity.elevationProfile, // TODO: Split elevation profile too
      statistics: secondStats,
      customColor: originalActivity.customColor,
      notes: originalActivity.notes,
      tags: [...(originalActivity.tags || [])],
      weatherData: originalActivity.weatherData,
      processingStatus: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Recalculate journey statistics
    await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
      journeyId: originalActivity.journeyId,
    });

    return { originalActivityId: args.activityId, newActivityId };
  },
});

// Merge multiple activities
export const mergeActivities = mutation({
  args: {
    activityIds: v.array(v.id("activities")),
    mergedName: v.string(),
    keepOriginals: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    if (args.activityIds.length < 2) {
      throw new Error("At least 2 activities required for merging");
    }

    // Get all activities and verify ownership
    const activities = [];
    for (const activityId of args.activityIds) {
      const activity = await ctx.db.get(activityId);
      if (!activity || activity.userId !== identity.subject) {
        throw new Error("One or more activities not found or unauthorized");
      }
      activities.push(activity);
    }

    // Verify all activities are from the same journey
    const journeyId = activities[0].journeyId;
    if (!activities.every((a) => a.journeyId === journeyId)) {
      throw new Error("All activities must be from the same journey");
    }

    // Sort activities by creation date
    activities.sort((a, b) => a.createdAt - b.createdAt);

    // Merge route data
    const mergedCoordinates = [];
    const mergedElevationProfile = [];

    for (const activity of activities) {
      if (activity.routeData && activity.routeData.coordinates) {
        mergedCoordinates.push(...activity.routeData.coordinates);
      }
      if (activity.elevationProfile) {
        mergedElevationProfile.push(...activity.elevationProfile);
      }
    }

    // Calculate merged statistics
    const mergedStats = activities.reduce(
      (acc, activity) => ({
        distance: acc.distance + (activity.statistics?.distance || 0),
        duration: acc.duration + (activity.statistics?.duration || 0),
        elevationGain: acc.elevationGain + (activity.statistics?.elevationGain || 0),
        elevationLoss: acc.elevationLoss + (activity.statistics?.elevationLoss || 0),
        maxSpeed: Math.max(acc.maxSpeed, activity.statistics?.maxSpeed || 0),
        avgSpeed: 0, // Will be recalculated
        calories: acc.calories + (activity.statistics?.calories || 0),
      }),
      {
        distance: 0,
        duration: 0,
        elevationGain: 0,
        elevationLoss: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        calories: 0,
      }
    );

    // Recalculate average speed
    mergedStats.avgSpeed =
      mergedStats.duration > 0 ? mergedStats.distance / (mergedStats.duration / 3600) : 0;

    // Create merged activity
    const mergedActivityId = await ctx.db.insert("activities", {
      journeyId,
      userId: identity.subject,
      name: args.mergedName,
      description: `Merged from ${activities.length} activities`,
      activityType: activities[0].activityType, // Use first activity's type
      gpxFileId: activities[0].gpxFileId, // Reference first GPX file
      routeData: {
        type: "LineString",
        coordinates: mergedCoordinates,
      },
      elevationProfile: mergedElevationProfile,
      statistics: mergedStats,
      customColor: activities[0].customColor,
      notes: activities
        .map((a) => a.notes)
        .filter(Boolean)
        .join("\n\n"),
      tags: [...new Set(activities.flatMap((a) => a.tags || []))], // Unique tags
      weatherData: null,
      processingStatus: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Delete original activities if not keeping them
    if (!args.keepOriginals) {
      for (const activityId of args.activityIds) {
        await ctx.db.delete(activityId);
      }
    }

    // Recalculate journey statistics
    await ctx.scheduler.runAfter(0, "journeys:recalculateStatistics", {
      journeyId,
    });

    return mergedActivityId;
  },
});

// Helper function to calculate statistics for trimmed routes
function calculateTrimmedStatistics(coordinates: number[][], elevationProfile: any[]) {
  if (coordinates.length < 2) {
    return {
      distance: 0,
      duration: 0,
      elevationGain: 0,
      elevationLoss: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      calories: 0,
    };
  }

  let distance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;

  // Calculate distance using Haversine formula
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    distance += R * c;
  }

  // Calculate elevation gain/loss if elevation data is available
  if (elevationProfile && elevationProfile.length > 1) {
    for (let i = 1; i < elevationProfile.length; i++) {
      const elevDiff = elevationProfile[i].elevation - elevationProfile[i - 1].elevation;
      if (elevDiff > 0) {
        elevationGain += elevDiff;
      } else {
        elevationLoss += Math.abs(elevDiff);
      }
    }
  }

  return {
    distance: Math.round(distance),
    duration: 0, // TODO: Calculate from timestamps if available
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
    maxSpeed: 0,
    avgSpeed: 0,
    calories: 0, // TODO: Estimate based on activity type and duration
  };
}

// Utility functions that would be implemented elsewhere
function parseGPXData(gpxText: string) {
  // This would use @tmcw/togeojson or similar library
  // For now, return a mock structure
  return {
    coordinates: [],
    timestamps: [],
    elevations: [],
    metadata: {},
  };
}

function generateActivityName(parsedData: any, activityType: string) {
  const date = new Date().toLocaleDateString();
  return `${activityType} - ${date}`;
}

function calculateActivityStatistics(parsedData: any) {
  // Calculate distance, elevation, duration, etc.
  return {
    distance: 0,
    duration: 0,
    elevationGain: 0,
    elevationLoss: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    calories: 0,
  };
}

function generateElevationProfile(parsedData: any) {
  // Generate elevation profile data
  return [];
}

function simplifyRouteData(parsedData: any) {
  // Simplify route using Douglas-Peucker algorithm or similar
  return {
    type: "LineString",
    coordinates: [],
  };
}
