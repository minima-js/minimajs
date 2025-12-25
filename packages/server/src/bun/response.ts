import type { App } from "../types.js";
import type { Response as ResponseType } from "../interfaces/response.js";

export class Response implements ResponseType<null, App> {
  public readonly raw: null = null;
  public statusCode: number = 200;
  private _hijacked: boolean = false;
  private _sent: boolean = false;
  private _headers: Map<string, string> = new Map();
  private _body: any = null;

  constructor(public readonly server: App) {}

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  header(name: string, value: string): this {
    this._headers.set(name.toLowerCase(), value);
    return this;
  }

  send(payload?: unknown): this {
    if (this._hijacked || this._sent) {
      return this;
    }

    this._sent = true;
    this._body = payload;

    if (payload === undefined || payload === null) {
      return this;
    }

    if (typeof payload === "string") {
      if (!this._headers.has("content-type")) {
        this._headers.set("content-type", "text/plain; charset=utf-8");
      }
      return this;
    }

    if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
      if (!this._headers.has("content-type")) {
        this._headers.set("content-type", "application/octet-stream");
      }
      return this;
    }

    if (!this._headers.has("content-type")) {
      this._headers.set("content-type", "application/json; charset=utf-8");
    }
    this._body = JSON.stringify(payload);
    return this;
  }

  hijack(): this {
    this._hijacked = true;
    return this;
  }

  get sent(): boolean {
    return this._sent;
  }

  toResponse(): globalThis.Response {
    const headers = new Headers();
    this._headers.forEach((value, key) => {
      headers.set(key, value);
    });

    return new globalThis.Response(this._body, {
      status: this.statusCode,
      headers,
    });
  }
}
