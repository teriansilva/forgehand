# Agent rules for this repo

This file is both **this repo's live agent instructions** and the **template** you copy into your own repos when adopting forgehand (step 6 of [`docs/setup.md`](docs/setup.md)).

## The canonical workflow

All work in this repo follows the agent workflow imported below: issue-first planning, labels, the capped issue-review loop, isolated per-issue checkouts, the PR-review loop, guarded auto-merge, deploy watch.

## Repo-specific overlay

Overlays **extend, never relax** the canonical rules. For this repo:

- Markdown, YAML, shell, and TypeScript only — there is no build step; "CI green" means lint/shellcheck-level sanity.
- This repo is a **public release artifact**: never commit anything site-specific — no internal hostnames, IPs, org names, bot identities, or notification endpoints. Placeholders only (`git.example.com`, `acme`, `reviewer-bot`, `forge-bot`).
- The workflow doc here (`docs/agent-workflow.md`) **is the canonical copy for this repo** — it is not synced from anywhere; edit it directly via PR.

## Other agents

`AGENTS.md` is a symlink to this file so opencode and other AGENTS.md-aware tools pick up these repo rules. The `@docs/agent-workflow.md` line below is **Claude Code's** import syntax — opencode does not evaluate it, so the canonical doc is *also* loaded for opencode via [`opencode.json`](opencode.json)'s `instructions` array (`docs/agent-workflow.md` + this file). Keep both in sync: if you rename or move the canonical doc, update `opencode.json` and this import together.

---

@docs/agent-workflow.md
