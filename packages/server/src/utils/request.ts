export interface ParseRequestResult {
  pathname: string;
  url: string;
}

export function parseRequestURL(request: Request): ParseRequestResult {
  const s = request.url;
  const len = s.length;

  let i = 8; // skip "https://"
  if (s.charCodeAt(4) !== 115 /* s */) i = 7; // "http://"

  // Skip host
  while (i < len) {
    const c = s.charCodeAt(i);
    if (c === 47 /* / */) break;
    i++;
  }

  const pathStart = i;

  // Scan path until '?'
  while (i < len && s.charCodeAt(i) !== 63 /* ? */) i++;

  return {
    pathname: s.slice(pathStart, i),
    url: s.slice(pathStart),
  };
}
