import { StatusCodes } from "http-status-codes";
import type { App, Request, Response } from "./types.js";
import { kErrorDecorator } from "./internal/symbol.js";

export type ErrorDecorator = (
  err: HttpError
) =>
  | [statusCode: number, payload: unknown]
  | Promise<[statusCode: number, payload: unknown]>;

function getDecorator(app: App): ErrorDecorator {
  return (
    app[kErrorDecorator] ??
    async function render(err) {
      return [err.statusCode, err.toJSON()];
    }
  );
}

export abstract class BaseHttpError extends Error {
  static is(value: unknown): value is BaseHttpError {
    return value instanceof this;
  }
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
    res.hijack();
    const decorator = getDecorator(req.server);
    const [status, payload] = await decorator(this);
    const { raw: response } = res;
    response.statusCode = status;
    response.end(res.serialize(payload));
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

export function decorate(app: App, render: ErrorDecorator) {
  app.decorate(kErrorDecorator, render);
}
