// convex/gpxProcessing.ts
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";

// Types for GPX processing
export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: number;
}

export interface GPXTrack {
  name?: string;
  points: GPXPoint[];
}

export interface ProcessedGPXData {
  tracks: GPXTrack[];
  metadata: {
    name?: string;
    desc?: string;
    author?: string;
    time?: number;
  };
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  stats: {
    totalDistance: number;
    totalElevationGain: number;
    totalElevationLoss: number;
    minElevation?: number;
    maxElevation?: number;
    duration?: number;
    avgSpeed?: number;
    maxSpeed?: number;
  };
}

// Process GPX file from storage
export const processGPXFile = action({
  args: {
    fileId: v.id("_storage"),
    journeyId: v.id("journeys"),
    activityName: v.optional(v.string()),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get the file from storage
    const fileUrl = await ctx.storage.getUrl(args.fileId);
    if (!fileUrl) {
      throw new Error("File not found in storage");
    }

    try {
      // Fetch the GPX file content
      const response = await fetch(fileUrl);
      const gpxContent = await response.text();

      // Parse GPX content
      const processedData = await parseGPX(gpxContent);

      // Simplify routes for storage optimization
      const simplifiedData = simplifyRoutes(processedData);

      // Create activity record
      const activityId = await ctx.runMutation(api.activities.create, {
        journeyId: args.journeyId,
        name: args.activityName || processedData.metadata.name || "Untitled Activity",
        type: args.activityType || detectActivityType(processedData),
        gpxFileId: args.fileId,
        routeData: simplifiedData,
        distance: processedData.stats.totalDistance,
        elevationGain: processedData.stats.totalElevationGain,
        elevationLoss: processedData.stats.totalElevationLoss,
        duration: processedData.stats.duration,
        avgSpeed: processedData.stats.avgSpeed,
        maxSpeed: processedData.stats.maxSpeed,
        startTime: processedData.tracks[0]?.points[0]?.time || Date.now(),
        endTime:
          processedData.tracks[0]?.points[processedData.tracks[0].points.length - 1]?.time ||
          Date.now(),
        bounds: processedData.bounds,
      });

      // Store full resolution data for detailed analysis
      await ctx.runMutation(api.gpxProcessing.storeFullResolutionData, {
        activityId,
        fullData: processedData,
      });

      return { activityId, processedData: simplifiedData };
    } catch (error) {
      console.error("GPX processing error:", error);
      throw new Error(`Failed to process GPX file: ${error.message}`);
    }
  },
});

// Store full resolution data separately for performance
export const storeFullResolutionData = internalMutation({
  args: {
    activityId: v.id("activities"),
    fullData: v.any(), // ProcessedGPXData type
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gpxData", {
      activityId: args.activityId,
      fullData: args.fullData,
      createdAt: Date.now(),
    });
  },
});

// Get full resolution data for detailed analysis
export const getFullResolutionData = internalQuery({
  args: {
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gpxData")
      .withIndex("by_activity_id", (q) => q.eq("activityId", args.activityId))
      .first();
  },
});

// Batch process multiple GPX files
export const batchProcessGPXFiles = action({
  args: {
    fileIds: v.array(v.id("_storage")),
    journeyId: v.id("journeys"),
    defaultActivityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < args.fileIds.length; i++) {
      const fileId = args.fileIds[i];
      try {
        const result = await ctx.runAction(api.gpxProcessing.processGPXFile, {
          fileId,
          journeyId: args.journeyId,
          activityType: args.defaultActivityType,
        });
        results.push({ fileId, ...result });
      } catch (error) {
        errors.push({ fileId, error: error.message });
      }
    }

    return {
      processed: results.length,
      errors: errors.length,
      results,
      errors,
    };
  },
});

// Reprocess activity with different settings
export const reprocessActivity = action({
  args: {
    activityId: v.id("activities"),
    simplificationTolerance: v.optional(v.number()),
    elevationSmoothing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get the activity and verify ownership
    const activity = await ctx.runQuery(api.activities.getById, {
      activityId: args.activityId,
    });

    if (!activity) {
      throw new Error("Activity not found");
    }

    // Get full resolution data
    const fullData = await ctx.runQuery(api.gpxProcessing.getFullResolutionData, {
      activityId: args.activityId,
    });

    if (!fullData) {
      throw new Error("Full resolution data not found");
    }

    // Reprocess with new settings
    const reprocessedData = simplifyRoutes(
      fullData.fullData,
      args.simplificationTolerance,
      args.elevationSmoothing
    );

    // Update activity with reprocessed data
    await ctx.runMutation(api.activities.updateRouteData, {
      activityId: args.activityId,
      routeData: reprocessedData,
    });

    return { success: true, processedData: reprocessedData };
  },
});

// Helper functions for GPX processing

async function parseGPX(gpxContent: string): Promise<ProcessedGPXData> {
  // Basic GPX parsing implementation
  // In a real implementation, you'd use a proper XML parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxContent, "text/xml");

  // Check for parsing errors
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid GPX file format");
  }

  const tracks: GPXTrack[] = [];
  const trackElements = doc.querySelectorAll("trk");

  let minLat = Number.POSITIVE_INFINITY,
    maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY,
    maxLon = Number.NEGATIVE_INFINITY;
  let totalDistance = 0;
  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  let minElevation = Number.POSITIVE_INFINITY,
    maxElevation = Number.NEGATIVE_INFINITY;
  let startTime: number | undefined;
  let endTime: number | undefined;

  for (const trackElement of trackElements) {
    const trackName = trackElement.querySelector("name")?.textContent || undefined;
    const segments = trackElement.querySelectorAll("trkseg");
    const points: GPXPoint[] = [];

    for (const segment of segments) {
      const trkpts = segment.querySelectorAll("trkpt");

      for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = Number.parseFloat(pt.getAttribute("lat") || "0");
        const lon = Number.parseFloat(pt.getAttribute("lon") || "0");
        const eleElement = pt.querySelector("ele");
        const timeElement = pt.querySelector("time");

        const point: GPXPoint = { lat, lon };

        if (eleElement) {
          point.ele = Number.parseFloat(eleElement.textContent || "0");
          minElevation = Math.min(minElevation, point.ele);
          maxElevation = Math.max(maxElevation, point.ele);
        }

        if (timeElement) {
          point.time = new Date(timeElement.textContent || "").getTime();
          if (!startTime) startTime = point.time;
          endTime = point.time;
        }

        points.push(point);

        // Update bounds
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);

        // Calculate distance and elevation changes
        if (i > 0) {
          const prevPoint = points[i - 1];
          totalDistance += calculateDistance(prevPoint, point);

          if (prevPoint.ele !== undefined && point.ele !== undefined) {
            const elevDiff = point.ele - prevPoint.ele;
            if (elevDiff > 0) {
              totalElevationGain += elevDiff;
            } else {
              totalElevationLoss += Math.abs(elevDiff);
            }
          }
        }
      }
    }

    if (points.length > 0) {
      tracks.push({ name: trackName, points });
    }
  }

  // Calculate additional stats
  const duration = startTime && endTime ? endTime - startTime : undefined;
  const avgSpeed = duration ? totalDistance / (duration / 1000 / 3600) : undefined; // km/h

  // Calculate max speed from consecutive points
  let maxSpeed = 0;
  for (const track of tracks) {
    for (let i = 1; i < track.points.length; i++) {
      const prev = track.points[i - 1];
      const curr = track.points[i];
      if (prev.time && curr.time) {
        const timeDiff = (curr.time - prev.time) / 1000; // seconds
        const distance = calculateDistance(prev, curr) * 1000; // meters
        const speed = (distance / timeDiff) * 3.6; // km/h
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }
  }

  // Extract metadata
  const metadata = {
    name:
      doc.querySelector("metadata name")?.textContent ||
      doc.querySelector("trk name")?.textContent ||
      undefined,
    desc:
      doc.querySelector("metadata desc")?.textContent ||
      doc.querySelector("trk desc")?.textContent ||
      undefined,
    author: doc.querySelector("metadata author name")?.textContent || undefined,
    time: doc.querySelector("metadata time")?.textContent
      ? new Date(doc.querySelector("metadata time")!.textContent!).getTime()
      : undefined,
  };

  return {
    tracks,
    metadata,
    bounds: { minLat, maxLat, minLon, maxLon },
    stats: {
      totalDistance,
      totalElevationGain,
      totalElevationLoss,
      minElevation: minElevation === Number.POSITIVE_INFINITY ? undefined : minElevation,
      maxElevation: maxElevation === Number.NEGATIVE_INFINITY ? undefined : maxElevation,
      duration,
      avgSpeed,
      maxSpeed: maxSpeed > 0 ? maxSpeed : undefined,
    },
  };
}

function simplifyRoutes(
  data: ProcessedGPXData,
  tolerance = 0.0001,
  smoothElevation = true
): ProcessedGPXData {
  // Implement Douglas-Peucker algorithm for route simplification
  const simplifiedTracks = data.tracks.map((track) => ({
    ...track,
    points: simplifyPath(track.points, tolerance),
  }));

  if (smoothElevation) {
    simplifiedTracks.forEach((track) => {
      track.points = smoothElevationData(track.points);
    });
  }

  return {
    ...data,
    tracks: simplifiedTracks,
  };
}

function simplifyPath(points: GPXPoint[], tolerance: number): GPXPoint[] {
  if (points.length <= 2) return points;

  // Basic implementation of Douglas-Peucker algorithm
  function perpDistance(point: GPXPoint, lineStart: GPXPoint, lineEnd: GPXPoint): number {
    const A = lineEnd.lat - lineStart.lat;
    const B = lineStart.lon - lineEnd.lon;
    const C = lineEnd.lon * lineStart.lat - lineStart.lon * lineEnd.lat;

    return Math.abs(A * point.lon + B * point.lat + C) / Math.sqrt(A * A + B * B);
  }

  function douglasPeucker(points: GPXPoint[], epsilon: number): GPXPoint[] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpDistance(points[i], firstPoint, lastPoint);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > epsilon) {
      const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const right = douglasPeucker(points.slice(maxIndex), epsilon);
      return [...left.slice(0, -1), ...right];
    } else {
      return [firstPoint, lastPoint];
    }
  }

  return douglasPeucker(points, tolerance);
}

function smoothElevationData(points: GPXPoint[]): GPXPoint[] {
  // Simple moving average for elevation smoothing
  const windowSize = 5;
  return points.map((point, index) => {
    if (point.ele === undefined) return point;

    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(points.length, index + Math.floor(windowSize / 2) + 1);

    let sum = 0;
    let count = 0;

    for (let i = start; i < end; i++) {
      if (points[i].ele !== undefined) {
        sum += points[i].ele!;
        count++;
      }
    }

    return {
      ...point,
      ele: count > 0 ? sum / count : point.ele,
    };
  });
}

function calculateDistance(point1: GPXPoint, point2: GPXPoint): number {
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lon - point1.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function detectActivityType(data: ProcessedGPXData): string {
  // Simple heuristics for activity type detection
  const { avgSpeed, totalDistance } = data.stats;

  if (!avgSpeed) return "other";

  if (avgSpeed > 15) {
    return "cycling";
  } else if (avgSpeed > 8) {
    return "running";
  } else if (avgSpeed > 3) {
    return "hiking";
  } else {
    return "walking";
  }
}
