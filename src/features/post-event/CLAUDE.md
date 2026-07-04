# sprout — post-event slice context

This folder (`src/features/post-event/`) is the **post-event slice**, owned by
Niraj on `feature/post-event`. It is self-contained so parallel team slices
(profiles, matching/passphrase) don't collide: keep all post-event code, types,
docs, and decisions inside this folder. The only files owned outside it are the
route `src/app/post-event.tsx` and the tab entries in
`src/components/app-tabs.tsx` / `app-tabs.web.tsx`.

## What the app is

A hackathon app that gets people connecting in real life. Users have a profile
(interests + in-app calendar of free slots). They get prompted with an
activity, meet someone, and confirm the connection by exchanging a passphrase.
Afterwards, the **post-event flow** (this slice) lets each user review who they
got along with, then an **autonomous planner** books follow-up group events
based on shared interests and overlapping availability — so connections
persist beyond the event.

## Slice principles

- **Autonomous planning**: when review completes, the planner always figures
  something out for any approved connection with calendar overlap. Users never
  configure anything.
- **Opt-out attendance**: planned events are auto-confirmed onto everyone's
  calendar; users actively opt out. Removing friction from connection is the
  product thesis.
- **No backend yet**: all state is in-memory mock data in
  `services/mock-data.ts`, accessed only through `services/post-event.ts`.
  Screens never import mock data directly. Service signatures are the
  integration contract — keep them stable.

## Layout

- `types.ts` — domain types (`User`, `Connection`, `ConnectionReview`,
  `SproutEvent`, `CalendarItem`). Proposed as team-wide contracts; needs
  sign-off from the profile and matching slices.
- `services/post-event.ts` — the only module screens call
- `services/event-planner.ts` — `EventPlanner` interface + `lookupPlanner`
  (deterministic catalog lookup; LLM planner is a swap-in stretch goal via
  `setPlanner()`)
- `services/mock-data.ts` — backend stand-in
- `DECISIONS.md` — log every notable design/scope decision here

## Tech conventions

- Expo SDK 57, expo-router, React Native 0.86, TypeScript strict.
- Path alias `@/*` → `src/*`.
- Styling: `StyleSheet.create` + `ThemedView`/`ThemedText` + tokens from
  `src/constants/theme.ts`. No CSS-in-JS libs.
- New routes must be added to BOTH tab files (native + web).
- Validate with `npx tsc --noEmit` and `npx expo lint` before committing.
- Hackathon scope: demoable > complete; deterministic, offline-safe demo path.
