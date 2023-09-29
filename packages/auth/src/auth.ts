import { type Request, type Response, createContext } from "@minimajs/app";
import { BaseHttpError as HttpError } from "@minimajs/app/error";

interface Auth<T> {
  data?: T;
  error?: HttpError;
}

type AuthCallback<T> = (req: Request, res: Response) => Promise<T>;
export function createAuth<T>(callback: AuthCallback<T>) {
  const [getAuth$1, setAuth$1] = createContext<Auth<T>>({});
  function getAuth() {
    return getAuth$1().data;
  }

  async function authGuard() {
    const { error } = getAuth$1();
    if (error) {
      throw error;
    }
  }

  async function interceptor(req: Request, res: Response) {
    try {
      const data = await callback(req, res);
      setAuth$1({ data });
    } catch (error) {
      if (!(error instanceof HttpError)) {
        throw error;
      }
      setAuth$1({ error });
    }
  }
  return [interceptor, authGuard, getAuth] as const;
}
