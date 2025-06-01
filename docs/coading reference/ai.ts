import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// AI analysis types
const AnalysisType = v.union(
  v.literal("route_categorization"),
  v.literal("activity_detection"),
  v.literal("difficulty_assessment"),
  v.literal("poi_identification"),
  v.literal("design_suggestion"),
  v.literal("content_generation")
);

// AI analysis status
const AnalysisStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// Request AI analysis for activity
export const requestActivityAnalysis = mutation({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
    analysisTypes: v.array(AnalysisType),
  },
  handler: async (ctx, args) => {
    const analysisId = await ctx.db.insert("aiAnalyses", {
      userId: args.userId,
      entityType: "activity",
      entityId: args.activityId,
      analysisTypes: args.analysisTypes,
      status: "pending" as const,
      results: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule AI processing
    await ctx.scheduler.runAfter(0, api.ai.processAnalysis, {
      analysisId,
    });

    return analysisId;
  },
});

// Request AI analysis for journey
export const requestJourneyAnalysis = mutation({
  args: {
    userId: v.id("users"),
    journeyId: v.id("journeys"),
    analysisTypes: v.array(AnalysisType),
  },
  handler: async (ctx, args) => {
    const analysisId = await ctx.db.insert("aiAnalyses", {
      userId: args.userId,
      entityType: "journey",
      entityId: args.journeyId,
      analysisTypes: args.analysisTypes,
      status: "pending" as const,
      results: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule AI processing
    await ctx.scheduler.runAfter(0, api.ai.processAnalysis, {
      analysisId,
    });

    return analysisId;
  },
});

// Process AI analysis
export const processAnalysis = action({
  args: { analysisId: v.id("aiAnalyses") },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.ai.updateAnalysisStatus, {
      analysisId: args.analysisId,
      status: "processing",
    });

    try {
      const analysis = await ctx.runQuery(api.ai.getAnalysis, {
        analysisId: args.analysisId,
      });

      if (!analysis) {
        throw new Error("Analysis not found");
      }

      let entityData;
      if (analysis.entityType === "activity") {
        entityData = await ctx.runQuery(api.activities.getActivityById, {
          activityId: analysis.entityId as Id<"activities">,
        });
      } else if (analysis.entityType === "journey") {
        entityData = await ctx.runQuery(api.journeys.getJourneyById, {
          journeyId: analysis.entityId as Id<"journeys">,
        });
      }

      if (!entityData) {
        throw new Error("Entity not found");
      }

      const results: Record<string, any> = {};

      // Process each analysis type
      for (const analysisType of analysis.analysisTypes) {
        try {
          switch (analysisType) {
            case "route_categorization":
              results[analysisType] = await analyzeRouteCategory(entityData);
              break;
            case "activity_detection":
              results[analysisType] = await detectActivityType(entityData);
              break;
            case "difficulty_assessment":
              results[analysisType] = await assessDifficulty(entityData);
              break;
            case "poi_identification":
              results[analysisType] = await identifyPointsOfInterest(entityData);
              break;
            case "design_suggestion":
              results[analysisType] = await suggestDesignElements(entityData);
              break;
            case "content_generation":
              results[analysisType] = await generateContent(entityData);
              break;
          }
        } catch (error) {
          console.error(`Error processing ${analysisType}:`, error);
          results[analysisType] = {
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }

      await ctx.runMutation(api.ai.completeAnalysis, {
        analysisId: args.analysisId,
        results,
      });
    } catch (error) {
      console.error("AI analysis failed:", error);
      await ctx.runMutation(api.ai.updateAnalysisStatus, {
        analysisId: args.analysisId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// AI analysis helper functions
async function analyzeRouteCategory(entityData: any) {
  // Mock implementation - replace with actual Gemini AI call
  const routeData = extractRouteFeatures(entityData);

  // This would call Gemini AI with route characteristics
  const mockCategories = [
    { category: "Mountain Trail", confidence: 0.85 },
    { category: "Urban Route", confidence: 0.15 },
  ];

  return {
    primaryCategory: mockCategories[0].category,
    allCategories: mockCategories,
    features: routeData,
  };
}

async function detectActivityType(entityData: any) {
  // Mock implementation
  const speedProfile = calculateSpeedProfile(entityData);
  const elevationProfile = calculateElevationProfile(entityData);

  const mockDetection = {
    detectedType: "hiking",
    confidence: 0.92,
    alternatives: [{ type: "trail_running", confidence: 0.08 }],
    reasoning: "Consistent moderate pace with significant elevation changes typical of hiking",
  };

  return mockDetection;
}

async function assessDifficulty(entityData: any) {
  const stats = entityData.stats || {};
  const elevationGain = stats.elevationGain || 0;
  const distance = stats.distance || 0;
  const duration = stats.duration || 0;

  // Simple difficulty calculation - enhance with AI
  let difficulty = "easy";
  let score = 0;

  if (elevationGain > 500) score += 2;
  if (distance > 10000) score += 1; // 10km
  if (duration > 3 * 60 * 60 * 1000) score += 1; // 3 hours

  if (score >= 3) difficulty = "hard";
  else if (score >= 1) difficulty = "moderate";

  return {
    difficulty,
    score: score / 4, // Normalized score
    factors: {
      elevation: elevationGain,
      distance,
      duration,
    },
    description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty based on elevation gain, distance, and duration`,
  };
}

async function identifyPointsOfInterest(entityData: any) {
  // Mock POI identification - would integrate with actual mapping APIs
  const mockPOIs = [
    {
      name: "Scenic Viewpoint",
      type: "viewpoint",
      coordinates: [0, 0], // Would extract from route
      description: "Mountain vista with panoramic views",
    },
    {
      name: "Trail Junction",
      type: "junction",
      coordinates: [0, 0],
      description: "Major trail intersection",
    },
  ];

  return {
    poisFound: mockPOIs.length,
    pois: mockPOIs,
  };
}

async function suggestDesignElements(entityData: any) {
  // AI-powered design suggestions based on route characteristics
  const activityType = entityData.activityType || "unknown";
  const stats = entityData.stats || {};

  const suggestions = {
    colorScheme: getColorSchemeForActivity(activityType),
    layoutType: stats.distance > 20000 ? "detailed" : "minimal",
    emphasizeStats: getImportantStats(activityType, stats),
    templateRecommendations: getTemplateRecommendations(activityType),
  };

  return suggestions;
}

async function generateContent(entityData: any) {
  const activityType = entityData.activityType || "activity";
  const stats = entityData.stats || {};

  // Mock content generation - would use actual AI
  const content = {
    title: `Amazing ${activityType} adventure`,
    description: `Completed a ${(stats.distance / 1000).toFixed(1)}km ${activityType} with ${stats.elevationGain}m elevation gain.`,
    hashtags: [`#${activityType}`, "#adventure", "#outdoors", "#fitness"],
    socialCaption: `Just finished an epic ${activityType}! 🏃‍♂️ ${(stats.distance / 1000).toFixed(1)}km covered with some amazing views along the way. #${activityType} #adventure`,
  };

  return content;
}

// Helper functions
function extractRouteFeatures(entityData: any) {
  return {
    totalDistance: entityData.stats?.distance || 0,
    elevationGain: entityData.stats?.elevationGain || 0,
    elevationLoss: entityData.stats?.elevationLoss || 0,
    averageSpeed: entityData.stats?.averageSpeed || 0,
    maxSpeed: entityData.stats?.maxSpeed || 0,
    duration: entityData.stats?.duration || 0,
  };
}

function calculateSpeedProfile(entityData: any) {
  // Mock speed profile calculation
  return {
    average: entityData.stats?.averageSpeed || 0,
    max: entityData.stats?.maxSpeed || 0,
    variance: 0.2, // Mock variance
  };
}

function calculateElevationProfile(entityData: any) {
  return {
    gain: entityData.stats?.elevationGain || 0,
    loss: entityData.stats?.elevationLoss || 0,
    maxElevation: entityData.stats?.maxElevation || 0,
    minElevation: entityData.stats?.minElevation || 0,
  };
}

function getColorSchemeForActivity(activityType: string) {
  const schemes: Record<string, string[]> = {
    hiking: ["#228B22", "#32CD32", "#90EE90"],
    cycling: ["#FF6B35", "#F7931E", "#FFD700"],
    running: ["#DC143C", "#FF69B4", "#FF1493"],
    default: ["#4A90E2", "#7B68EE", "#9370DB"],
  };

  return schemes[activityType] || schemes.default;
}

function getImportantStats(activityType: string, stats: any) {
  const baseStats = ["distance", "duration"];

  const typeSpecificStats: Record<string, string[]> = {
    hiking: ["elevationGain", "maxElevation"],
    cycling: ["averageSpeed", "maxSpeed"],
    running: ["averageSpeed", "pace"],
  };

  return [...baseStats, ...(typeSpecificStats[activityType] || [])];
}

function getTemplateRecommendations(activityType: string) {
  return [`${activityType}_minimal`, `${activityType}_detailed`, "adventure_showcase"];
}

// Get analysis result
export const getAnalysis = query({
  args: { analysisId: v.id("aiAnalyses") },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId);
    return analysis;
  },
});

// Update analysis status
export const updateAnalysisStatus = mutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    status: AnalysisStatus,
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Complete analysis
export const completeAnalysis = mutation({
  args: {
    analysisId: v.id("aiAnalyses"),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      status: "completed" as const,
      results: args.results,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get user's AI analyses
export const getUserAnalyses = query({
  args: {
    userId: v.id("users"),
    entityType: v.optional(v.union(v.literal("activity"), v.literal("journey"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("aiAnalyses")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    if (args.entityType) {
      query = query.filter((q) => q.eq(q.field("entityType"), args.entityType));
    }

    const analyses = await query.order("desc").take(args.limit || 50);

    return analyses;
  },
});

// Cache frequently requested AI results
export const cacheAIResult = mutation({
  args: {
    cacheKey: v.string(),
    analysisType: AnalysisType,
    result: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiCache", {
      cacheKey: args.cacheKey,
      analysisType: args.analysisType,
      result: args.result,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
  },
});

// Get cached AI result
export const getCachedResult = query({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("aiCache")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .unique();

    return cached?.result || null;
  },
});

// Clean up expired cache entries
export const cleanupExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const expiredEntries = await ctx.db
      .query("aiCache")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deletedCount: expiredEntries.length };
  },
});
