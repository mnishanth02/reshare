import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../users";

/**
 * Get paginated list of journeys for the authenticated user
 * @param args - Filter, sort, and pagination parameters
 * @returns Paginated list of user's journeys
 */
export const getUserJourneys = query({
  args: {
    // Pagination
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
      id: v.optional(v.any()), // Workaround: Temporarily allow 'id' to bypass validation
    }),

    // Filters
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    defaultActivityType: v.optional(v.string()),
    dateFilter: v.optional(
      v.object({
        field: v.union(
          v.literal("createdAt"),
          v.literal("updatedAt"),
          v.literal("lastActivityDate")
        ),
        startDate: v.optional(v.number()), // Timestamps
        endDate: v.optional(v.number()), // Timestamps
      })
    ),
    searchTerm: v.optional(v.string()),

    // Sorting
    sortBy: v.optional(
      v.union(
        v.literal("createdAt"),
        v.literal("updatedAt"),
        v.literal("title"),
        v.literal("totalDistance")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const paginationOpts = args.paginationOpts; // paginationOpts is now guaranteed to be provided by usePaginatedQuery

    // For now, let's use a simpler approach that works with current Convex version
    // We'll collect and filter/sort manually until we can properly implement search index
    const baseQuery = ctx.db
      .query("journeys")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id));

    // Get all journeys first
    let journeys = await baseQuery.collect();

    // Apply status filter
    if (args.status) {
      journeys = journeys.filter((j) => j.status === args.status);
    }

    // Apply activity type filter
    if (args.defaultActivityType) {
      journeys = journeys.filter((j) => j.defaultActivityType === args.defaultActivityType);
    }

    // Apply date filter
    if (args.dateFilter) {
      const { field, startDate, endDate } = args.dateFilter;
      journeys = journeys.filter((j) => {
        const fieldValue = j[field];
        if (typeof fieldValue !== "number") return true;

        if (startDate && fieldValue < startDate) return false;
        if (endDate && fieldValue > endDate) return false;
        return true;
      });
    }

    // Apply search filter
    if (args.searchTerm) {
      const searchTerm = args.searchTerm.toLowerCase();
      journeys = journeys.filter(
        (j) =>
          j.title.toLowerCase().includes(searchTerm) ||
          j.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "updatedAt";
    const sortOrder = args.sortOrder || "desc";

    journeys.sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortBy) {
        case "createdAt":
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case "updatedAt":
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "totalDistance":
          aValue = a.totalDistance || 0;
          bValue = b.totalDistance || 0;
          break;
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
      }

      if (aValue === undefined) aValue = 0;
      if (bValue === undefined) bValue = 0;

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    // Apply manual pagination
    const numItems = paginationOpts.numItems;
    const startIndex = paginationOpts.cursor ? Number.parseInt(paginationOpts.cursor) : 0;
    const endIndex = startIndex + numItems;
    const paginatedJourneys = journeys.slice(startIndex, endIndex);
    const nextCursor = endIndex < journeys.length ? endIndex.toString() : "";

    return {
      page: paginatedJourneys,
      isDone: nextCursor === "",
      continueCursor: nextCursor,
    };
  },
});

/**
 * Get a single journey by ID with access control
 * @param args - Journey ID
 * @returns Journey with activities or null if not accessible
 */
export const getJourney = query({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      return null;
    }

    // Apply access control based on visibility
    if (journey.visibility === "private") {
      // Private journeys only accessible by owner
      if (!user || journey.userId !== user._id) {
        return null;
      }
    } else {
      // Public and unlisted journeys require authentication but are accessible
      if (!user) {
        return null;
      }
    }

    // Get activities for this journey
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    return {
      ...journey,
      activities: activities.sort((a, b) => a.activityDate - b.activityDate),
    };
  },
});

/**
 * Get journey analytics for the owner
 * @param args - Journey ID
 * @returns Journey analytics data
 */
export const getJourneyAnalytics = query({
  args: {
    journeyId: v.id("journeys"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.userId !== user._id) {
      throw new Error("Journey not found or access denied");
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_journey_id", (q) => q.eq("journeyId", args.journeyId))
      .collect();

    // Calculate analytics
    const activityTypes = activities.reduce(
      (acc, activity) => {
        acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const monthlyStats = activities.reduce(
      (acc, activity) => {
        const date = new Date(activity.activityDate);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!acc[monthKey]) {
          acc[monthKey] = { distance: 0, count: 0, elevationGain: 0 };
        }

        acc[monthKey].distance += activity.distance || 0;
        acc[monthKey].count += 1;
        acc[monthKey].elevationGain += activity.elevationGain || 0;

        return acc;
      },
      {} as Record<string, { distance: number; count: number; elevationGain: number }>
    );

    return {
      totalActivities: activities.length,
      totalDistance: journey.totalDistance || 0,
      totalElevationGain: journey.totalElevationGain || 0,
      totalDuration: journey.totalDuration || 0,
      activityTypes,
      monthlyStats,
      averages: {
        distancePerActivity:
          activities.length > 0 ? (journey.totalDistance || 0) / activities.length : 0,
        elevationPerActivity:
          activities.length > 0 ? (journey.totalElevationGain || 0) / activities.length : 0,
        durationPerActivity:
          activities.length > 0 ? (journey.totalDuration || 0) / activities.length : 0,
      },
    };
  },
});
