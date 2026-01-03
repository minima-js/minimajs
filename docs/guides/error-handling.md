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
import { HttpError } from "@minimajs/server/error";

throw new HttpError("This is a custom error message", 400);
```

When you throw an `HttpError`, Minima.js will automatically use the status code and message to generate the error response.

## The `abort` Helper

To make it even easier to throw HTTP errors, Minima.js provides an `abort` helper function. This function is a shorthand for throwing an `HttpError`.

```typescript
import { abort } from "@minimajs/server";

app.get("/users/:id", () => {
  const { id } = params<{ id: string }>();
  const user = findUserById(id);

  if (!user) {
    abort("User not found", 404);
  }

  return user;
});
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
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    },
  });
});
```

### Module-Level Error Handler

You can also define an error handler for a specific module using `interceptor.error`.

```typescript
import { interceptor } from "@minimajs/server";
import { HttpError } from "@minimajs/server/error";

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
  reply.status(404).send({ error: "Not Found" });
});
```

This handler will be executed for any request that does not match a defined route.
