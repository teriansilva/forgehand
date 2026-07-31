# Agent workflow — canonical doc

The canonical agent workflow for every Forgejo repository under `git.example.com/acme/*`. Applies equally to **Claude Code** (via `CLAUDE.md`) and **opencode** (via the `AGENTS.md` symlink). Loaded at session start by both engines.

> **Placeholders.** This doc ships with four placeholders — replace them org-wide when adopting:
> `git.example.com` (your Forgejo host) · `acme` (your org) · `reviewer-bot` (the AI reviewer account) · `forge-bot` (the automation account).

**Sync source.** The authoritative copy lives in one canonical repo. Per-repo copies (`docs/agent-workflow.md`) are kept in sync by [`workflows/sync-canonical-docs.yml`](../workflows/sync-canonical-docs.yml). Do **not** edit per-repo copies — change the canonical file and let the cascade open sync PRs.

---

## 1. Planning — open an issue first when work is non-trivial

When work is more than a small change — anything spanning multiple files, multiple steps, or affecting infra / auth / data / schema — open a **Forgejo issue** *before* implementing. The issue body is the source of truth; PRs reference it; comments capture course corrections.

### Skip the issue dance for

- Bug fixes with a clear root cause.
- One-file changes.
- Doc edits.
- Configuration tweaks.

A plan is overhead — only pay it when alignment is needed.

### Issue body shape

Every non-trivial issue body **must** include all of these sections:

- **Overview** — what & why, in 2–3 sentences.
- **Goals** — bullet list of outcomes that define success.
- **Architecture** — only the parts that aren't obvious from code. Diagrams, table layouts, message protocols, integration points, schema changes.
- **Phases** — concrete checklist for the phase being built; sketches for deferred phases. Phases double as acceptance criteria — each box closes when its work lands.
- **Risks** — what could go wrong, mitigation per row. **Security impact lives here** (§5): if the work touches auth, input handling, secrets, permissions, dependencies, or network exposure, spell it out rather than leaving it implied.
- **Out of scope** — explicit list. The most useful section.

Title: imperative, scoped (`feat(auth): theme the login flow with design tokens`).

If a plan grows past comfortable reading length for one issue, split it: a parent tracking issue with the high-level plan and per-phase child issues with detailed steps.

### Record the authoring session on every issue you open

An issue that doesn't say which session *wrote* it is as opaque as one that doesn't say which session is *working* it. So **immediately after creating an issue, post a session record comment** — the same device as the §5 claim record, at the other end of the issue's life. It gives a reader a one-click path from the issue text back to the transcript that produced it: why this scope, what was ruled out, what the user actually asked for.

Post it as the **first comment** on the new issue, exactly this shape:

```markdown
<!-- agent-session-author: engine=<engine> id=<session-id> -->
🤖 **Issue opened by** `<engine>` session `<session-id>`

- Session: https://sessions.example.com/s/<engine>/<session-id>
```

- **The marker is `agent-session-author:`, deliberately not `agent-session:`** — an authoring record is **not** a claim. §5's claim resolution matches on `agent-session:` (with the colon), which `agent-session-author:` does not contain, so an authoring record can never be misread as the current holder of an in-progress issue — nor mistaken by your own later self for a claim you already posted.
- **Do not apply `status:in-progress`.** Writing an issue isn't working it. That label goes on at the §4-final → implementation handoff (§5), not here.
- **No checkout / branch line** — neither exists yet at issue-creation time.
- Session-id resolution and the `id=unavailable` fallback are per §5 → "Resolving your own session id". Same rule: **a guessed id is worse than none.**
- **A comment, never the issue body** — a body edit re-fires the whole issue review (§10); an `issue_comment` leaves the issue-review route silent.

The session link assumes you run a **session viewer** that indexes each engine's transcripts at a stable URL (substitute your own host and engine slugs for `sessions.example.com` / `<engine>`). If you don't run one, keep the marker and the id and drop the link — the id alone still ties the issue to a transcript on disk.

When the same session goes on to implement the issue (the §4 auto-handoff), it **still** posts its own §5 claim record at that point — two comments from one session, marking two different events. A parent/child split gets one authoring record per issue.

### Mockup-first for issues that touch design

If an issue introduces or materially changes **user-facing UI**, attach a mockup to the issue **before implementation** — post it as a comment (or embed it in the body) together with a one-paragraph description of the intent, and re-post when the design materially changes.

A mockup must be a **proper graphical artifact** — a rendered raster (PNG) and/or vector (SVG), built to the design system's real tokens, shown in the relevant themes and viewports (light + dark, desktop + mobile). **ASCII sketches do not count.** A quick HTML/CSS prototype screenshotted in a browser is the cheapest route.

This is conditional and a no-op for most issues: server-only, schema, API, infra, CI, docs, and bot-logic issues need no mockup. When unsure, err toward a quick mockup.

---

## 2. Labels — every issue and PR gets labels

Every issue and PR ships with **one `type:*` label** + **at least one `area:*` label**. Labels are how the team and the reviewer bot slice the backlog. An untagged issue is incomplete.

### Type labels — exactly one per issue / PR

| Label | When to use |
|---|---|
| `type:feature` | A new capability the user / operator can observe. |
| `type:enhancement` | A meaningful improvement to an existing capability. |
| `type:bug` | A defect — observable broken behaviour. |
| `type:chore` | Refactor, cleanup, dependency bumps, brand assets, spikes, scaffolding. |
| `type:docs` | Documentation only — no code change beyond docs/comments. |
| `type:tracking` | A tracking parent issue whose children carry the work, or work captured but not actively prioritised. |

### Area labels — one or more per issue / PR

Area-label sets are repo-specific. Typical patterns:

- **Platform / SaaS repos** — `area:platform`, `area:auth`, `area:realtime`, `area:web`, `area:api`, `area:data`, `area:infra`.
- **Bot repos** — `area:bot`, `area:dashboard`, `area:webhooks`.
- **Docs repos** — `area:docs`, `area:runbooks`, `area:network`.

List a repo's labels before creating anything (`GET /repos/<owner>/<repo>/labels`).

### Status labels — `status:in-progress`, applied by the working agent

`status:in-progress` is **not** part of the `type:*` / `area:*` taxonomy above and doesn't interact with the "exactly one `type:*`" rule — it's transient state, applied when an agent starts implementing an issue and removed when the agent stops. The agent manages it; a human never needs to.

Provision it in every repo the harness works. If it's missing, create it before claiming — same rule as any other absent label (see "New labels" below), with `color: fbca04`. Never skip the claim just because the label isn't there yet.

Its presence on an open issue means *an agent session is working this right now* — see §5 "Claim the issue before implementing". Its absence means the issue is free. Filter the issue list on it to see what the fleet is currently doing.

### API gotcha — label IDs, not names

The Forgejo label-assignment API (`POST /repos/<owner>/<repo>/issues/<n>/labels`) takes **numeric label IDs**, not names. List the repo's labels first to map names → IDs. The mapping is repo-specific and not stable across repos.

### Where labels get applied

- **At issue creation.** Don't ship an untagged issue.
- **At PR creation.** Forgejo doesn't auto-inherit labels from a linked issue; re-apply the same `type:*` + `area:*` labels on the PR itself.
- **When scope shifts mid-issue.** Don't swap the type label silently, and don't stack a second one. If scope genuinely shifts, split the secondary work into a follow-up issue with its own type label.

### New labels

If you need a label that doesn't exist, create it (`POST /repos/<owner>/<repo>/labels`) *before* opening the issue. Don't squat a near-fit existing label.

---

## 3. Less is more — don't over-engineer

Default to the minimum thing that solves the asked problem. Two anti-patterns to actively avoid:

- **Speculative feature flags.** Don't add `FEATURE_X` env vars "for safety" unless a concrete risk *currently* requires hiding the surface. A natural empty state is almost always a better answer than a flag.
- **Scope creep "while I'm here".** If the user asked for A, ship A. Adjacent improvements get their own follow-up issue — the user decides whether they're worth shipping, not the agent.

Both come from the same root: respect the stated scope. Less code is less surface to review, fewer rollback points, and faster cycles.

---

## 4. Autonomous issue-review loop — hard cap 5 iterations

After an issue opens, the reviewer bot (`reviewer-bot`) **automatically** posts an advisory review comment within a few minutes. Each re-fire **appends a new comment**; comments are not edited, so the chain is auditable.

The reviewer's role on issues is **sanity-check, not gatekeeping** — a missing `## Out of scope`, fuzzy goal statement, missing labels, contradiction with an existing issue, or scope that should be split. It does *not* approve or reject; it nudges.

**Mockups (design issues).** When the issue carries a mockup (per §1), the reviewer reviews it too. For a UI-touching issue with **no** mockup, "add a mockup" is a **mechanical** nudge — the agent renders one and attaches it; it is not a scope/design bail. Don't auto-hand-off to implementation on a design issue until a mockup exists and the reviewer has had a chance to weigh in.

### The loop

While the issue is open and the most recent comment by `reviewer-bot` flags something:

1. Read the latest reviewer comment (`GET /repos/<owner>/<repo>/issues/<n>/comments`; filter to the bot, take the last).
2. **If the request is mechanical** — add a missing section, tighten a goal, apply a missing label, link a referenced issue — apply it (`PATCH /repos/<owner>/<repo>/issues/<n>` for the body). Increment the iteration counter.
3. **If the request is a scope / design call** — split this in two? defer phase 2? do we even need X? — **bail out**, post a brief comment summarizing the question, and surface to the human user. Do not iterate further.
4. After the body edit lands, the reviewer re-fires within seconds-to-minutes. Loop.

### Hard cap — 5 iterations

**Stop after 5 iterations**, even if iteration 6 would be mechanical. On the 6th open question, post a summary comment and surface to the human user. Excessive back-and-forth means the issue isn't crisp; a human eye resolves it faster.

### Cadence

Between checks, **wait** rather than busy-loop: ~270 s while actively waiting on the reviewer, backing off to ~1200 s after 10 minutes of no state change.

- **Claude Code** — `ScheduleWakeup` with `delaySeconds: 270` (deferred re-invocation).
- **opencode** — the `wait` tool from the [OpenCodeuler plugin](../opencode/plugin/opencodeuler.ts): `wait({ seconds: 270, reason: "<what you're waiting on>" })`. It blocks the turn rather than deferring re-invocation, but the polling rhythm is identical.

### Bail conditions (end the loop, surface to user)

- 5 iterations reached.
- The reviewer asks a scope / design question.
- The reviewer contradicts a prior nudge — the issue is unstable.
- Two consecutive iterations on the same point — the obvious fix didn't satisfy the reviewer; guessing again wastes the user's time.
- Cumulative wall-clock time exceeds 30 min on issue refinement.

### "Final" state — and the auto-handoff to implementation

An issue is **final** when:

- No new reviewer comment has fired in 5 minutes after the last body edit, **and**
- The most recent reviewer comment is either silent or explicitly says the issue is ready.

**At that point, proceed to implementation automatically** — no further user instruction is required. The agent claims the issue per §5 (`status:in-progress` + a session record), opens an `agent/<slug>` branch, implements the issue's checklist, opens the PR, and feeds that PR into §7's review loop and §8's autonomous merge.

Skip the auto-handoff and surface to the user instead when:

- Any bail condition above fired.
- The user explicitly said "hold this" / "don't implement yet" in chat or on the issue.
- A `hold` / `do-not-implement` label is set on the issue.
- The issue's scope is genuinely exploratory ("how should we approach X?" — no concrete deliverable in the Phases checklist).

---

## 5. Implementation conventions

### Claim the issue before implementing — `status:in-progress` + a session record

An issue gives no sign that an agent is already inside it, and once work lands there's no path from the issue back to the transcript that produced it. Both are fixed by a **claim**: the agent marks the issue in progress and records which session is doing the work.

Claim at the §4-final → implementation handoff, **before** cutting the branch. (No issue, no claim — the §1 "skip the issue dance" cases have nothing to mark.)

**1. Check for an existing claim first.** Read the issue's labels.

- **No `status:in-progress`** → the issue is free. Claim it.
- **`status:in-progress` present** → read the newest `<!-- agent-session: … -->` comment. That newest record is the **current holder**; older ones are history.
  - It records **your own** session id → this is your claim, resumed. Continue; don't re-post.
  - It records **another live** session → another agent is on this issue. **Do not start.** Surface to the user with the issue number and a link to the other session.
  - It records a **dead** session → the claim is stale; take it over (below). Never silently steal a *live* claim.
  - It records `id=unavailable` → you cannot prove it isn't yours, so don't assume it is. Treat it as another agent's claim and follow the stale-claim test.

Only `<!-- agent-session: … -->` records are claims. **Skip `<!-- agent-session-author: … -->` records** when resolving the holder — those record who *opened* the issue (§1), not who is working it, and an issue routinely carries both.

**Stale claim — all three must hold** before you take it over:

1. No **open** PR references the issue (a merged/closed one doesn't keep a claim alive).
2. The recorded session is **not running** — absent from your session viewer's live list, and no process for it exists on the host.
3. Its `~/agentwork/<repo>/<slug>` checkout is either gone or has no unpushed work.

Then **take over, don't stack**: post a short comment naming the session you're superseding and why it looked dead, and immediately follow it with your own session record. The newest record is now the holder. Leave the old record in place.

**2. Apply the label.** `status:in-progress`, via `POST /repos/<owner>/<repo>/issues/<n>/labels` — remember it takes numeric label IDs (§2), so resolve the name → ID for that repo first.

**3. Post the session record.** One comment, exactly this shape. The HTML marker is what a resuming session matches on:

```markdown
<!-- agent-session: engine=<engine> id=<session-id> -->
🤖 **Working this issue** — `<engine>` session `<session-id>`

- Session: https://sessions.example.com/s/<engine>/<session-id>
- Checkout: `~/agentwork/<repo>/<slug>` · Branch: `agent/<slug>`
```

The link goes to your **session viewer** — substitute your own host and engine slugs, or drop the line entirely if you don't run one (§1). The checkout path is what a human traces when there's no viewer.

When a **second session** picks the issue up — a crash, a resume, a handoff — it appends **its own** record. Never edit or delete a prior one: the comment chain is the audit trail of everyone who touched the issue, which is the point.

**Never put the session record in the issue body.** The reviewer's issue review keys its idempotency marker off a hash of the body (§10), so a body edit re-fires a full review. A label change and a comment both leave the issue-review route silent.

#### Resolving your own session id

Record what the engine actually reports. **A guessed id is worse than none** — it points the next reader at an unrelated transcript.

- **Claude Code** — `$CLAUDE_CODE_SESSION_ID`, exported into every session. (It's the basename of the session's own transcript, `~/.claude/projects/<slug>/<uuid>.jsonl`.)
- **opencode** — a `ses_*` id from the engine's own session store (`~/.local/share/opencode/opencode.db`). Don't infer it by picking the newest row: with concurrent sessions that's a coin flip.
- **Can't determine it** → still claim, using the literal `unavailable` so the marker stays parseable. Drop the session link (it would 404); keep the checkout path:

  ```markdown
  <!-- agent-session: engine=opencode id=unavailable -->
  🤖 **Working this issue** — `opencode`, session id unavailable

  - Checkout: `~/agentwork/<repo>/<slug>` · Branch: `agent/<slug>`
  ```

  An `id=unavailable` record can never be matched back to a specific session, so a resuming agent cannot recognise it as its own — it will go through the stale-claim test above. That's the intended cost of an engine that won't name its sessions.

#### Release the claim

Remove `status:in-progress` on **every** exit path — the label must mean *in progress*, never *somebody died here*:

- **PR merged** (§8) — the issue closes via `Closes #N`; remove the label in the same step.
- **Bailed to the user** (a §4 or §7 bail condition fired) — post the bail comment explaining what's blocking, *then* remove the label. The user or the next agent decides what happens next, and neither should see a claim that nobody is honouring.
- **Abandoned** for any other reason — same order: say so in a comment, then release.

A **takeover** is the one case that doesn't touch the label: it's already set, and it stays set — only the holder changes.

Leave the session-record comments in place. They're history; the label is state.

### Isolated per-issue checkouts — never share a working tree

Multiple agents (and one agent juggling parallel issues) must **not** share a working tree. Sharing one on-disk clone is the root of cross-agent conflicts: uncommitted changes leak across branches, `git checkout` collisions, ambiguous branch state.

**Each issue gets its own throwaway full clone** under `~/agentwork/<repo>/<slug>`:

- Any long-lived reference clone is **read-only** — never run feature work in it.
- Mechanism is a full `git clone` (not `git worktree`) — zero shared `.git` state; teardown is a plain `rm -rf`.
- Location is a persistent scratch dir, **never `/tmp`** (it gets swept).
- **Always** isolate per issue — unless the user says otherwise ("just fix this one-liner in place").

**Start of an issue:**

```bash
agentwork start <repo> <slug>     # clone → ~/agentwork/<repo>/<slug>, branch agent/<slug> off main
cd ~/agentwork/<repo>/<slug>
```

**End of an issue** — clean up once the work has fully landed (PR merged **and** issue closed):

```bash
agentwork done <repo> <slug>      # verifies clean + pushed + PR merged/closed, then rm -rf; refuses otherwise
```

`agentwork done` enforces a mechanical safety floor — it refuses unless the working tree is clean, the work was pushed, and the PR is merged/closed. Never `rm` a checkout by hand without first confirming `git status --porcelain` is empty and the branch is merged. At session start, `agentwork sweep` (dry-run by default; `--yes` to act) clears checkouts whose PRs already merged/closed.

See [`bin/agentwork`](../bin/agentwork) — configure with `FORGE_URL`, `FORGE_ORG`, `AGENTWORK_REPOS`.

### Branch naming

`agent/<short-scoped-slug>` for all agent feature branches. One branch per issue; multi-branch issues should split into per-phase child issues first.

### Commit messages

- Imperative, scoped: `feat(auth): mount theme.css into the login flow (#12)`.
- Reference the issue number in the trailing `(#N)`.
- **No AI attribution boilerplate** — no `Co-Authored-By` for any AI, no "Generated with X" footers, no badges.

### UI / UX fixes — reproduce in a real browser, red → green

For any **user-facing UI or interaction fix**, a unit test in a DOM *emulator* (jsdom / happy-dom) is **not** sufficient proof. Emulators don't model real layout, stacking / `pointer-events`, touch, overlay geometry, service-worker caching, or genuine event dispatch — exactly the things these bugs live in.

- **Reproduce first.** Write a **real-browser** test (e.g. Playwright; run mobile *and* desktop projects where both exist) that **fails on the current code**.
- **Ship it green with the fix**, committed so CI guards it. State the red→green result in the PR.
- A deployed fix the user still can't see is usually a **stale cached bundle** (PWAs precache the shell) — confirm the running build before re-debugging.
- Doesn't apply to non-UI work or repos with no browser UI. If you genuinely can't run a real browser, say so explicitly in the PR — don't pass it off as verified.

### Security — assess the impact of every change

**Every change gets a security assessment, not just the ones that look security-shaped.** Before opening the PR, work out what your diff changes about the system's exposure and *state the conclusion*. "No security impact — docs-only change" is a perfectly good assessment; the rule is that it has to be **made and written down**, not skipped. Most changes are one line of work here.

What to look at, per diff:

| Surface | Ask |
|---|---|
| **Input handling** | Does untrusted input reach a shell, SQL query, file path, template, deserializer, or the DOM without validation / escaping? |
| **AuthN / AuthZ** | Does this add a route, endpoint, or action that skips an auth or ownership check — or widen who can reach an existing one? |
| **Secrets** | Any credential, token, or key landing in git, a log line, an error message, a client bundle, or a CI artifact? |
| **Transport / crypto** | TLS verification disabled, cert checking dropped, a weak or homemade cipher, plaintext where TLS was in use? |
| **Dependencies** | New / bumped packages: known-vulnerable, unpinned, or from an unexpected registry? Does the install step execute fetched code (`curl … \| sh`)? |
| **CI / workflows** | Does a workflow gain broad `permissions`, run on `pull_request_target` while checking out PR code, or expose secrets to a fork-triggered run? |
| **Runtime / container** | New `privileged: true`, added capabilities, host networking, a host-path or docker-socket mount, root user, or a port newly bound to `0.0.0.0` / published at the edge? |
| **Data exposure** | Does a response, log, or backup now carry more personal or tenant data than before? Any cross-tenant leakage? |

Where the assessment is recorded:

- **Issue** — security impact belongs in **Risks** (§1), one row per real risk with its mitigation. If the whole issue *is* a security change, say so in **Overview**.
- **PR** — a short `## Security impact` section in the body (§6).
- **Review** — the reviewer assesses every PR for security explicitly and blocks on findings it judges exploitable or on leaked secrets (§10). That's the **second** opinion, not the first — don't outsource your own assessment to it.

**If you're unsure, raise it — don't guess.** Genuine uncertainty about whether something is exploitable, whether an endpoint is actually authenticated, or whether a value is really a secret is a **bail-to-user** condition, on the same footing as a §4 / §7 scope question: say what you're unsure about and what you'd need to check in order to be sure. An unflagged maybe is the failure mode this rule exists to stop — a false alarm costs one sentence, a missed one costs an incident. This is *not* licence to pad reviews with speculative findings; flag what you actually can't resolve.

### Never grant "all permissions" — least privilege, wildcards need explicit user sign-off

Blanket-permission settings are **not** an acceptable shortcut to make something work — not in code, config, CI, or infra. The agent does not introduce one, and does not widen an existing one, unless **the user explicitly approved that specific grant**. "It was the only way I could get it working" is a reason to ask, not a reason to ship.

Non-exhaustive list of what counts:

- **Filesystem** — `chmod 777` / `0777`, world-writable dirs, a broad recursive `chown`.
- **CI** — `permissions: write-all` in a workflow (grant the specific scopes instead), or a job token carrying more than the job needs.
- **Cloud / IAM** — `"Action": "*"`, `"Resource": "*"`, `roles/owner`, contributor-at-subscription-scope.
- **Database** — `GRANT ALL PRIVILEGES`, or the app connecting as `postgres` / `root` / `sa`.
- **Network** — binding `0.0.0.0` where loopback or a LAN bind works, a firewall rule from `any`, a security group open to `0.0.0.0/0`, a newly edge-exposed port.
- **Web** — `Access-Control-Allow-Origin: *` (especially with credentials), a CSP carrying `unsafe-inline` / `unsafe-eval` / `*`, cookies relaxed to `SameSite=None` without cause.
- **TLS / SSH** — `verify=False`, `curl -k` / `--insecure`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `StrictHostKeyChecking no`.
- **Containers** — `privileged: true`, `--cap-add ALL`, `--net=host`, the docker socket mounted in, running as root where a non-root user exists.
- **Agent tooling** — bypass-all-permission modes (`--dangerously-skip-permissions` and equivalents) or a blanket `"*"` in a tool allowlist.

When a broad grant looks necessary:

1. **Try narrow first** — name the specific scopes / actions / paths / origins / capabilities. This is almost always enough.
2. **If narrow genuinely doesn't work, stop and ask the user**, with what you tried and how it failed. Don't ship the wildcard and mention it in the PR body as a fait accompli — that's a decision presented as a footnote.
3. **If the user approves, get the approval on the record where a reviewer can verify it** — ask them to say so in their **own comment** on the issue or PR, naming the specific grant. Then scope it as tightly as the approval allows, leave a comment at the site, and link that approving comment from the PR's `## Security impact` section.

**Getting approval and proving it are two different things.** A "yes" in chat is enough for *you* to proceed, but it is invisible to the reviewer — and your own assertion that it happened is not evidence, because the PR body, commit messages, and branch content are all authored by the party being gated. The reviewer therefore only accepts approval recorded by a **trusted human account** (not the PR author, not `forge-bot`, not `reviewer-bot`) and blocks otherwise (§10). That asymmetry is deliberate: it's what stops an agent from waving its own wildcard through.

Wildcards you **didn't** introduce aren't this PR's problem — don't scope-creep into fixing them (§3). Note them for a follow-up issue if they look serious.

### When the implementation diverges from the issue

Edit the issue body in the same PR — don't let the issue drift. If the divergence is a design call, bail out per §4.

---

## 6. Pull request shape

### Title

Match the commit message format: `feat(auth): mount theme.css into the login flow`.

### Body

```markdown
## Summary
1–3 bullets on what changed and why. Reference the issue: `Closes #12.`

## Security impact
One line minimum, per §5 — "None: docs-only change" is a valid answer, an empty section is not.
Name anything that widens exposure (auth, input handling, secrets, deps, CI privilege, network,
container privilege), plus what you're unsure about. Any broad-permission grant must be listed
here with a **link to the user's own approving comment** — asserting the approval here doesn't
clear the reviewer's gate, by design: this body is authored by you (§5).

## Test plan
- [x] Unit / integration tests added; all green locally
- [x] For a UI / interaction fix: a real-browser test that was **red before / green after** (per §5) — N/A for non-UI work
- [x] Build green locally
- [x] Combined commit status green — *all* required checks for the head SHA, not just the first one (see §7/§8)
- [ ] Empirical verification — describe what you ran in the running stack, or say so explicitly if you couldn't
```

If a step couldn't be run, leave it `[ ]` and explain — honesty about what was empirically verified beats an optimistic checkbox.

### Labels on the PR

Re-apply the issue's `type:*` and `area:*` labels on the PR (Forgejo doesn't inherit from linked issues).

---

## 7. Autonomous PR-review loop — soft cap

### Monitor every pipeline stage — the work isn't done until it's deployed

A change moves through a fixed pipeline, and **the agent monitors every stage** — never fire-and-forget at any hand-off:

```
PR opened → Validation (all required checks → combined status) → AI review → iterations → APPROVED → merge → Deploy → verify live
```

1. **PR** — opened with the §6 shape + labels.
2. **Validation** — the **combined commit status for the current head SHA** (every required check, not just the first). Any required check red is a closed gate: fix and push before anything else. The reviewer does **not** review until validation is green — a red (or never-triggered) required check is the #1 reason a PR sits with "no review".
3. **AI review** — fires only on validation-green. Read the latest review filtered to the current head SHA.
4. **Iterations** — apply mechanical notes, push, which re-triggers validation → review. Loop.
5. **Approve + merge** — on `APPROVED` + §8 guards, squash-merge. **Verify the merge actually landed** (`merged: true` + a new base SHA) — a merge API can return success without merging; re-check, and fall back to the REST `PUT …/merge` if a wrapper lied.
6. **Deploy** — merging `main` triggers the deploy pipeline. **Monitor it to completion and verify the change is live** (§9).

If any stage stalls (no validation run appears, no review after validation is green, a deploy hangs), **investigate that stage directly** — the workflow run, the runner, the reviewer service — rather than assuming the next stage will catch up.

After pushing the PR, **do not drop it.** Stay in a self-paced loop until the PR auto-merges (§8) and the deploy is verified live (§9), or a bail condition fires. The reviewer's **default vote is `REQUEST_CHANGES`** — that's the design, not failure.

### The loop

Each iteration:

1. **Check the combined commit status for the current head SHA** — *all* required checks. Query the rollup with `GET /repos/<owner>/<repo>/commits/<sha>/status` (its top-level `state`).
   - **Any required check still running / `pending`** → wait ~270 s (§4 Cadence), re-check.
   - **Any required check red** → fix the failing step, push, restart the iteration. Don't poll for a review; the gate is closed.
   - **Combined `state == "success"`** → continue.
2. If the repo has a per-PR dev-env / visual-snapshot workflow, wait for its comment before checking reviews.
3. **List PR reviews** — `GET /repos/<owner>/<repo>/pulls/<n>/reviews`. Filter to entries whose `commit_id` matches the current head SHA; take the latest.
   - **None yet** → wait ~270 s, re-check.
   - **`REQUEST_CHANGES`** → read the review body + inline comments. Apply each note **if it's mechanical** (rename, missing test, lint nit, copy edit, narrow refactor in one file). If applying any one requires a scope / design call — **bail** to the user. Push, restart the iteration.
   - **`APPROVED`** → **merge automatically** per §8 (squash, delete branch). Report: "Merged #N — `<title>`. Branch deleted." If a §8 guard fires, surface to the user instead.
4. Loop.

### Soft cap — no fixed iteration ceiling, but bounded

The loop continues as long as:

- the combined commit status keeps going green, **and**
- the reviewer's requests stay mechanical, **and**
- wall-clock time in the loop is under **60 minutes**.

There's no fixed iteration ceiling for PRs the way there is for issues — review-driven cleanups often span many small commits and that's healthy.

### Bail conditions (end the loop, surface to user)

- Merge conflict against the base branch.
- A reviewer comment that asks "should this also handle X?" / "did you consider Y?" / anywhere the wording requires choosing between >1 reasonable interpretation.
- Two consecutive failures of the same required check with the same root cause.
- Any destructive action needed to proceed (force-push, branch delete on someone else's branch, revert of a merged commit, schema rollback, dependency downgrade).
- Satisfying a reviewer note would require introducing or widening a broad-permission grant (§5) — ask the user for that specific grant instead of shipping it.
- A security finding whose severity or exploitability you can't settle from the diff — surface it rather than resolving it by guess in either direction (§5).
- A human (anyone other than `reviewer-bot`) leaves a review or substantive comment — they may be redirecting scope; defer.
- Cumulative wall-clock time in the loop exceeds 60 min.

### Don't enter the loop when

- The user said they want to drive the review themselves.
- The work is exploratory and may need scope decisions during review.
- The PR is a draft (`WIP:`-prefixed or marked draft).

---

## 8. Merge rule — autonomous merge on reviewer approval

When the reviewer votes `APPROVED` on a PR, the agent **merges the PR automatically** unless a guard below fires. No further user instruction is required.

Default merge call: mode `squash`, `delete_branch_after_merge: true`, title = the PR title.

Then **release the claim**: remove `status:in-progress` from the linked issue (§5). The merge closes the issue via `Closes #N`, but the label doesn't come off by itself, and a closed issue still wearing it reads as work in flight.

### Auto-merge applies when ALL of these hold

- The reviewer's latest review on the PR has `commit_id` matching the current head SHA, **and** `state == "APPROVED"`.
- **The combined commit status for the current head SHA is `success`** — *every* required check green. **Read the combined `/status` rollup, not the `/statuses` per-check list** (the list carries stale duplicate `pending` rows). Any required check `failure` / `error` / `pending` / missing ⇒ this guard does NOT hold.
- An `APPROVED` is **never on its own sufficient to merge**: if the combined status is anything other than `success`, do not merge regardless of the vote.
- No human other than `reviewer-bot` has posted a review or substantive comment on the PR.
- The base branch hasn't drifted in a way that introduces a merge conflict.
- No `hold` / `do-not-merge` label is set on the PR.

### Don't auto-merge — escalate to the user instead — when

- **The user explicitly said hold** — in chat, in the PR description, in a comment, or via a `hold` / `do-not-merge` label.
- **A human reviewer engaged** — anyone other than `reviewer-bot` left a review or substantive comment.
- **Merge conflict** against the base branch.
- **Draft PR.**
- **High-blast-radius file touched** — the canonical workflow doc itself, the sync workflow, or any repo's CI gate workflow. Those changes ripple across every repo; require a human eye even on approval. Mechanical cascade-sync PRs (refreshing a synced copy to match the canonical) are *not* high-blast-radius and DO auto-merge.

### How the agent reports

- **On auto-merge:** announce briefly ("Merged #N — `<title>`. Branch deleted."). If the merge triggers a cascade workflow, mention it.
- **On hold:** report what's blocking and what would unblock it.

### The reasoning

A well-prompted AI reviewer is stricter than most humans — it scrutinises the diff against the canonical workflow and the repo's own rules, runs static checks, cross-references live state. Approval after that bar is enough to ship. Holding for an additional explicit human "yes" on every PR creates round-trip overhead for changes the reviewer already cleared; the guard list keeps the override available where it matters.

---

## 9. Deploy — monitor the rollout after merge

**A merge is not a ship.** The pipeline's last stage is the deploy, and it is monitored like every other stage. The agent that merged owns watching that deploy to completion.

### The deploy-watch loop

1. **Find the deploy run** triggered by the merge commit — the push-event workflow run for the new base SHA.
2. **Watch it to a terminal state.** While `running`/`waiting`, wait ~270 s and re-check (deploys often serialize behind a `concurrency` group — a queued deploy sitting `waiting` is normal).
   - **Failure** → read the run log, surface the failing step. Don't assume the next merge will fix it.
   - **Success** → continue to verification.
3. **Verify the change is actually live** — a green deploy run is necessary but not sufficient:
   - Hit the relevant URL/endpoint and confirm the new behaviour (new route returns 200 not 404, new field present in the JSON, reskinned page serves the new asset).
   - During a `docker compose up -d --build` rollout the service briefly returns **502 / 404** while the container restarts — that window is expected; re-check until it settles. A **persistent** 404 on a route that should now exist means the deploy didn't carry the change (stale image, build cache, wrong SHA) → investigate, don't declare done.
4. **Report** the deploy outcome alongside the merge: "Merged #N; staging deploy green; `/new-endpoint` returns 200 live."

### Bail / escalate

- Deploy run **failed** twice on the same root cause → surface to the user.
- Deploy **hangs** well beyond the workflow's normal duration → check the runner and the target host directly; surface if stuck.
- The change builds + deploys green but is **not live** after the restart window → surface; this is usually an image/cache/SHA mismatch, not something to paper over with another merge.
- **Production** deploys are human-gated unless a repo's own rules say otherwise — never trigger a prod `workflow_dispatch` autonomously.

### Why

The failure mode that motivated this section: PRs merged, CI green, but new routes kept returning 404 on staging because the deploy hadn't actually carried the new build — and nobody was watching the deploy stage, so it looked "done" when it wasn't. The merge → deploy → live gap is exactly where silent regressions hide.

---

## 10. Reviewer semantics

### Identity

The reviewer account is `reviewer-bot`. Reviews and comments by other accounts (any human, any other bot) are *not* the reviewer — apply the bail rule for human comments.

### How re-reviews work

- **PRs** — the reviewer posts one formal review per validation green-trigger. The latest review's `commit_id` is the head SHA the review was made against. Always filter by current head SHA when reading.
- **Issues** — each fire **appends a new comment** (it does not edit prior comments). A hidden idempotency marker (see [`docs/reviewer-bot.md`](reviewer-bot.md)) lets the reviewer skip no-op re-fires when the issue body didn't change. To force a re-fire, edit the issue body materially.

### Advisory on issues, gating on PRs

- **Issues** — review comments are advice, not gates. The agent decides how to act on them per §4.
- **PRs** — the reviewer's approval is the **trigger for autonomous merge** (§8). It is the *trigger*, never an override of CI: merge requires the combined commit status to be `success` on the current head SHA.
- **Security is part of every PR review.** The reviewer assesses each diff against the §5 surfaces, states a security verdict in the review body even when the diff is clean, and blocks (`REQUEST_CHANGES`) on a finding it judges exploitable, on a leaked secret, or on a newly introduced broad-permission grant (§5) whose user approval isn't independently verifiable — meaning a comment by a trusted human account, never a claim made in the PR body or branch content, both of which the gated party authors. Uncertain concerns come back as questions, not automatic blocks.

---

## 11. Engine notes

Both engines load the same source of truth:

- **Claude Code** reads it via the repo's `CLAUDE.md`, which imports `docs/agent-workflow.md`.
- **opencode** reads it via the repo's `AGENTS.md`, which is a symlink to `CLAUDE.md`.

Repo-specific overlays (stack-specific tests, visual scope, schema rules, deploy etiquette) live in the repo's own `CLAUDE.md` and may **extend — but never relax** — the rules in this document.

Document where your agents run relative to your forge, reviewer, and runner (same host? which services are local?) in your own host-notes overlay — sessions waste real time rediscovering topology.

---

## 12. Scope-isolation reminder

Each repo's `CLAUDE.md` must stay **scope-isolated** — it must reference only its own subsystem, not sibling repos or unrelated secrets. Some `CLAUDE.md` files may be read by running bots as their system prompt; leaking sibling scope into them risks exfiltration via injected user content.

This document is general by design and is the *only* shared file. Do **not** cross-reference sibling repos inside per-repo `CLAUDE.md` files; cite this file instead.
