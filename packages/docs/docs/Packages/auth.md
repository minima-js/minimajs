---
title: Auth
sidebar_position: 2
---

# Authentication Middleware

## Introduction

The `createAuth` function provided by `@minimajs/auth` is a powerful middleware for handling authentication in Node.js applications. It allows developers to easily implement authentication logic and manage authentication state within their applications.

## Installation

To use the `createAuth` function, ensure you have `@minimajs/auth` and its dependencies installed in your project:

```bash
npm install @minimajs/server
```

## Using `createAuth` Function

The `createAuth` function is a utility provided by `@minimajs/server` for handling authentication in server-side applications. It allows you to create an authentication interceptor that executes a callback function to perform authentication logic. This interceptor can then be integrated into your server middleware stack to secure routes and endpoints.

### How to Use

3. **Creating Authentication Interceptor**:

   Use the `createAuth` function to create an authentication interceptor. This function takes the authentication callback as its parameter and returns an array containing the interceptor function, an authentication guard function, and a function to retrieve authentication data.

   ```typescript
   import { createAuth } from "@minimajs/auth";

   const [authInterceptor, authGuard, getAuth] = createAuth(callback);
   ```
