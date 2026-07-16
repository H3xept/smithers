<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/logo/smithers-dark.svg">
    <img alt="Smithers" src="./docs/logo/smithers-light.svg" width="360">
  </picture>
</div>

<br />

<div align="center"><b>Agent workflows you can watch live, rewind, fork, and replay.</b></div>

<br />

<div align="center">
  <a href="https://www.npmjs.com/package/smithers-orchestrator"><img src="https://img.shields.io/npm/v/smithers-orchestrator?color=2563eb&label=npm" alt="npm"></a>
  <a href="https://github.com/smithersai/smithers/actions/workflows/ci.yml"><img src="https://github.com/smithersai/smithers/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-MIT-2563eb" alt="License: MIT"></a>
  <a href="https://smithers.sh"><img src="https://img.shields.io/badge/docs-smithers.sh-2563eb" alt="Docs"></a>
  <a href="https://github.com/smithersai/awesome-smithers"><img src="https://img.shields.io/badge/awesome-smithers-2563eb" alt="Awesome Smithers"></a>
</div>

<br />

**Smithers** runs your coding agent's multi-step work as durable workflows: watch every
step live, gate the risky ones behind human approvals, and rewind, fork, or replay any
run. The same workflow runs across Claude Code, Codex, Pi, AI SDK models, and remote
sandboxes.

- ✍️ **Zero config**: describe the outcome in plain English and your coding agent authors
  the workflow, then runs it. Prompting is the authoring step.
- 🛡️ **Durable**: every completed step is persisted the moment it finishes, so a run
  resumes from where it stopped instead of starting over.
- ⏪ **Time travel**: watch every step live, then rewind, fork, or replay any run from any
  point.
- 🔌 **Any agent, any model**: Claude Code, Codex, Pi, Antigravity, and more, plus any
  model through the AI SDK. Swap the harness without rewriting the workflow.
- 🙋 **Human in the loop**: an approval suspends the run durably, overnight if needed, and
  resumes it when you answer.
- 🧩 **Structure for real work**: review loops, retries, and evals produce higher-quality
  output than one-shot prompts.

*Fork a run from any earlier frame and branch an alternate timeline. Every step is a
database row, so live watching, rewind, and replay are built in.*

<img src="./docs/images/why/task-fork.gif" alt="Forking a Smithers run from an earlier frame to branch an alternate timeline" width="1032" />

## Get started

One command sets everything up. From inside your project:

```sh
bunx smithers-orchestrator init
```

`init` installs the `smithers` skill into the coding agents on your machine (Claude Code,
Pi, and more), so your agent knows how and when to use Smithers, and scaffolds
`.smithers/` with the authoring workflows `create-workflow`, `create-skill`, and
`docs-driven-development`.

Smithers is driven by your coding agent, **not** a GUI you click. Then just ask:

> *"orchestrate an agent to add rate limiting and keep iterating until the tests pass."*

Your agent picks the right workflow, starts the run, and keeps going through retries and
review loops until the work is actually done.

> [!NOTE]
> **Requirements**: [Bun](https://bun.sh) 1.3+. The CLI runs on Bun on macOS, Linux, and
> Windows.

To wire the MCP server into every detected agent too (Cursor, Copilot, Hermes, OpenClaw,
and ~20 more), run `bunx smithers-orchestrator mcp add`. See
[Agent Support](https://smithers.sh/agents/overview) for the full per-agent matrix, and
[`skills/smithers/`](./skills/smithers) for the onboarding skill itself.

## What a workflow looks like

A workflow is a JSX tree of tasks. You usually don't write these by hand: you prompt your
agent, and it writes them from the same primitives the built-in pack uses.

This is the 90-second version. The **[Tour](https://smithers.sh/tour)** is the 15-minute
version: it builds a real code-review workflow one capability at a time.

> *"implement this request and keep iterating until a reviewer signs off"*

```tsx
import { createSmithers, Loop, CodexAgent } from "smithers-orchestrator";
import { z } from "zod";

const { Workflow, Task, smithers, outputs } = createSmithers({
  input: z.object({ request: z.string() }),
  impl: z.object({ summary: z.string(), filesChanged: z.array(z.string()) }),
  review: z.object({ approved: z.boolean(), feedback: z.string() }),
});

const coder = new CodexAgent({
  model: "gpt-5.6-luna",
  config: { model_reasoning_effort: "medium" },
});
const reviewer = new CodexAgent({
  model: "gpt-5.6-sol",
  config: { model_reasoning_effort: "xhigh" },
  sandbox: "read-only",
});

export default smithers((ctx) => (
  <Workflow name="implement-reviewed">
    <Loop until={ctx.latest(outputs.review, "validate")?.approved} maxIterations={5}>
      <Task id="implement" output={outputs.impl} agent={coder}>
        {`Implement: ${ctx.input.request}
Address this reviewer feedback first: ${ctx.latest(outputs.review, "validate")?.feedback ?? "none yet"}`}
      </Task>

      <Task id="validate" output={outputs.review} agent={reviewer}>
        {`Review the working-tree changes for: ${ctx.input.request}.
Approve only when the change is correct and tested.`}
      </Task>
    </Loop>
  </Workflow>
));
```

This is the loop a one-shot agent call can't give you: implement, review, feed the
feedback back in, repeat until approved. Every iteration is persisted, so a crash mid-loop
resumes at the current iteration instead of iteration one.

The bigger version of this idea (split a request into tickets, implement them in
parallel worktrees, gate on your approval, land through a merge queue) is
[`examples/parallel-tickets.jsx`](./examples/parallel-tickets.jsx): a small engineering
team in one file.

## Durable by default

Runs survive crashes, restarts, and flaky tools because **every completed step is
persisted to SQLite the moment it finishes**. The runtime always knows what's done and
what to run next. Approvals, human questions, retries, and replay are first-class.

```text
prompt → render workflow → run task → validate output → persist to SQLite → re-render → resume · inspect · replay
```

That loop is the whole model: a task runs, its output is validated against a schema and
written down, then the workflow re-renders from persisted state to decide the next task. A
crash at any point resumes from the last write, not from the top.

*A run killed mid-task, then resumed: the completed task is skipped, the interrupted task
re-runs, the run finishes. No recovery code.*

<img src="./docs/images/why/crash-resume.gif" alt="A Smithers run is killed partway through, then resumes: the completed task is skipped, the in-flight task re-runs as a new attempt, and the run finishes" width="1032" />

```bash
bunx smithers-orchestrator up workflow.tsx --input '{"description":"Fix bug"}'
bunx smithers-orchestrator up workflow.tsx --run-id abc123 --resume true   # resume after a crash
bunx smithers-orchestrator rewind abc123 --frame 4                          # time-travel to an earlier frame
bunx smithers-orchestrator fork abc123                                      # branch an alternate timeline
bunx smithers-orchestrator replay abc123                                    # replay from a checkpoint
```

## Drive and watch your runs

Whether your agent started a run or you did, you can see exactly what's happening:

```bash
bunx smithers-orchestrator ps              # list active, paused, and recently completed runs
bunx smithers-orchestrator inspect RUN_ID  # steps, agents, approvals, and outputs for one run
bunx smithers-orchestrator logs RUN_ID     # tail the event log
bunx smithers-orchestrator chat RUN_ID     # read the agent's chat output
```

`ps` shows you what needs attention (a paused approval, a recent failure); `inspect`
drills into a single run so you can follow each step and agent as it works.

> [!TIP]
> `bunx smithers-orchestrator starters` browses plain-English starter workflows, and
> `bunx smithers-orchestrator workflow run create-workflow --prompt "add rate limiting"`
> runs the seeded workflow builder directly.

Prefer a live page over every run? `bunx smithers-orchestrator monitor` opens the Smithers
Monitor: the grouped run list, each run's execution tree with per-node status, and the
structured event stream underneath.

<img src="./docs/images/monitor/run-detail.png" alt="A finished run in the Smithers Monitor: a completed execution tree with per-node status and the live event log with agent traces and token usage" width="1032" />

## Any agent, any model

Point a task at whichever agent is best for the job, mix several in one workflow, and
switch freely. The workflow doesn't change when the model does, so a frontier model can
plan, a fast model can fan out, and a specialized harness can do the edits.

| Agent | How it runs |
| --- | --- |
| [Claude Code](./docs/integrations/cli-agents.mdx) | CLI harness |
| Codex | CLI harness |
| [Pi](./docs/integrations/pi-integration.mdx) | CLI harness |
| Antigravity | CLI harness |
| Any [AI SDK](./docs/integrations/sdk-agents.mdx) model | SDK agent, with tools, structured output, and MCP |

The same `<Sandbox>` primitive runs an agent locally (Bubblewrap, Docker) or on a
remote provider like [Freestyle](https://freestyle.sh) with no change to the workflow,
and the `SandboxProvider` interface accepts any backend you bring.

## Examples

The [`examples/`](./examples) folder has 100+ runnable workflows, one per orchestration
pattern: review loops, parallel ticket fleets, supervisors, panels, debates, migrations,
RAG citation loops, repo janitors, and dozens more. Former init starter workflows are
archived there too, under [`examples/init-pack/`](./examples/init-pack). Copy one as a
starting point.

## Also in the box

- **Approvals**: gate risky steps behind a human approve or deny before they run.
- **Isolation**: sandbox agents so edits never touch your host.
- **Observability**: Prometheus metrics and OpenTelemetry traces out of the box, plus a
  one-command local Grafana stack (`bunx smithers-orchestrator observability`).
- **Evals and prompt optimization**: repeatable regression suites, and GEPA-style tuning
  that rewrites prompts only when the score improves.
- **Hot reload**: edit prompts, config, or JSX mid-run; newly scheduled tasks pick up the
  changes.

## Documentation

Full documentation lives at **[smithers.sh](https://smithers.sh)**: the
[Tour](https://smithers.sh/tour) builds a real code-review workflow in six steps,
[How It Works](https://smithers.sh/how-it-works) explains the durable execution model, and
[Components](https://smithers.sh/components/workflow) covers the full primitive set.
Community projects, workflow packs, examples, and integrations live in
[Awesome Smithers](https://github.com/smithersai/awesome-smithers).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, the test and typecheck gates, and the
docs pipeline.

## License

MIT
