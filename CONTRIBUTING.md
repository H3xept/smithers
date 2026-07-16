# Contributing to Smithers

## Setup

Smithers is a pnpm workspace that runs on [Bun](https://bun.sh).

Prerequisites: Bun 1.3+, Node 22+, pnpm.

```sh
pnpm install --frozen-lockfile
```

## Where things live

The full package map is in [AGENTS.md](./AGENTS.md). The short version:

- `packages/` holds the runtime: workflow graph, scheduler, engine, persistence,
  gateway, agents, and the published `smithers-orchestrator` facade.
- `apps/cli` is the CLI and MCP server.
- `docs/` is the Mintlify documentation source; `examples/` has runnable workflow
  patterns; `e2e/` has real-backend suites.

## Checks

Run these before opening a PR; CI gates on all of them.

```sh
pnpm typecheck
pnpm lint
pnpm -C packages/<package> test    # one package's tests
pnpm test                          # the full suite
```

## Invariants

- A dependency or package-manifest change must refresh both `pnpm-lock.yaml` and
  `bun.lock` in the same commit. CI installs with `--frozen-lockfile`, so a stale
  pnpm lockfile reds every job.
- After editing docs, run `pnpm docs:llms` to regenerate the generated llms
  bundles and commit them; CI gates on `check-docs` and `check:llms`.
- Product code and e2e tests run against real backends and real data, not mocked
  behavior.
- New public API surface (an exported type, a component prop, a CLI flag) needs
  matching docs in the same change; `scripts/check-docs.mjs` catches drift.

## License

MIT. Contributions are accepted under the same license.
