/**
 * @minimajs/server/mock - Testing utilities
 *
 * Provides lightweight utilities for creating mock requests in tests.
 * For full integration tests, use `app.inject()` directly.
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
 * // Use with app.inject
 * const response = await app.inject(request);
 * expect(response.status).toBe(200);
 * ```
 */

export * from "./request.js";
