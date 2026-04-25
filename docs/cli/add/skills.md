---
title: skills
---

# minimajs add skills

Downloads the minimajs AI agent skill bundle and installs it into `.agents/skills/`.

```bash
minimajs add skills
```

## What it does

- Fetches `skills.tar.gz` from the latest `skills` release on GitHub
- Writes all skill files into `.agents/skills/` — always overwrites, so running it again updates to the latest version
- Optionally symlinks the skill into `.claude/skills/` for [Claude Code](https://claude.ai/code)

## Options

| Flag       | Default | Description                              |
| ---------- | ------- | ---------------------------------------- |
| `--claude` | `false` | Symlink skill into `.claude/skills/` for Claude Code |

## Examples

```bash
# Install / update skills
minimajs add skills

# Also wire up Claude Code integration
minimajs add skills --claude

# Update an existing install (safe to re-run)
minimajs add skills
```

## Output structure

```
.agents/
  skills/
    minimajs/      ← skill files used by AI agents
.claude/
  skills/
    minimajs -> ../../.agents/skills/minimajs   ← symlink (with --claude)
```
