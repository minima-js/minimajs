export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
export function getBody<T = any>(res: Response) {
  return res.json() as T;
}
