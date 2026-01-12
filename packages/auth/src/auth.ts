import { createContext, hook, type PluginSync } from "@minimajs/server";
import { BaseHttpError } from "@minimajs/server/error";

interface AuthResource<T> {
  data?: T;
  error?: BaseHttpError;
}

export interface AuthOption {
  required?: boolean;
}

export type AuthCallback<T> = () => Promise<T> | T;

export type GuardCallback<T> = (data?: T, error?: BaseHttpError) => Promise<boolean> | boolean;

export type GuardMessageCallback = (error?: BaseHttpError) => string;

export interface AuthResourceWithRequired<T> {
  (): T;
  required(): T;
}

export interface AuthResourceOptional<T> {
  (): T | undefined;
  required(): T;
}

/**
 * Creates an authentication middleware plugin and resource accessor for Minima.js applications.
 *
 * This function sets up authentication by creating a middleware plugin that executes your
 * authentication logic and a resource accessor function to retrieve the authenticated data
 * throughout your application.
 *
 * @template T - The type of the authentication data (e.g., User object)
 *
 * @param callback - An async or sync function that performs authentication logic.
 *                   Should return the authenticated data (e.g., user object) or throw
 *                   a BaseHttpError (like UnauthorizedError) if authentication fails.
 *
 * @param option - Configuration options for authentication behavior:
 *                 - `required: true` - Makes authentication mandatory. The resource accessor
 *                   will always return T (non-nullable). If authentication fails, all routes
 *                   protected by this plugin will automatically throw the authentication error.
 *                 - If omitted, authentication is optional. The resource accessor returns
 *                   T | undefined, allowing routes to handle missing authentication gracefully.
 *
 * @returns A tuple containing:
 *   1. `plugin` - A middleware plugin to register with your app using `app.register(plugin)`
 *   2. `resource` - A function to access the authenticated data:
 *      - When `required: true`: Returns T (non-nullable)
 *      - When optional: Returns T | undefined
 *      - Has a `.required()` method that always returns T or throws if auth failed
 *
 * @example
 * ```typescript
 * // Optional authentication
 * import { headers } from "@minimajs/server";
 * import { createAuth, UnauthorizedError } from "@minimajs/auth";
 *
 * export const [plugin, getUser] = createAuth(async () => {
 *   const token = headers.get("x-user-token");
 *   const user = await User.findByToken(token);
 *   if (!user) {
 *     throw new UnauthorizedError("Invalid credentials");
 *   }
 *   return user;
 * });
 *
 * // In your app
 * app.register(plugin);
 * app.get("/", () => {
 *   const user = getUser(); // User | undefined
 *   if (user) console.log(`Logged in as ${user.name}`);
 * });
 *
 * // Create a guard for protected routes
 * function guard() {
 *   getUser.required(); // Throws if auth failed
 * }
 * app.register(interceptor([guard], protectedRoutes));
 * ```
 *
 * @example
 * ```typescript
 * // Required authentication (all routes protected by default)
 * export const [plugin, getUser] = createAuth(
 *   async () => {
 *     const token = headers.get("x-user-token");
 *     const user = await User.findByToken(token);
 *     if (!user) {
 *       throw new UnauthorizedError("Invalid credentials");
 *     }
 *     return user;
 *   },
 *   { required: true }
 * );
 *
 * // In your app
 * app.register(plugin); // All routes now require authentication
 * app.get("/profile", () => {
 *   const user = getUser(); // User (non-nullable)
 *   return { name: user.name }; // TypeScript knows user exists
 * });
 * ```
 */
export function createAuth<T, S = any>(
  callback: AuthCallback<T>,
  option: { required: true }
): [PluginSync<S>, AuthResourceWithRequired<T>];

export function createAuth<T, S = any>(callback: AuthCallback<T>): [PluginSync<S>, AuthResourceOptional<T>];

export function createAuth<T, S = any>(
  callback: AuthCallback<T>,
  option?: AuthOption
): [PluginSync<S>, AuthResourceWithRequired<T> | AuthResourceOptional<T>] {
  const [getAuth, setAuth] = createContext<AuthResource<T>>({});
  function resource() {
    if (option?.required) {
      return resource.required();
    }
    return getAuth().data;
  }

  resource.required = function requiredResource() {
    const { data, error } = getAuth();
    if (error) throw error;
    return data!;
  };

  const plugin = hook("request", async function middleware() {
    try {
      const data = await callback();
      setAuth({ data });
    } catch (error) {
      if (!BaseHttpError.is(error)) {
        throw error;
      }
      setAuth({ error });
    }
  });

  return [plugin, resource] as const;
}
