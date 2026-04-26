---
title: dockerfile
---

# minimajs add dockerfile

Generates a production-ready multi-stage `Dockerfile` for your project, auto-detecting the runtime (Bun or Node) and package manager.

```bash
minimajs add dockerfile
```

## What it does

- Detects the runtime from `.bun-version`, `.node-version`, `package.json` engines, or the current process
- Detects the package manager (bun, npm, pnpm, yarn, yarn berry)
- Generates a two-stage Dockerfile: build stage and lean production stage
- Creates a non-root user to run the container

## Options

| Flag        | Default       | Description                                              |
| ----------- | ------------- | -------------------------------------------------------- |
| `--user`    | `minimajs`    | Non-root OS user created and used to run the container   |
| `--version` | auto-detected | Base image version tag (e.g. `24-alpine`, `lts-alpine`) |

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

# Custom OS user
minimajs add dockerfile --user=nodejs

# Both
minimajs add dockerfile --version=lts-alpine --user=appuser
```

## Supported package managers

| Package manager | Lock file          |
| --------------- | ------------------ |
| bun             | `bun.lock`         |
| npm             | `package-lock.json`|
| pnpm            | `pnpm-lock.yaml`   |
| yarn            | `yarn.lock`        |
| yarn berry      | `.yarnrc.yml`      |
