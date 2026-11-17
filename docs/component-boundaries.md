# Component boundaries

A component is a directory of `src`.
`src/engine/dataTypes`, `src/client` and `src/server` are components, and so is
`src/engine/testSupport`.

## An import names the component it reaches into

`package.json` maps a reference to each component:

```json
"imports": {
  "#engine/*": "./src/engine/*",
  "#client/*": "./src/client/*",
  "#server/*": "./src/server/*",
  "#testSupport/*": "./src/engine/testSupport/*"
}
```

Every import of a module of `src` uses such a reference, even an import of a
sibling module.
A relative path says where a module sits on disk.
A reference says which component it belongs to, which is what a boundary rule
has to see.
Biome therefore bans `./**` and `../**`, and it can ban a reference.

The specifier carries the extension, as in `#engine/dataTypes/cards/card.ts`.
A mapping to `*.ts` alone would not serve `src/client`, which holds `.tsx`
modules, and a mapping to a list of candidates does not help: Rollup resolves
the first entry of the list and reports a failure instead of trying the next.
One mapping per component therefore ends at `*`, and TypeScript needs
`allowImportingTsExtensions` for the extension in the specifier.

Test support reaches `src/engine/testSupport` as `#testSupport/*`.
The same directory also answers to `#engine/testSupport/*`, which Biome bans,
so the component has one name to ban.

## Test code is for tests

A production module imports neither `#testSupport/*` nor a `*.test.ts` module.
Test support exists to build values that a test compares, and a production
module that reaches for it carries test-only behaviour into the game.

`biome.json` states the ban for every file and lifts it again for `*.test.ts`
and for `src/engine/testSupport`, which build on test support by definition.
An override replaces the options of a rule instead of adding to them, so the
patterns of the ban on relative paths appear in the override as well.
