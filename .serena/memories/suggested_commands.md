# Commands

- `npm run dev` — `tsx watch src/server/main.ts` (the server).
- `npm start` — production server; `npm run host` builds first.
- `npm run build` — lint, then `tsc`, then `vite build`.
- `npm test` — all tests. `npm run test:unit` excludes `*.integration.test.ts`; `npm run test:integration` runs only those.
- `npm run lint` — `biome check --error-on-warnings` (warnings fail).
- `npm run format` — `biome check --write` (format, safe lint fixes, import sort).
- `npx tsc` — type check only. Vitest does not type check, so run it for test files too.
