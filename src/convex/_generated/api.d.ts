/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as favorites from "../favorites.js";
import type * as lib_externalItems from "../lib/externalItems.js";
import type * as lib_serverSecret from "../lib/serverSecret.js";
import type * as lib_steam from "../lib/steam.js";
import type * as lib_strings from "../lib/strings.js";
import type * as lib_usernames from "../lib/usernames.js";
import type * as projectPosts from "../projectPosts.js";
import type * as projects from "../projects.js";
import type * as steamSync from "../steamSync.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  crons: typeof crons;
  favorites: typeof favorites;
  "lib/externalItems": typeof lib_externalItems;
  "lib/serverSecret": typeof lib_serverSecret;
  "lib/steam": typeof lib_steam;
  "lib/strings": typeof lib_strings;
  "lib/usernames": typeof lib_usernames;
  projectPosts: typeof projectPosts;
  projects: typeof projects;
  steamSync: typeof steamSync;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
