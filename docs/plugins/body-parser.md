# Body Parser

The Body Parser plugin is responsible for parsing incoming request bodies based on their `Content-Type` header. Once registered, it enables the use of the `body()` context-aware function to access the parsed body in your route handlers.

## Installation

The plugin is included with the `@minimajs/server` package and can be imported from `@minimajs/server/plugins`.

```typescript
import { bodyParser } from "@minimajs/server/plugins";
```

## Usage

Register the plugin with your application instance. By default, it is configured to parse `application/json`.

```typescript
// Register with default settings (JSON parsing)
app.register(bodyParser());

app.post("/users", () => {
  // Now you can access the parsed JSON body
  const newUser = body<{ name: string; email: string }>();
  // ... create user
  return { created: newUser };
});
```

## Configuration

You can configure the plugin to parse different content types by passing an options object.

### `type`

Specifies the content types to parse.

- **Type**: `("json" | "text" | "form" | "arrayBuffer" | "blob")[]`
- **Default**: `["json"]`

```typescript
// Configure the plugin to parse JSON and plain text
app.register(bodyParser({ type: ["json", "text"] }));

app.post("/text-log", () => {
  const logMessage = body<string>();
  console.log(logMessage);
  return { status: "logged" };
});
```

### `clone`

Clones the request object before parsing the body. This can be useful if you need to read the raw request body stream more than once.

- **Type**: `boolean`
- **Default**: `false`

```typescript
app.register(bodyParser({ clone: true }));
```
