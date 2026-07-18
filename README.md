# utg-prototype

pnpm / Vite+ monorepo for the UTG prototype.

| Package      | Path         | Description                       |
| ------------ | ------------ | --------------------------------- |
| `@utg/game`  | `apps/game`  | PixiJS game client (GitHub Pages) |
| `@utg/admin` | `apps/admin` | React Router admin app            |

## Setup

```bash
vp install
```

## Develop

```bash
vp run dev:game    # game client
vp run dev:admin   # admin (needs VITE_BACKEND_URL; see apps/admin/.env.example)
```

## Build

```bash
vp run build:game
vp run build:admin
```

Game production builds deploy to GitHub Pages from `apps/game/dist`.
