// convex/settings.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// User preferences and settings management
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return getDefaultSettings();
    }

    return settings;
  },
});

export const updateUserSettings = mutation({
  args: {
    preferences: v.object({
      // Display preferences
      units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
      language: v.optional(v.string()),
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("auto"))),

      // Map preferences
      defaultMapStyle: v.optional(v.string()),
      defaultZoomLevel: v.optional(v.number()),
      showElevationProfile: v.optional(v.boolean()),
      animateRoutes: v.optional(v.boolean()),

      // Activity preferences
      defaultActivityType: v.optional(v.string()),
      autoDetectActivityType: v.optional(v.boolean()),
      defaultPrivacy: v.optional(
        v.union(v.literal("private"), v.literal("public"), v.literal("unlisted"))
      ),

      // Export preferences
      defaultExportFormat: v.optional(v.string()),
      defaultExportQuality: v.optional(
        v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
      ),
      includeWatermark: v.optional(v.boolean()),

      // Notification preferences
      emailNotifications: v.optional(v.boolean()),
      marketingEmails: v.optional(v.boolean()),
      weeklyDigest: v.optional(v.boolean()),

      // Advanced preferences
      enableBetaFeatures: v.optional(v.boolean()),
      dataProcessingConsent: v.optional(v.boolean()),
      analyticsConsent: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get existing settings or create new ones
    const existingSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (existingSettings) {
      // Update existing settings
      return await ctx.db.patch(existingSettings._id, {
        preferences: {
          ...existingSettings.preferences,
          ...args.preferences,
        },
        updatedAt: Date.now(),
      });
    } else {
      // Create new settings
      return await ctx.db.insert("userSettings", {
        userId: identity.subject,
        preferences: {
          ...getDefaultSettings().preferences,
          ...args.preferences,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getDefaultJourneySettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return {
      defaultMapStyle: settings?.preferences.defaultMapStyle || "outdoors",
      defaultActivityType: settings?.preferences.defaultActivityType || "cycling",
      defaultPrivacy: settings?.preferences.defaultPrivacy || "private",
      autoDetectActivityType: settings?.preferences.autoDetectActivityType ?? true,
    };
  },
});

export const updateNotificationSettings = mutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    weeklyDigest: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existingSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    const notificationPrefs = {
      emailNotifications: args.emailNotifications,
      marketingEmails: args.marketingEmails,
      weeklyDigest: args.weeklyDigest,
      pushNotifications: args.pushNotifications,
    };

    if (existingSettings) {
      return await ctx.db.patch(existingSettings._id, {
        preferences: {
          ...existingSettings.preferences,
          ...notificationPrefs,
        },
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("userSettings", {
        userId: identity.subject,
        preferences: {
          ...getDefaultSettings().preferences,
          ...notificationPrefs,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getPrivacySettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    return {
      defaultPrivacy: settings?.preferences.defaultPrivacy || "private",
      dataProcessingConsent: settings?.preferences.dataProcessingConsent ?? false,
      analyticsConsent: settings?.preferences.analyticsConsent ?? false,
      shareLocation: settings?.preferences.shareLocation ?? false,
      allowPublicProfile: settings?.preferences.allowPublicProfile ?? false,
    };
  },
});

export const updatePrivacySettings = mutation({
  args: {
    defaultPrivacy: v.optional(
      v.union(v.literal("private"), v.literal("public"), v.literal("unlisted"))
    ),
    dataProcessingConsent: v.optional(v.boolean()),
    analyticsConsent: v.optional(v.boolean()),
    shareLocation: v.optional(v.boolean()),
    allowPublicProfile: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existingSettings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    const privacyPrefs = {
      defaultPrivacy: args.defaultPrivacy,
      dataProcessingConsent: args.dataProcessingConsent,
      analyticsConsent: args.analyticsConsent,
      shareLocation: args.shareLocation,
      allowPublicProfile: args.allowPublicProfile,
    };

    if (existingSettings) {
      return await ctx.db.patch(existingSettings._id, {
        preferences: {
          ...existingSettings.preferences,
          ...privacyPrefs,
        },
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("userSettings", {
        userId: identity.subject,
        preferences: {
          ...getDefaultSettings().preferences,
          ...privacyPrefs,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Brand kit and custom styling
export const getUserBrandKit = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const brandKit = await ctx.db
      .query("brandKits")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!brandKit) {
      return getDefaultBrandKit();
    }

    return brandKit;
  },
});

export const updateBrandKit = mutation({
  args: {
    name: v.optional(v.string()),
    colors: v.optional(
      v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.string(),
        background: v.string(),
        text: v.string(),
      })
    ),
    fonts: v.optional(
      v.object({
        heading: v.string(),
        body: v.string(),
      })
    ),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    watermarkSettings: v.optional(
      v.object({
        enabled: v.boolean(),
        position: v.union(
          v.literal("top-left"),
          v.literal("top-right"),
          v.literal("bottom-left"),
          v.literal("bottom-right")
        ),
        opacity: v.number(),
        size: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existingBrandKit = await ctx.db
      .query("brandKits")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (existingBrandKit) {
      return await ctx.db.patch(existingBrandKit._id, {
        name: args.name || existingBrandKit.name,
        colors: args.colors || existingBrandKit.colors,
        fonts: args.fonts || existingBrandKit.fonts,
        logoUrl: args.logoUrl || existingBrandKit.logoUrl,
        logoStorageId: args.logoStorageId || existingBrandKit.logoStorageId,
        watermarkSettings: args.watermarkSettings || existingBrandKit.watermarkSettings,
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.insert("brandKits", {
        userId: identity.subject,
        name: args.name || "My Brand Kit",
        colors: args.colors || getDefaultBrandKit().colors,
        fonts: args.fonts || getDefaultBrandKit().fonts,
        logoUrl: args.logoUrl,
        logoStorageId: args.logoStorageId,
        watermarkSettings: args.watermarkSettings || getDefaultBrandKit().watermarkSettings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Account management
export const getAccountInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    // Get usage statistics
    const journeys = await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const totalActivities = await Promise.all(
      journeys.map(async (journey) => {
        const activities = await ctx.db
          .query("activities")
          .filter((q) => q.eq(q.field("journeyId"), journey._id))
          .collect();
        return activities.length;
      })
    );

    const exports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    return {
      user: user
        ? {
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            createdAt: user.createdAt,
            timezone: user.timezone,
            locale: user.locale,
          }
        : null,
      usage: {
        totalJourneys: journeys.length,
        totalActivities: totalActivities.reduce((sum, count) => sum + count, 0),
        totalExports: exports.length,
        storageUsed: calculateStorageUsage(journeys, exports),
      },
      limits: {
        maxJourneys: 100, // Example limits - adjust based on plan
        maxActivitiesPerJourney: 500,
        maxExportsPerMonth: 100,
        maxStorageGB: 5,
      },
    };
  },
});

export const updateAccountInfo = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (existingUser) {
      return await ctx.db.patch(existingUser._id, {
        name: args.name || existingUser.name,
        timezone: args.timezone || existingUser.timezone,
        locale: args.locale || existingUser.locale,
        updatedAt: Date.now(),
      });
    }

    // If user doesn't exist in our db, create them
    return await ctx.db.insert("users", {
      userId: identity.subject,
      email: identity.email || "",
      name: args.name || identity.name || "",
      timezone: args.timezone || "UTC",
      locale: args.locale || "en",
      profileImageUrl: identity.pictureUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteAccount = mutation({
  args: {
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify confirmation text
    if (args.confirmationText !== "DELETE") {
      throw new Error("Invalid confirmation text");
    }

    // Delete all user data in order (foreign key constraints)

    // 1. Delete all activities and their associated data
    const journeys = await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const journey of journeys) {
      const activities = await ctx.db
        .query("activities")
        .filter((q) => q.eq(q.field("journeyId"), journey._id))
        .collect();

      for (const activity of activities) {
        await ctx.db.delete(activity._id);
      }
    }

    // 2. Delete journeys
    for (const journey of journeys) {
      await ctx.db.delete(journey._id);
    }

    // 3. Delete templates
    const templates = await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const template of templates) {
      await ctx.db.delete(template._id);
    }

    // 4. Delete exports
    const exports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const exportItem of exports) {
      await ctx.db.delete(exportItem._id);
    }

    // 5. Delete share links
    const shareLinks = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const shareLink of shareLinks) {
      await ctx.db.delete(shareLink._id);
    }

    // 6. Delete analytics data
    const analytics = await ctx.db
      .query("analytics")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const analytic of analytics) {
      await ctx.db.delete(analytic._id);
    }

    // 7. Delete settings
    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (settings) {
      await ctx.db.delete(settings._id);
    }

    // 8. Delete brand kit
    const brandKit = await ctx.db
      .query("brandKits")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (brandKit) {
      await ctx.db.delete(brandKit._id);
    }

    // 9. Finally delete user
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }

    return { success: true, message: "Account deleted successfully" };
  },
});

export const exportUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Collect all user data for GDPR compliance
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    const journeys = await ctx.db
      .query("journeys")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const allActivities = [];
    for (const journey of journeys) {
      const activities = await ctx.db
        .query("activities")
        .filter((q) => q.eq(q.field("journeyId"), journey._id))
        .collect();
      allActivities.push(...activities);
    }

    const settings = await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    const brandKit = await ctx.db
      .query("brandKits")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    const exports = await ctx.db
      .query("exports")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const shareLinks = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const userData = {
      user,
      journeys,
      activities: allActivities,
      settings,
      brandKit,
      exports,
      shareLinks,
      exportedAt: Date.now(),
    };

    // Store the export data temporarily for download
    const exportId = await ctx.db.insert("dataExports", {
      userId: identity.subject,
      data: userData,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return { exportId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  },
});

// Helper functions
function getDefaultSettings() {
  return {
    preferences: {
      units: "metric" as const,
      language: "en",
      theme: "auto" as const,
      defaultMapStyle: "outdoors",
      defaultZoomLevel: 12,
      showElevationProfile: true,
      animateRoutes: true,
      defaultActivityType: "cycling",
      autoDetectActivityType: true,
      defaultPrivacy: "private" as const,
      defaultExportFormat: "png",
      defaultExportQuality: "high" as const,
      includeWatermark: false,
      emailNotifications: true,
      marketingEmails: false,
      weeklyDigest: true,
      enableBetaFeatures: false,
      dataProcessingConsent: false,
      analyticsConsent: false,
      shareLocation: false,
      allowPublicProfile: false,
    },
  };
}

function getDefaultBrandKit() {
  return {
    colors: {
      primary: "#3B82F6",
      secondary: "#10B981",
      accent: "#F59E0B",
      background: "#FFFFFF",
      text: "#1F2937",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
    watermarkSettings: {
      enabled: false,
      position: "bottom-right" as const,
      opacity: 50,
      size: "medium" as const,
    },
  };
}

function calculateStorageUsage(journeys: any[], exports: any[]): number {
  // Calculate approximate storage usage in bytes
  let totalSize = 0;

  // Rough estimates - in production you'd want more accurate calculations
  totalSize += journeys.length * 1024; // ~1KB per journey
  totalSize += exports.length * 1024 * 1024; // ~1MB per export

  return totalSize;
}
