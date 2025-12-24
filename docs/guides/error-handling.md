---
title: Error Handling
sidebar_position: 6
tags:
  - error
  - exception
---

# Error Handling

Proper error handling is crucial for building robust and reliable web applications. Minima.js provides a flexible and powerful error handling mechanism that allows you to catch and handle errors in a predictable way.

By default, Minima.js catches any uncaught exceptions in your route handlers and sends a generic `500 Internal Server Error` response. However, you can customize this behavior to handle different types of errors in different ways.

## The `HttpError` Class

For handling HTTP-specific errors, Minima.js provides a custom `HttpError` class. You can use this class to create errors with a specific status code and message.

```typescript
import { HttpError } from '@minimajs/server/error';

throw new HttpError('This is a custom error message', 400);
```

When you throw an `HttpError`, Minima.js will automatically use the status code and message to generate the error response.

## The `abort` Helper

To make it even easier to throw HTTP errors, Minima.js provides an `abort` helper function. This function is a shorthand for throwing an `HttpError`.

```typescript
import { abort, params } from '@minimajs/server';

app.get('/users/:id', async () => {
  const userId = params.get('id');
  const user = await findUserById(userId);

  if (!user) {
    abort('User not found', 404);
  }

  if (user.type !== 'admin') {
    abort('Unauthorized access', 'UNAUTHORIZED');
  }

  return user;
});
```

### abort.notFound

Convenience method for 404 errors:

```typescript
import { abort, params } from "@minimajs/server";

app.get('/users/:id', async () => {
  const userId = params.get("id");
  const user = await findUserById(userId);

  if (!user) {
    abort.notFound(); // Throws 404 error
  }

  return user;
});
```

### abort.is

Check if an error is an abort error:

```typescript
import { abort } from "@minimajs/server";

try {
  abort("Something went wrong", 500);
} catch (error) {
  if (abort.is(error)) {
    console.log("This is an abort error");
    // Handle abort errors specifically
  }
}
```

### abort.assert

Ensures an error is an abort error. If the error is NOT an abort error, it gets re-thrown:

```typescript
import { abort } from "@minimajs/server";

async function processUser() {
  try {
    const user = await findUser();
    return user;
  } catch (error) {
    abort.assert(error); // Re-throws if NOT an abort error
    // If we reach here, it's an abort error - handle it gracefully
    console.log("Caught abort error:", error);
    return null;
  }
}
```

### abort.rethrow

Re-throws the error only if it IS an abort error. If the error is NOT an abort error, execution continues:

```typescript
import { abort } from "@minimajs/server";

async function processData() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    abort.rethrow(error); // Re-throws if it IS an abort error
    // If we reach here, it's NOT an abort error - handle other errors
    console.error("Non-abort error occurred:", error);
    return { error: "Processing failed" };
  }
}
```

## Customizing Error Responses

Minima.js provides several ways to customize the error response format.

### Global Error Handler

The most common way to customize error handling is to set a global error handler using `app.setErrorHandler()`. This handler will be called for all uncaught exceptions in your application.

```typescript
app.setErrorHandler((error, request, reply) => {
  // Log the error
  console.error(error);

  // Send a custom error response
  reply.status(error.statusCode || 500).send({
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });
});
```

### Module-Level Error Handler

You can also define an error handler for a specific module using `interceptor.error`.

```typescript
import { interceptor } from '@minimajs/server';
import { HttpError } from '@minimajs/server/error';

const errorDecorator = interceptor.error((err) => {
  if (err instanceof HttpError) {
    // Customize the response for HttpErrors
    return new HttpError({ error: err.message }, err.statusCode);
  }
  return err; // Let the default handler take care of other errors
});

const myModule = interceptor([errorDecorator], (app) => {
  // ...
});
```

### Customizing the JSON Response

If you just want to change the JSON representation of `HttpError` responses, you can override the `HttpError.toJSON` method.

```typescript
import { HttpError } from "@minimajs/server/error";

HttpError.toJSON = function (err: HttpError) {
  return {
    statusCode: err.statusCode,
    error: err.message,
    code: err.code, // Add a custom error code
  };
};
```

## Handling Not Found Errors

The global error handler does not catch "Not Found" (404) errors. To handle these errors, you need to set a "Not Found" handler using `app.setNotFoundHandler()`.

```typescript
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'Not Found' });
});
```

This handler will be executed for any request that does not match a defined route.