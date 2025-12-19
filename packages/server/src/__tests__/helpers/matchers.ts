import type { InjectResponse } from "../../mock/index.js";

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

interface CustomMatchers<R = unknown> {
  toHaveStatusCode(expected: number): R;
  toHaveHeader(name: string, value?: string): R;
  toHaveBody(expected: any): R;
  toBeSuccessResponse(): R;
  toBeErrorResponse(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

export function setupCustomMatchers() {
  expect.extend({
    toHaveStatusCode(
      response: InjectResponse,
      expected: number
    ) {
      const pass = response.statusCode === expected;
      return {
        pass,
        message: () =>
          pass
            ? `expected status code not to be ${expected}`
            : `expected status code ${response.statusCode} to be ${expected}`,
      };
    },

    toHaveHeader(
      response: InjectResponse,
      name: string,
      value?: string
    ) {
      const headerValue = response.headers[name];
      const exists = headerValue !== undefined;

      if (value === undefined) {
        return {
          pass: exists,
          message: () =>
            exists
              ? `expected header "${name}" not to exist`
              : `expected header "${name}" to exist`,
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

    toHaveBody(response: InjectResponse, expected: any) {
      const pass = JSON.stringify(response.body) === JSON.stringify(expected);
      return {
        pass,
        message: () =>
          pass
            ? `expected body not to match`
            : `expected body to match\nExpected: ${JSON.stringify(expected, null, 2)}\nReceived: ${JSON.stringify(response.body, null, 2)}`,
      };
    },

    toBeSuccessResponse(response: InjectResponse) {
      const pass = response.statusCode >= 200 && response.statusCode < 300;
      return {
        pass,
        message: () =>
          pass
            ? `expected status code ${response.statusCode} not to be a success code (2xx)`
            : `expected status code ${response.statusCode} to be a success code (2xx)`,
      };
    },

    toBeErrorResponse(response: InjectResponse) {
      const pass = response.statusCode >= 400;
      return {
        pass,
        message: () =>
          pass
            ? `expected status code ${response.statusCode} not to be an error code (4xx/5xx)`
            : `expected status code ${response.statusCode} to be an error code (4xx/5xx)`,
      };
    },
  });
}
