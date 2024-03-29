import { type Request, type Response, createContext } from "@minimajs/server";
import { BaseHttpError } from "@minimajs/server/error";
import { UnauthorizedError } from "./error.js";

interface Auth<T> {
  data?: T;
  error?: BaseHttpError;
}

export type AuthCallback<T> = (req: Request, res: Response) => Promise<T>;

export type GuardCallback<T> = (data?: T, error?: BaseHttpError) => Promise<boolean> | boolean;

export type GuardMessageCallback = (error?: BaseHttpError) => string;

export function createAuth<T>(callback: AuthCallback<T>) {
  const [getAuth$1, setAuth$1] = createContext<Auth<T>>({});
  function getAuth() {
    return getAuth$1().data;
  }
  function createGuard(callback?: GuardCallback<T>, message?: string | GuardMessageCallback) {
    return async function guard() {
      const { data, error } = getAuth$1();
      if (callback) {
        if (await callback(data, error)) {
          return;
        }
        if (message) {
          if (typeof message === "function") {
            message = message(error);
          }
          throw new UnauthorizedError(message);
        }
      }
      if (error) {
        throw error;
      }
    };
  }

  async function interceptor(req: Request, res: Response) {
    try {
      const data = await callback(req, res);
      setAuth$1({ data });
    } catch (error) {
      if (!BaseHttpError.is(error)) {
        throw error;
      }
      setAuth$1({ error });
    }
  }
  return [interceptor, createGuard, getAuth] as const;
}
