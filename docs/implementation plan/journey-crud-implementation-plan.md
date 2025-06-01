# Journey CRUD Operations Implementation Plan

## Overview
This document outlines the detailed implementation plan for **3.1 Journey CRUD Operations** from the main implementation plan. This task focuses on implementing the core Create, Read, Update, and Delete operations for Journeys in Convex.

## Scope
- **Included:** Core CRUD operations, input validation, user ownership, basic access control
- **Excluded:** Advanced sharing permissions (deferred to later stage)
- **Estimated Time:** 5-6 days

## Files to Create/Modify

### New Files
- `convex/journeys/queries.ts` - Journey query functions
- `convex/journeys/mutations.ts` - Journey mutation functions

### Existing Files (Review/Ensure Compatibility)
- `convex/lib/validators.ts` - Contains journey validators
- `convex/schema.ts` - Journey table schema (already defined)

## Implementation Steps

### Step 0: Preparation & File Structure
1. Create directory structure: `convex/journeys/`
2. Review existing validators in `convex/lib/validators.ts`
3. Confirm schema compatibility in `convex/schema.ts`

### Step 1: Implement Journey Queries (`convex/journeys/queries.ts`)

#### 1.1 `getUserJourneys` Query
**Purpose:** Fetch paginated list of journeys for authenticated user

**Source Reference:** `docs/coading reference/journey-ref.ts:288`

**Arguments:**
- `status?: "active" | "archived"` (optional filter)
- `searchTerm?: string` (optional search)
- `sortBy?: "created" | "updated" | "title" | "distance"` (optional)
- `sortOrder?: "asc" | "desc"` (optional)
- `limit?: number` (pagination)
- `cursor?: string` (pagination)

**Logic:**
1. Require authentication (`ctx.auth.getUserIdentity()`)
2. Query `journeys` table using `by_user_id` index
3. Apply filters (status, search term)
4. Apply sorting
5. Apply pagination
6. Return paginated results with metadata

**Return Type:**
```typescript
{
  journeys: Journey[],
  nextCursor: string | null,
  totalCount: number
}
```

#### 1.2 `getJourney` Query
**Purpose:** Fetch single journey with access control

**Source Reference:** `docs/coading reference/journey-ref.ts:377`

**Arguments:**
- `journeyId: Id<"journeys">`

**Logic:**
1. Fetch journey by ID
2. Apply access control:
   - If `visibility === "private"`: Only owner can access
   - If `visibility === "public" | "unlisted"`: Any authenticated user can access
3. Optionally include associated activities
4. Return journey or null if access denied

**Return Type:**
```typescript
Journey & { activities?: Activity[] } | null
```

### Step 2: Implement Journey Mutations (`convex/journeys/mutations.ts`)

#### 2.1 `createJourney` Mutation
**Purpose:** Create new journey for authenticated user

**Source Reference:** `docs/coading reference/journey-ref.ts:6`

**Arguments:** Use `createJourneyValidator` from `convex/lib/validators.ts:7`
- `title: string`
- `description?: string`
- `visibility: "private" | "unlisted" | "public"`
- `defaultMapStyle?: string`
- `defaultColorPalette?: string`
- `defaultActivityType?: string`
- `coverImageId?: Id<"_storage">`

**Logic:**
1. Require authentication
2. Get user ID from identity
3. Construct journey data with defaults:
   - `userId`: from authenticated user
   - `status`: "active"
   - `totalDistance`: 0
   - `totalElevationGain`: 0
   - `totalDuration`: 0
   - `activityCount`: 0
   - `createdAt`: current timestamp
   - `updatedAt`: current timestamp
4. Insert into `journeys` table
5. Return journey ID

**Return Type:** `Id<"journeys">`

#### 2.2 `updateJourney` Mutation
**Purpose:** Update existing journey (owner only)

**Source Reference:** `docs/coading reference/journey-ref.ts:67`

**Arguments:** Use `updateJourneyValidator` from `convex/lib/validators.ts:17`
- `journeyId: Id<"journeys">`
- `title?: string`
- `description?: string`
- `visibility?: "private" | "unlisted" | "public"`
- `defaultMapStyle?: string`
- `defaultColorPalette?: string`
- `defaultActivityType?: string`
- `coverImageId?: Id<"_storage">`
- `status?: "active" | "archived"`

**Logic:**
1. Require authentication
2. Fetch journey by ID
3. Verify ownership (`journey.userId === authenticatedUserId`)
4. Construct update object with provided fields
5. Set `updatedAt` to current timestamp
6. Patch journey in database
7. Return journey ID

**Return Type:** `Id<"journeys">`

#### 2.3 `deleteJourney` Mutation
**Purpose:** Delete journey and cascade delete related data (owner only)

**Source Reference:** `docs/coading reference/journey-ref.ts:188`

**Arguments:**
- `journeyId: Id<"journeys">`

**Logic:**
1. Require authentication
2. Fetch journey by ID
3. Verify ownership
4. Cascade delete:
   - Query all activities for this journey
   - For each activity:
     - Delete GPX file from storage (`activity.gpxFileId`)
     - Delete activity points (`activityPoints` table)
     - Delete activity record
   - Delete journey cover image if exists (`journey.coverImageId`)
   - Delete journey record
5. Return success status

**Return Type:** `boolean` or `Id<"journeys">`

### Step 3: Validation Integration

#### 3.1 Validator Usage
- Import validators from `convex/lib/validators.ts`
- Use directly in mutation `args` definitions
- Convex automatically validates input

**Example:**
```typescript
import { createJourneyValidator } from "../lib/validators";

export const create = mutation({
  args: createJourneyValidator,
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

#### 3.2 Schema Alignment
Ensure validators match schema fields:
- `createJourneyValidator` covers all required creation fields
- `updateJourneyValidator` includes `journeyId` and optional update fields
- All fields align with `journeys` table schema

### Step 4: User Relationships & Ownership

#### 4.1 Authentication Pattern
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Authentication required");
}
const userId = identity.tokenIdentifier; // or map to user._id
```

#### 4.2 Ownership Verification
```typescript
const journey = await ctx.db.get(journeyId);
if (!journey || journey.userId !== userId) {
  throw new Error("Journey not found or access denied");
}
```

#### 4.3 User ID Mapping
- Use `identity.tokenIdentifier` for `userId` field
- Ensure consistency with user creation in `convex/users.ts`
- Consider using helper function from `convex/users.ts:149` (`getCurrentUserOrThrow`)

### Step 5: Error Handling

#### 5.1 Standard Error Messages
- `"Authentication required"` - No valid session
- `"Journey not found or access denied"` - Invalid ID or no permission
- `"Invalid input"` - Validation failures (handled by Convex)

#### 5.2 Error Types
- Authentication errors: 401-equivalent
- Authorization errors: 403-equivalent  
- Not found errors: 404-equivalent
- Validation errors: 400-equivalent

### Step 6: Documentation & Testing

#### 6.1 JSDoc Comments
Add comprehensive documentation for each function:
```typescript
/**
 * Creates a new journey for the authenticated user
 * @param args - Journey creation parameters
 * @returns The ID of the created journey
 * @throws Error if user is not authenticated
 */
export const create = mutation({
  // ...
});
```

#### 6.2 Code Review Checklist
- [ ] Authentication checks in all functions
- [ ] Proper ownership verification
- [ ] Correct use of validators
- [ ] Proper error handling
- [ ] Cascade delete logic for `deleteJourney`
- [ ] Consistent user ID handling
- [ ] JSDoc documentation
- [ ] Type safety

## Implementation Order

1. **Setup:** Create file structure and review existing code
2. **Queries:** Implement `getUserJourneys` and `getJourney`
3. **Create:** Implement `createJourney` mutation
4. **Update:** Implement `updateJourney` mutation  
5. **Delete:** Implement `deleteJourney` mutation (most complex due to cascade)
6. **Testing:** Manual testing of all operations
7. **Documentation:** Final JSDoc and code review

## Dependencies

### Internal Dependencies
- `convex/schema.ts` - Journey table definition
- `convex/lib/validators.ts` - Input validation schemas
- `convex/users.ts` - User authentication helpers
- `convex/_generated/server` - Convex server functions

### External Dependencies
- Convex framework for database operations
- Clerk authentication (via Convex auth integration)

## Success Criteria

- [ ] All CRUD operations implemented and functional
- [ ] Proper authentication and authorization
- [ ] Input validation using existing validators
- [ ] Cascade delete works correctly
- [ ] No data leaks (users can only access their own private journeys)
- [ ] Public/unlisted journeys accessible as designed
- [ ] Comprehensive error handling
- [ ] Full JSDoc documentation
- [ ] Code passes review checklist

## Notes

- Sharing permissions are explicitly deferred to later implementation
- Focus on core CRUD functionality and data integrity
- Ensure compatibility with existing schema and validators
- Follow established patterns from `convex/users.ts` for authentication