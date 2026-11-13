<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

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
apps/backend               — Django + Django Ninja API (Python, uv; not a pnpm workspace package)
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

Admin talks to the backend via `VITE_BACKEND_URL` (see `apps/admin/.env.example`).

## Mobile (Capacitor, `apps/game`)

The game ships as native iOS/Android apps via Capacitor (`apps/game/capacitor.config.ts`, native projects in `apps/game/android` and `apps/game/ios`). Each command builds the web app into `dist/` first, then copies it into the native projects.

| Task               | Command                                     |
| ------------------ | ------------------------------------------- |
| Build + sync both  | `vp run cap:sync`                           |
| Run on Android     | `vp run cap:android`                        |
| Run on iOS (macOS) | `vp run cap:ios`                            |
| Open in native IDE | `vp exec cap open android` (in `apps/game`) |

Android needs `ANDROID_HOME` set and JDK 21 for Gradle.

Phones are portrait-only and fullscreen: the native apps lock orientation, and phone browsers get a rotate prompt. Every phone lays out at a logical width of 768, so fixed values behave the same across them.

- Pixi: use `responsive({ sm: 100, lg: 300 })` (`src/engine/utils/viewport.ts`). It has Tailwind's breakpoints and mobile-first rules, `sm` also covers narrower screens, and `lg` is the switch to the landscape layouts. Call it inside `resize` to follow size changes.
- A keyboard inside a scaled stage uses `resizeToScreen`; popups scale with `layoutPopup` (`src/app/ui/layout-popup.ts`); `safeAreaInsets()` keeps controls clear of the notch and home indicator.
- React: use Tailwind's own `max-sm:` classes.
- `VITE_NATIVE_DEBUG="true"` shows the on-screen startup log in native builds, which have no reachable console.

## Backend (`apps/backend`)

Django app managed with `uv`, not `vp`; it's excluded from Vite+ fmt/lint. Run commands from `apps/backend` — see its `README.md` for setup and env vars.

| Task       | Command (in `apps/backend`)                                |
| ---------- | ---------------------------------------------------------- |
| Install    | `uv sync`                                                  |
| Dev server | `uv run python manage.py runserver`                        |
| Checks     | `uv run ruff check .`, `uv run ruff format --check .`      |
| Migrations | `uv run python manage.py makemigrations --check --dry-run` |

## Game URLs (`apps/game/src/router`)

Every game screen has a URL, in dev and prod. Screens keep navigating with `navigation.showScreen(Screen, props)`; the router writes the URL from the route table and rebuilds the screen from the URL on load or Back/Forward.

- New screen: add a `defineRoute` entry to `routes.ts` (dev logs a warning for screens without one).
- New level type: nothing to do; `/:layer/levels/:id/play` covers everything in `LEVEL_TYPE_SCREENS`.
- Hosting must serve `index.html` for unknown paths (`vercel.json` does).

## Game i18n (Paraglide, `apps/game`)

English is the base locale; Turkish (`tr`) is the only other one so far. Messages live in `apps/game/messages/{locale}.json` and compile to `src/paraglide` (gitignored), which the Vite plugin and `vp run i18n` regenerate.

- Use `m.some_key()` from `src/paraglide/messages.js` for English UI text. Never translate Uyghur content: letters, words, sentences, subtitles, script names in their own script.
- Switching language reloads the page, so Pixi text built once at construction is fine.
- Unit titles come translated from the backend's `translations` table (`title_translations` on unit responses); the game picks `getLocale()` and falls back to `title`.

## Level types (`@utg/level-types`)

Shared source of truth for level type ids and per-type `level_props` Zod schemas. Admin UI forms stay in `@utg/admin` (`level-type-forms`); keep the Django `LevelType` allow-list (`apps/backend/apps/game/models.py`) in sync when adding ids.

## Letters (`@utg/letters`)

Shared Uyghur education alphabet (`EDUCATION_LETTERS`), typing key sequences (`TYPING_SEQUENCE`), and keyboard letter pool (`KEYBOARD_LETTERS`).

## Script converter (`@utg/script-converter`)

Convert between Uyghur Arabic, Latin, and Cyrillic (`convert(text, from, to)`). Ported from [Uyghur-Multi-Script-Converter](https://github.com/neouyghur/Uyghur-Multi-Script-Converter).
