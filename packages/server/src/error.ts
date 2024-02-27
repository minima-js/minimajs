import { StatusCodes } from "http-status-codes";
import type { App, Request, Response } from "./types.js";
import { kErrorRenderer } from "./internal/symbol.js";

export type Renderer = (
  err: HttpError,
  req: Request,
  res: Response
) => Promise<void> | void;

export abstract class BaseHttpError extends Error {
  abstract render(req: Request, res: Response): void;
}

export class HttpError extends BaseHttpError {
  public readonly statusCode: number;

  public static create(err: unknown): BaseHttpError {
    if (err instanceof BaseHttpError) {
      return err;
    }
    if (err instanceof Error) {
      return new HttpError(err.message, "INTERNAL_SERVER_ERROR");
    }
    return new HttpError("Unable to handle request", "INTERNAL_SERVER_ERROR");
  }

  public static render: Renderer = function render(err, _, res) {
    res.status(err.statusCode).send(err.toJSON());
  };

  public static toJSON = function toJSON(err: HttpError): unknown {
    return { message: err.message };
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
    return HttpError.toJSON(this);
  }

  async render(req: Request, res: Response) {
    const doRender = getRender(req.server);
    return doRender(this, req, res);
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
  HttpError.create(error).render(req, reply);
}

/**
 * Yet to be implemented
 */
export function renderError(app: App, render: Renderer) {
  app.decorate(kErrorRenderer, render);
}

function getRender(app: App): Renderer {
  return (
    app[kErrorRenderer] ??
    function render(err, _, res) {
      res.status(err.statusCode).send(err.toJSON());
    }
  );
}
