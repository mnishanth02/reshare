// convex/analytics.ts
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Types for analytics
export interface ActivityStats {
  totalDistance: number;
  totalActivities: number;
  totalElevationGain: number;
  totalTime: number;
  avgDistance: number;
  avgSpeed: number;
  longestActivity: number;
  fastestActivity: number;
  byActivityType: Record<
    string,
    {
      count: number;
      totalDistance: number;
      totalTime: number;
      avgSpeed: number;
    }
  >;
  byMonth: Record<
    string,
    {
      count: number;
      distance: number;
      time: number;
    }
  >;
}

export interface JourneyStats {
  totalJourneys: number;
  totalActivities: number;
  totalDistance: number;
  totalTime: number;
  avgActivitiesPerJourney: number;
  longestJourney: {
    id: Id<"journeys">;
    name: string;
    distance: number;
  };
  mostActiveJourney: {
    id: Id<"journeys">;
    name: string;
    activityCount: number;
  };
}

export interface UserStats {
  memberSince: number;
  totalJourneys: number;
  totalActivities: number;
  totalDistance: number;
  totalTime: number;
  totalElevationGain: number;
  storageUsed: number;
  exportsGenerated: number;
  achievements: Achievement[];
  streaks: {
    current: number;
    longest: number;
    lastActivityDate?: number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  progress?: number;
  target?: number;
}

// Get comprehensive user statistics
export const getUserStats = query({
  args: {},
  handler: async (ctx): Promise<UserStats> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get user creation date
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    // Get all journeys
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Get all activities
    const activities = await Promise.all(
      journeys.map(async (journey) => {
        return await ctx.db
          .query("activities")
          .withIndex("by_journey_id", (q) => q.eq("journeyId", journey._id))
          .collect();
      })
    );

    const flatActivities = activities.flat();

    // Calculate basic stats
    const totalDistance = flatActivities.reduce(
      (sum, activity) => sum + (activity.distance || 0),
      0
    );
    const totalTime = flatActivities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
    const totalElevationGain = flatActivities.reduce(
      (sum, activity) => sum + (activity.elevationGain || 0),
      0
    );

    // Get storage usage
    const storageUsage = await ctx.runQuery(api.fileStorage.getStorageUsage);

    // Get exports count
    const exports = await ctx.db
      .query("exports")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Calculate streaks
    const streaks = calculateActivityStreaks(flatActivities);

    // Get achievements
    const achievements = await ctx.runQuery(api.analytics.getUserAchievements);

    return {
      memberSince: user?.createdAt || Date.now(),
      totalJourneys: journeys.length,
      totalActivities: flatActivities.length,
      totalDistance,
      totalTime,
      totalElevationGain,
      storageUsed: storageUsage.totalSize,
      exportsGenerated: exports.length,
      achievements,
      streaks,
    };
  },
});

// Get detailed activity statistics
export const getActivityStats = query({
  args: {
    timeRange: v.optional(
      v.union(v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all"))
    ),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ActivityStats> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Calculate time range filter
    const now = Date.now();
    let startTime = 0;

    switch (args.timeRange) {
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "year":
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = 0;
    }

    // Get user journeys
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Get activities with filters
    let activities = [];
    for (const journey of journeys) {
      const journeyActivities = await ctx.db
        .query("activities")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", journey._id))
        .filter((q) => q.gte(q.field("startTime"), startTime))
        .collect();

      activities.push(...journeyActivities);
    }

    // Filter by activity type if specified
    if (args.activityType) {
      activities = activities.filter((a) => a.type === args.activityType);
    }

    if (activities.length === 0) {
      return {
        totalDistance: 0,
        totalActivities: 0,
        totalElevationGain: 0,
        totalTime: 0,
        avgDistance: 0,
        avgSpeed: 0,
        longestActivity: 0,
        fastestActivity: 0,
        byActivityType: {},
        byMonth: {},
      };
    }

    // Calculate statistics
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalElevationGain = activities.reduce((sum, a) => sum + (a.elevationGain || 0), 0);

    const avgDistance = totalDistance / activities.length;
    const avgSpeed = totalTime > 0 ? totalDistance / (totalTime / 3600) : 0;

    const longestActivity = Math.max(...activities.map((a) => a.distance || 0));
    const fastestActivity = Math.max(...activities.map((a) => a.maxSpeed || 0));

    // Group by activity type
    const byActivityType: Record<string, any> = {};
    for (const activity of activities) {
      const type = activity.type || "other";
      if (!byActivityType[type]) {
        byActivityType[type] = {
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          avgSpeed: 0,
        };
      }

      byActivityType[type].count++;
      byActivityType[type].totalDistance += activity.distance || 0;
      byActivityType[type].totalTime += activity.duration || 0;
    }

    // Calculate average speeds for each type
    Object.keys(byActivityType).forEach((type) => {
      const stats = byActivityType[type];
      stats.avgSpeed = stats.totalTime > 0 ? stats.totalDistance / (stats.totalTime / 3600) : 0;
    });

    // Group by month
    const byMonth: Record<string, any> = {};
    for (const activity of activities) {
      const date = new Date(activity.startTime || 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          count: 0,
          distance: 0,
          time: 0,
        };
      }

      byMonth[monthKey].count++;
      byMonth[monthKey].distance += activity.distance || 0;
      byMonth[monthKey].time += activity.duration || 0;
    }

    return {
      totalDistance,
      totalActivities: activities.length,
      totalElevationGain,
      totalTime,
      avgDistance,
      avgSpeed,
      longestActivity,
      fastestActivity,
      byActivityType,
      byMonth,
    };
  },
});

// Get journey statistics
export const getJourneyStats = query({
  args: {},
  handler: async (ctx): Promise<JourneyStats> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get all journeys
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    if (journeys.length === 0) {
      return {
        totalJourneys: 0,
        totalActivities: 0,
        totalDistance: 0,
        totalTime: 0,
        avgActivitiesPerJourney: 0,
        longestJourney: { id: "" as Id<"journeys">, name: "", distance: 0 },
        mostActiveJourney: { id: "" as Id<"journeys">, name: "", activityCount: 0 },
      };
    }

    // Get activities for each journey
    const journeyStats = await Promise.all(
      journeys.map(async (journey) => {
        const activities = await ctx.db
          .query("activities")
          .withIndex("by_journey_id", (q) => q.eq("journeyId", journey._id))
          .collect();

        const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
        const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);

        return {
          journey,
          activityCount: activities.length,
          totalDistance,
          totalTime,
        };
      })
    );

    const totalActivities = journeyStats.reduce((sum, s) => sum + s.activityCount, 0);
    const totalDistance = journeyStats.reduce((sum, s) => sum + s.totalDistance, 0);
    const totalTime = journeyStats.reduce((sum, s) => sum + s.totalTime, 0);
    const avgActivitiesPerJourney = totalActivities / journeys.length;

    // Find longest journey by distance
    const longestJourney = journeyStats.reduce((max, current) =>
      current.totalDistance > max.totalDistance ? current : max
    );

    // Find most active journey by activity count
    const mostActiveJourney = journeyStats.reduce((max, current) =>
      current.activityCount > max.activityCount ? current : max
    );

    return {
      totalJourneys: journeys.length,
      totalActivities,
      totalDistance,
      totalTime,
      avgActivitiesPerJourney,
      longestJourney: {
        id: longestJourney.journey._id,
        name: longestJourney.journey.name,
        distance: longestJourney.totalDistance,
      },
      mostActiveJourney: {
        id: mostActiveJourney.journey._id,
        name: mostActiveJourney.journey.name,
        activityCount: mostActiveJourney.activityCount,
      },
    };
  },
});

// Get user achievements
export const getUserAchievements = query({
  args: {},
  handler: async (ctx): Promise<Achievement[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get user's achievement records
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    // Get achievement definitions
    const achievementDefinitions = await ctx.db.query("achievements").collect();

    // Combine with user progress
    return achievementDefinitions.map((def) => {
      const userProgress = userAchievements.find((ua) => ua.achievementId === def.id);

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        unlockedAt: userProgress?.unlockedAt || 0,
        progress: userProgress?.progress || 0,
        target: def.target,
      };
    });
  },
});

// Check and update achievements
export const checkAchievements = action({
  args: {
    activityId: v.optional(v.id("activities")),
    journeyId: v.optional(v.id("journeys")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Get current user stats
    const userStats = await ctx.runQuery(api.analytics.getUserStats);
    const activityStats = await ctx.runQuery(api.analytics.getActivityStats, {
      timeRange: "all",
    });

    // Get achievement definitions
    const achievements = await ctx.db.query("achievements").collect();
    const newlyUnlocked = [];

    for (const achievement of achievements) {
      // Check if already unlocked
      const existing = await ctx.db
        .query("userAchievements")
        .withIndex("by_user_achievement", (q) =>
          q.eq("userId", userId).eq("achievementId", achievement.id)
        )
        .first();

      if (existing && existing.unlockedAt > 0) {
        continue; // Already unlocked
      }

      // Check achievement conditions
      let progress = 0;
      let isUnlocked = false;

      switch (achievement.type) {
        case "distance_total":
          progress = userStats.totalDistance;
          isUnlocked = progress >= achievement.target;
          break;
        case "activities_count":
          progress = userStats.totalActivities;
          isUnlocked = progress >= achievement.target;
          break;
        case "journeys_count":
          progress = userStats.totalJourneys;
          isUnlocked = progress >= achievement.target;
          break;
        case "elevation_total":
          progress = userStats.totalElevationGain;
          isUnlocked = progress >= achievement.target;
          break;
        case "streak_days":
          progress = userStats.streaks.current;
          isUnlocked = progress >= achievement.target;
          break;
        case "single_activity_distance":
          progress = activityStats.longestActivity;
          isUnlocked = progress >= achievement.target;
          break;
      }

      // Update or create achievement record
      if (existing) {
        await ctx.db.patch(existing._id, {
          progress,
          unlockedAt: isUnlocked ? Date.now() : 0,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("userAchievements", {
          userId,
          achievementId: achievement.id,
          progress,
          unlockedAt: isUnlocked ? Date.now() : 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      if (isUnlocked && (!existing || existing.unlockedAt === 0)) {
        newlyUnlocked.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
        });
      }
    }

    return { newlyUnlocked };
  },
});

// Record analytics event
export const recordEvent = mutation({
  args: {
    event: v.string(),
    properties: v.optional(v.any()),
    journeyId: v.optional(v.id("journeys")),
    activityId: v.optional(v.id("activities")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    return await ctx.db.insert("analyticsEvents", {
      userId: identity.subject,
      event: args.event,
      properties: args.properties || {},
      journeyId: args.journeyId,
      activityId: args.activityId,
      timestamp: Date.now(),
    });
  },
});

// Get analytics events for admin/debugging
export const getAnalyticsEvents = query({
  args: {
    limit: v.optional(v.number()),
    event: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    let query = ctx.db
      .query("analyticsEvents")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .order("desc");

    if (args.event) {
      query = query.filter((q) => q.eq(q.field("event"), args.event));
    }

    return await query.take(args.limit || 100);
  },
});

// Helper functions

function calculateActivityStreaks(activities: any[]) {
  if (activities.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort activities by date
  const sortedActivities = activities
    .filter((a) => a.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  if (sortedActivities.length === 0) {
    return { current: 0, longest: 0 };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Group activities by day
  const activityDays = new Set<number>();
  for (const activity of sortedActivities) {
    const activityDate = new Date(activity.startTime);
    activityDate.setHours(0, 0, 0, 0);
    activityDays.add(activityDate.getTime());
  }

  const uniqueDays = Array.from(activityDays).sort((a, b) => a - b);

  const currentStreak = 0;
  let longestStreak = 0;
  let currentStreakLength = 1;

  // Calculate longest streak
  for (let i = 1; i < uniqueDays.length; i++) {
    const dayDiff = (uniqueDays[i] - uniqueDays[i - 1]) / dayMs;

    if (dayDiff === 1) {
      currentStreakLength++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreakLength);
      currentStreakLength = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreakLength);

  return { current: currentStreak, longest: longestStreak };
}

// Analytics for journey and activity insights
export const trackEvent = mutation({
  args: {
    eventType: v.string(),
    userId: v.optional(v.id("users")),
    journeyId: v.optional(v.id("journeys")),
    activityId: v.optional(v.id("activities")),
    metadata: v.optional(
      v.object({
        deviceType: v.optional(v.string()),
        platform: v.optional(v.string()),
        duration: v.optional(v.number()),
        features: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analytics", {
      eventType: args.eventType,
      userId: args.userId,
      journeyId: args.journeyId,
      activityId: args.activityId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

export const getJourneyAnalytics = query({
  args: { journeyId: v.id("journeys") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify user owns this journey
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or access denied");
    }

    // Get all activities for this journey
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("journeyId"), args.journeyId))
      .collect();

    // Calculate total stats
    const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
    const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
    const totalElevationGain = activities.reduce(
      (sum, activity) => sum + (activity.elevationGain || 0),
      0
    );

    // Group activities by type
    const activityTypes = activities.reduce(
      (acc, activity) => {
        const type = activity.activityType || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Group activities by month for trend analysis
    const monthlyData = activities.reduce(
      (acc, activity) => {
        const date = new Date(activity.startTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!acc[monthKey]) {
          acc[monthKey] = { count: 0, distance: 0, duration: 0 };
        }

        acc[monthKey].count += 1;
        acc[monthKey].distance += activity.distance || 0;
        acc[monthKey].duration += activity.duration || 0;

        return acc;
      },
      {} as Record<string, { count: number; distance: number; duration: number }>
    );

    return {
      totalStats: {
        activitiesCount: activities.length,
        totalDistance,
        totalDuration,
        totalElevationGain,
        averageDistance: totalDistance / activities.length || 0,
        averageDuration: totalDuration / activities.length || 0,
      },
      activityTypes,
      monthlyData,
      lastActivity: activities.length > 0 ? Math.max(...activities.map((a) => a.startTime)) : null,
      firstActivity: activities.length > 0 ? Math.min(...activities.map((a) => a.startTime)) : null,
    };
  },
});

export const getUserAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get all user's journeys
    const journeys = await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Get all activities across all journeys
    const allActivities = [];
    for (const journey of journeys) {
      const activities = await ctx.db
        .query("activities")
        .filter((q) => q.eq(q.field("journeyId"), journey._id))
        .collect();
      allActivities.push(...activities);
    }

    // Calculate user-wide statistics
    const totalDistance = allActivities.reduce(
      (sum, activity) => sum + (activity.distance || 0),
      0
    );
    const totalDuration = allActivities.reduce(
      (sum, activity) => sum + (activity.duration || 0),
      0
    );
    const totalElevationGain = allActivities.reduce(
      (sum, activity) => sum + (activity.elevationGain || 0),
      0
    );

    // Most active months
    const monthlyActivity = allActivities.reduce(
      (acc, activity) => {
        const date = new Date(activity.startTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Activity type distribution
    const activityTypeStats = allActivities.reduce(
      (acc, activity) => {
        const type = activity.activityType || "Unknown";
        if (!acc[type]) {
          acc[type] = { count: 0, distance: 0, duration: 0 };
        }
        acc[type].count += 1;
        acc[type].distance += activity.distance || 0;
        acc[type].duration += activity.duration || 0;
        return acc;
      },
      {} as Record<string, { count: number; distance: number; duration: number }>
    );

    return {
      overallStats: {
        totalJourneys: journeys.length,
        totalActivities: allActivities.length,
        totalDistance,
        totalDuration,
        totalElevationGain,
      },
      monthlyActivity,
      activityTypeStats,
      achievements: await calculateAchievements(allActivities),
    };
  },
});

// Helper function to calculate user achievements
async function calculateAchievements(activities: any[]) {
  const achievements = [];

  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const totalActivities = activities.length;
  const longestActivity = Math.max(...activities.map((a) => a.distance || 0));

  // Distance milestones
  if (totalDistance >= 1000000)
    achievements.push({ type: "distance", level: "1000km", unlocked: true });
  else if (totalDistance >= 500000)
    achievements.push({ type: "distance", level: "500km", unlocked: true });
  else if (totalDistance >= 100000)
    achievements.push({ type: "distance", level: "100km", unlocked: true });

  // Activity count milestones
  if (totalActivities >= 100)
    achievements.push({ type: "activities", level: "century", unlocked: true });
  else if (totalActivities >= 50)
    achievements.push({ type: "activities", level: "fifty", unlocked: true });
  else if (totalActivities >= 10)
    achievements.push({ type: "activities", level: "ten", unlocked: true });

  // Single activity achievements
  if (longestActivity >= 100000)
    achievements.push({ type: "single", level: "100km", unlocked: true });
  else if (longestActivity >= 50000)
    achievements.push({ type: "single", level: "50km", unlocked: true });

  return achievements;
}

export const getPopularRoutes = query({
  args: {
    limit: v.optional(v.number()),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // This would require spatial indexing for proper implementation
    // For now, return most recently created public activities
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .order("desc")
      .take(limit);

    return activities.map((activity) => ({
      id: activity._id,
      name: activity.name,
      distance: activity.distance,
      elevationGain: activity.elevationGain,
      activityType: activity.activityType,
      startPoint: activity.routeData?.coordinates?.[0],
    }));
  },
});
