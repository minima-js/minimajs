# MinimaJS Features Overview

MinimaJS is a high-performance, TypeScript-first web framework built on Fastify, designed to be faster than Express and simpler than NestJS. Here's a comprehensive overview of all available features and packages.

## 🚀 Core Framework Features

### **[@minimajs/server](./packages/server)** - Core HTTP Framework
**Built on Fastify for maximum performance**

#### Context-Aware Request Handling
- **No prop drilling**: Access request data anywhere with `getRequest()`, `getBody()`, `getParams()`
- **Type-safe parameter extraction**: `getParam("id")` with automatic validation
- **Yup schema integration**: Validate and transform on-the-fly with Yup schemas
- **Instant access**: `getHeaders()`, `getSearchParams()`, `getQueries()`

```typescript
import { createApp, getParam, getBody, getField } from "@minimajs/server";
import { number, string, object } from "yup";

const app = createApp();

app.post("/users/:id", () => {
  // Simple access
  const userId = getParam("id");              // string | undefined
  const name = getParam.required("name");     // string (throws if missing)

  // With Yup validation (peer dependency)
  const page = getParam("page", number().min(1));           // number | undefined
  const email = getField("email", string().email());        // validated email
  const age = getField("age", number().positive().required()); // number

  // No need to pass req/res around!
});
```

#### Advanced HTTP Utilities
- **Smart redirects**: `redirect("/new-path", isPermanent)`
- **Flexible responses**: `setStatusCode()`, `setHeader()`
- **Error handling**: `abort()`, `abort.notFound()`, custom error types
- **Deferred execution**: Schedule tasks after response is sent

#### Robust Error Management
- Built-in error types: `HttpError`, `ValidationError`, `NotFoundError`, `RedirectError`
- Automatic error serialization and status code handling
- Custom error responses with proper HTTP status codes

#### Graceful Shutdown
- Automatic SIGTERM/SIGINT handling
- Configurable shutdown hooks
- Clean resource cleanup

## 🔐 Authentication & Security

### **[@minimajs/auth](./packages/auth)** - Authentication System
**Simple yet powerful authentication**

- Session-based authentication
- Token validation and generation
- Customizable auth strategies
- Seamless integration with context system

```typescript
import { auth } from "@minimajs/auth";

app.use(auth({
  // Configure your auth strategy
}));

// Access authenticated user anywhere
const user = getAuthenticatedUser();
```

### **[@minimajs/cookie](./packages/cookie)** - Cookie Management
**Type-safe cookie handling with validation**

- Secure cookie management with `@fastify/cookie`
- Schema validation for cookie values
- Type-safe cookie access and manipulation
- Automatic serialization/deserialization

```typescript
import { setCookie, getCookie } from "@minimajs/cookie";

app.get("/profile", () => {
  const preferences = getCookie("user-prefs", UserPrefsSchema);
  return { preferences };
});
```

## 📁 File Handling & Storage

### **[@minimajs/multipart](./packages/multipart)** - File Upload System
**Powerful multipart/form-data handling**

#### Advanced File Processing
- **Stream-based uploads**: Memory-efficient file handling
- **Schema validation**: Validate uploaded files with Yup integration
- **Multiple file support**: Handle single and multiple file uploads
- **File type validation**: Automatic MIME type checking
- **Size limits**: Configurable file size restrictions

```typescript
import { multipart } from "@minimajs/multipart";

app.post("/upload", multipart({
  schema: {
    avatar: FileSchema.required(),
    documents: FileSchema.array()
  }
}), () => {
  const files = getField("files");
  // Process uploaded files
});
```

### **[@minimajs/disk](./packages/disk)** - Local Storage Driver
**Simple local file system operations**

- File read/write operations
- Directory management
- Stream support for large files

### **[@minimajs/azure-blob](./packages/azure-blob)** - Azure Storage Integration
**Seamless Azure Blob Storage integration**

- Direct Azure Blob Storage operations
- Upload/download with progress tracking
- Metadata management
- Stream-based operations for large files

```typescript
import { uploadToAzure, downloadFromAzure } from "@minimajs/azure-blob";

const blobUrl = await uploadToAzure(fileStream, "container/file.jpg");
```

## ✅ Validation & Schema

### **[@minimajs/schema](./packages/schema)** - Schema Validation
**Powered by Yup for robust validation**

#### Type-Safe Validation
- **Request validation**: Automatically validate body, params, headers
- **Response validation**: Ensure response data integrity
- **Custom validators**: Create reusable validation schemas
- **Error handling**: Detailed validation error messages

```typescript
import { validate } from "@minimajs/schema";

const UserSchema = object({
  name: string().required(),
  email: string().email().required(),
  age: number().positive().integer()
});

app.post("/users", validate({ body: UserSchema }), () => {
  const user = getBody<InferType<typeof UserSchema>>();
  // Body is automatically validated and typed
});
```

## 🎨 Template Rendering

### **[@minimajs/edge](./packages/edge)** - Edge.js Template Engine
**Modern template engine integration**

- Server-side rendering with Edge.js
- Component-based templates
- Layout and partial support
- Type-safe template props

```typescript
import { render } from "@minimajs/edge";

app.get("/profile", () => {
  return render("profile", { user: getCurrentUser() });
});
```

## 🔧 Utilities & Helpers

### **[@minimajs/utility](./packages/utility)** - Common Utilities
**Essential utilities for everyday development**

- **Context management**: Advanced context handling utilities
- **Random generators**: Secure random string/number generation
- **Range utilities**: Number range operations and validations
- **Type helpers**: Common TypeScript utility types

```typescript
import { randomString, range } from "@minimajs/utility";

const id = randomString(12); // Generate secure ID
const pages = range(1, 10); // [1, 2, 3, ..., 10]
```

## 🚧 Upcoming Features

### **[@minimajs/kafka](./packages/kafka)** - Message Queue Integration
**Apache Kafka integration for event-driven architecture**

- Event publishing and consumption
- Topic management
- Consumer group handling
- Message serialization

### **[@minimajs/isc](./packages/isc)** - Inter-Service Communication
**Microservice communication utilities**

- Service discovery
- Load balancing
- Circuit breaker patterns
- Health checks

## 🎯 Why Choose MinimaJS?

### **Performance Advantages**
- **Fastify Foundation**: 2-3x faster than Express
- **Optimized Bundle**: Tree-shakeable, minimal runtime overhead
- **Stream Support**: Efficient handling of large payloads
- **Memory Efficient**: Smart context management and garbage collection

### **Developer Experience**
- **Zero Boilerplate**: Start building immediately
- **Type Safety**: End-to-end TypeScript support
- **Context Magic**: No more prop drilling or middleware chains
- **Modern Standards**: ESM-first, latest JavaScript features

### **Ecosystem Integration**
- **Modular Design**: Use only what you need
- **Standard APIs**: Familiar patterns, reduced learning curve
- **Extensible**: Easy to create custom packages
- **Future Ready**: Built for modern deployment environments

## 🚀 Quick Start Comparison

### Traditional Express.js
```javascript
const express = require('express');
const app = express();

app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.post('/users/:id', (req, res) => {
  const userId = req.params.id;
  const userData = req.body;
  // Lots of middleware setup required
});
```

### MinimaJS
```typescript
import { createApp, getParam, getBody } from "@minimajs/server";

const app = createApp();

app.post('/users/:id', () => {
  const userId = getParam("id"); // Context-aware, type-safe
  const userData = getBody<User>(); // Automatic typing
  // Zero boilerplate, maximum productivity
});
```

## 📚 Next Steps

1. **[Getting Started Guide](./packages/docs/docs/Guide/getting-started.md)** - Set up your first MinimaJS app
2. **[API Reference](./packages/docs/docs/)** - Detailed documentation for each package
3. **[Examples](./examples/)** - Real-world usage examples
4. **[Migration Guide](./MIGRATION.md)** - Moving from Express or NestJS

---

*MinimaJS: The perfect balance of performance, simplicity, and developer experience.*