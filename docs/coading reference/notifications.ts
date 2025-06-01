// convex/notifications.ts - Notification system for user alerts and updates
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// Queries
// ============================================================================

// Get all notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, limit = 50, includeRead = true } = args;

    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (!includeRead) {
      notificationsQuery = notificationsQuery.filter((q) => 
        q.eq(q.field("isRead"), false)
      );
    }

    const notifications = await notificationsQuery
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const count = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return count.length;
  },
});

// Get notifications by type
export const getNotificationsByType = query({
  args: {
    userId: v.id("users"),
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, type, limit = 20 } = args;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("type"), type))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// ============================================================================
// Mutations
// ============================================================================

// Create a new notification
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, type, title, message, data, actionUrl, expiresAt } = args;

    const notificationId = await ctx.db.insert("notifications", {
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      actionUrl,
      expiresAt,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { notificationId, userId } = args;

    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or access denied");
    }

    await ctx.db.patch(notificationId, {
      isRead: true,
    });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = args;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );

    return { success: true, count: unreadNotifications.length };
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { notificationId, userId } = args;

    const notification = await ctx.db.get(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or access denied");
    }

    await ctx.db.delete(notificationId);
    return { success: true };
  },
});

// Bulk delete notifications
export const bulkDeleteNotifications = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { notificationIds, userId } = args;

    const notifications = await Promise.all(
      notificationIds.map((id) => ctx.db.get(id))
    );

    // Verify all notifications belong to the user
    const validNotifications = notifications.filter(
      (notification) => notification && notification.userId === userId
    );

    await Promise.all(
      validNotifications.map((notification) =>
        ctx.db.delete(notification!._id)
      )
    );

    return { success: true, deleted: validNotifications.length };
  },
});

// ============================================================================
// Notification Creation Helpers
// ============================================================================

// Create journey-related notifications
export const notifyJourneyEvent = mutation({
  args: {
    userId: v.id("users"),
    journeyId: v.id("journeys"),
    eventType: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("shared"),
      v.literal("export_ready")
    ),
    additionalData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, journeyId, eventType, additionalData } = args;

    const journey = await ctx.db.get(journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }

    let title: string;
    let message: string;
    let actionUrl: string;

    switch (eventType) {
      case "created":
        title = "Journey Created";
        message = `Your journey "${journey.title}" has been created successfully.`;
        actionUrl = `/journeys/${journeyId}`;
        break;
      case "updated":
        title = "Journey Updated";
        message = `Your journey "${journey.title}" has been updated.`;
        actionUrl = `/journeys/${journeyId}`;
        break;
      case "shared":
        title = "Journey Shared";
        message = `Your journey "${journey.title}" has been shared.`;
        actionUrl = `/journeys/${journeyId}/share`;
        break;
      case "export_ready":
        title = "Export Ready";
        message = `Your export for "${journey.title}" is ready for download.`;
        actionUrl = `/journeys/${journeyId}/exports`;
        break;
      default:
        throw new Error("Invalid event type");
    }

    return await ctx.db.insert("notifications", {
      userId,
      type: `journey_${eventType}`,
      title,
      message,
      data: {
        journeyId,
        journeyTitle: journey.title,
        ...additionalData,
      },
      isRead: false,
      actionUrl,
      createdAt: Date.now(),
    });
  },
});

// Create activity processing notifications
export const notifyActivityProcessing = mutation({
  args: {
    userId: v.id("users"),
    activityId: v.id("activities"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, activityId, status, error } = args;

    const activity = await ctx.db.get(activityId);
    if (!activity) {
      throw new Error("Activity not found");
    }

    let title: string;
    let message: string;
    let type: string;

    switch (status) {
      case "processing":
        title = "Processing Activity";
        message = `Your activity "${activity.name}" is being processed.`;
        type = "activity_processing";
        break;
      case "completed":
        title = "Activity Ready";
        message = `Your activity "${activity.name}" has been processed successfully.`;
        type = "activity_completed";
        break;
      case "failed":
        title = "Processing Failed";
        message = `Failed to process activity "${activity.name}". ${error || "Please try again."}`;
        type = "activity_failed";
        break;
      default:
        throw new Error("Invalid status");
    }

    return await ctx.db.insert("notifications", {
      userId,
      type,
      title,
      message,
      data: {
        activityId,
        activityName: activity.name,
        status,
        error,
      },
      isRead: false,
      actionUrl: `/journeys/${activity.journeyId}`,
      createdAt: Date.now(),
    });
  },
});

// Create export notifications
export const notifyExportStatus = mutation({
  args: {
    userId: v.id("users"),
    exportId: v.id("exports"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, exportId, status, error } = args;

    const exportRecord = await ctx.db.get(exportId);
    if (!exportRecord) {
      throw new Error("Export not found");
    }

    let title: string;
    let message: string;
    let type: string;

    switch (status) {
      case "queued":
        title = "Export Queued";
        message = `Your export "${exportRecord.name}" has been queued for processing.`;
        type = "export_queued";
        break;
      case "processing":
        title = "Export Processing";
        message = `Your export "${exportRecord.name}" is being generated.`;
        type = "export_processing";
        break;
      case "completed":
        title = "Export Ready";
        message = `Your export "${exportRecord.name}" is ready for download.`;
        type = "export_completed";
        break;
      case "failed":
        title = "Export Failed";
        message = `Failed to generate export "${exportRecord.name}". ${error || "Please try again."}`;
        type = "export_failed";
        break;
      default:
        throw new Error("Invalid status");
    }

    return await ctx.db.insert("notifications", {
      userId,
      type,
      title,
      message,
      data: {
        exportId,
        exportName: exportRecord.name,
        status,
        error,
      },
      isRead: false,
      actionUrl: `/exports/${exportId}`,
      createdAt: Date.now(),
    });
  },
});

// Create system notifications
export const createSystemNotification = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, title, message, type = "system", priority = "normal", expiresAt } = args;

    return await ctx.db.insert("notifications", {
      userId,
      type: `system_${type}`,
      title,
      message,
      data: { priority },
      isRead: false,
      expiresAt,
      createdAt: Date.now(),
    });
  },
});

// ============================================================================
// Cleanup Functions
// ============================================================================

// Clean up expired notifications
export const cleanupExpiredNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    await Promise.all(
      expiredNotifications.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );

    return { success: true, deleted: expiredNotifications.length };
  },
});

// Clean up old read notifications (older than 30 days)
export const cleanupOldNotifications = mutation({
  args: {
    maxAge: v.optional(v.number()), // milliseconds
  },
  handler: async (ctx, args) => {
    const { maxAge = 30 * 24 * 60 * 60 * 1000 } = args; // 30 days default
    const cutoffTime = Date.now() - maxAge;

    const oldNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoffTime))
      .filter((q) => q.eq(q.field("isRead"), true))
      .collect();

    await Promise.all(
      oldNotifications.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );

    return { success: true, deleted: oldNotifications.length };
  },
});

// ============================================================================
// Batch Notification Functions
// ============================================================================

// Send notifications to multiple users
export const sendBulkNotifications = mutation({
  args: {
    userIds: v.array(v.id("users")),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userIds, type, title, message, data, actionUrl, expiresAt } = args;

    const notificationIds = await Promise.all(
      userIds.map((userId) =>
        ctx.db.insert("notifications", {
          userId,
          type,
          title,
          message,
          data,
          isRead: false,
          actionUrl,
          expiresAt,
          createdAt: Date.now(),
        })
      )
    );

    return { success: true, created: notificationIds.length };
  },
});

// ============================================================================
// Analytics and Reporting
// ============================================================================

// Get notification statistics
export const getNotificationStats = query({
  args: {
    userId: v.id("users"),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { userId, timeRange } = args;

    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (timeRange) {
      notificationsQuery = notificationsQuery.filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), timeRange.start),
          q.lte(q.field("createdAt"), timeRange.end)
        )
      );
    }

    const notifications = await notificationsQuery.collect();

    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      byType: notifications.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      readRate: notifications.length > 0 ? 
        (notifications.filter((n) => n.isRead).length / notifications.length) * 100 : 0,
    };

    return stats;
  },
});