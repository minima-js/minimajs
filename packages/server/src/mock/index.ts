/**
 * @minimajs/server/mock - Testing utilities
 *
 * Provides lightweight utilities for creating mock requests in tests.
 * For full integration tests, use `app.handle()` directly.
 *
 * @module @minimajs/server/mock
 *
 * @example
 * ```typescript
 * import { createRequest } from '@minimajs/server/mock';
 *
 * // Create a mock request
 * const request = createRequest('/users', { method: 'POST', body: { name: 'John' } });
 *
 * // Use with app.handle
 * const response = await app.handle(request);
 * expect(response.status).toBe(200);
 * ```
 */

export * from "./request.js";
export * from "./context.js";
