---
title: Errors
sidebar_position: 5
tags:
  - error
---

## Abort

Aborting request

```ts
import { abort } from "@minimajs/server"; // import abort

async function findUser() {
  const params = getParams<{ user: string }>();
  const user = await User.findOne({ _id: params.user });
  if (!user) {
    abort("User doesn't exists", 404);
  }
  return user;
}

app.get("/users/:user", findUser);
```

## References:

These functions are exposed from `@minimajs/server`.

1. **abort(message: string, statusCode: number | StatusCodes): void**

   - Description: Terminates the current operation with an optional message and HTTP status code.
   - Parameters:
     - `message` (string): A descriptive message explaining the reason for aborting the operation.
     - `statusCode` (number | StatusCodes): An optional parameter indicating the HTTP status code associated with the abort.
   - Example:

     ```typescript
     import { abort, StatusCodes } from "@minimajs/server";

     // Example 1: Abort with a custom message and status code
     abort("Unauthorized access", StatusCodes.UNAUTHORIZED);

     // Example 2: Abort with only a message (default status code will be used)
     abort("Internal server error");

     // Example 3: Abort with a numeric status code and without a message
     abort(StatusCodes.NOT_FOUND);
     ```

2. **redirect(path: string, isPermanent = false): void**

   - Description: Redirects the client to the specified path.
   - Parameters:
     - `path` (string): The URL path to redirect to.
     - `isPermanent` (boolean): Optional parameter indicating whether the redirect is permanent (HTTP status code 301) or temporary (HTTP status code 302). Default is `false`.
   - Example:

     ```typescript
     import { redirect } from "@minimajs/server";

     // Example 1: Redirect to a specific path
     redirect("/home");

     // Example 2: Redirect permanently to a different path
     redirect("/new-home", true);
     ```
