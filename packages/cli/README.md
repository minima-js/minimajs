# @minimajs/cli

The official CLI for [MinimaJS](https://minimajs.com) — scaffold, develop, build, and manage your app.

## Create a new project

```bash
# Node.js (default)
npx @minimajs/cli new my-app

# Bun
bunx @minimajs/cli new my-app --bun

# With options
npx @minimajs/cli new my-app --pm pnpm     # package manager: bun | pnpm | yarn | npm
npx @minimajs/cli new my-app --no-install  # skip dependency installation
npx @minimajs/cli new my-app --no-git      # skip git init
```

Every scaffolded project includes an `./app` executable — use it instead of `minimajs` directly:

```bash
./app dev
./app build
./app start
./app add module orders
```

## Commands

### `./app dev`

Start the development server with file watching and auto-restart.

```bash
./app dev
./app dev --no-check           # skip TypeScript type checking
./app dev --sourcemap          # enable sourcemaps
./app dev --env-file .env.local
./app dev --no-run             # watch and rebuild without running
```

### `./app build`

Compile TypeScript to production JavaScript.

```bash
./app build
./app build --minify           # minify output
./app build --outdir dist      # custom output directory
./app build --no-check         # skip type checking
```

### `./app start`

Run the compiled production build.

```bash
./app start
./app start --env-file .env.production
```

### `./app add`

Generate files inside your project.

```bash
./app add module orders
./app add hook request-logger
./app add service mailer
```

### `./app check`

Run TypeScript type checking without building.

```bash
./app check
./app check --tsconfig tsconfig.custom.json
```

### `./app info`

Display environment and project info.

```bash
./app info
```

## Configuration

The scaffolded `minimajs.config.ts` looks like this:

```typescript
import { defineConfig } from "@minimajs/cli";

export default defineConfig(({ dev }) => ({
  exec: "node [filename]",
  envFile: ".env",
  sourcemap: dev,
  // import: ["./src/instrument.ts"],
}));
```

`defineConfig` receives `{ mode, dev }` — where `mode` is `"dev" | "build" | "start"` and `dev` is shorthand for `mode === "dev"`.

## Documentation

For full documentation, guides, and API reference visit **[minimajs.com/cli](https://minimajs.com/cli)**.
