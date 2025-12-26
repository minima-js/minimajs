export type ResponseBody = ReadableStream | string;
export type Serializer = (req: Request, res: Response, body: unknown) => ResponseBody | Promise<ResponseBody>;
