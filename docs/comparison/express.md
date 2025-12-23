## MinimaJS vs Express.js

### Performance

```typescript
// Express - Slow middleware chain
app.use(express.json());
app.use(cookieParser());
app.use(session());

app.post("/users/:id", (req, res) => {
  const userId = req.params.id;
  const body = req.body;
  res.json({ userId, body });
});
```

```typescript
// MinimaJS - 2-3x faster, built on Fastify
import { createApp, params, body } from "@minimajs/server";

const app = createApp();

app.post("/users/:id", () => {
  const userId = params.get("id");
  const data = body();
  return { userId, data };
});
```

### Context Handling

```typescript
// Express - Prop drilling nightmare
function validateUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/profile", validateUser, async (req, res) => {
  const user = req.user; // Passed through middleware
  const data = await getProfile(req.user.id);
  res.json(data);
});
```

```typescript
// MinimaJS - No prop drilling, context-aware
import { createAuth } from "@minimajs/auth";

const [plugin, auth] = createAuth(
  async (token) => {
    return validateToken(token);
  },
  { required: true }
);

app.register(plugin);
app.get("/profile", async () => {
  const user = auth(); // Available anywhere
  const data = await getProfile(user.id);
  return data;
});
```

### TypeScript Support

- **Express**: Community types (`@types/express`), often outdated
- **MinimaJS**: First-class TypeScript with full type inference

---
