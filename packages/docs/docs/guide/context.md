---
title: Context
sidebar_position: 8
tags:
  - context
---

The concept of Context is fundamental to backend development, and it's a core feature of the minimajs framework. Context enables sharing data within the request scope without the need to explicitly pass it around.

Let's delve into this concept with examples:

```typescript
import { getQuery, createContext } from "@minimajs/server";

// Create a context for storing and retrieving a message
const [getMessage, setMessage] = createContext<string>("");

// Function that utilizes the message from the context
function somethingForHello() {
  const message = getMessage();
  console.log(`The message: ${message}`);
}

// Request handler for the '/hello' endpoint
function helloHandler() {
  const message = getQuery("message");
  setMessage(`Hello ${message}`); // Set the message for the request scope
  somethingForHello(); // Use the message
}

app.get("/hello", helloHandler);
```

Context is particularly useful for passing data from a middleware to a request callback:

```typescript title="src/hello/context.ts"
import { createContext } from "@minimajs/server";

// Define the User interface
export interface User {
  name: string;
}

// Create a context for storing and retrieving user data
export const [getUser, setUser] = createContext<User>({ name: "" });
```

```ts title="src/hello/middleware.ts"
import { getHeaders } from "@minimajs/server";
import { setUser } from "./context";

// Middleware to intercept and set user data from headers
function userInterceptor() {
  const headers = getHeaders();
  if (headers["x-user"]) {
    setUser(JSON.parse(headers["x-user"]));
  }
}
```

```ts title="src/hello/index.ts"
import { type App } from "@minimajs/server";

// Request handler for the '/' endpoint
function helloHandler() {
  const message = getQuery("message");
  setMessage(`Hello ${message}`); // Set the message for the request scope
  somethingForHello(); // Use the message
}

// Export the helloModule function
export function helloModule(app: App) {
  app.get("/", helloHandler);
}
```

```ts title="src/index.ts"
import { interceptor } from "@minimajs/server";
import { userInterceptor } from "./hello/middleware";
import { helloModule } from "./hello";

// Register the userInterceptor middleware and helloModule request handler
app.register(interceptor([userInterceptor], helloModule), { prefix: "/hello" });
```

Contexts are a powerful tool for managing and sharing data within the scope of a request or a specific part of an application. They allow developers to avoid passing data explicitly between functions or components, making code cleaner and more maintainable. Here are some common use cases for contexts:

## References

Certainly! Below is the signature for the `createContext` function:

```typescript
createContext<T>(defaultValue: T): [() => T, (value: T) => void]
```

This signature indicates that `createContext` is a generic function that takes a default value of type `T`. It returns an array containing two functions:

1. The first function (`() => T`) retrieves the current value stored in the context.
2. The second function (`(value: T) => void`) sets a new value in the context.

Here's a breakdown of each part of the signature:

- `createContext<T>`: This indicates that `createContext` is a generic function that takes a type parameter `T`, representing the type of data to be stored in the context.
- `(defaultValue: T)`: This parameter specifies the default value of type `T` that will be set in the context initially.
- `[() => T, (value: T) => void]`: This is the return type of the `createContext` function, indicating that it returns an array containing two functions:
  - `() => T`: This function retrieves the current value stored in the context.
  - `(value: T) => void`: This function sets a new value in the context.

With this signature, users can create and manipulate contexts to store and retrieve data within the request scope efficiently.
