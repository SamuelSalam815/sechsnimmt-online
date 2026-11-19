# UI polish plan

This plan is for the next session. It works on the branch `client-server-model`.

Before you start:

- Read `CLAUDE.md` and `TODO.md`.
- Raise with the user each `TODO.md` entry that touches this work.

While you work:

- Do the items in order: part 1 (simplifications) first, then part 2 (UI changes).
- Commit each item when it is complete, as its own commit.
- Run `npm run format`, `npm run lint`, `npx tsc` and `npm test` before each commit.
- Do not push.
- If this plan does not decide something, ask the user before you choose. Do not guess.

You cannot see the UI in a browser. Do not say that a visual change works. In each report, tell the user what to check in the browser.

Delete this file in the last commit, when every item is done.

## Decisions that apply to every item

- Use `rem` for every size, not `em`. A size in `em` grows with each nested font size.
- Use the colors of `docs/color-palette.json` through the custom properties in `src/client/theme.css`. Add a property there when an item needs a new palette color.
- Two shared patterns. Define each one once, as a CSS class in `theme.css`:
  - **Red ring**: an inset ring in `--color-accent` (annotationRed). It shows on hover on every element that the player can click: a card in the hand, a row in the row pick, the ready button.
  - **Negative text**: `--color-header` (headerActive) fill with `--color-panel` text. It is the style of the picked card today.
- The **ink ring** has the same thickness as the red ring, in `--color-ink`.

## Part 1: simplifications

### 1.1 Styles to CSS classes

Move the inline style objects into classes in `src/client/theme.css`, in `rem`:

- `CardView` and `EmptyCardSlot` in `src/client/game/CardView.tsx`. The penalty backgrounds (panel for 1 to 3, support for 5, accent for 7) become modifier classes.
- The rows in `src/client/game/PlayArea.tsx`.
- `PenaltyTallies` in `src/client/game/PenaltyTallies.tsx`: only its CSS size moves. The view box units stay.

Inline styles cannot express `:hover`, and part 2 needs it. Do not change how the UI looks in this item.

### 1.2 One request-in-flight hook

`NamePrompt`, `RoomDisplay`, `HandArea` and `PlayArea` each repeat the same steps: a `useState` flag, a guard, set the flag, await the request, clear the flag. Replace the four copies with one hook in `src/client/connection/`.

Clear the flag in a `finally`. Today a request that throws leaves the flag set, and the control stays dead.

### 1.3 GameDisplay resolves the game

Each game component checks `session === null` and `game.phase === GamePhase.PreStart` on its own. Move both checks into `GameDisplay`. It passes the session and the `RoundGameState` (`src/engine/dataTypes/game/gameState.ts`) to its children as props. The children then drop their guards and get types that cannot be null.

### 1.4 One countdown clock

`App` and `RoomDisplay` each run a timer and keep a `now` state for the same countdown. Replace both with one hook. `App` needs a render at the end of the countdown, and `RoomDisplay` needs one at each countdown step (`COUNTDOWN_STEP_MILLISECONDS`).

## Part 2: UI changes

### 2.1 Hover on a card in the hand

When the player can click a card in the hand, hovering over it shows:

- the red ring, inset inside the card edge, so that it surrounds the tallies and the face value and the card keeps its size;
- a short lift: the card moves up a little above the line that the other cards of the hand align on.

A card that the player cannot click shows neither.

### 2.2 Row pick by a click on the row

Remove the "Take" button from `PlayArea`. During the row pick, the row picker clicks a row to take it. Hovering over a row shows the red ring around the whole row, its cards and its empty slots. The other players see no ring.

The row must still work from the keyboard: make it a `button`, or give it the role and the key handling of one.

### 2.3 Negative text header above the hand

Replace the `<h3>` with the own name in `HandArea` by a full-width bar in the negative text pattern. It holds only the own name. It separates the play area from the hand.

### 2.4 Negative text tag for ready and picked

- In the room (`src/client/room/RoomDisplay.tsx`), the name of a ready player is a tag in the negative text pattern. The name of a player who is not ready is plain ink text. The words "ready" and "not ready" go away. The "(you)" mark stays.
- In the player list of the game (`src/client/game/PlayerStatus.tsx`), the name of a player who has picked is the same tag. The word "picked" goes away.

### 2.5 Ready button

Replace the ready checkbox with a minimalist button that always reads "Ready":

- not ready: an ink outline;
- ready: the negative text pattern;
- hover: the red ring.

### 2.6 Ink ring on the cards of the last reveal

The cards that the last reveal placed get the ink ring while they are on the table. The ring goes away at the next reveal. A card that a row take removed leaves the table, and its ring goes with it.

`selectLastRevealEvents` in `src/engine/reducers/history.ts` finds the last reveal. Keep the choice of the cards in a pure function in `src/client/game/gameView.ts`, with unit tests.

### 2.7 Game log in place of the report

Replace `ReportArea` and `listReportRows` with a log of the whole game, oldest line first:

- one line for each placed card, and no line for the reveal;
- a divider at the start of each round.

```
— Round 1 —
Ada 5 takes row 1 (+3)
Ben 25 → row 2
— Round 2 —
```

Rows count from 1 in the log. "+3" is the penalty of the taken cards. The log scrolls when it is taller than its space. Build the lines in a pure function in `gameView.ts`, with unit tests that replay a projected history, as `gameView.test.ts` does.
