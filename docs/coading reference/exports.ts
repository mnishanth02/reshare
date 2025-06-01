import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Export status enum
const ExportStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// Export format enum
const ExportFormat = v.union(
  v.literal("png"),
  v.literal("jpeg"),
  v.literal("webp"),
  v.literal("svg"),
  v.literal("pdf")
);

// Export settings schema
const exportSettingsSchema = v.object({
  format: ExportFormat,
  width: v.number(),
  height: v.number(),
  dpi: v.number(),
  quality: v.optional(v.number()), // For JPEG/WebP
  backgroundColor: v.optional(v.string()),
  transparent: v.optional(v.boolean()),
});

// Create export job
export const createExportJob = mutation({
  args: {
    userId: v.id("users"),
    journeyId: v.id("journeys"),
    templateId: v.optional(v.id("templates")),
    settings: exportSettingsSchema,
    customElements: v.optional(v.array(v.any())), // Custom design elements
    activityIds: v.optional(v.array(v.id("activities"))), // Specific activities to include
  },
  handler: async (ctx, args) => {
    const exportJobId = await ctx.db.insert("exportJobs", {
      userId: args.userId,
      journeyId: args.journeyId,
      templateId: args.templateId,
      settings: args.settings,
      customElements: args.customElements || [],
      activityIds: args.activityIds,
      status: "pending" as const,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule the export processing
    await ctx.scheduler.runAfter(0, api.exports.processExportJob, {
      exportJobId,
    });

    return exportJobId;
  },
});

// Process export job (action for external API calls)
export const processExportJob = action({
  args: { exportJobId: v.id("exportJobs") },
  handler: async (ctx, args) => {
    // Update status to processing
    await ctx.runMutation(api.exports.updateExportStatus, {
      exportJobId: args.exportJobId,
      status: "processing",
      progress: 10,
    });

    try {
      // Get export job details
      const exportJob = await ctx.runQuery(api.exports.getExportJob, {
        exportJobId: args.exportJobId,
      });

      if (!exportJob) {
        throw new Error("Export job not found");
      }

      // Get journey and activities data
      const journey = await ctx.runQuery(api.journeys.getJourneyById, {
        journeyId: exportJob.journeyId,
      });

      if (!journey) {
        throw new Error("Journey not found");
      }

      // Update progress
      await ctx.runMutation(api.exports.updateExportStatus, {
        exportJobId: args.exportJobId,
        status: "processing",
        progress: 30,
      });

      // Get activities (either specified ones or all from journey)
      const activities = exportJob.activityIds
        ? await Promise.all(
            exportJob.activityIds.map((id) =>
              ctx.runQuery(api.activities.getActivityById, { activityId: id })
            )
          )
        : await ctx.runQuery(api.activities.getActivitiesByJourney, {
            journeyId: exportJob.journeyId,
          });

      // Update progress
      await ctx.runMutation(api.exports.updateExportStatus, {
        exportJobId: args.exportJobId,
        status: "processing",
        progress: 50,
      });

      // Process template if specified
      let template = null;
      if (exportJob.templateId) {
        template = await ctx.runQuery(api.templates.getTemplateById, {
          templateId: exportJob.templateId,
        });
      }

      // Update progress
      await ctx.runMutation(api.exports.updateExportStatus, {
        exportJobId: args.exportJobId,
        status: "processing",
        progress: 70,
      });

      // Generate the static map image
      const mapImageData = await generateStaticMapImage({
        journey,
        activities: activities.filter(Boolean),
        template,
        customElements: exportJob.customElements,
        settings: exportJob.settings,
      });

      // Update progress
      await ctx.runMutation(api.exports.updateExportStatus, {
        exportJobId: args.exportJobId,
        status: "processing",
        progress: 90,
      });

      // Store the generated image
      const imageBlob = new Blob([mapImageData], {
        type: `image/${exportJob.settings.format}`,
      });

      const storageId = await ctx.storage.store(imageBlob);

      // Update export job with result
      await ctx.runMutation(api.exports.completeExportJob, {
        exportJobId: args.exportJobId,
        resultFileId: storageId,
        fileSize: mapImageData.byteLength,
      });
    } catch (error) {
      console.error("Export processing failed:", error);
      await ctx.runMutation(api.exports.updateExportStatus, {
        exportJobId: args.exportJobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Helper function to generate static map image
async function generateStaticMapImage(params: {
  journey: any;
  activities: any[];
  template: any;
  customElements: any[];
  settings: any;
}): Promise<ArrayBuffer> {
  // This would use MapLibre GL Native or similar server-side rendering
  // For now, returning mock data - implement actual map rendering logic
  const mockImageData = new Uint8Array(1024); // Mock image data
  return mockImageData.buffer;
}

// Get export job
export const getExportJob = query({
  args: { exportJobId: v.id("exportJobs") },
  handler: async (ctx, args) => {
    const exportJob = await ctx.db.get(args.exportJobId);
    return exportJob;
  },
});

// Update export status
export const updateExportStatus = mutation({
  args: {
    exportJobId: v.id("exportJobs"),
    status: ExportStatus,
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.exportJobId, {
      status: args.status,
      progress: args.progress,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Complete export job
export const completeExportJob = mutation({
  args: {
    exportJobId: v.id("exportJobs"),
    resultFileId: v.id("_storage"),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.exportJobId, {
      status: "completed" as const,
      progress: 100,
      resultFileId: args.resultFileId,
      fileSize: args.fileSize,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get user's export history
export const getUserExports = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const exports = await ctx.db
      .query("exportJobs")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return exports.slice(args.offset || 0);
  },
});

// Delete export job
export const deleteExportJob = mutation({
  args: {
    exportJobId: v.id("exportJobs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const exportJob = await ctx.db.get(args.exportJobId);
    if (!exportJob) {
      throw new Error("Export job not found");
    }

    if (exportJob.userId !== args.userId) {
      throw new Error("Unauthorized: You can only delete your own exports");
    }

    // Delete the stored file if exists
    if (exportJob.resultFileId) {
      await ctx.storage.delete(exportJob.resultFileId);
    }

    // Delete the export job
    await ctx.db.delete(args.exportJobId);
  },
});

// Batch export multiple journeys
export const createBatchExportJob = mutation({
  args: {
    userId: v.id("users"),
    journeyIds: v.array(v.id("journeys")),
    templateId: v.optional(v.id("templates")),
    settings: exportSettingsSchema,
  },
  handler: async (ctx, args) => {
    const batchJobId = await ctx.db.insert("batchExportJobs", {
      userId: args.userId,
      journeyIds: args.journeyIds,
      templateId: args.templateId,
      settings: args.settings,
      status: "pending" as const,
      progress: 0,
      totalJobs: args.journeyIds.length,
      completedJobs: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule batch processing
    await ctx.scheduler.runAfter(0, api.exports.processBatchExportJob, {
      batchJobId,
    });

    return batchJobId;
  },
});

// Process batch export job
export const processBatchExportJob = action({
  args: { batchJobId: v.id("batchExportJobs") },
  handler: async (ctx, args) => {
    const batchJob = await ctx.runQuery(api.exports.getBatchExportJob, {
      batchJobId: args.batchJobId,
    });

    if (!batchJob) {
      throw new Error("Batch export job not found");
    }

    await ctx.runMutation(api.exports.updateBatchExportStatus, {
      batchJobId: args.batchJobId,
      status: "processing",
    });

    try {
      const exportJobIds: Id<"exportJobs">[] = [];

      // Create individual export jobs for each journey
      for (let i = 0; i < batchJob.journeyIds.length; i++) {
        const journeyId = batchJob.journeyIds[i];

        const exportJobId = await ctx.runMutation(api.exports.createExportJob, {
          userId: batchJob.userId,
          journeyId,
          templateId: batchJob.templateId,
          settings: batchJob.settings,
        });

        exportJobIds.push(exportJobId);

        // Update batch progress
        const progress = Math.round(((i + 1) / batchJob.journeyIds.length) * 100);
        await ctx.runMutation(api.exports.updateBatchExportStatus, {
          batchJobId: args.batchJobId,
          status: "processing",
          progress,
          completedJobs: i + 1,
        });
      }

      // Update batch job with export job IDs
      await ctx.runMutation(api.exports.completeBatchExportJob, {
        batchJobId: args.batchJobId,
        exportJobIds,
      });
    } catch (error) {
      console.error("Batch export processing failed:", error);
      await ctx.runMutation(api.exports.updateBatchExportStatus, {
        batchJobId: args.batchJobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Get batch export job
export const getBatchExportJob = query({
  args: { batchJobId: v.id("batchExportJobs") },
  handler: async (ctx, args) => {
    const batchJob = await ctx.db.get(args.batchJobId);
    return batchJob;
  },
});

// Update batch export status
export const updateBatchExportStatus = mutation({
  args: {
    batchJobId: v.id("batchExportJobs"),
    status: ExportStatus,
    progress: v.optional(v.number()),
    completedJobs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchJobId, {
      status: args.status,
      progress: args.progress,
      completedJobs: args.completedJobs,
      error: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Complete batch export job
export const completeBatchExportJob = mutation({
  args: {
    batchJobId: v.id("batchExportJobs"),
    exportJobIds: v.array(v.id("exportJobs")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchJobId, {
      status: "completed" as const,
      progress: 100,
      exportJobIds: args.exportJobIds,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get export file URL
export const getExportFileUrl = query({
  args: { exportJobId: v.id("exportJobs") },
  handler: async (ctx, args) => {
    const exportJob = await ctx.db.get(args.exportJobId);
    if (!exportJob || !exportJob.resultFileId) {
      return null;
    }

    const url = await ctx.storage.getUrl(exportJob.resultFileId);
    return url;
  },
});

// Clean up old export jobs (scheduled function)
export const cleanupOldExports = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;

    const oldExports = await ctx.db
      .query("exportJobs")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    for (const exportJob of oldExports) {
      // Delete stored file if exists
      if (exportJob.resultFileId) {
        await ctx.storage.delete(exportJob.resultFileId);
      }

      // Delete export job record
      await ctx.db.delete(exportJob._id);
    }

    return { deletedCount: oldExports.length };
  },
});
