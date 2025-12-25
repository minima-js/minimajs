import type { App } from "./app.js";

export interface Response<TRaw = any, TServer = App> {
  readonly raw: TRaw;
  readonly server: TServer;
  readonly sent: boolean;
  statusCode: number;
  status(code: number): this;
  header(name: string, value: string): this;
  send(payload?: unknown): this;
  hijack(): this;
}
