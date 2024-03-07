---
title: Error Handling
sidebar_position: 9
tags:
  - error
---

## Customizing Error Responses

When it comes to handling errors in your application, customization is key. Here are three ways you can customize error responses in Minimajs

### HttpError.toJSON

To customize error responses using the `HttpError.toJSON` method, you can override the default behavior to return a custom JSON representation of the error. Here's an example:

```typescript
import { HttpError } from "@minimajs/server/error";

HttpError.toJSON = function (err: HttpError) {
  return { statusCode: err.statusCode, error: err.message };
};
```

### decorateError

The `decorateError` function allows you to customize error responses at the root level or module level of your application. Here's how you can use it:

```typescript
import { createApp, abort, type App } from "@minimajs/server";
import { decorateError } from "@minimajs/server/error";

const app = createApp();

app.get("/", () => {
  abort("something is not right", 500);
});
// highlight-next-line
decorateError(app, (err) => {
  return [err.statusCode, { error: err.message }];
});

// Module-level error handling
app.register(function(app2: App) => {
  // highlight-next-line
  decorateError(app, (err) => {
    return [err.statusCode, { error2: err.message }];
  });
  app.get('/something', () => {
    return 'some route'
  })
})

await app.listen({ port: 1234 });
```

### setErrorHandler

For more fine-grained control over error handling, you can use the `setErrorHandler` method. This allows you to define a function that will be called whenever an error occurs. Here's an example:

```typescript
app.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error);
  // Send error response
  reply.status(409).send({ ok: false });
});
```

Keep in mind that `setErrorHandler` will not catch not found (404) errors. For those scenarios, Use `app.setNotFoundHandler` instead.
