// OpenCodeuler — a "scheduler" plugin for opencode.
//
// opencode runs the agent synchronously: a tool's execute() runs to completion
// and its return value is fed straight back to the model in the same turn. There
// is no background re-invocation loop (unlike Claude Code's ScheduleWakeup), so
// the practical way to "let the model wait if it needs to" is a tool that blocks
// for a bounded interval and then returns control.
//
// Auto-loaded from ~/.config/opencode/plugin/*.ts. Adds a `wait` tool to every
// session/agent.
//
// Plugin API pin: typechecked in CI against @opencode-ai/plugin@1.18.2 (see
// .forgejo/workflows/pr-validate.yml). Bump that pin when you upgrade opencode.

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const MAX_SECONDS = 3600 // 1h hard cap so a bad value can't hang a session forever
const MIN_SECONDS = 0

/** Sleep for `ms`, resolving early (without throwing) if the session is aborted. */
function sleep(ms: number, signal: AbortSignal): Promise<"elapsed" | "aborted"> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve("aborted")
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve("elapsed")
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      resolve("aborted")
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

export const OpenCodeulerPlugin: Plugin = async () => {
  return {
    tool: {
      wait: tool({
        description:
          "Pause and wait for a fixed amount of time before continuing. Use this " +
          "when you need to let something external make progress before your next " +
          "step — e.g. waiting for a deploy/CI run, a service to come up, a rate " +
          "limit to reset, or a remote queue to drain. Blocks for the requested " +
          "duration (capped at 3600s) and then returns so you can re-check state. " +
          "It does NOT run anything during the wait; pair it with a follow-up check.",
        args: {
          seconds: tool.schema
            .number()
            .min(MIN_SECONDS)
            .describe(
              "How long to wait, in seconds. Clamped to [0, 3600]. " +
                "Pick a duration matched to how fast the thing you're waiting on changes.",
            ),
          reason: tool.schema
            .string()
            .optional()
            .describe(
              "Short note on what you're waiting for (shown to the user). " +
                "Be specific, e.g. 'CI build for PR #42' rather than 'waiting'.",
            ),
        },
        async execute(args, context) {
          const requested = Number.isFinite(args.seconds) ? args.seconds : 0
          const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, requested))
          const reason = args.reason?.trim()

          context.metadata({
            title: reason ? `wait ${seconds}s — ${reason}` : `wait ${seconds}s`,
            metadata: { seconds, requested, reason },
          })

          const startedAt = Date.now()
          const result = await sleep(seconds * 1000, context.abort)
          const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

          const clampNote =
            requested !== seconds ? ` (clamped from requested ${requested}s)` : ""
          const reasonNote = reason ? ` Reason: ${reason}.` : ""

          if (result === "aborted") {
            return `Wait interrupted after ${elapsed}s of a planned ${seconds}s${clampNote}.${reasonNote} Continuing.`
          }
          return `Waited ${seconds}s${clampNote}.${reasonNote} You may now proceed and re-check whatever you were waiting on.`
        },
      }),
    },
  }
}
