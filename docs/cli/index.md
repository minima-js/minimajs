---
title: CLI
---

# CLI

The Minima.js CLI scaffolds projects, runs the development server, builds for production, generates code, and manages dependencies — all through a single `./app` script that lives in your project.

## The `./app` runner

Every scaffolded project includes an executable `./app` script that forwards commands to the local `minimajs` binary. You never need a global install — the project always uses its own pinned version.

```bash
./app dev          # start dev server
./app build        # production build
./app start        # run compiled output
./app sync         # install from lockfile
./app i zod        # add a package
./app un zod       # remove a package
./app add module users  # generate a module
```

---

## `new` — Scaffold a project

```bash
# Node.js (default)
npx @minimajs/cli new my-app

# Bun
bunx @minimajs/cli new my-app

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
├── .node-version          # pinned Node.js version (or .bun-version for Bun)
├── .env
├── .gitignore
└── app                    # ./app runner (executable)
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

| Flag                     | Default   | Description                                        |
| ------------------------ | --------- | -------------------------------------------------- |
| `-s, --sourcemap`        | `false`   | Enable sourcemaps (`--enable-source-maps` on Node) |
| `--env-file`             | —         | Path to `.env` file                                |
| `-p, --tsconfig`         | —         | Path to `tsconfig.json`                            |
| `--check` / `--no-check` | `true`    | Run TypeScript type checking on each rebuild       |
| `--reset`                | —         | Clear screen on each rebuild                       |
| `--kill-signal`          | `SIGTERM` | Signal used to stop process before restart         |
| `--grace` / `--no-grace` | `true`    | Graceful shutdown before restart                   |
| `--run` / `--no-run`     | `true`    | Watch and rebuild without running the process      |
| `--exec`                 | —         | Custom run command (e.g. `'node [filename]'`)      |

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

| Flag              | Default | Description               |
| ----------------- | ------- | ------------------------- |
| `-s, --sourcemap` | —       | Enable sourcemaps on Node |
| `--env-file`      | —       | Path to `.env` file       |

---

## Package management

The `./app` runner wraps your package manager so you always use the right one for the project — no need to remember whether it's `bun`, `pnpm`, `yarn`, or `npm`.

The package manager is read from the `packageManager` field in `package.json` (set automatically by `./app init` or `npx @minimajs/cli new`) and will be automatically installed if missing — no need to worry about which version to use.

If you have [fnm](https://github.com/Schniz/fnm) installed, the correct Node.js version is selected automatically — you never have to think about it again.

### `sync` — Install from lockfile

Performs a clean, reproducible install from the lockfile. Equivalent to `npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, or `bun install --frozen-lockfile`.

```bash
./app sync
```

### `install` / `i` — Add packages

Installs one or more packages, or re-installs all dependencies when no arguments are given.

```bash
./app install          # re-install all deps
./app i zod            # add a package
./app i -D vitest      # add a dev dependency
```

### `uninstall` / `un` — Remove packages

Removes one or more packages.

```bash
./app uninstall zod
./app un lodash uuid
```

---

## `add` — Generators & integrations

### Code generators

All generators create a file and auto-patch the nearest `module.ts` to register it. Pass `--force` / `-f` to overwrite an existing file.

| Command                    | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `add module <name>`        | Scaffold a route module                                    |
| `add module <name> --crud` | Scaffold a full CRUD module (handler + repository)         |
| `add hook <name>`          | Scaffold a lifecycle hook, register in nearest `module.ts` |
| `add plugin <name>`        | Scaffold a plugin, register in nearest `module.ts`         |
| `add middleware <name>`    | Scaffold a middleware, register in root `src/module.ts`    |

```bash
./app add module orders
./app add module orders --crud       # creates module.ts, orders.handler.ts, orders.repository.ts
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
