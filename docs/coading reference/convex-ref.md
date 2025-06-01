# ReShare App - Complete Convex Backend

## Project Structure
```
convex/
├── schema.ts                 # Database schema definitions
├── lib/
│   ├── types.ts             # Shared types and interfaces
│   ├── utils.ts             # Utility functions
│   └── validators.ts        # Input validation schemas
├── journeys/
│   ├── queries.ts           # Journey-related queries
│   ├── mutations.ts         # Journey-related mutations
│   └── functions.ts         # Journey utility functions
├── activities/
│   ├── queries.ts           # Activity-related queries
│   ├── mutations.ts         # Activity-related mutations
│   └── functions.ts         # Activity processing functions
├── gpx/
│   ├── mutations.ts         # GPX upload and processing
│   └── functions.ts         # GPX parsing utilities
├── exports/
│   ├── mutations.ts         # Image generation and export
│   └── functions.ts         # Export utilities
├── ai/
│   ├── functions.ts         # AI integration functions
│   └── mutations.ts         # AI-powered features
└── auth/
    ├── queries.ts           # User authentication queries
    └── mutations.ts         # User profile management
```

## 1. Database Schema (schema.ts)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    // Clerk integration
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    
    // User preferences
    defaultMapStyle: v.optional(v.string()),
    defaultColorPalette: v.optional(v.string()),
    defaultPrivacy: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Journeys table
  journeys: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    
    // Journey settings
    visibility: v.union(v.literal("private"), v.literal("unlisted"), v.literal("public")),
    defaultMapStyle: v.optional(v.string()),
    defaultColorPalette: v.optional(v.string()),
    defaultActivityType: v.optional(v.string()),
    
    // Journey metadata
    totalDistance: v.optional(v.number()),
    totalElevationGain: v.optional(v.number()),
    totalDuration: v.optional(v.number()),
    activityCount: v.optional(v.number()),
    
    // Status
    status: v.union(v.literal("active"), v.literal("archived")),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityDate: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_visibility", ["visibility"])
    .index("by_created_at", ["createdAt"])
    .index("by_updated_at", ["updatedAt"]),

  // Activities table
  activities: defineTable({
    journeyId: v.id("journeys"),
    userId: v.id("users"),
    
    // Activity metadata
    name: v.string(),
    description: v.optional(v.string()),
    activityType: v.string(), // hiking, running, cycling, etc.
    
    // GPX data
    originalFileName: v.string(),
    gpxFileId: v.id("_storage"),
    processedGeoJson: v.optional(v.string()), // Stringified GeoJSON
    
    // Activity statistics
    distance: v.optional(v.number()), // in meters
    duration: v.optional(v.number()), // in seconds
    elevationGain: v.optional(v.number()), // in meters
    elevationLoss: v.optional(v.number()), // in meters
    maxElevation: v.optional(v.number()),
    minElevation: v.optional(v.number()),
    avgSpeed: v.optional(v.number()), // m/s
    maxSpeed: v.optional(v.number()), // m/s
    avgPace: v.optional(v.number()), // seconds per km
    estimatedCalories: v.optional(v.number()),
    
    // Visual properties
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    opacity: v.optional(v.number()),
    
    // Route bounds
    boundingBox: v.optional(v.object({
      north: v.number(),
      south: v.number(),
      east: v.number(),
      west: v.number(),
    })),
    
    // Center point
    centerLat: v.optional(v.number()),
    centerLng: v.optional(v.number()),
    
    // Timestamps and dates
    activityDate: v.number(), // Date from GPX or user input
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Processing status
    processingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processingError: v.optional(v.string()),
  })
    .index("by_journey_id", ["journeyId"])
    .index("by_user_id", ["userId"])
    .index("by_activity_date", ["activityDate"])
    .index("by_processing_status", ["processingStatus"])
    .index("by_journey_date", ["journeyId", "activityDate"]),

  // Activity points table (for detailed route data)
  activityPoints: defineTable({
    activityId: v.id("activities"),
    pointIndex: v.number(),
    latitude: v.number(),
    longitude: v.number(),
    elevation: v.optional(v.number()),
    timestamp: v.optional(v.number()),
    speed: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    cadence: v.optional(v.number()),
    power: v.optional(v.number()),
    temperature: v.optional(v.number()),
  })
    .index("by_activity_id", ["activityId"])
    .index("by_activity_point", ["activityId", "pointIndex"]),

  // Export templates table
  exportTemplates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // social, print, custom
    
    // Template configuration
    config: v.string(), // Stringified JSON configuration
    previewImageId: v.optional(v.id("_storage")),
    
    // Template metadata
    isPublic: v.optional(v.boolean()),
    usageCount: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_category", ["category"])
    .index("by_public", ["isPublic"]),

  // Generated exports table
  generatedExports: defineTable({
    userId: v.id("users"),
    journeyId: v.id("journeys"),
    activityIds: v.array(v.id("activities")),
    
    // Export metadata
    exportType: v.string(), // image, pdf, svg
    format: v.string(), // png, jpeg, webp, pdf, svg
    resolution: v.string(), // 1x, 2x, 3x, etc.
    dimensions: v.object({
      width: v.number(),
      height: v.number(),
    }),
    
    // Template and styling
    templateId: v.optional(v.id("exportTemplates")),
    customConfig: v.optional(v.string()), // Stringified JSON
    
    // Generated file
    fileId: v.id("_storage"),
    fileSize: v.optional(v.number()),
    
    // Processing status
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_journey_id", ["journeyId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // AI analysis results
  aiAnalysis: defineTable({
    userId: v.id("users"),
    targetId: v.string(), // Can be journeyId or activityId
    targetType: v.union(v.literal("journey"), v.literal("activity")),
    
    // Analysis type and results
    analysisType: v.string(), // route_analysis, difficulty_assessment, poi_detection, etc.
    results: v.string(), // Stringified JSON results
    confidence: v.optional(v.number()),
    
    // AI model information
    model: v.string(),
    version: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // For caching
  })
    .index("by_target", ["targetId", "targetType"])
    .index("by_analysis_type", ["analysisType"])
    .index("by_user_id", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // User sessions for tracking active editing sessions
  userSessions: defineTable({
    userId: v.id("users"),
    journeyId: v.optional(v.id("journeys")),
    
    // Session data
    sessionId: v.string(),
    lastActivity: v.number(),
    currentView: v.optional(v.string()), // dashboard, journey, editor
    
    // Editor state (if applicable)
    editorState: v.optional(v.string()), // Stringified JSON
    
    // Device information
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_session_id", ["sessionId"])
    .index("by_last_activity", ["lastActivity"]),

  // System logs for monitoring
  systemLogs: defineTable({
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    category: v.string(), // gpx_processing, ai_analysis, export_generation, etc.
    message: v.string(),
    
    // Context data
    userId: v.optional(v.id("users")),
    journeyId: v.optional(v.id("journeys")),
    activityId: v.optional(v.id("activities")),
    
    // Additional metadata
    metadata: v.optional(v.string()), // Stringified JSON
    stack: v.optional(v.string()),
    
    // Timestamps
    timestamp: v.number(),
  })
    .index("by_level", ["level"])
    .index("by_category", ["category"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_id", ["userId"]),
});
```


## 4. Utility Functions (lib/utils.ts)

```typescript
import { Id } from "./_generated/dataModel";

// Color utilities
export function generateDailyColors(activityDate: number, index: number = 0): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB85F2", "#52C4B0"
  ];
  
  const dayOfYear = Math.floor(activityDate / (1000 * 60 * 60 * 24));
  const colorIndex = (dayOfYear + index) % colors.length;
  return colors[colorIndex];
}

// Distance utilities
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Bounding box utilities
export function calculateBoundingBox(points: Array<{latitude: number, longitude: number}>) {
  if (points.length === 0) {
    return null;
  }
  
  let north = points[0].latitude;
  let south = points[0].latitude;
  let east = points[0].longitude;
  let west = points[0].longitude;
  
  for (const point of points) {
    north = Math.max(north, point.latitude);
    south = Math.min(south, point.latitude);
    east = Math.max(east, point.longitude);
    west = Math.min(west, point.longitude);
  }
  
  return { north, south, east, west };
}

// Center point calculation
export function calculateCenter(points: Array<{latitude: number, longitude: number}>) {
  if (points.length === 0) {
    return null;
  }
  
  const bounds = calculateBoundingBox(points);
  if (!bounds) return null;
  
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2
  };
}

// Speed and pace calculations
export function calculateSpeed(distance: number, duration: number): number {
  if (duration === 0) return 0;
  return distance / duration; // m/s
}

export function calculatePace(distance: number, duration: number): number {
  if (distance === 0) return 0;
  return (duration * 1000) / distance; // seconds per km
}

// Elevation utilities
export function calculateElevationGain(elevations: number[]): {gain: number, loss: number} {
  let gain = 0;
  let loss = 0;
  
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }
  
  return { gain, loss };
}

// Smoothing algorithms
export function smoothElevations(elevations: number[], windowSize: number = 5): number[] {
  if (elevations.length <= windowSize) {
    return [...elevations];
  }
  
  const smoothed: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < elevations.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(elevations.length - 1, i + halfWindow);
    
    let sum = 0;
    let count = 0;
    
    for (let j = start; j <= end; j++) {
      sum += elevations[j];
      count++;
    }
    
    smoothed.push(sum / count);
  }
  
  return smoothed;
}

// Route simplification (Douglas-Peucker algorithm)
export function simplifyRoute(
  points: Array<{latitude: number, longitude: number}>,
  tolerance: number = 0.0001
): Array<{latitude: number, longitude: number}> {
  if (points.length <= 2) {
    return points;
  }
  
  return douglasPeucker(points, tolerance);
}

function douglasPeucker(
  points: Array<{latitude: number, longitude: number}>,
  tolerance: number
): Array<{latitude: number, longitude: number}> {
  if (points.length <= 2) {
    return points;
  }
  
  let maxDistance = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(
      points[i],
      points[0],
      points[points.length - 1]
    );
    
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIndex), tolerance);
    
    return [...left.slice(0, -1), ...right];
  } else {
    return [points[0], points[points.length - 1]];
  }
}

function perpendicularDistance(
  point: {latitude: number, longitude: number},
  lineStart: {latitude: number, longitude: number},
  lineEnd: {latitude: number, longitude: number}
): number {
  const x0 = point.longitude;
  const y0 = point.latitude;
  const x1 = lineStart.longitude;
  const y1 = lineStart.latitude;
  const x2 = lineEnd.longitude;
  const y2 = lineEnd.latitude;
  
  const numerator = Math.abs(
    (y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1
  );
  const denominator = Math.sqrt(
    Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2)
  );
  
  return numerator / denominator;
}

// Date utilities
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

export function getDateRange(timestamp: number): {start: number, end: number} {
  const date = new Date(timestamp);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

// Validation utilities
export function isValidGPXFile(filename: string): boolean {
  const validExtensions = ['.gpx', '.tcx', '.kml'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

export function isValidImageFile(filename: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return validExtensions.includes(extension);
}

// Error handling utilities
export function createError(message: string, code?: string, details?: any): Error {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).details = details;
  return error;
}

// Pagination utilities
export function createCursor(timestamp: number, id: string): string {
  return Buffer.from(`${timestamp}:${id}`).toString('base64');
}

export function parseCursor(cursor: string): {timestamp: number, id: string} | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestamp, id] = decoded.split(':');
    return {
      timestamp: parseInt(timestamp, 10),
      id
    };
  } catch {
    return null;
  }
}
```

This is a comprehensive foundation for your ReShare app backend. The structure includes:

1. **Complete database schema** with all necessary tables and indexes
2. **Type definitions** for type safety throughout the application
3. **Input validators** for all mutations and queries
4. **Utility functions** for common operations like distance calculations, route simplification, etc.

The backend is designed to handle:
- User authentication integration with Clerk
- Journey and activity management
- GPX file processing and storage
- Export generation and templates
- AI analysis integration
- Performance optimizations with proper indexing
- Real-time updates through Convex's reactive nature

## 5. Authentication Functions (auth/)

### auth/queries.ts
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// Get current user profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get