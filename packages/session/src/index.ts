import { createContext, defer } from "@minimajs/server";
import { Session, type Facade, type SessionOption } from "./session.js";

const kInstance = Symbol("instance");

export function getInstance(session: Facade): Session {
  return (session as any)[kInstance]();
}

export function createSession(option: SessionOption) {
  const [session, setSession] = createContext<Session>();

  async function store() {
    const sess = session();
    await sess.commit();
  }

  const facade = new Proxy<Record<string | symbol, unknown>>(
    { [kInstance]: session },
    {
      get(handler, key) {
        if (key in handler) return handler[key];
        return session().get(key as string);
      },
    }
  );
  async function interceptor() {
    setSession(await Session.create("11", option.store));
    defer(store);
  }
  return [interceptor, facade] as const;
}
