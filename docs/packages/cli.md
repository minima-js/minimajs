---
title: CLI
sidebar_position: 7
tags:
  - cli
  - tooling
  - dev
---

# @minimajs/cli

The Minima.js CLI scaffolds projects, runs the development server, builds for production, and generates code.

## Installation

```bash
# Global install (optional)
npm install -g @minimajs/cli

# Or use npx / bunx without installing
bunx @minimajs/cli new my-app
npx @minimajs/cli new my-app
```

Scaffolded projects include an `./app` runner that wraps the CLI, so you rarely need a global install:

```bash
./app dev          # start dev server
./app build        # production build
./app add module users  # generate a module
```

## Commands

### `minimajs new <name>`

Scaffold a new MinimaJS application.

```bash
bunx @minimajs/cli new my-app
bunx @minimajs/cli new my-app --bun
bunx @minimajs/cli new my-app --runtime=node --pm=pnpm
```

| Flag                         | Default       | Description                                    |
| ---------------------------- | ------------- | ---------------------------------------------- |
| `--pm`                       | auto-detected | Package manager (`bun`, `pnpm`, `yarn`, `npm`) |
| `--runtime`                  | auto-detected | Runtime target (`node` or `bun`)               |
| `--bun`                      | —             | Shorthand for `--runtime=bun`                  |
| `--install` / `--no-install` | `true`        | Install dependencies after scaffolding         |
| `--git` / `--no-git`         | `true`        | Run `git init` after scaffolding               |

**Generated files:**

```
my-app/
├── src/
│   ├── index.ts        # entry point
│   └── module.ts       # root module
├── minimajs.config.ts  # project config
├── tsconfig.json
├── .env
├── .gitignore
└── app                 # runner script (executable)
```

---

### `minimajs init`

Initialize config files in an existing project directory.

```bash
minimajs init
```

Creates `tsconfig.json`, `minimajs.config.ts` (or `.js` for Node), and the `app` runner script. Skips files that already exist.

---

### `minimajs dev`

Start the development server with watch mode and auto-restart.

```bash
./app dev
./app dev --no-check
./app dev --env-file .env.local
```

| Flag                     | Default | Description                                                       |
| ------------------------ | ------- | ----------------------------------------------------------------- |
| `--env-file`             | —       | Path to `.env` file                                               |
| `-p, --tsconfig`         | —       | Path to `tsconfig.json`                                           |
| `--check` / `--no-check` | `true`  | Run TypeScript type checking on each rebuild                      |
| `--reset`                | —       | Clear screen on each rebuild                                      |
| `--kill-signal`          | —       | Signal used to stop process before restart (`SIGTERM`, `SIGKILL`) |
| `--grace` / `--no-grace` | `true`  | Graceful shutdown before restart                                  |
| `--run` / `--no-run`     | `true`  | Watch and rebuild without running the process                     |
| `--exec`                 | —       | Custom command to run after build (e.g. `'node [filename]'`)      |

---

### `minimajs build`

Compile TypeScript to production JavaScript using esbuild.

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

### `minimajs start`

Run the compiled production build.

```bash
./app start
./app start dist/index.js
./app start --env-file .env.production
```

The entry file is auto-detected from `package.json#main`, or the first existing file among `dist/index.js`, `dist/index.mjs`, `dist/main.js`. Enables source maps automatically on Node.js when the build included them.

| Flag         | Default       | Description         |
| ------------ | ------------- | ------------------- |
| `[entry]`    | auto-detected | Compiled entry file |
| `--env-file` | —             | Path to `.env` file |

---

### `minimajs check`

Run TypeScript type checking without building.

```bash
./app check
./app check -p tsconfig.build.json
```

| Flag             | Description             |
| ---------------- | ----------------------- |
| `-p, --tsconfig` | Path to `tsconfig.json` |

---

### `minimajs info`

Display project configuration and discovered modules.

```bash
./app info
```

Shows project name, version, runtime, package manager, build settings, and the list of auto-discovered modules.

---

### `minimajs add`

Scaffold modules, services, and install integrations.

#### Code generators

| Command                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `add module <name>`     | Scaffold a route module (handler + `module.ts`) |
| `add service <name>`    | Scaffold a service file                         |
| `add middleware <name>` | Scaffold a middleware plugin                    |
| `add plugin <name>`     | Scaffold a reusable plugin                      |
| `add hook <name>`       | Scaffold a lifecycle hook                       |

All generators support `--dir <path>` to specify the output directory (default: `src`).

```bash
./app add module users
./app add service users/users.service
./app add middleware auth
```

#### Integrations

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `add disk`       | Install disk file-storage integration    |
| `add openapi`    | Install OpenAPI / Swagger documentation  |
| `add lint`       | Scaffold ESLint with TypeScript support  |
| `add format`     | Scaffold Prettier formatting             |
| `add dockerfile` | Generate a Dockerfile                    |
| `add skills`     | Install the MinimaJS skill for AI agents |

**`add disk`**

```bash
./app add disk                    # file-system driver (default)
./app add disk --driver=aws-s3
./app add disk --driver=azure-blob
```

Installs the required packages and scaffolds the disk plugin. See [Disk](/packages/disk/index.md) for usage.

**`add openapi`**

```bash
./app add openapi
```

Installs `@minimajs/openapi` and patches the root module. See [OpenAPI](/packages/openapi) for usage.

**`add lint`**

```bash
./app add lint
```

Installs `eslint`, `@eslint/js`, and `typescript-eslint`. Adds a `lint` script to `package.json`.

**`add format`**

```bash
./app add format
```

Installs `prettier`. Creates `prettier.config.js` and `.prettierignore`. Adds `format` and `format:check` scripts to `package.json`.

**`add dockerfile`**

```bash
./app add dockerfile
```

Generates a multi-stage `Dockerfile` optimised for the detected runtime (Bun or Node), using the latest Alpine-based image.

**`add skills`**

```bash
./app add skills --claude
```

Downloads the MinimaJS AI agent skill from GitHub Releases. Pass `--claude` to symlink it for Claude Code.

## The `./app` runner

Every scaffolded project includes an executable `./app` script that forwards commands to the local `minimajs` binary. This means you don't need a global CLI install and the project always uses the version pinned in `package.json`.

```bash
# These are equivalent
./app dev
npx minimajs dev
bunx minimajs dev
```
