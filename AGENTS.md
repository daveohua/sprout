# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# sprout — agent context

## What the app is

A hackathon app that gets people connecting in real life. Users have a profile
(interests + in-app calendar of free slots). They get prompted with an
activity, meet someone, and confirm the connection by exchanging a passphrase.
Afterwards, the **post-event flow** lets each user review who they got along
with, then an **autonomous planner** proposes follow-up group events based on
shared interests and overlapping availability — so connections persist beyond
the event.

## Tech

- Expo SDK 57, expo-router (file-based routing in `src/app/`), React Native 0.86, TypeScript strict.
- Path alias `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- Styling: `StyleSheet.create` with `ThemedView`/`ThemedText` components and
  tokens from `src/constants/theme.ts` (`Spacing`, `Colors`, `MaxContentWidth`,
  `BottomTabInset`). No CSS-in-JS libs.
- Tabs are defined twice: `src/components/app-tabs.tsx` (native, `NativeTabs`)
  and `app-tabs.web.tsx` (web, `expo-router/ui`). New routes must be added to both.

## Project structure

- `src/app/` — routes (`index`, `explore`, `post-event`)
- `src/types/index.ts` — shared domain types; the contract between team slices
- `src/services/` — data + logic, UI never imports mock data directly:
  - `post-event.ts` — the only module screens call for the post-event flow
  - `event-planner.ts` — `EventPlanner` interface + `lookupPlanner` implementation
  - `mock-data.ts` — in-memory stand-in for the backend (none exists yet)

## Team situation

Team members work in parallel on separate slices (profiles, matching/passphrase,
post-event) with **no backend yet**. All state is in-memory mock data behind
service functions so integration later is a swap of internals, not signatures.
This branch (`feature/post-event`) owns the post-event slice.

## Working rules

- Record every notable design/scope decision in `DECISIONS.md` (see format there).
- Keep service function signatures stable; they are the integration contract.
- Validate with `npx tsc --noEmit` and `npx expo lint` before committing.
- Scope for the hackathon: demoable > complete. Prefer deterministic,
  offline-safe behavior for anything in the demo path.
