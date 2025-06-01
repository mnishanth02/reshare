// convex/backgroundJobs.ts - Background job processing system
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================================================
// Types and Constants
// ============================================================================

const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

// ============================================================================
// Queries
// ============================================================================

// Get jobs by status
export const getJobsByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { status, limit = 50, userId } = args;

    let jobsQuery = ctx.db
      .query("backgroundJobs")
      .withIndex("by_status", (q) => q.eq("status", status));

    if (userId) {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("userId"), userId));
    }

    const jobs = await jobsQuery
      .order("desc")
      .take(limit);

    return jobs;
  },
});

// Get user's jobs
export const getUserJobs = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    jobType: v.optional(v.union(
      v.literal("gpx_processing"),
      v.literal("image_generation"),
      v.literal("ai_analysis"),
      v.literal("cleanup"),
      v.literal("export")
    )),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50, jobType } = args;

    let jobsQuery = ctx.db
      .query("backgroundJobs")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (jobType) {
      jobsQuery = jobsQuery.filter((q) => q.eq(q.field("jobType"), jobType));
    }

    const jobs = await jobsQuery
      .order("desc")
      .take(limit);

    return jobs;
  },
});

// Get job by ID
export const getJob = query({
  args: {
    jobId: v.id("backgroundJobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    return job;
  },
});

// Get pending jobs for processing
export const getPendingJobs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit = 10 } = args;
    const now = Date.now();

    const jobs = await ctx.db
      .query("backgroundJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => 
        q.or(
          q.eq(q.field("scheduledFor"), undefined),
          q.lte(q.field("scheduledFor"), now)
        )
      )
      .order("asc", "priority")
      .take(limit);

    return jobs;
  },
});

// ============================================================================
// Mutations
// ============================================================================

// Create a new background job
export const createJob = mutation({
  args: {
    jobType: v.union(
      v.literal("gpx_processing"),
      v.literal("image_generation"),
      v.literal("ai_analysis"),
      v.literal("cleanup"),
      v.literal("export")
    ),
    entityId: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    data: v.any(),
    priority: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const {
      jobType,
      entityId,
      userId,
      data,
      priority = JOB_PRIORITIES.NORMAL,
      scheduledFor,
      maxAttempts = MAX_RETRY_ATTEMPTS,
    } = args;

    const jobId = await ctx.db.insert("backgroundJobs", {
      jobType,
      entityId,
      userId,
      priority,
      status: "pending",
      data,
      result: undefined,
      error: undefined,
      progress: 0,
      attempts: 0,
      maxAttempts,
      scheduledFor,
      startedAt: undefined,
      completedAt: undefined,
      createdAt: Date.now(),
    });

    // Schedule the job to be processed
    await ctx.scheduler.runAfter(
      scheduledFor ? Math.max(0, scheduledFor - Date.now()) : 0,
      internal.backgroundJobs.processJob,
      { jobId }
    );

    return jobId;
  },
});

// Update job status
export const updateJobStatus = mutation({
  args: {
    jobId: v.id("backgroundJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    progress: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, status, progress, result, error } = args;

    const job = await ctx.db.get(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    const updateData: Partial<Doc<"backgroundJobs">> = {
      status,
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (result !== undefined) {
      updateData.result = result;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    if (status === "running" && !job.startedAt) {
      updateData.startedAt = Date.now();
    }

    if (status === "completed" || status === "failed") {
      updateData.completedAt = Date.now();
    }

    await ctx.db.patch(jobId, updateData);

    return { success: true };
  },
});

// Cancel a job
export const cancelJob = mutation({
  args: {
    jobId: v.id("backgroundJobs"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { jobId, userId } = args;

    const job = await ctx.db.get(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Check if user has permission to cancel this job
    if (userId && job.userId !== userId) {
      throw new Error("Unauthorized: Cannot cancel job that doesn't belong to you");
    }

    // Only allow canceling pending or running jobs
    if (job.status !== "pending" && job.status !== "running") {
      throw new Error("Cannot cancel job that is not pending or running");
    }

    await ctx.db.patch(jobId, {
      status: "canceled",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Retry a failed job
export const retryJob = mutation({
  args: {
    jobId: v.id("backgroundJobs"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { jobId, userId } = args;

    const job = await ctx.db.get(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Check if user has permission to retry this job
    if (userId && job.userId !== userId) {
      throw new Error("Unauthorized: Cannot retry job that doesn't belong to you");
    }

    // Only allow retrying failed jobs
    if (job.status !== "failed") {
      throw new Error("Can only retry failed jobs");
    }

    // Check if we haven't exceeded max attempts
    if (job.attempts >= job.maxAttempts) {
      throw new Error("Maximum retry attempts exceeded");
    }

    await ctx.db.patch(jobId, {
      status: "pending",
      error: undefined,
      attempts: job.attempts + 1,
      startedAt: undefined,
      completedAt: undefined,
    });

    // Schedule the job to be processed again
    await ctx.scheduler.runAfter(0, internal.backgroundJobs.processJob, { jobId });

    return { success: true };
  },
});

// ============================================================================
// Actions (Job Processing)
// ============================================================================

// Main job processor
export const processJob = action({
  args: {
    jobId: v.id("backgroundJobs"),
  },
  handler: async (ctx, args) => {
    const { jobId } = args;

    try {
      // Get the job
      const job = await ctx.runQuery(internal.backgroundJobs.getJob, { jobId });
      if (!job) {
        console.error(`Job ${jobId} not found`);
        return;
      }

      // Check if job is still pending
      if (job.status !== "pending") {
        console.log(`Job ${jobId} is no longer pending (status: ${job.status})`);
        return;
      }

      // Mark job as running
      await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
        jobId,
        status: "running",
        progress: 0,
      });

      // Process the job based on its type
      let result: any;
      switch (job.jobType) {
        case "gpx_processing":
          result = await processGPXJob(ctx, job);
          break;
        case "image_generation":
          result = await processImageGenerationJob(ctx, job);
          break;
        case "ai_analysis":
          result = await processAIAnalysisJob(ctx, job);
          break;
        case "cleanup":
          result = await processCleanupJob(ctx, job);
          break;
        case "export":
          result = await processExportJob(ctx, job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark job as completed
      await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
        jobId,
        status: "completed",
        progress: 100,
        result,
      });

      console.log(`Job ${jobId} completed successfully`);

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      const job = await ctx.runQuery(internal.backgroundJobs.getJob, { jobId });
      if (!job) return;

      const shouldRetry = job.attempts < job.maxAttempts;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const retryDelay = RETRY_DELAYS[Math.min(job.attempts, RETRY_DELAYS.length - 1)];
        
        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId,
          status: "pending",
          error: error instanceof Error ? error.message : String(error),
        });

        await ctx.scheduler.runAfter(
          retryDelay,
          internal.backgroundJobs.processJob,
          { jobId }
        );

        console.log(`Job ${jobId} scheduled for retry in ${retryDelay}ms`);
      } else {
        // Mark job as permanently failed
        await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
          jobId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        console.log(`Job ${jobId} permanently failed after ${job.attempts} attempts`);
      }
    }
  },
});

// ============================================================================
// Job Type Processors
// ============================================================================

async function processGPXJob(ctx: any, job: Doc<"backgroundJobs">) {
  const { activityId, gpxData } = job.data;

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 25,
  });

  // Process GPX data
  const processedData = await ctx.runAction(internal.gpxprocessing.processGPXData, {
    gpxData,
    activityId,
  });

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 75,
  });

  // Update the activity with processed data
  await ctx.runMutation(internal.activities.updateActivityData, {
    activityId,
    processedData,
  });

  return { processedData, activityId };
}

async function processImageGenerationJob(ctx: any, job: Doc<"backgroundJobs">) {
  const { exportId, journeyId, templateData, customizations } = job.data;

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 20,
  });

  // Generate the image
  const imageResult = await ctx.runAction(internal.maprendering.generateStaticImage, {
    journeyId,
    templateData,
    customizations,
  });

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 80,
  });

  // Update the export record
  await ctx.runMutation(internal.exports.updateExportFile, {
    exportId,
    fileId: imageResult.fileId,
    fileSize: imageResult.fileSize,
  });

  return { exportId, imageResult };
}

async function processAIAnalysisJob(ctx: any, job: Doc<"backgroundJobs">) {
  const { entityType, entityId, analysisType } = job.data;

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 30,
  });

  // Perform AI analysis
  const analysisResult = await ctx.runAction(internal.ai.performAnalysis, {
    entityType,
    entityId,
    analysisType,
  });

  // Update progress
  await ctx.runMutation(internal.backgroundJobs.updateJobStatus, {
    jobId: job._id,
    status: "running",
    progress: 90,
  });

  return analysisResult;
}

async function processCleanupJob(ctx: any, job: Doc<"backgroundJobs">) {
  const { cleanupType, parameters } = job.data;

  let result: any;
  switch (cleanupType) {
    case "expired_exports":
      result = await ctx.runMutation(internal.exports.cleanupExpiredExports, parameters);
      break;
    case "old_notifications":
      result = await ctx.runMutation(internal.notifications.cleanupOldNotifications, parameters);
      break;
    case "failed_jobs":
      result = await cleanupFailedJobs(ctx, parameters);
      break;
    default:
      throw new Error(`Unknown cleanup type: ${cleanupType}`);
  }

  return result;
}

async function processExportJob(ctx: any, job: Doc<"backgroundJobs">) {
  const { journeyId, format, dimensions, templateId, customizations } = job.data;

  // Create export record
  const exportId = await ctx.runMutation(internal.exports.createExport, {
    journeyId,
    name: `Export ${Date.now()}`,
    format,
    dimensions,
    templateUsed: templateId,
    customizations,
  });

  // Generate the export
  const exportResult = await ctx.runAction(internal.maprendering.generateExport, {
    exportId,
    journeyId,
    format,
    dimensions,
    templateId,
    customizations,
  });

  return { exportId, exportResult };
}

// ============================================================================
// Cleanup Functions
// ============================================================================

async function cleanupFailedJobs(ctx: any, parameters: any) {
  const { maxAge = 7 * 24 * 60 * 60 * 1000 } = parameters; // 7 days default
  const cutoffTime = Date.now() - maxAge;

  const failedJobs = await ctx.runQuery(internal.backgroundJobs.getJobsByStatus, {
    status: "failed",
    limit: 1000,
  });

  const oldFailedJobs = failedJobs.filter(
    (job: Doc<"backgroundJobs">) => job.createdAt < cutoffTime
  );

  await Promise.all(
    oldFailedJobs.map((job: Doc<"backgroundJobs">) =>
      ctx.runMutation(internal.backgroundJobs.deleteJob, { jobId: job._id })
    )
  );

  return { oldFailedJobs };
}