export interface RouteHandler {
  (req: Request, res: Response): unknown;
}
