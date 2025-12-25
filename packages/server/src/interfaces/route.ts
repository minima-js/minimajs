import type { Request } from "./request.js";
import type { Response } from "./response.js";

export interface RouteHandler {
  (req: Request, res: Response): unknown;
}
