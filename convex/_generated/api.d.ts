/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activities_actions from "../activities/actions.js";
import type * as activities_index from "../activities/index.js";
import type * as activities_mutations from "../activities/mutations.js";
import type * as http from "../http.js";
import type * as journeys_index from "../journeys/index.js";
import type * as journeys_mutations from "../journeys/mutations.js";
import type * as journeys_queries from "../journeys/queries.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_types from "../lib/types.js";
import type * as lib_utils from "../lib/utils.js";
import type * as lib_validators from "../lib/validators.js";
import type * as storage_index from "../storage/index.js";
import type * as storage_mutations from "../storage/mutations.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "activities/actions": typeof activities_actions;
  "activities/index": typeof activities_index;
  "activities/mutations": typeof activities_mutations;
  http: typeof http;
  "journeys/index": typeof journeys_index;
  "journeys/mutations": typeof journeys_mutations;
  "journeys/queries": typeof journeys_queries;
  "lib/index": typeof lib_index;
  "lib/types": typeof lib_types;
  "lib/utils": typeof lib_utils;
  "lib/validators": typeof lib_validators;
  "storage/index": typeof storage_index;
  "storage/mutations": typeof storage_mutations;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
