import type { App } from "./app.js";

export type ResponseBody = string | ReadableStream | ArrayBuffer | Blob | null;
export type Serializer = (body: unknown, req: Request) => ResponseBody | Promise<ResponseBody>;
export type ErrorHandler = (error: unknown, req: Request, app: App) => Response | Promise<Response>;
