import { v } from "convex/values";
import { type QueryCtx, internalMutation, mutation, query } from "./_generated/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user !== null) {
      if (user.name !== identity.name || user.imageUrl !== identity.pictureUrl) {
        await ctx.db.patch(user._id, {
          name: identity.name?.toString() ?? "",
          imageUrl: identity.pictureUrl?.toString() ?? "",
          updatedAt: Date.now(),
        });
      }
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: identity.name?.toString() ?? "",
      imageUrl: identity.pictureUrl?.toString() ?? "",
      email: identity.email?.toString() ?? "",
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, // Expects Clerk UserJSON-like data
  async handler(ctx, { data }) {
    const clerkUserId = data.id as string;

    // Define an interface for the email address object from Clerk
    interface ClerkEmailAddress {
      id: string;
      email_address: string;
      // Add other properties if needed, e.g., verification
    }

    // Construct name, ensuring it's a string. Handles null first/last names.
    const name = `${data.first_name || ""} ${data.last_name || ""}`.trim();

    // Extract email address from Clerk's email_addresses array
    let primaryEmail: string | undefined = undefined;
    const emailAddresses = data.email_addresses as ClerkEmailAddress[] | undefined;

    if (emailAddresses && Array.isArray(emailAddresses) && emailAddresses.length > 0) {
      let emailObj: ClerkEmailAddress | undefined;
      // Try to find the primary email address using primary_email_address_id
      if (data.primary_email_address_id) {
        emailObj = emailAddresses.find((e) => e.id === data.primary_email_address_id);
      }
      // Fallback to the first email address in the array if primary is not found or not specified
      if (!emailObj) {
        emailObj = emailAddresses[0];
      }
      // Ensure the found object has an email_address string
      if (emailObj && typeof emailObj.email_address === "string") {
        primaryEmail = emailObj.email_address;
      }
    }

    if (!primaryEmail) {
      console.error(
        `Clerk webhook: User data for Clerk ID ${clerkUserId} is missing a usable email address. The 'email' field is required by the Convex schema. Problematic email_addresses payload: ${JSON.stringify(emailAddresses)}`
      );
      // Throw an error to indicate failure, which Clerk can retry.
      // Convex schema validation for 'email: v.string()' would also cause a failure.
      throw new Error(`Missing primary email for Clerk user ${clerkUserId}.`);
    }

    // Prepare the payload for Convex, mapping Clerk fields to your schema
    const userPayload = {
      tokenIdentifier: clerkUserId,
      name,
      email: primaryEmail, // Now guaranteed to be a string if we reach here
      // Use data.image_url and ensure it's undefined if null/missing, matching v.optional(v.string())
      imageUrl: (data.image_url as string | null) ?? undefined,
    };

    console.log("Upserting user from Clerk webhook:", {
      clerkUserId,
      name: userPayload.name,
      email: userPayload.email,
      imageUrl: userPayload.imageUrl,
    });

    const existingUser = await userByTokenIdentifier(ctx, clerkUserId);

    if (existingUser === null) {
      console.log(`Clerk webhook: Creating new user for Clerk ID: ${clerkUserId}`);
      await ctx.db.insert("users", {
        ...userPayload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Check if a patch is necessary by comparing relevant fields
      const needsPatch =
        existingUser.name !== userPayload.name ||
        existingUser.email !== userPayload.email ||
        existingUser.imageUrl !== userPayload.imageUrl;

      if (needsPatch) {
        console.log(`Clerk webhook: Patching existing user for Clerk ID: ${clerkUserId}`);
        await ctx.db.patch(existingUser._id, {
          ...userPayload, // This will update name, email, imageUrl. tokenIdentifier won't change.
          updatedAt: Date.now(),
        });
      } else {
        console.log(`Clerk webhook: No changes detected for user ${clerkUserId}. Skipping patch.`);
      }
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    console.log("Deleting user", clerkUserId);
    const user = await userByTokenIdentifier(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByTokenIdentifier(ctx, identity.tokenIdentifier);
}

async function userByTokenIdentifier(ctx: QueryCtx, tokenIdentifier: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

// current exposes the user information to the client, which will helps the client determine whether the webhook already succeeded
// upsertFromClerk will be called when a user signs up or when they update their account
// deleteFromClerk will be called when a user deletes their account via Clerk UI from your app
// getCurrentUserOrThrow retrieves the currently logged-in user or throws an error
// getCurrentUser retrieves the currently logged-in user or returns null
// userByExternalId retrieves a user given the Clerk ID, and is used only for retrieving the current user or when updating an existing user via the webhook
