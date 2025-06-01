// convex/mapRendering.ts
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Types for map rendering
export interface MapStyle {
  id: string;
  name: string;
  style: any; // MapLibre style object
  thumbnail?: string;
}

export interface RenderOptions {
  width: number;
  height: number;
  dpi: number;
  format: "png" | "jpeg" | "webp";
  quality?: number;
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  zoom?: number;
  center?: {
    lat: number;
    lon: number;
  };
  padding?: number;
  showAttribution?: boolean;
}

export interface LayerConfig {
  id: string;
  type: "route" | "marker" | "text" | "image";
  visible: boolean;
  style: any;
  data?: any;
}

// Generate static map image
export const generateStaticMap = action({
  args: {
    journeyId: v.id("journeys"),
    activityIds: v.optional(v.array(v.id("activities"))),
    styleId: v.string(),
    renderOptions: v.object({
      width: v.number(),
      height: v.number(),
      dpi: v.number(),
      format: v.union(v.literal("png"), v.literal("jpeg"), v.literal("webp")),
      quality: v.optional(v.number()),
      padding: v.optional(v.number()),
      showAttribution: v.optional(v.boolean()),
    }),
    layers: v.optional(v.array(v.any())), // LayerConfig[]
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get journey and verify ownership
    const journey = await ctx.runQuery(api.journeys.getById, {
      journeyId: args.journeyId,
    });

    if (!journey) {
      throw new Error("Journey not found");
    }

    // Get activities to render
    let activities;
    if (args.activityIds && args.activityIds.length > 0) {
      activities = await Promise.all(
        args.activityIds.map((id) => ctx.runQuery(api.activities.getById, { activityId: id }))
      );
    } else {
      activities = await ctx.runQuery(api.activities.getByJourney, {
        journeyId: args.journeyId,
      });
    }

    // Get map style
    const mapStyle = await ctx.runQuery(api.mapRendering.getMapStyle, {
      styleId: args.styleId,
    });

    if (!mapStyle) {
      throw new Error("Map style not found");
    }

    // Calculate bounds if not provided
    const bounds = calculateBounds(activities);

    // Render the map using server-side rendering
    const imageBuffer = await renderMapImage({
      style: mapStyle.style,
      activities: activities.filter(Boolean),
      bounds,
      renderOptions: args.renderOptions,
      layers: args.layers || [],
    });

    // Store the generated image
    const blob = new Blob([imageBuffer], {
      type: `image/${args.renderOptions.format}`,
    });
    const fileId = await ctx.storage.store(blob);

    // Store metadata
    const exportRecord = await ctx.runMutation(api.exports.create, {
      journeyId: args.journeyId,
      activityIds: args.activityIds || activities.map((a) => a!._id),
      type: "static_map",
      format: args.renderOptions.format,
      fileId,
      settings: {
        style: args.styleId,
        renderOptions: args.renderOptions,
        layers: args.layers,
      },
      fileSize: imageBuffer.byteLength,
    });

    return {
      exportId: exportRecord,
      fileId,
      downloadUrl: await ctx.storage.getUrl(fileId),
    };
  },
});

// Get available map styles
export const getMapStyles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mapStyles").collect();
  },
});

// Get specific map style
export const getMapStyle = query({
  args: {
    styleId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mapStyles")
      .withIndex("by_style_id", (q) => q.eq("styleId", args.styleId))
      .first();
  },
});

// Create custom map style
export const createMapStyle = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    style: v.any(), // MapLibre style object
    thumbnail: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const styleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return await ctx.db.insert("mapStyles", {
      styleId,
      name: args.name,
      description: args.description,
      style: args.style,
      thumbnail: args.thumbnail,
      isPublic: args.isPublic || false,
      isBuiltIn: false,
      createdBy: identity.subject,
      createdAt: Date.now(),
    });
  },
});

// Update map style
export const updateMapStyle = mutation({
  args: {
    styleId: v.id("mapStyles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    style: v.optional(v.any()),
    thumbnail: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const existingStyle = await ctx.db.get(args.styleId);
    if (!existingStyle) {
      throw new Error("Map style not found");
    }

    if (existingStyle.createdBy !== identity.subject && !existingStyle.isBuiltIn) {
      throw new Error("Permission denied");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.style !== undefined) updates.style = args.style;
    if (args.thumbnail !== undefined) updates.thumbnail = args.thumbnail;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    updates.updatedAt = Date.now();

    await ctx.db.patch(args.styleId, updates);
    return { success: true };
  },
});

// Generate map tile for caching
export const generateMapTile = action({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    styleId: v.string(),
    format: v.union(v.literal("png"), v.literal("webp")),
  },
  handler: async (ctx, args) => {
    // Get map style
    const mapStyle = await ctx.runQuery(api.mapRendering.getMapStyle, {
      styleId: args.styleId,
    });

    if (!mapStyle) {
      throw new Error("Map style not found");
    }

    // Calculate tile bounds
    const bounds = tileToLatLonBounds(args.x, args.y, args.z);

    // Render tile
    const tileBuffer = await renderMapTile({
      style: mapStyle.style,
      bounds,
      z: args.z,
      x: args.x,
      y: args.y,
      format: args.format,
    });

    // Store tile with cache headers
    const blob = new Blob([tileBuffer], {
      type: `image/${args.format}`,
    });
    const fileId = await ctx.storage.store(blob);

    // Store tile metadata for caching
    await ctx.runMutation(api.mapRendering.storeTileCache, {
      z: args.z,
      x: args.x,
      y: args.y,
      styleId: args.styleId,
      format: args.format,
      fileId,
      size: tileBuffer.byteLength,
    });

    return {
      fileId,
      url: await ctx.storage.getUrl(fileId),
    };
  },
});

// Store tile cache metadata
export const storeTileCache = mutation({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    styleId: v.string(),
    format: v.string(),
    fileId: v.id("_storage"),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tileCache", {
      z: args.z,
      x: args.x,
      y: args.y,
      styleId: args.styleId,
      format: args.format,
      fileId: args.fileId,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

// Get cached tile
export const getCachedTile = query({
  args: {
    z: v.number(),
    x: v.number(),
    y: v.number(),
    styleId: v.string(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    const cacheEntry = await ctx.db
      .query("tileCache")
      .withIndex("by_tile_coords", (q) =>
        q
          .eq("z", args.z)
          .eq("x", args.x)
          .eq("y", args.y)
          .eq("styleId", args.styleId)
          .eq("format", args.format)
      )
      .first();

    if (!cacheEntry) {
      return null;
    }

    // Check if tile is still valid (e.g., not older than 24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - cacheEntry.createdAt > maxAge) {
      return null;
    }

    return {
      fileId: cacheEntry.fileId,
      url: await ctx.storage.getUrl(cacheEntry.fileId),
      createdAt: cacheEntry.createdAt,
    };
  },
});

// Clear tile cache
export const clearTileCache = action({
  args: {
    styleId: v.optional(v.string()),
    olderThan: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("tileCache");

    if (args.styleId) {
      query = query.withIndex("by_style_id", (q) => q.eq("styleId", args.styleId));
    }

    const tiles = await query.collect();
    const tilesToDelete = tiles.filter((tile) => {
      if (args.olderThan) {
        return tile.createdAt < args.olderThan;
      }
      return true;
    });

    // Delete files from storage
    for (const tile of tilesToDelete) {
      await ctx.storage.delete(tile.fileId);
      await ctx.db.delete(tile._id);
    }

    return { deleted: tilesToDelete.length };
  },
});

// Helper functions

function calculateBounds(activities: any[]) {
  if (!activities.length) {
    return {
      minLat: -85,
      maxLat: 85,
      minLon: -180,
      maxLon: 180,
    };
  }

  let minLat = Number.POSITIVE_INFINITY,
    maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY,
    maxLon = Number.NEGATIVE_INFINITY;

  for (const activity of activities) {
    if (activity?.bounds) {
      minLat = Math.min(minLat, activity.bounds.minLat);
      maxLat = Math.max(maxLat, activity.bounds.maxLat);
      minLon = Math.min(minLon, activity.bounds.minLon);
      maxLon = Math.max(maxLon, activity.bounds.maxLon);
    }
  }

  return { minLat, maxLat, minLon, maxLon };
}

function tileToLatLonBounds(x: number, y: number, z: number) {
  const n = Math.pow(2, z);
  const lonLeft = (x / n) * 360.0 - 180.0;
  const lonRight = ((x + 1) / n) * 360.0 - 180.0;
  const latTop = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180.0) / Math.PI;
  const latBottom = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180.0) / Math.PI;

  return {
    minLat: latBottom,
    maxLat: latTop,
    minLon: lonLeft,
    maxLon: lonRight,
  };
}

// Mock server-side rendering functions (would need actual implementation)
async function renderMapImage(config: {
  style: any;
  activities: any[];
  bounds: any;
  renderOptions: RenderOptions;
  layers: LayerConfig[];
}): Promise<ArrayBuffer> {
  // This would use MapLibre GL Native for server-side rendering
  // For now, return a mock buffer
  console.log("Rendering map image with config:", config);

  // In real implementation, this would:
  // 1. Set up MapLibre GL Native context
  // 2. Load the style and data sources
  // 3. Add activity routes as layers
  // 4. Apply custom layers
  // 5. Render to canvas/image buffer
  // 6. Return the buffer

  const mockBuffer = new ArrayBuffer(1024); // Mock 1KB image
  return mockBuffer;
}

async function renderMapTile(config: {
  style: any;
  bounds: any;
  z: number;
  x: number;
  y: number;
  format: string;
}): Promise<ArrayBuffer> {
  // This would render a single map tile
  console.log("Rendering map tile:", config);

  const mockBuffer = new ArrayBuffer(512); // Mock 512B tile
  return mockBuffer;
}
