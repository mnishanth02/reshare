// convex/fileStorage.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// File upload URL generation
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Store file metadata after upload
export const storeFileMetadata = mutation({
  args: {
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    purpose: v.union(
      v.literal("gpx"),
      v.literal("cover_image"),
      v.literal("profile_image"),
      v.literal("template_image"),
      v.literal("export_image")
    ),
    journeyId: v.optional(v.id("journeys")),
    activityId: v.optional(v.id("activities")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;

    // Verify file exists in storage
    const fileUrl = await ctx.storage.getUrl(args.fileId);
    if (!fileUrl) {
      throw new Error("File not found in storage");
    }

    return await ctx.db.insert("files", {
      fileId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      purpose: args.purpose,
      userId,
      journeyId: args.journeyId,
      activityId: args.activityId,
      uploadedAt: Date.now(),
    });
  },
});

// Get file metadata
export const getFileMetadata = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== identity.subject) {
      throw new Error("File not found or access denied");
    }

    return file;
  },
});

// Get file URL for serving
export const getFileUrl = query({
  args: {
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Verify user has access to this file
    const fileMetadata = await ctx.db
      .query("files")
      .withIndex("by_file_id", (q) => q.eq("fileId", args.fileId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!fileMetadata) {
      throw new Error("File not found or access denied");
    }

    return await ctx.storage.getUrl(args.fileId);
  },
});

// Delete file and metadata
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== identity.subject) {
      throw new Error("File not found or access denied");
    }

    // Delete from storage
    await ctx.storage.delete(file.fileId);

    // Delete metadata
    await ctx.db.delete(args.fileId);

    return { success: true };
  },
});

// Batch delete files
export const batchDeleteFiles = mutation({
  args: {
    fileIds: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const deletedFiles = [];

    for (const fileId of args.fileIds) {
      const file = await ctx.db.get(fileId);
      if (file && file.userId === identity.subject) {
        await ctx.storage.delete(file.fileId);
        await ctx.db.delete(fileId);
        deletedFiles.push(fileId);
      }
    }

    return { deletedCount: deletedFiles.length, deletedFiles };
  },
});

// Get user's file storage usage
export const getStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .collect();

    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const filesByType = files.reduce(
      (acc, file) => {
        acc[file.purpose] = (acc[file.purpose] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalFiles: files.length,
      totalSize,
      filesByType,
      files: files.map((file) => ({
        id: file._id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        purpose: file.purpose,
        uploadedAt: file.uploadedAt,
      })),
    };
  },
});

// Clean up orphaned files (admin/maintenance function)
export const cleanupOrphanedFiles = action({
  args: {},
  handler: async (ctx) => {
    // This should only be called by admin users or scheduled functions
    const files = await ctx.runQuery(api.fileStorage.getAllFiles);
    const orphanedFiles = [];

    for (const file of files) {
      let isOrphaned = false;

      switch (file.purpose) {
        case "gpx":
          if (file.activityId) {
            const activity = await ctx.runQuery(api.activities.getById, {
              activityId: file.activityId,
            });
            if (!activity) {
              isOrphaned = true;
            }
          }
          break;
        case "cover_image":
          if (file.journeyId) {
            const journey = await ctx.runQuery(api.journeys.getById, {
              journeyId: file.journeyId,
            });
            if (!journey) {
              isOrphaned = true;
            }
          }
          break;
      }

      if (isOrphaned) {
        orphanedFiles.push(file._id);
      }
    }

    if (orphanedFiles.length > 0) {
      await ctx.runMutation(api.fileStorage.batchDeleteFiles, {
        fileIds: orphanedFiles,
      });
    }

    return { cleanedUp: orphanedFiles.length };
  },
});

// Internal query for admin/maintenance
export const getAllFiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("files").collect();
  },
});
