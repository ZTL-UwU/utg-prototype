<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Monorepo layout

```
apps/game                  — PixiJS game client (@utg/game)
apps/admin                 — React Router admin app (@utg/admin)
packages/level-types       — Level type ids, labels, and Zod props schemas (@utg/level-types)
packages/letters           — Education/keyboard letter constants (@utg/letters)
packages/script-converter  — Uyghur Arabic ↔ Latin ↔ Cyrillic (@utg/script-converter)
```

Install once at the repo root with `vp install`.

| Task        | Command                                                    |
| ----------- | ---------------------------------------------------------- |
| Game dev    | `vp run --filter @utg/game dev` or `vp run dev:game`       |
| Admin dev   | `vp run --filter @utg/admin dev` or `vp run dev:admin`     |
| Game build  | `vp run --filter @utg/game build` or `vp run build:game`   |
| Admin build | `vp run --filter @utg/admin build` or `vp run build:admin` |

Admin talks to the backend via `VITE_BACKEND_URL` (see `apps/admin/.env.example`). Backend code lives in `../utg-project-be`.

## Level types (`@utg/level-types`)

Shared source of truth for level type ids and per-type `level_props` Zod schemas. Admin UI forms stay in `@utg/admin` (`level-type-forms`); keep the Django `LevelType` allow-list in sync when adding ids.

## Letters (`@utg/letters`)

Shared Uyghur education alphabet (`EDUCATION_LETTERS`), typing key sequences (`TYPING_SEQUENCE`), and keyboard letter pool (`KEYBOARD_LETTERS`).

## Script converter (`@utg/script-converter`)

Convert between Uyghur Arabic, Latin, and Cyrillic (`convert(text, from, to)`). Ported from [Uyghur-Multi-Script-Converter](https://github.com/neouyghur/Uyghur-Multi-Script-Converter).
