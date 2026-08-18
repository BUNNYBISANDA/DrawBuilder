# Galle Zonal Draw Builder

A tournament draw builder for badminton events — build brackets, seed and BYE
placement, live-collaborative editing between organizers, a read-only public
"watch" link for players/parents, match scheduling with scores, and PDF
export.

Live app code lives in [`draw-builder-react/`](draw-builder-react). The repo
root also has `badminton_draw_builder.html`, an earlier single-file prototype
kept for reference — it is **not** the deployed app and is no longer
maintained (see [Legacy prototype](#legacy-prototype) below).

## How it works, end to end

1. An organizer opens the app with no `?t=` link — this creates a new
   tournament row in Supabase and rewrites the URL to `?t=<uuid>`. That URL
   *is* the edit link: anyone who has it can edit (no login).
2. `ShareBar` exposes two links to copy:
   - **Edit link** — the current URL (`?t=<uuid>`), full read/write access.
   - **Watch link** — the same id with `&view=watch` appended, which loads
     the read-only `PublicView` instead of the editor (see
     [`src/main.jsx`](draw-builder-react/src/main.jsx)).
3. All editors sharing an edit link see each other's changes live via
   Supabase Realtime, and see who else currently has the link open (presence
   avatars in the top bar).
4. Every change is written to `localStorage` immediately, independent of
   network state, so a dropped connection never loses local edits — pending
   changes are retried automatically once the network is back.

## Features

- **Multiple events per tournament** — add/edit/delete/reorder events (e.g.
  "U15 Boys Singles"), each with its own entries, seeds, BYEs and bracket.
  Events can be individually hidden from the public watch link while still
  being worked on.
- **Entries** — paste/import names in bulk (with duplicate detection), add,
  rename, reorder, remove, mark players "checked in", and shuffle entry
  order.
- **Seeding** — free-text seed list, strongest first, with optional pinned
  line numbers (`Name @ 48`) and support for doubles pairs (`A / B`).
- **BYE handling** — auto-fills BYEs in paper order, or accepts custom BYE
  line numbers; validates counts/placement against the chosen draw size.
- **Draw sizes** — auto (next power of two from entries) or a forced size
  (8/16/32/64/128/256).
- **Bracket generation & editing** — generates the full single-elimination
  bracket with seed placement and BYE auto-advance; click to advance a
  winner (with confirmation if it would clear a downstream pick), rename a
  player inline in a bracket slot (propagates to every round they appear
  in), clear a downstream result, and swap two round-1 slots ("Move BYEs").
- **Match scheduler** — a separate view per real match (BYEs excluded) to
  set status (Scheduled / In progress / Completed / Walkover / Retired),
  court, time, and best-of-3 set scores.
- **Match progress bar** — live breakdown of completed / in-progress /
  walkover / retired / scheduled matches for the active event.
- **Search** — find a player across the current bracket, with match count
  and next/previous focus navigation.
- **PDF export** — exports the bracket (32 slots per page) via
  `html2canvas` + `jsPDF`.
- **Public watch view** (`?view=watch`) — read-only bracket + scheduler for
  players/parents, live-updating, event tabs limited to events the
  organizer hasn't hidden.
- **Live collaborative editing** — see [Real-time sync](#real-time-sync--offline-behavior).
- **Offline resilience** — see [Real-time sync](#real-time-sync--offline-behavior).

## Tech stack

- **React 19 + Vite** (`draw-builder-react/`)
- **Supabase** (Postgres + Realtime) as the backend — one table, `tournaments`
- **html2canvas** + **jsPDF** for PDF export
- **oxlint** for linting
- Deployed on **Vercel** (root [`vercel.json`](vercel.json) builds the
  `draw-builder-react` subproject)

No backend server code — the browser talks to Supabase directly using the
public anon key, secured by row-level security policies (see
[Supabase setup](#supabase-setup)).

## Project layout

```
draw-builder-react/
  src/
    main.jsx              # picks App (editor) vs PublicView (?view=watch)
    App.jsx                # editor: state, sync orchestration, layout
    PublicView.jsx          # read-only live viewer
    components/
      EventTabs.jsx          # event switcher + add/edit/hide menu
      EventModal.jsx          # add/edit event metadata (category/gender/type)
      ImportPanel.jsx          # bulk-paste entries, duplicate detection
      EntriesPanel.jsx          # entries list, seeds, BYEs, draw size, generate
      BracketView.jsx            # the bracket canvas (advance/rename/swap/search)
      SchedulerView.jsx           # per-match status/court/time/scores
      MatchProgress.jsx            # progress bar for the active event
      DrawSearch.jsx                 # player search box
      ShareBar.jsx                    # sync status, editor name, presence, share links
      Footer.jsx
    utils/
      bracket.js             # bracket build/advance/rename/search logic
      layout.js                # bracket canvas geometry constants
      names.js                  # name parsing/normalizing, seed line parsing
      eventShape.js               # default event + shape normalization
      eventMeta.js                  # category presets, derived event names
      storage.js                     # localStorage read/write
      supabase.js                     # Supabase client + supabaseEnabled flag
      tournamentSync.js                # create/load/save/subscribe/presence
      editorIdentity.js                 # per-browser editor id + display name
      pdfExport.js                       # bracket -> PDF
  supabase-setup.sql        # one-time SQL to create the `tournaments` table
  .env.example                # required Supabase env vars
```

## Real-time sync & offline behavior

This is the part that took the most care, so it's worth documenting how it
actually works (see [`src/utils/tournamentSync.js`](draw-builder-react/src/utils/tournamentSync.js)
and the sync logic in [`src/App.jsx`](draw-builder-react/src/App.jsx)).

**Storage model.** Every tournament is one row in the `tournaments` table:
`{ id, data: { events, active, editor, editorId, editedAt }, updated_at }`.
The whole `data` blob is read/written as one JSON document — there's no
field-level database schema for events/players/brackets.

**Local-first writes.** Every state change is written to `localStorage`
immediately and synchronously, before anything touches the network. A
600ms-debounced push to Supabase follows. This means:
- A dropped connection, a slow network, or closing the tab mid-edit never
  loses the edit — it's already on disk.
- If the push to Supabase fails (offline, server error), the app marks
  those changes "pending sync", shows an "Offline" / "Sync error — retrying"
  status, and retries automatically every 8s and immediately when the
  browser fires its `online` event.

**Per-event conflict resolution.** Two organizers can safely edit two
*different* events in the same tournament at once. Each local change
records which event index it touched ("dirty"); when a remote update
arrives, the app merges it per event — indices with unsynced local changes
keep the local version, everything else takes the incoming version. Only a
genuinely structural conflict (someone added/removed an event while you had
unsynced changes) can't be merged this way — that's surfaced as a visible
conflict notice instead of silently picking a side.

**Protecting a field mid-edit.** A field can be *being typed into* without
having produced a committed change yet. If a remote update landed in that
gap, it could overwrite what someone was mid-keystroke on. Every editable
field (player rename, bracket-slot rename, seed list, BYE list) marks its
event as "protected" the instant it gains focus, not just when the edit is
committed — so live updates for that event are held back until the field is
blurred.

**Presence.** A separate Supabase Realtime presence channel (not the same
as the data channel) tracks who currently has the edit link open, keyed by
a stable per-browser `editorId` stored in `localStorage`. This drives the
"also editing" avatars in the top bar; it does not gate or block anyone's
editing — it's purely informational.

**Self-echo.** Every push writes `editorId` and `editor` (display name)
into the row, so when your own write echoes back over Realtime it can be
distinguished from someone else's change (used to skip the "so-and-so
updated the draw" notice for your own edits, not to skip the merge logic
itself).

## Running locally

```bash
cd draw-builder-react
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Without Supabase env vars set, `supabaseEnabled` is `false` and the app runs
in **local-only mode**: no share links, no live sync, no presence — state
just persists to `localStorage` on this one browser.

Other scripts (run from `draw-builder-react/`):

```bash
npm run build      # production build -> dist/
npm run preview    # preview the production build
npm run lint        # oxlint
```

## Supabase setup

1. Create a Supabase project.
2. Run [`draw-builder-react/supabase-setup.sql`](draw-builder-react/supabase-setup.sql)
   in the SQL editor. It creates the `tournaments` table, enables row-level
   security with public read/insert/update policies (this is a
   shareable-link model — anyone with a tournament's id can read and write
   it, there is no login), and adds the table to the `supabase_realtime`
   publication so live updates work.
3. Copy the project URL and anon public key into
   `draw-builder-react/.env.local` (see `.env.example`) for local dev, and
   into the Vercel project's environment variables (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) for production.

## Deployment

The root [`vercel.json`](vercel.json) points Vercel at the
`draw-builder-react` subproject (`npm ci` there, `npm run build`, serve
`draw-builder-react/dist`). Pushing to the deployed branch is enough; no
separate backend deploy is needed since Supabase is the entire backend.

## Legacy prototype

`badminton_draw_builder.html` at the repo root is a self-contained,
single-file version of an earlier iteration of this tool (inline CSS/JS,
XLSX import, no live sync). It predates the React rewrite and is kept only
for reference — new work should go into `draw-builder-react/`.
