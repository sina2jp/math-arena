# Math Arena v3 (v3.4)

A calm, step-by-step practice game for AMC 8 (Jan 24, 2027) and Math Kangaroo Level 3-4 (Mar 18, 2027), built as one
web page (React + esbuild). The player types a nickname on the device; nothing else about him is stored or sent.

## What's in the site folder (dist)

| File | What it is |
|---|---|
| `index.html` | The app (v3). A static poster shows while it loads. |
| `bank-<id>-1.js` … `-4.js` | The problem bank (2,057 problems + 36 guardians and 5 Comeback mini bosses, each with 4 number sets) in parts of about 1.4 MB, loaded in order by plain `<script>` tags; the names change with every bank. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installable app (Add to Home Screen) and offline play after the first visit. |
| `kit/` | The Hyrule art + music pack (fan art), packed into a few files: `kit.js` (music, sound effects, ocarina), `pack.js` (characters, bosses, items), `places/<scene>.js` (backgrounds, loaded per scene), `fonts.css` (fonts inlined), `CREDITS.md`. |
| `classic/index.html` | The previous live version, rebuilt from its source, for rollback. It still reads the old `mathArena.*` save keys. |
| `source.zip`, `source-kit-1.zip`, `source-kit-2.zip` | The full v3 source: code, build tools, tests, bank and docs in `source.zip`, the kit's pictures (`kit-src/img/`) in the `source-kit-*.zip` files. Unzip all of them into one folder. |

**Publishing:** copy everything in `dist/` to the repo root, replacing the old root files. Do **not** delete `calm/`.
Every file is under 3.5 MB (`tools/package.mjs` checks this) and there are fewer than 60 files. The packaging step also
scrubs every file (and every file inside the zips) for internal hosts, tool names and paths, and fails on any hit.
The service worker only handles its own files (and `kit/`), never `classic/` or `calm/`.

## Family Wallet (v3.4)

Math Arena now shares one wallet with Language Quest, Code Quest and Music Quest (same browser, same origin), through
`src/family-wallet.js`: one framework-free file that every family app copies unchanged (its header documents the
storage keys, the rules and the API; its unit tests run with `node test/family-wallet.test.cjs`).

- **Shards**: Math Arena earns Wisdom (Language Quest Courage, Code Quest Power, Music Quest Song). A reward costs a full
  set: by default 3 shards from each app in the set (the parent can switch to "any app", 3 per app in the set, and pick
  which apps are in the set). Claiming spends the shards and adds a ticket; a grown-up approves it with the PIN.
- **Earning in Math Arena**: every 10 active minutes on a learning screen (quests, Training camp, the Comeback, Contest
  Day; never Home, the market or settings; only while the page is visible and he tapped in the last minute; at most 6 a
  day); +2 for a finished quest (3+ answers), Training camp lesson, Comeback lesson or practice, contest round or mini
  mock; +3 for a beaten temple guardian or Comeback mini boss; +1 for a problem solved after a miss or a clue (3 a day);
  +1 per Gold Skulltula (each secret, which replaces "3 tokens = a ticket"); +1 at every 3-day streak.
- **Shared rupees**: +1 per correct answer (at most 20 per quest or practice round), +10 per finished unit, +25 per boss,
  +50 on a "Triforce Day" (shards in every app of the set that day). 3+ wrong answers within 5 seconds pause earning for
  a minute. The in-quest rupee count and the rank keep Math Arena's own lifetime total, so spending never lowers a rank.
- **The Hyrule Market** (My progress › Shop): one shared catalog of cosmetic and creative items (Home backgrounds,
  buddies, Navi colors, Hero's Room trophies, Home music, titles, and per-app items such as Math Arena arena skins).
  Math Arena's tunics and shield are still sold there. A weekly new item, "Save for this" (a goal bar on Home), the
  Hero's Room showcase, and "You can afford X!". Nothing buys a learning shortcut; nothing is random.
- **Top bar**: a mini Triforce (plus the note) with the shard counts and rupees; it opens the Treasure Wallet (Triforce
  progress, rupees, the goal, Today, Claim a reward, My tickets, and the Secrets tab, House of Skulltula).
- **Parent corner › Rewards**: the wallet settings, the reward list with costs, a ledger of the last 50 events, a weekly
  report, Mark as used and a manual adjust with a reason.
- **Migration (once)**: waiting Skulltula tokens become Wisdom shards, unspent rupees join the shared balance, and items
  bought in the old shop carry over and stay worn. Nothing is written at load when there is nothing to move.
- Code: `src/family-wallet.js` (shared), `src/wallet.jsx` (Math Arena's glue). Tests: `test/treasure-e2e.mjs`.

## Secret Treasures (v3.3)

18 hidden tokens to collect: Gold Skulltula tokens in the Hyrule look, golden beetles in Starlit Grove, gold stars in
Classic. Every N tokens (parent setting, default 3) earn one Reward Ticket for a real-world reward from the parent's list.

- **6 secrets to find** (subtle, one-time, a faint shimmer about every 20 s): a glint on the hub, three knocks on the
  Comeback host, a lost treasure at the end of the temple path, a secret ocarina song (the existing secret songs count; the
  ocarina is now in every look), three knocks on the shop sign, the Contest Day door.
- **12 secrets to achieve**: finish each of the 5 Comeback trails, beat a temple guardian with no clues, play 3 and 7
  days in a row (the longest run ever counts, so it never goes down), beat your mini-mock best, explain 10 answers in
  words, a sprint with no blanks, 20 twin problems solved. Earlier play counts (credited when the Secrets page opens or
  after the next quest, round or lesson).
- **Top bars** show a small token counter; it opens the Secrets page ("House of Skulltula"): found count, a cryptic hint for
  each unfound secret, progress bars, the next-ticket bar and My tickets.
- **A ticket**: the chest opens, he chooses a reward, then a ticket card ("… · earned in Math Arena · Show a grown-up!")
  with "Grown-up: approve", which asks for the PIN and marks it used.
- **Weekly cap**: tickets per local Sun–Sat week across all three apps stay at or under the cap; over it, tokens wait
  ("Your treasure chest is full this week. Your Skulltulas will wait for next week!").
- **Parent corner › Rewards**: edit the list (emoji + text, up to 8), tokens per ticket (1–10), weekly cap (0–14), on/off,
  every app's tickets with "Mark as used". Shared by Math Arena, Language Quest and Code Quest on this browser.
- **Shared storage** (same origin, same design in all three apps): `familyApps.rewards.v1`
  `{version:1, enabled, tokensPerTicket, weeklyCap, rewards:[{id,emoji,text}], updatedAt}` (defaults written only when
  missing, re-read before every use) and `familyApps.tickets.v1` `[{id, app:"math", rewardId, rewardText, emoji, earnedAt,
  status:"earned"|"used", usedAt}]` (read-modify-write, other apps' entries kept, newest 200). Found secrets and waiting
  tokens are in Math Arena's own save (`progress.treasures`). Code: `src/treasure.js`, `src/treasure-ui.jsx`.
- Tests: `test/treasure-unit.mjs`, `test/treasure-e2e.mjs`.

Hero names from the classic save are read whether they were stored JSON-encoded or plain; a 1–2 letter name shows, and
'""' (a skipped name) keeps "add your name" (`test/nickname-e2e.mjs`, with the v2 Realm 2 → Fire Temple save).

## Kangaroo Comeback (v3.2)

A calm, game-like section that strengthens a few contest skills, hosted by Kaepora Gaebora (in the other looks, that
look's mentor). It is generic: no scores, test details or names are in the code or content.

- **Five trails**, each with 3–4 short hands-on lessons (3 minutes or less), then 5 practice problems, then a mini boss
  (a 3-hit story problem with 4 number sets; wounds carry over like any guardian):
  - **Story Detective** (word problems): circle the question; tap-to-build rows × columns; act it out with swap tiles and a
    back-and-forth cycle strip (find the 53rd by grouping); a Roman-numeral decoder ring; work backwards with coins.
  - **Fold & Spin Lab** (spatial): fold/punch/unfold simulator (predict, then watch); gear stepper; T-block tiling by drag;
    cut-the-corner; alternating necklace checker.
  - **Impa's Logic Puzzles**: drag kids into seats with rules; people onto floors with clues; "the most anyone ate" bars.
  - **Patterns & Paths**: matchstick growing patterns (find 1 + 5n, not 6n); trace every path, then 2 × 3 = 6; magic triangle.
  - **Contest Habits**: "Trust your first answer unless you can name the mistake" (answers flip right → wrong when changed
    for no reason); "Never leave a blank: rule out, then guess"; two passes.
- Every piece works with a mouse, with touch (drag) and with tap-then-tap. Pieces are in `src/comeback/w-*.jsx`, lessons in
  `src/comeback/l-*.js`, the trail data and rules in `src/comeback/index.js`, the screens in `src/comeback/screen.jsx`.
- **Comeback meter**: first-try accuracy in the five areas now (bar) vs. at the start (thin mark); habits = rounds with no
  blanks. It never shows a mock score.
- **Mini mock**: 12 Kangaroo-style questions in 30 minutes (3/4/5 points, out of 48), weighted to the five areas; opens
  after 2 finished trails.
- **Weekly path**: for 4 weeks from the first start of v3.2 the hub's path line says "This week: Kangaroo Comeback · …"
  (word problems → spatial → logic → patterns & paths) and opens that week's trail; quests lean on that week's skills. Then
  the normal mix returns. The hub still has one main action (Start quest).
- **Training camp** shows the Kangaroo Comeback as one highlighted card at the top.
- **Parent corner › Mock tests**: type in scores from practice tests to track progress. They stay in this browser only (own
  local key: not synced, not in backups) and the player never sees them.
- **Bank**: 183 new original problems (levels 2–4, all 5-choice, each with a second, independent `verify()`) in
  `bank/families/70-72-*.mjs` with an `area` field, and 5 mini bosses in `bank/guardians-kc-*.mjs` (`cb: '<area>'`,
  never used in quests). Every new item was re-solved by independent solvers. Comeback items balance their answer letters
  with their own counters, so every older problem and guardian is byte-for-byte unchanged.
- Tests: `test/comeback-unit.mjs`, `test/comeback-e2e.mjs` (every trail, both sizes; a test-only `#cbtest` button marks a
  piece as done), `test/w-story.mjs`, `w-fold.mjs`, `w-logic.mjs`, `w-paths.mjs` (every piece with mouse, touch and tap).

## How a quest works (v3.1, after the review round)

- **One tap for "Why?"**: before Check he taps the strategy he used (Drew it, Made a list, Worked backwards, Tried the
  choices, Found a pattern, Used a rule, Other). Words are asked only after a wrong answer ("What will you check?", 3+
  words), on the guardian's final blow (4+ words), in the training camp and in the Contest Day review. The chip goes into
  the parent report.
- **Progress only goes forward on screen.** A first-try answer with no clue counts toward the next level (3 in a row).
  "Solved with help" (try 2-3, or any clue) is neutral. Two full misses in a row (every try wrong) step back one level,
  silently: the screens always show the highest temple and hearts he has reached (`progress.peak`).
- Each quest starts at his last level with a **warm-up** from one level below (ends after 2 clean solves, 4 at most).
- **Quest mix**: 40% this week's topic, 40% spiral review of earlier weeks, 20% weak spots. Missed and "solved with help"
  problems come back as **same-family twins** (new numbers and story) after about 1, 3 and 7 days; the first 1-2 problems of
  a quest can be these, with a small "Rematch" label.
- **Top bar**: a calm path-to-the-boss-door bar (no clock), rupees, temple + hearts, Pause. Pause holds sound on/off,
  "Navi, this looks wrong" (logged to the parent report) and ending early (parent PIN).
- **Guessing does not pay**: multiple choice has 2 tries, typed answers 3; rupees are 10 / 3 / 0. A wrong pick is crossed
  out with the note written for that exact choice.
- **Guardians**: the fight has no clock; landed hits stay (an escaped guardian comes back wounded); a guardian is never
  swapped; on the 3rd meeting Navi's first clue is free; every guardian has 4 number sets, so a rematch tests the method.
- **Mentor lessons** (3 minutes or less) open inside a quest when a new weekly topic begins or after 2 misses on one skill;
  each gives that mentor's item (shown in My progress).
- A speaker button reads the problem and the clues aloud (the browser's English voice).
- **Hub = one main action**: Start quest (on the weekly Contest Day, the big button is Contest Day), the path line with the
  weekly ring (3 quests a week, any days), the progress card and My progress. Training camp (with the 6 Contest Moves
  micro-lessons), Contest Day, the shop and the ocarina live in My progress; road and quest length in the parent corner.
- **Contest Day** opens at Level 2. AMC sprints grow from 10 questions / 16 min to 15 / 24 and 25 / 40 by mid-December;
  results show the personal best, the Honor goal (15 on a full AMC round) and the points lost to blanks; Kangaroo rounds
  are 24 questions scored /96 with no deduction. **Dampé's Race** (5 problems, 8 minutes, one try each) replaces the start
  of one quest a week.
- **Shop** (rupees): Goron and Zora tunics, a wooden shield, fairy colors. **Ocarina secrets**: if he plays one of the
  classic 6-note songs himself, the guide reacts and the first time gives a heart piece (the app never plays or shows them).

## Build

```
npm ci --registry https://registry.npmjs.org/      # react, react-dom, esbuild
node tools/build-bank.mjs --review                 # bank/ -> src/bankdata.js (checks every item), dist/bank-review.txt
node test/unit.mjs                                 # game rules, bank, migration, contest, path (all must pass)
node test/contest-unit.mjs && node test/shop-unit.mjs && node test/fuzz.mjs   # contest, shop/secrets, 120 simulated quests
node test/comeback-unit.mjs && node test/treasure-unit.mjs                      # Kangaroo Comeback, Secret Treasures
node tools/build.mjs                               # -> dist/ (index.html, bank-<id>.js, kit/, sw.js, icons)
```
Browser tests (need Playwright + Chromium): `test/quest-e2e.mjs` (setup, a full quest with a guardian, both screen sizes),
`test/contest-e2e.mjs` (both Contest Day formats), `test/migration-e2e.mjs` (live-build save -> v3, backup/restore, offline),
`test/sandbox-e2e.mjs` (the quest inside a sandboxed preview frame with no storage), `test/kid-e2e.mjs` (camp, shop,
progress, ocarina, parent corner, reload + second tab, Contest Day on its day), `test/shots-v31.mjs` (the v3.1 tour: three
looks, pause menu, mentor lesson, wounded guardian, weekly race, parent tips).

## Layout

| Path | What it is |
|---|---|
| `src/app.jsx` | Screens and saving. `play.jsx` quest, `contest.jsx` Contest Day, `train.jsx` training camp, `parent.jsx` parent corner, `setup.jsx` first-run grown-up setup, `screens.jsx` hub / progress / end screens, `backup.jsx` backup + install help |
| `src/logic.js`, `session.js`, `path.js`, `contest.js`, `training.js` | Pure rules (unit-tested): leveling, picking problems and guardians, the Why? checks, reports, the weekly path to contest day, contest rounds |
| `src/skin.js`, `skinart.jsx`, `skin.css`, `scene.js`, `kit.js`, `music.js` | Looks (Parent corner > Settings > Look): **Hyrule** (default, fan art), **Starlit Grove** (the kit's original world, no outside characters) and **Classic** (the original starry look with Pip). Names, art, scenes and music change; problems never do |
| `src/store.js`, `tabs.js` | Saving under `mathArena.v3.*`, migration, backups; one tab plays a quest at a time |
| `bank/` | Problems as code. `families/*.mjs` (each family = one problem shape with several number sets, answers computed in code, most with an independent `verify()`), `guardians*.mjs`, `legacy.json` (the original 105). `BANK-GUIDE.md` is the authoring guide |
| `tools/` | `build-bank.mjs` (checks + encodes the bank), `build.mjs` (bundles the site), `build-kit.mjs` (packs the kit), `verify-export.mjs` (questions without answers, for independent solvers), `bank-stats.mjs`, `fig-preview.mjs` |
| `kit-src/` | The Hyrule kit as delivered (drop 2, incl. `fallback/` = Starlit Grove). Only the files the app uses are packed into `dist/kit/` |

## Saves and migration

- v3 saves under `mathArena.v3.*` (data, running quest, nickname, mute, keypad, last backup, migration record).
- On the first start it **copies** the live game's `mathArena.data.v1`, `.active.v1`, `.nickname`, `.muted` (and `.keypad`), reads
  the copy back and checks it matches, then records `mathArena.v3.migration`. The old keys are never changed or deleted.
  The old AI key (`mathArena.aiKey`) is copied to the family key `familyApps.anthropicKey.v1` only if that is empty.
- Parent corner > Backup: download a backup file, see "last backup N days ago", restore (it shows both dates and nicknames first).
  A small dot on the Parent button means a backup is due (7 days). If the browser refuses to save, a calm note says so.
- In a sandboxed preview (no storage) the game runs from memory and says "Preview mode: progress won't be saved here."

## The rules a problem must pass (build-bank.mjs)

4 hint texts (Navi asks one question per clue; 3 clues), a check prompt, 3 guide questions, tagged wrong answers with a
message, a worked solution, no answer leaks anywhere the player sees before solving, answers computed in code
(`verify()` re-checks most families another way). Each problem has a best contest strategy (`bank/strategies.mjs`):
Navi's plan clue names it and the report shows it.

**Numeric choices are sorted smallest to largest, like the real AMC.** To keep the right letter balanced over A-E (overall
and within each family), the builder may replace at most 2 authored wrong choices with made-up values on the other side of
the answer, written in the same style, at spread-out distances, and only for exact "how many / what is" questions. Made-up
values respect limits read from the question (angles below 180°, last digits 0-9, remainders below the divisor, ranges such
as "from 1 to 25", perimeters above every side). `dist/rank-swaps.json` lists the changed problems; every changed choice set
was re-solved by independent solvers.

## Credit

Fan art inspired by The Legend of Zelda: Ocarina of Time. Not affiliated with or endorsed by Nintendo. The kit's music,
the ocarina songs and every problem are original. Fonts: SIL Open Font License (see `kit/CREDITS.md`).
