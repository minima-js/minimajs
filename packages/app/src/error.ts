import { StatusCodes } from "http-status-codes";
import type { Request, Response } from "./types.js";

type JSONFormatter = (err: HttpError) => Promise<unknown> | unknown;

export abstract class BaseHttpError extends Error {
  abstract render(req: Request, res: Response): void;
}

export class HttpError extends BaseHttpError {
  public readonly statusCode: number;
  public static toJSON: JSONFormatter = (err) => ({
    message: err.message,
  });

  constructor(message: string, statusCode: keyof typeof StatusCodes | number) {
    super(message);
    if (typeof statusCode !== "number") {
      this.statusCode = StatusCodes[statusCode];
    } else {
      this.statusCode = statusCode;
    }
  }

  toJSON(): unknown {
    return HttpError.toJSON(this);
  }

  async render(req: Request, res: Response) {
    res.status(this.statusCode).send(await this.toJSON());
  }
}

export class RedirectError extends BaseHttpError {
  statusCode: number;
  constructor(public readonly url: string, isPermanent = false) {
    super();
    this.statusCode = isPermanent ? 301 : 302;
  }
  render(_: unknown, res: Response) {
    res.redirect(this.statusCode, this.url);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 401);
  }
}

export function errorHandler(error: unknown, req: Request, reply: Response) {
  if (error instanceof BaseHttpError) {
    error.render(req, reply);
    return;
  }
  throw error;
}
