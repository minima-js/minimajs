---
title: Data Validation with Yup
sidebar_position: 4
---

# Data Validation with Yup

Data validation is a critical part of any web application. It ensures that the data you receive from clients is in the correct format and meets your application's requirements.

Minima.js provides a powerful package, `@minimajs/schema`, for data validation. This package is designed to work seamlessly with popular validation libraries like [Yup](https://github.com/jquense/yup), [Zod](https://zod.dev/), and others.

This recipe will show you how to use `@minimajs/schema` with Yup to validate incoming request data.

## Prerequisites

First, you need to install the required packages:

```bash
npm install @minimajs/schema yup
```

## 1. Creating a Schema

The first step is to create a validation schema using Yup. A schema defines the structure and constraints of your data.

Let's create a schema for a new user:

```typescript title="src/user/schema.ts"
import * as yup from 'yup';

export const createUserSchema = yup.object({
  name: yup.string().min(2).required(),
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});
```

This schema defines a user object with a `name`, `email`, and `password`. It also specifies that the `name` must be at least 2 characters long, the `email` must be a valid email address, the `password` must be at least 8 characters long, and all fields are required.

## 2. Validating the Request Body

Now that we have a schema, we can use it to validate the request body. The `@minimajs/schema` package provides a `createBody` function for this purpose.

```typescript
import { createApp } from '@minimajs/server';
import { createBody } from '@minimajs/schema';
import { createUserSchema } from './user/schema';

const app = createApp();

const getValidatedBody = createBody(createUserSchema);

app.post('/users', () => {
  const { name, email, password } = getValidatedBody();

  // At this point, you can be sure that the data is valid.
  // ... create the user ...

  return { message: 'User created' };
});

await app.listen({ port: 3000 });
```

In this example:
*   We use `createBody(createUserSchema)` to create a `getValidatedBody` function.
*   When `getValidatedBody()` is called inside the route handler, it will:
    1.  Parse the request body.
    2.  Validate it against the `createUserSchema`.
    3.  If the validation passes, it returns the validated data.
    4.  If the validation fails, it automatically throws a `ValidationError` and sends a `400 Bad Request` response with the validation errors.

## 3. Validating Headers and Search Params

You can also validate request headers and search parameters using the `createHeaders` and `createSearchParams` functions.

```typescript
import { createHeaders, createSearchParams } from '@minimajs/schema';
import * as yup from 'yup';

const paginationSchema = yup.object({
  page: yup.number().integer().positive().default(1),
  limit: yup.number().integer().positive().default(10),
});

const getPagination = createSearchParams(paginationSchema);

app.get('/posts', () => {
  const { page, limit } = getPagination();
  // ... fetch posts with pagination ...
  return { page, limit };
});
```

In this example, we use `createSearchParams` to validate and parse the `page` and `limit` search parameters.

## Handling Validation Errors

You don't need to do anything special to handle validation errors. `@minimajs/schema` handles them for you.

If a validation fails, it will automatically send a response like this:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "path": "name",
      "message": "name must be at least 2 characters"
    }
  ]
}
```

This makes it incredibly easy to provide meaningful error messages to your clients without writing any boilerplate code.