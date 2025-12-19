/**
 * Test fixtures for consistent test data
 */

export const testFixtures = {
  users: {
    valid: {
      id: "123",
      name: "John Doe",
      email: "john@example.com",
      age: 30,
    },
  },
  headers: {
    auth: {
      authorization: "Bearer token123",
    },
    combined: {
      authorization: "Bearer token123",
      "x-custom": "value",
      "content-type": "application/json",
    },
  },
  params: {
    user: { id: "123" },
    post: { id: "456", slug: "hello-world" },
  },
  query: {
    pagination: { page: "1", limit: "10" },
    filters: { status: "active", category: "tech" },
  },
};

export function createTestUser(overrides?: Partial<typeof testFixtures.users.valid>) {
  return { ...testFixtures.users.valid, ...overrides };
}
