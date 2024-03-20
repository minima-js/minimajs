---
title: "MinimaJS vs. The Crowd"
sidebar_position: 2
---

This demonstration showcases the elegance and efficiency of MinimaJS compared to traditional frameworks when constructing a basic CRUD application for interacting with MongoDB.

## Entity Modeling:

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

## Controller: Fetching Posts

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

creating a post module with `/posts` route

```ts title="src/post/index.ts"
import { type App } from "@minimajs/server";
import { getPosts } from "./controller";

// creating a post module
export async function post(app: App) {
  app.get("/", getPosts); // GET request handler for listing posts
}
```

## Main Application Entry Point:

```ts title="src/index.ts"
import { createApp } from "@minimajs/server";
import { post } from "./post";
import { connect } from "mongoose";

const app = createApp();

// register post module with prefix /posts
app.register(post, { prefix: "/posts" });

// connecting to mongodb and wait for connection.
const { connection } = await connect("mongodb://localhost/minimajs-starter-kit");
app.addHook("onClose", () => {
  connection.close();
  // close the mongodb connection as soon as app closed, it will fast development speed.
});

// finally start the server.
await app.listen({ port: 1234 });
```

Wow!!.

application is ready for list of posts api.

## Next adding the rest apis

Creating post

```ts title="src/post/controller.ts"
import { createBody, number, object, string } from "@minimajs/schema";
import { Post } from "./entity";

export type PostPayload = ReturnType<typeof getPostPayload>;
/*
type PostPayload = {
    title: string;
    content: string;
    author: {
        name: string;
    };
    status: "published" | "draft";
}
*/

const getPostPayload = createBody({
  title: string().required().max(255),
  content: string().required(),
  author: object({
    name: string().required(),
  }).required(),
  status: string().oneOf(["published", "draft"]).default("draft"),
});

export function createPost() {
  const payload = getPostPayload();
  const post = new Post(payload);
  return post.save();
}
```

Find a post

```ts title="src/post/controller.ts"
import { abort, getParam } from "@minimajs/server";
import { Post } from "./entity";

export async function findPost() {
  const id = getParam("post");
  const post = await Post.findById(id);
  if (!post) {
    abort.notFound();
  }
  return post;
}
```

Updating a post

```ts title="src/post/controller.ts"
import { createBody, string } from "@minimajs/schema";
import { Post } from "./entity";

const getUpdatePostPayload = createBody({
  title: string().max(255),
  content: string(),
  status: string().oneOf(["published", "draft"]).default("draft"),
});

export async function updatePost() {
  const payload = getUpdatePostPayload();
  const post = await findPost(); // we can use same post;
  await post.updateOne(payload);
  return post;
}
```

Finally delete

```ts title="src/post/controller.ts"
export async function deletePost() {
  const post = await findPost();
  await post.deleteOne();
  return post;
}
```

Adding routes in post module

```ts title="src/post/index.ts"
import { type App } from "@minimajs/server";
import { createPost, deletePost, findPost, updatePost } from "./controller";

export async function post(app: App) {
  app.post("/", createPost);
  app.get("/:post", findPost);
  app.patch("/:post", updatePost);
  app.delete("/:post", deletePost);
}
```

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
    └── / (GET, HEAD, POST)
        └── :post (GET, HEAD, PATCH, DELETE)

INFO (11978): Server listening at http://[::1]:1234
INFO (11978): Server listening at http://127.0.0.1:1234
```

your basic crud is ready.

full source code:
https://github.com/minima-js/starterkit/tree/crud-mongoose
