---
title: CLI
---

# CLI

The Minima.js CLI scaffolds projects, runs the development server, builds for production, and generates code.

## The `./app` runner

Every scaffolded project includes an executable `./app` script that forwards commands to the local `minimajs` binary. You never need a global install — the project always uses its own pinned version.

```bash
./app dev          # start dev server
./app build        # production build
./app start        # run compiled output
./app add module users  # generate a module
```

---

## `new` — Scaffold a project

```bash
# Node.js (default)
npx @minimajs/cli new my-app

# Bun
bunx @minimajs/cli new my-app --bun

# With options
npx @minimajs/cli new my-app --pm pnpm --no-git
```

| Flag                         | Default       | Description                                    |
| ---------------------------- | ------------- | ---------------------------------------------- |
| `--pm`                       | auto-detected | Package manager (`bun`, `pnpm`, `yarn`, `npm`) |
| `--runtime`                  | auto-detected | Runtime target (`node` or `bun`)               |
| `--bun`                      | —             | Shorthand for `--runtime=bun`                  |
| `--install` / `--no-install` | `true`        | Install dependencies after scaffolding         |
| `--git` / `--no-git`         | `true`        | Run `git init` after scaffolding               |

**Scaffolded structure:**

```
my-app/
├── src/
│   ├── index.ts           # entry point
│   ├── module.ts          # root module
│   └── users/
│       ├── module.ts
│       └── users.handler.ts
├── minimajs.config.ts     # project config
├── tsconfig.json
├── .env
├── .gitignore
└── app                    # runner script (executable)
```

---

## `dev` — Development server

```bash
./app dev
./app dev -s               # with sourcemaps
./app dev --no-check       # skip TypeScript type checking
./app dev --no-run         # watch/rebuild only, don't run the process
./app dev --env-file .env.local
```

| Flag                     | Default  | Description                                                        |
| ------------------------ | -------- | ------------------------------------------------------------------ |
| `-s, --sourcemap`        | `false`  | Enable sourcemaps (`--enable-source-maps` on Node)                 |
| `--env-file`             | —        | Path to `.env` file                                                |
| `-p, --tsconfig`         | —        | Path to `tsconfig.json`                                            |
| `--check` / `--no-check` | `true`   | Run TypeScript type checking on each rebuild                       |
| `--reset`                | —        | Clear screen on each rebuild                                       |
| `--kill-signal`          | `SIGTERM`| Signal used to stop process before restart                         |
| `--grace` / `--no-grace` | `true`   | Graceful shutdown before restart                                   |
| `--run` / `--no-run`     | `true`   | Watch and rebuild without running the process                      |
| `--exec`                 | —        | Custom run command (e.g. `'node [filename]'`)                      |

---

## `build` — Production build

```bash
./app build
./app build --minify --sourcemap
./app build --outdir dist --target node22
```

| Flag                     | Default | Description                                  |
| ------------------------ | ------- | -------------------------------------------- |
| `-o, --outdir`           | `dist`  | Output directory                             |
| `-m, --minify`           | —       | Minify output                                |
| `-s, --sourcemap`        | —       | Emit sourcemaps                              |
| `-p, --tsconfig`         | —       | Path to `tsconfig.json`                      |
| `--check` / `--no-check` | `true`  | Run TypeScript type checking before building |
| `-t, --target`           | —       | Target environment (e.g. `node22`)           |

---

## `start` — Run production build

```bash
./app start
./app start -s             # with sourcemaps
./app start --env-file .env.production
```

| Flag              | Default | Description                         |
| ----------------- | ------- | ----------------------------------- |
| `-s, --sourcemap` | —       | Enable sourcemaps on Node           |
| `--env-file`      | —       | Path to `.env` file                 |

---

## `add` — Generators & integrations

### Code generators

All generators create a file and auto-patch the nearest `module.ts` to register it.

| Command                 | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `add module <name>`     | Scaffold a route module                                        |
| `add service <name>`    | Scaffold a service file                                        |
| `add hook <name>`       | Scaffold a lifecycle hook, register in nearest `module.ts`     |
| `add plugin <name>`     | Scaffold a plugin, register in nearest `module.ts`             |
| `add middleware <name>` | Scaffold a middleware, register in root `src/module.ts`        |

```bash
./app add module orders
./app add hook request-logger
./app add hook users/validate --type=request
./app add plugin rate-limit
./app add plugin orders/audit
./app add middleware request
./app add middleware auth/jwt
```

### Integrations

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `add disk`       | Scaffold a disk storage instance         |
| `add openapi`    | Install OpenAPI / Swagger documentation  |
| `add lint`       | Scaffold ESLint with TypeScript support  |
| `add format`     | Scaffold Prettier formatting             |
| `add dockerfile` | Generate a Dockerfile                    |
| `add skills`     | Install the MinimaJS skill for AI agents |

```bash
./app add disk                          # src/disks/index.ts
./app add disk uploads --driver=aws-s3  # named, S3-backed
./app add disk router --proto           # ProtoDisk for multi-provider routing
./app add openapi
./app add dockerfile
./app add skills --claude
```

---

## Configuration

See [Configuration](/cli/configuration) for `minimajs.config.ts` options and the plugin system.
