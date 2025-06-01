import { v } from "convex/values";
)
import { mutation, query } from "./_generated/server";

// Get user profile by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return user;
  },
});

// Get user profile by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

// Create or update user profile
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profileImageUrl: args.profileImageUrl,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    } else {
      // Create new user with default preferences
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profileImageUrl: args.profileImageUrl,
        preferences: {
          defaultMapStyle: "outdoors",
          defaultActivityColor: "#3B82F6",
          defaultPrivacy: "private",
          units: "metric",
          timezone: "UTC",
        },
        stats: {
          totalJourneys: 0,
          totalActivities: 0,
          totalDistance: 0,
          totalElevationGain: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return userId;
    }
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      defaultMapStyle: v.optional(v.string()),
      defaultActivityColor: v.optional(v.string()),
      defaultPrivacy: v.optional(
        v.union(v.literal("public"), v.literal("unlisted"), v.literal("private"))
      ),
      units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
      timezone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      preferences: {
        ...user.preferences,
        ...args.preferences,
      },
      updatedAt: Date.now(),
    });
  },
});

// Update user stats (called internally by other functions)
export const updateUserStats = mutation({
  args: {
    userId: v.id("users"),
    statsUpdate: v.object({
      totalJourneys: v.optional(v.number()),
      totalActivities: v.optional(v.number()),
      totalDistance: v.optional(v.number()),
      totalElevationGain: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      stats: {
        ...user.stats,
        ...args.statsUpdate,
      },
      updatedAt: Date.now(),
    });
  },
});

// Delete user account and all associated data
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all user's journeys
    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all activities for each journey
    for (const journey of journeys) {
      const activities = await ctx.db
        .query("activities")
        .withIndex("by_journey_id", (q) => q.eq("journeyId", journey._id))
        .collect();

      for (const activity of activities) {
        await ctx.db.delete(activity._id);
      }

      // Delete journey
      await ctx.db.delete(journey._id);
    }

    // Delete all user's templates
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    for (const template of templates) {
      await ctx.db.delete(template._id);
    }

    // Delete user profile
    await ctx.db.delete(args.userId);
  },
});

// Get user activity summary
export const getUserActivitySummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const journeys = await ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();

    const recentActivities = await ctx.db
      .query("activities")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);

    return {
      user: {
        ...user,
        stats: user.stats,
      },
      totalJourneys: journeys.length,
      recentActivities,
      journeysCreatedThisMonth: journeys.filter(
        (j) => j.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000
      ).length,
    };
  },
});
