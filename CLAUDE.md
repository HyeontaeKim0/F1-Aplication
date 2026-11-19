# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # dev server (http://localhost:3000)
npm run build   # production build
npm run start   # serve production build
npm run lint    # eslint (flat config: eslint.config.mjs)
npm run typecheck  # tsc --noEmit
npm run format  # prettier --write . (Tailwind class sorting via prettier-plugin-tailwindcss)
npm run format:check  # prettier --check .
```

No test runner is configured yet.

## Conventions

- Formatting is Prettier with default options (`.prettierrc` only adds the Tailwind plugin, pointed at `src/app/globals.css`). Run `npm run format` before finishing; don't hand-format. `eslint-config-prettier` is last in `eslint.config.mjs` to turn off conflicting rules.
- Before finishing a change, `npm run lint`, `npm run typecheck`, and `npm run format:check` should pass.
- Use the `@/*` alias for imports from `src/`.
- The user designs page routes and folder structure themselves. Don't create or move routes (`src/app/**`), component layout, or new folders on your own; ask first or follow the structure the user gives. The route/component lists in `docs/plan.md` are reference drafts, not decisions.
- Deferred lint rules (add when needed, not now): `import/order`, `@typescript-eslint/consistent-type-imports`.

## Next.js version warning

`next` is 16.4.6 with React 19.3 — newer than typical training data. `AGENTS.md` requires reading the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code, and heeding deprecation notices. Don't rely on memory of older App Router APIs.

## Architecture

- App Router under `src/app/` (`layout.tsx`, `page.tsx`, `globals.css`). Path alias `@/*` → `src/*`.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. This changes caching/rendering semantics (Cache Components model), so check the bundled docs before choosing how to fetch or cache data in a component.
- Tailwind CSS 4 is wired through Turbopack via a `*.css` rule using `@tailwindcss/turbopack` (not the PostCSS plugin). Keep that in mind when changing styling setup.
- The app is an F1 application; the project is at the scaffold stage and no data layer exists yet.

## Project scope

- Reference site: https://f1-boxbox.com/ko (Korean F1 fan site). Data source: OpenF1 (`https://api.openf1.org/v1/`).
- Phase 1: season schedule, results, standings, drivers/teams. Live features are deferred to a later phase (OpenF1 live data requires a paid plan).
- Out of scope for now: community board, news, video feed.
- OpenF1 free tier: no auth, 3 req/s and 30 req/min, historical data (2023+) only. Fetch server-side and cache; don't call it per user request.

## Subagents

Project subagents live in `.claude/agents/`: `planner` (read-only planning), `reviewer` (diff review, no edits), `frontend-dev` (UI), `api-integrator` (external F1 data API, types, caching).
