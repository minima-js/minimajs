---
title: dockerfile
---

# minimajs add dockerfile

Generates a production-ready `Dockerfile` for your project, auto-detecting the runtime (Bun or Node) and package manager.

```bash
minimajs add dockerfile
```

Also creates a `.dockerignore` if one does not already exist.

## 3-stage build

Every generated Dockerfile uses three stages:

```
base ──► builder ──► runner
```

**base** — installs the package manager tooling and copies only the lockfile and manifest. Shared by both builder and runner, so setup steps never run twice.

**builder** — extends base, runs a full dependency install (including devDependencies), then compiles the app (`build` script).

**runner** — extends base, installs production-only dependencies using the builder's package cache (no second network fetch), copies the compiled `dist/`, drops privileges to a non-root user, and starts the app.

## Dependency caching

The runner stage reuses the package cache populated in the builder stage via a BuildKit bind mount. The cache is visible only during the `RUN` step — it is never written into an image layer, so the final image stays lean.

| Package manager | Cache source (from builder)      | Env / flag used in runner             |
| --------------- | -------------------------------- | ------------------------------------- |
| yarn berry      | `/root/.yarn/berry/cache`        | `YARN_CACHE_FOLDER`                   |
| yarn classic    | `/root/.cache/yarn`              | `YARN_CACHE_FOLDER`                   |
| bun             | `/root/.bun/install/cache`       | `BUN_INSTALL_CACHE_DIR`               |
| npm             | `/root/.npm`                     | `--cache`                             |
| pnpm            | `/pnpm/store`                    | `--store-dir`                         |

This requires BuildKit, which has been the default since Docker 23. For older Docker, add `# syntax=docker/dockerfile:1` at the top of the generated file.

## Non-root user

The runner stage creates a dedicated system user to run the process. The command used depends on the base image:

- **Alpine** images (`*-alpine`) — uses `addgroup` / `adduser` (BusyBox)
- **Debian / Ubuntu** images — uses `groupadd` / `useradd` (shadow-utils)

The detection is automatic based on the `--version` flag value.

## Options

| Flag        | Default       | Description                                              |
| ----------- | ------------- | -------------------------------------------------------- |
| `--user`    | `minimajs`    | Non-root OS user created and used to run the container   |
| `--version` | auto-detected | Base image version tag (e.g. `24-alpine`, `lts-alpine`) |
| `--port`    | `6464`        | Port the container listens on                            |
| `--force`   | `false`       | Overwrite an existing `Dockerfile`                       |

When `--version` is not provided, the CLI resolves it in this order:

1. `.bun-version` / `.node-version` file → appends `-alpine` (e.g. `1.2.3-alpine`)
2. Fetches the latest release tag from Docker Hub
3. Falls back to `lts-alpine` (Node) or `latest` (Bun)

## Examples

```bash
# Auto-detect everything
minimajs add dockerfile

# Pin a specific version
minimajs add dockerfile --version=24-alpine

# Custom port
minimajs add dockerfile --port=1234

# Custom OS user
minimajs add dockerfile --user=nodejs

# Overwrite an existing Dockerfile
minimajs add dockerfile --force

# All options
minimajs add dockerfile --version=lts-alpine --user=appuser --port=8080 --force
```

## Supported package managers

| Package manager | Lock file           | Production install command                  |
| --------------- | ------------------- | ------------------------------------------- |
| bun             | `bun.lock`          | `bun install --frozen-lockfile --production`|
| npm             | `package-lock.json` | `npm ci --omit=dev`                         |
| pnpm            | `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile --prod`     |
| yarn classic    | `yarn.lock`         | `yarn install --frozen-lockfile --production`|
| yarn berry      | `.yarnrc.yml`       | `yarn workspaces focus --all --production`  |
