export interface ParseRequestResult {
  pathStart: number;
  pathEnd: number;
}

export function parseRequestURL(request: Request): ParseRequestResult {
  const s = request.url;
  let i = s.charCodeAt(4) === 115 ? 8 : 7;

  while (s.charCodeAt(i) !== 47) i++;
  const pathStart = i;

  while (i < s.length && s.charCodeAt(i) !== 63) i++;

  return { pathStart, pathEnd: i };
}
