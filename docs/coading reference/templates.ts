import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Template design element schema
const designElementSchema = v.object({
  id: v.string(),
  type: v.union(
    v.literal("text"),
    v.literal("image"),
    v.literal("shape"),
    v.literal("chart"),
    v.literal("stats")
  ),
  position: v.object({
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
  }),
  style: v.object({
    backgroundColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderWidth: v.optional(v.number()),
    borderRadius: v.optional(v.number()),
    opacity: v.optional(v.number()),
    fontSize: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    textColor: v.optional(v.string()),
    textAlign: v.optional(v.string()),
  }),
  content: v.any(), // Flexible content based on element type
  layer: v.number(),
  locked: v.optional(v.boolean()),
  visible: v.optional(v.boolean()),
});

// Get all public templates
export const getPublicTemplates = query({
  args: {
    category: v.optional(v.string()),
    activityType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let templatesQuery = ctx.db
      .query("templates")
      .withIndex("by_visibility", (q) => q.eq("isPublic", true));

    if (args.category) {
      templatesQuery = templatesQuery.filter((q) => q.eq("category", args.category));
    }

    if (args.activityType) {
      templatesQuery = templatesQuery.filter((q) => q.eq("activityType", args.activityType));
    }

    const templates = await templatesQuery.order("desc").take(args.limit || 50);

    return templates.slice(args.offset || 0);
  },
});

// Get user's templates
export const getUserTemplates = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return templates;
  },
});

// Get template by ID
export const getTemplateById = query({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    return template;
  },
});

// Create new template
export const createTemplate = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    activityType: v.optional(v.string()),
    previewImageId: v.optional(v.id("_storage")),
    canvasSettings: v.object({
      width: v.number(),
      height: v.number(),
      backgroundColor: v.string(),
      dpi: v.number(),
    }),
    elements: v.array(designElementSchema),
    isPublic: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const templateId = await ctx.db.insert("templates", {
      ...args,
      isPublic: args.isPublic || false,
      tags: args.tags || [],
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

// Update template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    userId: v.id("users"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      activityType: v.optional(v.string()),
      previewImageId: v.optional(v.id("_storage")),
      canvasSettings: v.optional(
        v.object({
          width: v.number(),
          height: v.number(),
          backgroundColor: v.string(),
          dpi: v.number(),
        })
      ),
      elements: v.optional(v.array(designElementSchema)),
      isPublic: v.optional(v.boolean()),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.userId !== args.userId) {
      throw new Error("Unauthorized: You can only update your own templates");
    }

    await ctx.db.patch(args.templateId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete template
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.userId !== args.userId) {
      throw new Error("Unauthorized: You can only delete your own templates");
    }

    await ctx.db.delete(args.templateId);
  },
});

// Duplicate template
export const duplicateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    userId: v.id("users"),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const originalTemplate = await ctx.db.get(args.templateId);
    if (!originalTemplate) {
      throw new Error("Template not found");
    }

    // Check if template is public or belongs to user
    if (!originalTemplate.isPublic && originalTemplate.userId !== args.userId) {
      throw new Error("Unauthorized: Cannot duplicate private template");
    }

    const newTemplateId = await ctx.db.insert("templates", {
      userId: args.userId,
      name: args.newName,
      description: originalTemplate.description,
      category: originalTemplate.category,
      activityType: originalTemplate.activityType,
      canvasSettings: originalTemplate.canvasSettings,
      elements: originalTemplate.elements,
      isPublic: false, // Duplicated templates are private by default
      tags: originalTemplate.tags,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newTemplateId;
  },
});

// Increment template usage
export const incrementTemplateUsage = mutation({
  args: { templateId: v.id("templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      usageCount: template.usageCount + 1,
    });
  },
});

// Rate template
export const rateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    userId: v.id("users"),
    rating: v.number(), // 1-5 scale
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check if user already rated this template
    const existingRating = await ctx.db
      .query("templateRatings")
      .withIndex("by_template_user", (q) =>
        q.eq("templateId", args.templateId).eq("userId", args.userId)
      )
      .unique();

    if (existingRating) {
      // Update existing rating
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        updatedAt: Date.now(),
      });
    } else {
      // Create new rating
      await ctx.db.insert("templateRatings", {
        templateId: args.templateId,
        userId: args.userId,
        rating: args.rating,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Recalculate template average rating
    const allRatings = await ctx.db
      .query("templateRatings")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .collect();

    const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / allRatings.length;

    await ctx.db.patch(args.templateId, {
      rating: averageRating,
      ratingCount: allRatings.length,
    });
  },
});

// Search templates
export const searchTemplates = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
    activityType: v.optional(v.string()),
    minRating: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("templates")
      .withIndex("by_visibility", (q) => q.eq("isPublic", true))
      .collect();

    // Filter by search term (name, description, tags)
    if (args.searchTerm) {
      const searchTerm = args.searchTerm.toLowerCase();
      templates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Filter by category
    if (args.category) {
      templates = templates.filter((template) => template.category === args.category);
    }

    // Filter by activity type
    if (args.activityType) {
      templates = templates.filter((template) => template.activityType === args.activityType);
    }

    // Filter by minimum rating
    if (args.minRating) {
      templates = templates.filter((template) => template.rating >= args.minRating);
    }

    // Sort by rating (highest first), then by usage count
    templates.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.usageCount - a.usageCount;
    });

    return templates.slice(0, args.limit || 50);
  },
});

// Get template categories
export const getTemplateCategories = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_visibility", (q) => q.eq("isPublic", true))
      .collect();

    const categories = [...new Set(templates.map((t) => t.category))];
    return categories.filter(Boolean);
  },
});
