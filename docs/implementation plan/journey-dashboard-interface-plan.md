# Journey Dashboard Interface Implementation Plan

**Objective:** Build a responsive and performant dashboard for users to view, search, filter, and sort their journeys.

**Target Files & Directories:**
*   Dashboard Page: `app/dashboard/page.tsx`
*   Dashboard Components: `components/dashboard/` (new directory)
*   Convex Queries: `convex/journeys/queries.ts`
*   Convex Schema (for adding search index): `convex/schema.ts`

---

## 1. Backend Enhancements (Convex)

### 1.1. Update `journeys` Schema for Search
*   **Task:** Add a search index to the `journeys` table to enable efficient server-side searching.
*   **File:** `convex/schema.ts`
*   **Details:**
    *   Define a search index on the `title` field.
    ```typescript
    // In convex/schema.ts, within the journeys table definition
    // ... other indexes
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId", "status", "defaultActivityType", "visibility", "createdAt", "updatedAt", "lastActivityDate"],
    })
    ```

### 1.2. Refactor `getUserJourneys` Query
*   **Task:** Enhance the existing `getUserJourneys` query for performance and new features.
*   **File:** `convex/journeys/queries.ts`
*   **Details:**
    *   **Implement True Pagination:**
        *   Replace client-side slicing with `ctx.db.query("journeys")....paginate({ numItems: limit, cursor: args.cursor })`.
        *   The query will return `{ page: Journey[], isDone: boolean, continueCursor: string }`.
    *   **Server-Side Search:**
        *   Accept `searchTerm` as an argument.
        *   If `searchTerm` is provided, use the `search_title` index: `query.withSearchIndex("search_title", q => q.search("title", args.searchTerm!))`
        *   Ensure debouncing is handled on the client-side before calling this query.
    *   **Server-Side Filtering:**
        *   **Status Filter:** Continue using `q.eq("status", args.status)` if status is provided. This can be combined with the search index's `filterFields`.
        *   **Type Filter (`defaultActivityType`):**
            *   Add `defaultActivityType: v.optional(v.string())` to `args`.
            *   If provided, add `q.eq("defaultActivityType", args.defaultActivityType)` to the query. This also needs to be a `filterField` in the search index.
        *   **Date Range Filter:**
            *   Add `dateFilter: v.optional(v.object({ field: v.union(v.literal("createdAt"), v.literal("updatedAt"), v.literal("lastActivityDate")), startDate: v.optional(v.number()), endDate: v.optional(v.number()) }))` to `args`.
            *   Dynamically build range conditions (e.g., `q.gte(args.dateFilter.field, args.dateFilter.startDate).lte(args.dateFilter.field, args.dateFilter.endDate)`). These fields should also be in `filterFields` for the search index.
    *   **Server-Side Sorting:**
        *   Prioritize sorting by `createdAt` or `updatedAt` (descending by default).
        *   The `sortBy` and `sortOrder` arguments will need to be carefully mapped to available indexes.
    *   **Revised Arguments for `getUserJourneys`:**
        ```typescript
        args: {
          // Pagination
          paginationOpts: v.optional(v.object({ numItems: v.number(), cursor: v.optional(v.string()) })),

          // Filters
          status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
          defaultActivityType: v.optional(v.string()),
          dateFilter: v.optional(v.object({
            field: v.union(v.literal("createdAt"), v.literal("updatedAt"), v.literal("lastActivityDate")),
            startDate: v.optional(v.number()), // Timestamps
            endDate: v.optional(v.number()),   // Timestamps
          })),
          searchTerm: v.optional(v.string()),

          // Sorting
          sortBy: v.optional(
            v.union(v.literal("createdAt"), v.literal("updatedAt"), v.literal("title"), v.literal("totalDistance"))
          ),
          sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
        }
        ```
    *   **Query Logic Sketch (Conceptual):**
        ```typescript
        // ...
        let query = ctx.db.query("journeys").withIndex("by_user_id", q => q.eq("userId", user._id)); // Base query

        // Apply filters (status, defaultActivityType, dateFilter)
        // ...

        // Apply search (if searchTerm is present, switch to search query)
        if (args.searchTerm) {
          query = ctx.db.search("journeys", "search_title", q => q.search("title", args.searchTerm!))
                      .filter(q => q.eq(q.field("userId"), user._id)); // Re-apply essential filters
          // Add other filterFields to search query as well
          // ...
        }

        // Apply sorting (e.g., query.order("desc", "updatedAt"); or based on args.sortBy)
        // ...

        const results = await query.paginate(args.paginationOpts || { numItems: 10 });
        return {
          journeys: results.page,
          nextCursor: results.isDone ? null : results.continueCursor,
        };
        ```

---

## 2. Frontend Implementation (React & Shadcn UI)

### 2.1. Create `components/dashboard/` Directory

### 2.2. `JourneyCard` Component
*   **File:** `components/dashboard/journey-card.tsx`
*   **Purpose:** Displays a single journey's summary.
*   **Props:** `journey: JourneyType`
*   **UI:**
    *   Use `<Card />` from Shadcn UI.
    *   Display: Cover Image, `journey.title`, `journey.description` (truncated), key stats (`totalDistance`, `activityCount`, `lastActivityDate`), `journey.status` (badge).
    *   Responsive design.
    *   Clickable, navigating to journey detail page.

### 2.3. `JourneyList` Component
*   **File:** `components/dashboard/journey-list.tsx`
*   **Purpose:** Renders `JourneyCard` components with infinite scrolling.
*   **Props:** `journeys: JourneyType[]`, `loadMore: () => void`, `hasMore: boolean`, `isLoading: boolean`
*   **UI:**
    *   Option for grid/list view.
    *   Infinite scroll implementation (e.g., `react-infinite-scroll-component` or Intersection Observer).
    *   Loading indicator.

### 2.4. `JourneySearch` Component
*   **File:** `components/dashboard/journey-search.tsx`
*   **Purpose:** Provides a search input.
*   **Props:** `onSearch: (searchTerm: string) => void`, `initialSearchTerm?: string`
*   **UI:** Use `<Input />`.
*   **Logic:** Implement debouncing.

### 2.5. `JourneyFilters` Component
*   **File:** `components/dashboard/journey-filters.tsx`
*   **Purpose:** Provides filter controls.
*   **Props:** `onFiltersChange: (filters: FilterStateType) => void`, `currentFilters: FilterStateType`, `activityTypes: string[]`
*   **UI:**
    *   Date Filter: `<DatePicker />` / Date Range Picker, `<Select />` for date field.
    *   Type Filter: `<Select />` for `defaultActivityType`.
    *   Status Filter: `<Select />` for "Active", "Archived".
*   **Logic:** Call `onFiltersChange` on value changes.

### 2.6. `JourneySort` Component
*   **File:** `components/dashboard/journey-sort.tsx`
*   **Purpose:** Provides sorting controls.
*   **Props:** `onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void`, `currentSortBy: string`, `currentSortOrder: 'asc' | 'desc'`
*   **UI:** `<Select />` for `sortBy`, controls for `sortOrder`.
*   **Logic:** Call `onSortChange`. Implement persistent preferences using `localStorage`.

### 2.7. Update `DashboardPage`
*   **File:** `app/dashboard/page.tsx`
*   **Purpose:** Main page integrating dashboard components and managing state.
*   **Logic:**
    *   **State Management:** `useState` for `searchTerm`, `filters`, `sortOptions`, `paginationCursor`.
    *   **Data Fetching:** Use `usePaginatedQuery` with `api.journeys.getUserJourneys`, passing state variables.
    *   **Component Integration:** Render `JourneySearch`, `JourneyFilters`, `JourneySort`, `JourneyList`, passing appropriate props and handlers.
    *   **Effects:** `useEffect` to reset pagination on filter/sort/search changes.

---

## 3. Component Structure & Data Flow (Mermaid Diagram)

```mermaid
graph TD
    A[app/dashboard/page.tsx] -->|Manages State & Fetches Data| B(usePaginatedQuery - api.journeys.getUserJourneys)
    A --> C{JourneySearch}
    A --> D{JourneyFilters}
    A --> E{JourneySort}
    A --> F{JourneyList}

    C -->|onSearch(term)| A
    D -->|onFiltersChange(filters)| A
    E -->|onSortChange(sort)| A

    F -->|Renders| G((JourneyCard))
    F -->|loadMore()| B

    B -->|journeys, loadMore, hasMore, isLoading| F
    B -->|queryArgs (searchTerm, filters, sort, cursor)| H[convex/journeys/queries.ts - getUserJourneys]

    H -->|Reads/Searches| I[Convex DB - journeys Table]
    I -- Search Index --> H

    subgraph "components/dashboard"
        C
        D
        E
        F
        G
    end
```

---

## 4. Timeline & Dependencies Considerations

*   This work falls under **Sprint 3: Journey Management Core (Week 4-5)**, specifically task **3.1 Journey CRUD Operations** -> **Journey Dashboard Interface**.
*   **Dependencies:**
    *   Completed Convex schema for `journeys`.
    *   Basic journey creation/editing functionality.
    *   User authentication.