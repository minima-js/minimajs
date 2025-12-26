export type ResponseBody = ReadableStream | string;
export type Serializer = (req: Request, res: Response, body: unknown) => ResponseBody | Promise<ResponseBody>;
export type ErrorHandler = (req: Request, error: unknown) => Response | Promise<Response>;
