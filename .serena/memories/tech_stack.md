# Tech stack

- TypeScript 7 (strict, `noEmit`, target ES2022, bundler resolution), ESM.
- React 19 + react-redux 9, Redux Toolkit 2.
- Server: Express 5, pino 10, run with tsx.
- Vite 7, Vitest 5, Biome 2 (lint + format + import sort; no ESLint/Prettier).
- npm; `.npmrc` `save-exact=true` → all versions pinned exactly. Lifecycle scripts allowlisted via `allowScripts` in `package.json`.
- Node via nvm.
