# utg-prototype

pnpm / Vite+ monorepo for the UTG prototype.

| Package                 | Path                        | Description                          |
| ----------------------- | --------------------------- | ------------------------------------ |
| `@utg/game`             | `apps/game`                 | PixiJS game client (GitHub Pages)    |
| `@utg/admin`            | `apps/admin`                | React Router admin app               |
| —                       | `apps/backend`              | Django API (uv; see its README)      |
| `@utg/level-types`      | `packages/level-types`      | Level type ids and Zod props schemas |
| `@utg/letters`          | `packages/letters`          | Education/keyboard letter constants  |
| `@utg/script-converter` | `packages/script-converter` | Uyghur Arabic ↔ Latin ↔ Cyrillic     |

## Setup

```bash
vp install
```

## Develop

```bash
vp run dev:game    # game client
vp run dev:admin   # admin (needs VITE_BACKEND_URL; see apps/admin/.env.example)
```

Backend: see [`apps/backend/README.md`](apps/backend/README.md).

## Mobile

The game also ships as native iOS/Android apps via Capacitor. Each command builds the game into `apps/game/dist` first, then copies it into the native projects.

```bash
vp run cap:sync      # build + sync both native projects
vp run cap:android   # run on Android (needs ANDROID_HOME and JDK 21)
vp run cap:ios       # run on iOS (macOS only)
```

To open a native project in Android Studio or Xcode, run `vp exec cap open android` (or `ios`) in `apps/game`.

## Build

```bash
vp run build:game
vp run build:admin
```

Game production builds deploy to GitHub Pages from `apps/game/dist`.
