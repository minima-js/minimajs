import { expect } from "@jest/globals";
/**
 * Custom Jest matchers for better test readability
 *
 * Usage:
 * ```ts
 * import { setupCustomMatchers } from './helpers/matchers';
 *
 * beforeAll(() => {
 *   setupCustomMatchers();
 * });
 * ```
 */

export function setupCustomMatchers() {
  expect.extend({
    toHaveStatusCode(response: Response, expected: number) {
      const pass = response.status === expected;
      return {
        pass,
        message: () =>
          pass ? `expected status code not to be ${expected}` : `expected status code ${response.status} to be ${expected}`,
      };
    },

    toHaveHeader(response: Response, name: string, value?: string) {
      const headerValue = response.headers.get(name);
      const exists = headerValue !== null;

      if (value === undefined) {
        return {
          pass: exists,
          message: () => (exists ? `expected header "${name}" not to exist` : `expected header "${name}" to exist`),
        };
      }

      const pass = headerValue === value;
      return {
        pass,
        message: () =>
          pass
            ? `expected header "${name}" not to be "${value}"`
            : `expected header "${name}" to be "${value}", got "${headerValue}"`,
      };
    },

    toBeSuccessResponse(response: Response) {
      const pass = response.status >= 200 && response.status < 300;
      return {
        pass,
        message: () =>
          pass
            ? `expected status code ${response.status} not to be a success code (2xx)`
            : `expected status code ${response.status} to be a success code (2xx)`,
      };
    },

    toBeErrorResponse(response: Response) {
      const pass = response.status >= 400;
      return {
        pass,
        message: () =>
          pass
            ? `expected status code ${response.status} not to be an error code (4xx/5xx)`
            : `expected status code ${response.status} to be an error code (4xx/5xx)`,
      };
    },
  });
}
