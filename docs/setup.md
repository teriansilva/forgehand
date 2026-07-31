# Setup — adopting forgehand on your Forgejo

Work through these in order. Steps 1–4 are one-time org setup; 5–7 wire the agents.

## 0. Compatibility floor & configuration contract

- **Forgejo:** v7+ with Actions enabled (the templates use `concurrency`, typed `workflow_dispatch` inputs, org secrets, and the combined commit-status API), plus at least one registered runner.
- **Placeholders (exhaustive):** `git.example.com` (forge host) · `acme` (org — the *same* token used everywhere, including in the prompt templates' scope guard) · `reviewer-bot` (AI reviewer login) · `forge-bot` (automation login) · `NOTIFY_URL` (optional notification endpoint) · `local/your-model` (audit model id). Search-and-replace these; nothing else in the tree is site-specific by design.
- **Runner topology (security contract):** PR-triggered validation must run on a **disposable/isolated** runner (fresh container/VM, separate user + home + workspace), and token-bearing **trusted** jobs (doc-sync, nightly audit, reviewer dispatch) on a **separate trusted pool** that never executes PR-head code. Removing secrets from the PR job is necessary but not sufficient on a *persistent* shared runner — see [`reviewer-bot.md`](reviewer-bot.md#runner-isolation--necessary-alongside-no-secrets-in-pr-ci).
- **Secrets:** `FORGE_BOT_TOKEN` (org secret — automation bot PAT, used only by trusted workflows like the doc-sync cascade). The reviewer secret (`REVIEWER_WEBHOOK_SECRET` etc.) lives with your **trusted** reviewer trigger — a status subscriber or host-side dispatcher — **never** in the `pull_request` validation workflow, which runs PR-controlled code (see [`reviewer-bot.md`](reviewer-bot.md#triggering-the-reviewer-safely--never-from-pr-controlled-ci)). The `pull_request` gate holds **no secrets at all**: the org-specific private-name leak scan (whose pattern list is itself sensitive) runs **pre-push** from a trusted context — a `git pre-push` hook or your host-side dispatcher — not in CI.
- **Host deps for `bin/agentwork`:** bash 4+, git, curl, jq.
- **Engines:** Claude Code (`CLAUDE.md` imports) and opencode (`@opencode-ai/plugin` API, see the plugin header).

## 1. Bot accounts

Create two users (regular accounts, not admins):

| Account | Needs | Token scopes |
|---|---|---|
| `forge-bot` | Push + PR on every target repo (org membership with write) | `write:repository` (+ `write:issue`) |
| `reviewer-bot` | Post issue comments + formal PR reviews | `write:issue`, `write:repository` (reviews) |

Store `forge-bot`'s token as an **org-level Actions secret** named `FORGE_BOT_TOKEN` — the workflow templates reference it. Keep `reviewer-bot`'s token wherever your LLM runtime lives.

## 2. Labels

Per repo: the `type:*` set plus your `area:*` sets (workflow §2). Script it —
the token is passed to `curl` via a `-K -` config on stdin, never on the
command line (so it can't be read from `ps` / `/proc`):

```bash
FORGE=https://git.example.com ORG=acme REPO=myrepo TOKEN=$(cat ~/.config/forgejo/token)
auth() { printf 'header = "Authorization: token %s"\n' "$TOKEN"; }
while IFS='|' read -r name color desc; do
  auth | curl -sf -X POST -K - -H 'Content-Type: application/json' \
    "$FORGE/api/v1/repos/$ORG/$REPO/labels" \
    -d "{\"name\":\"$name\",\"color\":\"#$color\",\"description\":\"$desc\"}" >/dev/null && echo "created $name"
done <<'EOF'
type:feature|00aabb|New capability
type:enhancement|84b6eb|Improvement to an existing capability
type:bug|ee0701|Defect
type:chore|cccccc|Refactor, cleanup, scaffolding
type:docs|1d76db|Documentation only
type:tracking|f9d0c4|Tracking parent / not actively prioritised
area:app|ff2db5|Application code
area:docs|a855f7|Docs
area:infra|7057ff|CI, deploy, infrastructure
EOF
```

## 3. The reviewer runtime

Anything that can receive a webhook, read a repo, and call the Forgejo API (see [`reviewer-bot.md`](reviewer-bot.md)). Add an **org-level webhook** for `issues` + PR events pointing at it, and load [`prompts/issue-review.md`](../prompts/issue-review.md) / [`prompts/pr-review.md`](../prompts/pr-review.md) with the placeholders filled.

Start with the PR route only if you want a gentler rollout — the issue route is advisory and can come second.

## 4. Canonical repo + cascade

Pick (or create) one repo as the canonical home of `docs/agent-workflow.md`. Add [`workflows/sync-canonical-docs.yml`](../workflows/sync-canonical-docs.yml) to it (as `.forgejo/workflows/…`), fill in the target-repo matrix, and make sure a runner is available. Every push to `main` that touches the canonical doc now opens sync PRs across the org — which your reviewer reviews and your agents auto-merge like any other PR.

You'll need at least one **Forgejo Actions runner** registered at org level. Repos should also have a `pr-validate` (or equivalent) required check — the combined commit status is the merge gate (workflow §7/§8), so every repo needs *something* red/green to gate on.

## 5. Agent host tooling

On the machine your coding agents run on:

```bash
install -m755 bin/agentwork ~/.local/bin/agentwork

# ~/.bashrc or the agent's env:
export FORGE_URL=https://git.example.com
export FORGE_ORG=acme
export AGENTWORK_REPOS="repo-a repo-b repo-c"   # allowlist; keeps agents inside your org
export FORGEJO_TOKEN_FILE=~/.config/forgejo/token   # used read-only for PR-state checks
```

For opencode users, install the wait-tool plugin too:

```bash
install -Dm644 opencode/plugin/opencodeuler.ts ~/.config/opencode/plugin/opencodeuler.ts
```

## 6. Per-repo agent instructions

In each repo:

```bash
cp path/to/forgehand/CLAUDE.md CLAUDE.md      # then edit the repo-specific overlay section
ln -s CLAUDE.md AGENTS.md                     # opencode reads the same rules
```

`CLAUDE.md` imports `docs/agent-workflow.md` (the synced copy the cascade maintains), then adds repo-specific overlay rules — stack commands, deploy etiquette, label inventory. Overlays **extend, never relax** the canonical rules.

## 7. Calibrate before trusting auto-merge

- Run the first several PRs with a `hold` label on: the loop does everything except merge, and you read the reviewer's judgment at zero risk.
- Tune the PR-review prompt until its `REQUEST_CHANGES` findings are consistently real. A reviewer that nitpicks noise trains agents to thrash; one that rubber-stamps trains them to ship garbage.
- Then remove the label and let §8 do its job. The guard list (human engaged, hold label, conflict, high-blast-radius file) stays as your safety net.

## Troubleshooting

| Symptom | First place to look |
|---|---|
| PR sits with no review | The **combined commit status** — a red or never-triggered required check means the reviewer was never told to fire |
| Reviewer loops on its own comments | The two-account rule (§ identities in [`reviewer-bot.md`](reviewer-bot.md)) — the self-loop guard keys on the login |
| Sync PRs unlabeled / flagged by reviewer | Label names differ per repo — the sync workflow resolves label **IDs** per target at runtime; check its fallback list matches your names |
| Merge "succeeded" but PR still open | Verify `merged: true` + new base SHA after every merge call (workflow §7.5); retry via REST `PUT …/merge` |
| Deploy green but change not live | Stale image / build cache / wrong SHA on the target host — workflow §9.3 |
