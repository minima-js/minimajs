import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import type { TLSSocket } from "node:tls";
import type { App, Dict } from "../types.js";
import type { RouteOptions, Request as RequestType } from "../interfaces/request.js";

export class Request implements RequestType {
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

  constructor(public readonly raw: IncomingMessage, public readonly server: App, public readonly socket: Socket) {
    this.id = this.generateRequestId();
    this.method = raw.method || "GET";
    this.url = raw.url || "/";
    this.originalUrl = this.url;
    this.extractHostname();
    this.extractProtocol();
    this.extractIp();
    this.routeOptions = {
      method: this.method,
      path: this.url.split("?")[0],
      params: [],
    };
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private extractHostname(): void {
    const host = this.raw.headers.host;
    this.hostname = host ? host.split(":")[0]! : "localhost";
  }

  private extractProtocol(): void {
    if ((this.socket as TLSSocket).encrypted) {
      this.protocol = "https";
      return;
    }
    const proto = this.raw.headers["x-forwarded-proto"];
    if (proto) {
      this.protocol = Array.isArray(proto) ? proto[0] : proto;
    }
  }

  private extractIp(): void {
    const forwarded = this.raw.headers["x-forwarded-for"];
    if (forwarded) {
      this.ip = Array.isArray(forwarded)
        ? forwarded?.[0]?.split?.(",")[0]?.trim()!
        : forwarded?.split?.(",")?.[0]?.trim()!;
      return;
    }
    this.ip = this.socket.remoteAddress || "";
  }
}
