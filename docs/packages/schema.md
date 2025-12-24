---
title: Schema
sidebar_position: 1
---

Schema, built on top of Yup, provides a comprehensive set of validation tools and exposes everything from `@minimajs/schema` to facilitate seamless validation in your applications.

### Installation

You can install `@minimajs/schema` via npm or yarn:

```bash npm2yarn
npm install @minimajs/schema
```

### Validating Request Body

To validate request bodies, you can use the `createBody` function along with Yup schema definitions. Here's an example:

```typescript
import { createBody, string } from "@minimajs/schema";

const getUserPayload = createBody({
  name: string().required(),
});

function createUser() {
  const payload = getUserPayload(); // { name: string } type will be inferred.
  // Save data
  // payload = { name: string }
  return payload;
}

app.post("/users", createUser);
```

In this example, we define a schema for validating user payloads with a required name field.

### Custom Validation Type

You can also create custom validation types using Yup's `test` function. Here's an example:

```typescript
const jamesSchema = string().test(
  "is-james",
  (d) => `${d.path} is not James`,
  (value) => value == null || value === "James"
);
```

This schema ensures that the value is either `null`, `undefined`, or equals "James".

### Async Validation

In some cases, you may need to perform asynchronous validation, such as checking if a username is unique. You can achieve this by defining a custom validator with an asynchronous test function. Here's how you can create a custom username validator:

```typescript
// validation/rules.ts
const username = string().test(
  "username",
  (d) => `${d.path} is taken`,
  async (value) => User.findOne({ username: value })
);
```

This validator checks if the username already exists in the database asynchronously.

```typescript title="src/user/index.ts"
const getUserPayload = createBodyAsync({
  name: string().required(),
  username: username().required(),
});

async function createUser() {
  const payload = await getUserPayload(); // [!code highlight]
  // Save data
  return "saved";
}

app.post("/", createUser);
```

In this example, we use `createBodyAsync` to validate the request body asynchronously, ensuring that both the name and username fields are present and satisfy the custom username validation rule.

The following functions are exposed from `@minimajs/schema` for your convenience:

1. `createBody`
2. `createHeaders`
3. `createSearchParams`
4. `createBodyAsync`
5. `createHeadersAsync`
6. `createSearchParamsAsync`

These functions enable you to easily define and validate request bodies, headers, and searchParams, both synchronously and asynchronously, ensuring the integrity and security of your application's data.
