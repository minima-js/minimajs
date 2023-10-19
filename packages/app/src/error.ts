import { StatusCodes } from "http-status-codes";
import type { Request, Response } from "./types.js";

type Renderer = (
  err: HttpError,
  req: Request,
  res: Response
) => Promise<void> | void;

export abstract class BaseHttpError extends Error {
  abstract render(req: Request, res: Response): void;
}

export class HttpError extends BaseHttpError {
  public readonly statusCode: number;

  public static render: Renderer = function render(err, _, res) {
    res.status(err.statusCode).send(err.toJSON());
  };

  constructor(message: string, statusCode: keyof typeof StatusCodes | number) {
    super(message);
    if (typeof statusCode !== "number") {
      this.statusCode = StatusCodes[statusCode];
    } else {
      this.statusCode = statusCode;
    }
  }

  public toJSON(): unknown {
    return {
      message: this.message,
    };
  }

  async render(req: Request, res: Response) {
    return HttpError.render(this, req, res);
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

export function errorHandler(error: unknown, req: Request, reply: Response) {
  if (error instanceof BaseHttpError) {
    error.render(req, reply);
    return;
  }
  throw error;
}
