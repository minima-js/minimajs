export type ResponseBody = string | ReadableStream | ArrayBuffer | Blob | null;
export type Serializer = (body: unknown, req: Request, res: Response) => ResponseBody | Promise<ResponseBody>;
export type ErrorHandler = (error: unknown, req: Request) => Response | Promise<Response>;
