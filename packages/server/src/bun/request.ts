import type { App, Dict } from "../types.js";
import type { RouteOptions, Request as RequestType } from "../interfaces/request.js";
import type { Server } from "bun";

export class Request implements RequestType<globalThis.Request, App> {
  public id: string;
  public params: Dict<string> = {};
  public query: Dict<string | string[]> = {};
  public body: unknown = null;
  public hostname: string = "";
  public ip: string = "";
  public protocol: string = "http";
  public url: string = "";
  public originalUrl: string = "";
  public method: string = "";
  public routeOptions: RouteOptions;
  public readonly socket?: any = undefined;

  constructor(
    public readonly raw: globalThis.Request,
    public readonly server: App,
    bunServer?: Server<any>
  ) {
    this.id = this.generateRequestId();
    const urlObj = new URL(raw.url);
    this.method = raw.method;
    this.url = urlObj.pathname + urlObj.search;
    this.originalUrl = this.url;
    this.hostname = urlObj.hostname;
    this.protocol = urlObj.protocol.replace(":", "");
    this.extractIp(bunServer);
    this.routeOptions = {
      method: this.method,
      path: urlObj.pathname,
      params: [],
    };
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private extractIp(bunServer?: Server<any>): void {
    // Use Bun's built-in requestIP for accurate client IP detection
    if (bunServer) {
      const address = bunServer.requestIP(this.raw);
      if (address) {
        this.ip = address.address;
        return;
      }
    }

    // Fallback to x-forwarded-for header
    const forwarded = this.raw.headers.get("x-forwarded-for");
    if (forwarded) {
      this.ip = forwarded.split(",")[0]?.trim() || "";
      return;
    }
    this.ip = "";
  }
}
