import type { ServerResponse } from "node:http";
import type { App } from "../types.js";

export class Response {
  public statusCode: number = 200;
  private _hijacked: boolean = false;

  constructor(public readonly raw: ServerResponse, public readonly server: App) {}

  send(payload?: unknown): this {
    if (this._hijacked || this.raw.writableEnded) {
      return this;
    }

    if (payload === undefined || payload === null) {
      this.raw.end();
      return this;
    }

    if (typeof payload === "string") {
      if (!this.raw.hasHeader("content-type")) {
        this.raw.setHeader("content-type", "text/plain; charset=utf-8");
      }
      this.raw.end(payload);
      return this;
    }

    if (Buffer.isBuffer(payload)) {
      if (!this.raw.hasHeader("content-type")) {
        this.raw.setHeader("content-type", "application/octet-stream");
      }
      this.raw.end(payload);
      return this;
    }

    if (!this.raw.hasHeader("content-type")) {
      this.raw.setHeader("content-type", "application/json; charset=utf-8");
    }
    this.raw.end(JSON.stringify(payload));
    return this;
  }

  hijack(): this {
    this._hijacked = true;
    return this;
  }

  get sent(): boolean {
    return this.raw.writableEnded;
  }
}
