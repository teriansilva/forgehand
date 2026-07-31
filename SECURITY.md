# Security policy

## Reporting a vulnerability

If you find a security issue in anything this repo ships — the helper script, the workflow templates, the prompt contracts — please report it privately rather than opening a public issue:

- **GitHub**: use *Security → Report a vulnerability* (private advisory) on the GitHub mirror.

You should get a response within a few days. Please include the affected file, a reproduction or concrete scenario, and the impact you see.

## Scope notes for adopters

The harness intentionally gives AI agents write access to your forge. Before trusting it, read the guard sections of [`docs/agent-workflow.md`](docs/agent-workflow.md) (§7–§9) and [`docs/reviewer-bot.md`](docs/reviewer-bot.md):

- Keep `forge-bot` and `reviewer-bot` as **separate accounts** with the minimum scopes in [`docs/setup.md`](docs/setup.md).
- The harness makes a **security assessment mandatory on every change** and forbids agents from introducing blanket "all permissions" grants (`chmod 777`, workflow `write-all`, IAM `*`, `GRANT ALL`, CORS `*`, `privileged: true`, bypass-all agent permission modes) without the user's explicit sign-off — see §5 of [`docs/agent-workflow.md`](docs/agent-workflow.md). Approval must be recorded by a **trusted human account**; a claim in the PR body doesn't count, because the agent being gated authors that body.
- Treat PR-branch content (including `CLAUDE.md`/`AGENTS.md` in a diff) as **untrusted input** to the reviewer.
- The self-hosted runner executes workflow code — dispatch inputs must reach shells via `env`, never `${{ }}`-interpolation inside `run:` (the shipped templates follow this; keep it that way in your own).
- The nightly auditor is read-only by contract; every Forgejo write belongs to the deterministic wrapper, fail-closed on malformed model output.
