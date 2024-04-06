---
title: "MinimaJS vs. The Crowd"
sidebar_position: 2
---

## Streamlined Integration with Third-Party Services

One of MinimaJS's defining strengths lies in its ability to simplify the integration of third-party services. Unlike traditional frameworks that often require a two-step process involving middleware and separate functions, MinimaJS empowers you to achieve the same functionality with a single, well-defined function.

#### Example: Seamless Multipart File Upload Handling

The provided code demonstrates how MinimaJS simplifies integrating multipart file upload functionalities:

### Implementation

```ts title="src/multipart.ts"
import { getRequest, defer, getSignal } from "@minimajs/server";

export interface UploadedBody {
  [key: string]: {
    name: string;
    stream: ReadableStream;
  };
}

export async function getUploadedBody<T extends UploadedBody = UploadedBody>(): Promise<T> {
  const request = getRequest();
  // Use the request object to access uploaded content (likely through a parsing library)
  const abortSignal = getSignal();
  // Utilize abortSignal for cancellation handling

  // ... logic to process uploaded files (saving to temp location) ...
  defer(cleanup); // Schedule cleanup after response is sent
  return newBody; // Return the processed uploaded body object
}

// Cleanup function to handle temporary resources
function cleanup() {
  // Delete temporary files or perform other cleanup tasks
}
```

### Utilization

```ts title="src/post/upload-photos.ts"
// upload handler function
import { getUploadedBody } from "../multipart";

async function handleUpload() {
  const body = await getUploadedBody(); // No middleware needed, directly call the function
  console.log(body.thumbnail.name); // Access uploaded file name
  const thumbnailStream = body.thumbnail.stream; // Access uploaded file stream

  // ... logic to save/process uploaded files (thumbnail and banner) ...

  return "files uploaded successfully!";
}
```

The `handleUpload` function in `post/upload-photos.ts` demonstrates how to effortlessly integrate the multipart handling functionality. It directly calls `getUploadedBody` without the need for middleware setup.

full implementation here: https://github.com/minima-js/minimajs/blob/main/packages/multipart/src/unstable.ts

## Basic CRUD operation using mongodb

This demonstration showcases the elegance and efficiency of MinimaJS compared to traditional frameworks when constructing a basic CRUD application for interacting with MongoDB.

### Entity Modeling:

We begin by defining the `Post` entity using Mongoose.

```ts title="src/post/entity.ts"
import { HydratedDocument, Schema, model } from "mongoose";
export interface IPost {
  title: string;
  content: string;
  author: {
    name: string;
  };
  status: "published" | "draft";
}
export type PostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost>({
  title: String,
  content: String,
  author: {
    name: String,
  },
  status: String,
});

export const Post = model("Post", postSchema);
```

### Controller: Fetching Posts

The post controller handles CRUD operations.

```ts title="src/post/controller.ts"
import { createSearchParams, number, string } from "@minimajs/schema";
import { Post } from "./entity";

// utility function
function pagination(page: number, perPage = 10) {
  return [perPage, (page - 1) * perPage] as const;
}
// validate quey string
export const getPostSearchQuery = createSearchParams({
  title: string(), // optional string
  content: string(), // optional string
  page: number().default(1), // automatically cast to number, and default value 1
});

// controller get posts
export async function getPosts() {
  const { page, ...query } = getPostSearchQuery();
  const [limit, skip] = pagination(page);
  const total = await Post.countDocuments(query);
  const data = await Post.find(query, null, { limit, skip });
  return { total, data };
}
```

Creating a post module with `/posts` route

```ts title="src/post/index.ts"
import { type App } from "@minimajs/server";
import { getPosts } from "./controller";

// creating a post module
export async function post(app: App) {
  app.get("/", getPosts); // GET request handler for listing posts
}
```

### Main Application Entry Point:

```ts title="src/index.ts"
import { createApp } from "@minimajs/server";
import { post } from "./post";
import { connect } from "mongoose";

const app = createApp();

// register post module with prefix /posts
app.register(post, { prefix: "/posts" });

// connecting to mongodb and wait for connection.
const { connection } = await connect("mongodb://localhost/minimajs-starter-kit");

// close the mongodb connection as soon as app closed.
app.addHook("onClose", () => connection.close());

// finally start the server.
await app.listen({ port: 1234 });
```

Wow!!.

Application is ready for list of posts api.

```bash
yarn dev
```

output

```
bundles src/index.ts → dist...
✔ created dist (7.76 kB) in 23ms
⧖ waiting for changes...
↺ rs ⏎ to restart

└── /posts (GET, HEAD, POST)
    └── / (GET, HEAD)

INFO (11978): Server listening at http://127.0.0.1:1234
```

full source code:
https://github.com/minima-js/starterkit/tree/crud-mongoose
