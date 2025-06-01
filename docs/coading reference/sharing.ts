// convex/sharing.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate shareable links for journeys
export const createShareLink = mutation({
  args: {
    journeyId: v.id("journeys"),
    expiresAt: v.optional(v.number()),
    allowDownload: v.optional(v.boolean()),
    requirePassword: v.optional(v.boolean()),
    password: v.optional(v.string()),
    customSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify user owns this journey
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or access denied");
    }

    // Generate unique share token
    const shareToken = args.customSlug || generateShareToken();

    // Check if custom slug is already taken
    if (args.customSlug) {
      const existing = await ctx.db
        .query("shareLinks")
        .filter((q) => q.eq(q.field("shareToken"), args.customSlug))
        .first();

      if (existing && existing.journeyId !== args.journeyId) {
        throw new Error("Custom slug already taken");
      }
    }

    // Hash password if provided
    let hashedPassword;
    if (args.password) {
      hashedPassword = await hashPassword(args.password);
    }

    return await ctx.db.insert("shareLinks", {
      journeyId: args.journeyId,
      userId: identity.subject,
      shareToken,
      expiresAt: args.expiresAt,
      allowDownload: args.allowDownload || false,
      requirePassword: args.requirePassword || false,
      hashedPassword,
      createdAt: Date.now(),
      viewCount: 0,
      isActive: true,
    });
  },
});

export const getShareLink = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!shareLink || !shareLink.isActive) {
      throw new Error("Share link not found or inactive");
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
      throw new Error("Share link has expired");
    }

    // Get journey data (public version)
    const journey = await ctx.db.get(shareLink.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }

    // Get activities for this journey
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("journeyId"), shareLink.journeyId))
      .collect();

    return {
      shareLink: {
        id: shareLink._id,
        requirePassword: shareLink.requirePassword,
        allowDownload: shareLink.allowDownload,
        viewCount: shareLink.viewCount,
      },
      journey: {
        id: journey._id,
        title: journey.title,
        description: journey.description,
        coverImageUrl: journey.coverImageUrl,
        createdAt: journey.createdAt,
        totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0),
        totalActivities: activities.length,
        activityTypes: [...new Set(activities.map((a) => a.activityType).filter(Boolean))],
      },
    };
  },
});

export const verifySharePassword = mutation({
  args: {
    shareToken: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!shareLink || !shareLink.isActive) {
      throw new Error("Share link not found or inactive");
    }

    if (!shareLink.requirePassword || !shareLink.hashedPassword) {
      return { success: true };
    }

    const isValid = await verifyPassword(args.password, shareLink.hashedPassword);

    if (isValid) {
      // Increment view count
      await ctx.db.patch(shareLink._id, {
        viewCount: shareLink.viewCount + 1,
      });
    }

    return { success: isValid };
  },
});

export const getSharedJourneyData = query({
  args: {
    shareToken: v.string(),
    authenticated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const shareLink = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("shareToken"), args.shareToken))
      .first();

    if (!shareLink || !shareLink.isActive) {
      throw new Error("Share link not found or inactive");
    }

    // Check if expired
    if (shareLink.expiresAt && shareLink.expiresAt < Date.now()) {
      throw new Error("Share link has expired");
    }

    // If password required and not authenticated, don't return data
    if (shareLink.requirePassword && !args.authenticated) {
      throw new Error("Password required");
    }

    // Get full journey data
    const journey = await ctx.db.get(shareLink.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }

    // Get activities for this journey
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("journeyId"), shareLink.journeyId))
      .collect();

    // Get journey owner info (limited)
    const owner = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), journey.userId))
      .first();

    return {
      journey: {
        ...journey,
        owner: owner
          ? {
              name: owner.name,
              profileImageUrl: owner.profileImageUrl,
            }
          : null,
      },
      activities: activities.map((activity) => ({
        ...activity,
        // Remove sensitive data for shared views
        gpxData: undefined,
      })),
      shareOptions: {
        allowDownload: shareLink.allowDownload,
      },
    };
  },
});

export const getUserShareLinks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const shareLinks = await ctx.db
      .query("shareLinks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .collect();

    // Get journey titles for each share link
    const linksWithJourneyInfo = await Promise.all(
      shareLinks.map(async (link) => {
        const journey = await ctx.db.get(link.journeyId);
        return {
          ...link,
          journeyTitle: journey?.title || "Unknown Journey",
        };
      })
    );

    return linksWithJourneyInfo;
  },
});

export const updateShareLink = mutation({
  args: {
    shareLinkId: v.id("shareLinks"),
    expiresAt: v.optional(v.number()),
    allowDownload: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const shareLink = await ctx.db.get(args.shareLinkId);
    if (!shareLink || shareLink.userId !== identity.subject) {
      throw new Error("Share link not found or access denied");
    }

    return await ctx.db.patch(args.shareLinkId, {
      expiresAt: args.expiresAt,
      allowDownload: args.allowDownload,
      isActive: args.isActive,
    });
  },
});

export const deleteShareLink = mutation({
  args: { shareLinkId: v.id("shareLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const shareLink = await ctx.db.get(args.shareLinkId);
    if (!shareLink || shareLink.userId !== identity.subject) {
      throw new Error("Share link not found or access denied");
    }

    await ctx.db.delete(args.shareLinkId);
    return { success: true };
  },
});

// Social media integration helpers
export const generateSocialMediaPosts = mutation({
  args: {
    journeyId: v.id("journeys"),
    platforms: v.array(v.string()),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== identity.subject) {
      throw new Error("Journey not found or access denied");
    }

    // Get journey statistics
    const activities = await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("journeyId"), args.journeyId))
      .collect();

    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalElevation = activities.reduce((sum, a) => sum + (a.elevationGain || 0), 0);

    // Generate platform-specific posts
    const posts = [];

    for (const platform of args.platforms) {
      let post;
      const stats = `${(totalDistance / 1000).toFixed(1)}km, ${activities.length} activities`;

      switch (platform) {
        case "twitter":
          post = {
            platform: "twitter",
            message:
              args.customMessage ||
              `Just completed my ${journey.title} journey! ${stats} 🚴‍♂️ #cycling #adventure`,
            characterLimit: 280,
          };
          break;
        case "instagram":
          post = {
            platform: "instagram",
            message:
              args.customMessage ||
              `${journey.title}\n\n${stats}\n${journey.description || ""}\n\n#adventure #outdoors #fitness`,
            characterLimit: 2200,
          };
          break;
        case "facebook":
          post = {
            platform: "facebook",
            message:
              args.customMessage ||
              `Excited to share my ${journey.title} journey! Covered ${stats} with some amazing views along the way. ${journey.description || ""}`,
            characterLimit: 5000,
          };
          break;
        default:
          post = {
            platform,
            message: args.customMessage || `Check out my ${journey.title} journey: ${stats}`,
            characterLimit: 500,
          };
      }

      posts.push(post);
    }

    return posts;
  },
});

// Utility functions
function generateShareToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use proper bcrypt or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}
