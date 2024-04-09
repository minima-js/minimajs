import type { Dict } from "@minimajs/server";
import type { Adapter } from "./adapter/adapter.js";
interface SessionCookie {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  maxAge: Date;
}
export interface SessionOption {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  store: Adapter;
  cookie: SessionCookie;
}

export type Facade = {
  [key: string]: unknown;
};

export class Session {
  constructor(public readonly id: string, public data: Dict, public readonly adapter: Adapter) {}
  static async create(id: string, adapter: Adapter) {
    const data = await adapter.read(id);
    return new Session(id, data as Dict, adapter);
  }
  set(key: string, val: unknown) {
    this.data[key] = val;
  }
  get(key: string) {
    return this.data[key];
  }
  delete(key: string) {
    delete this.data[key];
  }
  flush() {
    this.data = {};
  }
  commit() {
    return this.adapter.write(this.id, this.data);
  }
  regenerate() {
    return this;
  }
}
