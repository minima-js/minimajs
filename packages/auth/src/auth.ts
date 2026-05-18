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

export interface AuthResourceWithRequired<T> {
  (): T;
  required(): T;
}

export interface AuthResourceOptional<T> {
  (): T | undefined;
  required(): T;
}

/**
 * Creates an authentication plugin and resource accessor.
 *
 * Pass a single callback or an array of strategy callbacks (OR logic — first to resolve wins).
 * With `{ required: true }` the resource always returns `T`; without it returns `T | undefined`.
 *
 * @example
 * ```typescript
 * import { createAuth, bearer } from "@minimajs/auth";
 *
 * // single strategy
 * export const [authPlugin, getUser] = createAuth(bearer(token => verifyJWT(token)));
 *
 * // multi-strategy — JWT or API key, whichever resolves first
 * export const [authPlugin, getUser] = createAuth([
 *   bearer(token => verifyJWT(token)),
 *   apiKey("x-api-key", key => verifyKey(key)),
 * ]);
 *
 * // required — getUser() always returns User, throws 401 if auth failed
 * export const [authPlugin, getUser] = createAuth(bearer(token => verifyJWT(token)), { required: true });
 * ```
 */
export function createAuth<T, S>(
  callback: AuthCallback<T> | AuthCallback<T>[],
  option: { required: true }
): [PluginSync<S>, AuthResourceWithRequired<T>];

export function createAuth<T, S>(callback: AuthCallback<T> | AuthCallback<T>[]): [PluginSync<S>, AuthResourceOptional<T>];

export function createAuth<T, S>(
  callback: AuthCallback<T> | AuthCallback<T>[],
  option?: AuthOption
): [PluginSync<S>, AuthResourceWithRequired<T> | AuthResourceOptional<T>] {
  const [getAuth, setAuth] = createContext<AuthResource<T>>({});
  const strategies = Array.isArray(callback) ? callback : [callback];

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

  const plugin = hook<S>("request", async function middleware() {
    let lastError: BaseHttpError | undefined;
    for (const strategy of strategies) {
      try {
        const data = await strategy();
        setAuth({ data });
        return;
      } catch (error) {
        if (!BaseHttpError.is(error)) throw error;
        lastError = error;
      }
    }
    setAuth({ error: lastError });
  });

  return [plugin, resource] as const;
}
