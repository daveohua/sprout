# Sprout — Project Overview

This document summarizes everything built so far during the working session,
the current state of the code, and known gaps where earlier work was reverted
or left incomplete.

> **Reading note:** A few features that were discussed and partially built were
> later reverted or cancelled (e.g. the custom Sprout landing page, the sign-up
> flow, and the push-notification wiring). Those are called out explicitly in
> the [Known Gaps](#known-gaps--discrepancies) section so this doc reflects the
> **actual current code**, not just intent.

---

## Stack & Conventions

- **Framework:** Expo SDK **57** with **Expo Router** (`~57.0.3`), file-based routing.
- **Language:** TypeScript + React 19 / React Native 0.86.
- **Routing root:** `src/app` (not the default `app/` — the project uses `src/`).
- **Navigation:** Native tabs via `expo-router/unstable-native-tabs`.
- **Safe area:** `react-native-safe-area-context` (`SafeAreaProvider` at the root).
- **Path alias:** `@/…` maps to `src/…`.

### Mental model for a React / TanStack Router / Vite developer

| Expo concept | Familiar equivalent |
| --- | --- |
| `src/app/` directory | File-based routes (like TanStack Router's route tree) |
| `src/app/_layout.tsx` | Root layout / `RouterProvider` + providers |
| `index.tsx` in a folder | The `/` route for that segment |
| `app.json` | Build + app config (broader than `vite.config.js`) |
| `assets/` | `public/` / static assets |
| Native Tabs / Stack | Router-provided navigators |

---

## Directory Structure (routes)

```
src/app/
├── _layout.tsx          # Root layout: providers + tabs
├── index.tsx            # Home tab (currently the Expo starter screen)
├── explore.tsx          # Explore tab
├── profile.tsx          # Profile tab (editable profile form)
└── join/                # "Join an event" flow (nested stack)
    ├── _layout.tsx      # Headerless Stack for the join flow
    ├── index.tsx        # Kahoot-style event code entry
    ├── lobby.tsx        # Lobby + live challenge/passphrase view
    └── post-event.tsx   # Post-event "who to keep connecting with"
```

---

## Root Layout — `src/app/_layout.tsx`

- Wraps the app in `SafeAreaProvider` and Expo Router's `ThemeProvider`
  (light/dark based on `useColorScheme`).
- Keeps the splash screen up via `SplashScreen.preventAutoHideAsync()` and
  renders `AnimatedSplashOverlay`.
- **Renders the tab bar (`AppTabs`) on all routes.** The layout keeps a
  `renderTabs` flag (currently hard-coded to `true`) plus a fallback headerless
  `Stack`, so the tab-vs-stack decision can be reintroduced later without
  restructuring.

---

## Tab Bar — `src/components/app-tabs.tsx`

Uses `NativeTabs` with four triggers:

1. **Home** → `index`
2. **Explore** → `explore`
3. **Profile** → `profile`
4. **Join** → `join`

Styling notes:

- **Translucent tab bar:** instead of a solid `backgroundColor`, the bar uses the
  iOS `blurEffect` prop — `systemChromeMaterialDark` / `systemChromeMaterialLight`
  depending on color scheme. (`blurEffect` is iOS-only; Android falls back to its
  default surface. It requires a native reload to take effect.)
- `indicatorColor` and selected `labelStyle` come from the theme `Colors`.
- The Profile tab currently reuses the **home icon** as a placeholder (no
  dedicated profile icon asset exists yet).

---

## Screens

### Home — `src/app/index.tsx`
Currently the **Expo starter/template screen** ("Welcome to Sprout" hero, get-started
hints, dev-menu tips). Uses themed components and `SafeAreaView`.

> A custom Sprout landing page with an image placeholder and a "Sign Up" button
> was built earlier in the session but is **not present** in the current file —
> see [Known Gaps](#known-gaps--discrepancies).

### Profile — `src/app/profile.tsx`
An editable profile form, wrapped in `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView`:

- **Name** (text)
- **Email** (email keyboard)
- **Location** — placeholder guides toward a **UK postcode district** style
  (e.g. `SW1`, `E1`, `N1`), auto-capitalized.
- **Interests** — tag-style input: type a word, add it as a removable chip
  (tap × to remove); duplicates are ignored.
- **Save Profile** button — validates that name + email are filled, then shows a
  confirmation alert. Persistence is a `TODO`.

Imports `expo-notifications` and `expo-device` and pulls in `useEffect`/`useRef`,
but the actual push-notification logic is **not currently wired** (see gaps).

### Explore — `src/app/explore.tsx`
Existing template screen (unchanged during the session).

---

## The "Join an Event" Flow — `src/app/join/`

A self-contained, Kahoot-style flow for checking into a live event, participating
in challenges, and reviewing connections afterward. The nested layout
(`join/_layout.tsx`) is a **headerless `Stack`**.

### 1. Code Entry — `join/index.tsx`
- Bold purple Kahoot-style screen: emoji, "Join Event" title, and a large,
  letter-spaced **code input**.
- Input auto-uppercases, max 8 chars.
- "Let's Go!" validates a non-empty code and navigates to the lobby, passing the
  uppercased `code` as a route param.

### 2. Lobby + Challenges — `join/lobby.tsx`
The heart of the flow. Two rendered states within one screen:

**Lobby (waiting) view**
- "You're in!" with an animated pulsing dot and the event `code` badge.
- Copy inviting the user to wait for challenges.
- Two **discreet corner demo buttons** (positioned with `useSafeAreaInsets` so
  they sit just below the notch/dynamic island):
  - **demo ▸** (top-left) — manually trigger the next challenge.
  - **end event ▸** (top-right) — stop challenges and go to the post-event view.
- A timer (`PROMPT_INTERVAL`, 30s) also surfaces challenges automatically.

**Challenge (prompt) view** — orange, safe-area aware, **no scrolling** (layout is
compacted to fit):
- Shows the challenge emoji + text (e.g. "Find three other people wearing orange").
- **Passphrase model (per-person):** every attendee has their **own** 3-word
  passphrase. You connect with someone by entering **their** passphrase.
  - Your own passphrase (`MY_PASSPHRASE`, 3 words) is displayed so others can add you.
  - A prompt is shared by a random group of **2–5 people** (`promptGroup`).
  - A **wordbank** of tappable chips is shown (union of group members' words +
    a few decoys, shuffled). Tap to build a 3-word entry; tap again to remove.
  - A **"X / N connected"** progress counter tracks the group.
- **Demo behavior:** matching is intentionally lenient — **any** 3-word
  combination is accepted and simply connects you with the next group member you
  haven't met yet. Each successful connect is saved (tagged with the challenge
  text via `metVia`) and the input clears for the next person.
- **Connect** enables only when exactly 3 words are selected; a **Done** button
  leaves the challenge (connections already made are kept). When you've connected
  with everyone in the group, it shows a celebratory state.

`Connection` type (exported from `lobby.tsx`): `{ id, name, emoji, metVia }`.

### 3. Post-Event — `join/post-event.tsx`
- Reached via `router.replace` from the lobby's "end event" button, so the lobby
  unmounts and its challenge timer is cleared. Receives `code` and the serialized
  `connections`.
- Header: "That's a wrap · CODE" / "Keep the vibe going".
- Renders each connected person as a **selectable card** (avatar, name, and the
  "Met via: <challenge>" tag) with a toggle checkbox and green highlight when picked.
- Footer button label is dynamic: `Connect with N` when people are selected,
  "Maybe next time" when none, and a friendly empty state ("🤷") when no
  connections were made.
- Confirming shows a summary alert and returns to `/join`. Real persistence is a `TODO`.

---

## Cross-Cutting Concerns Addressed

- **Safe area / Dynamic Island:** `SafeAreaProvider` at the root; screens use
  `SafeAreaView`; the lobby's demo buttons offset by `useSafeAreaInsets`; the
  challenge view declares explicit safe-area edges and is laid out to fit
  **without scrolling**.
- **Translucent tab bar** via iOS `blurEffect` (see Tab Bar section).
- **Expo SDK 57 correctness:** Native tabs use the `expo-router/unstable-native-tabs`
  API; tab-bar transparency uses the SDK-57-supported `blurEffect` prop rather
  than a solid background.

---

## Known Gaps & Discrepancies

These were built or discussed during the session but are **not** in the current
code (reverted, overwritten, or cancelled), or are otherwise incomplete:

1. **Custom Sprout landing page** — an earlier version of `src/app/index.tsx`
   with an image placeholder and a "Sign Up" button is gone; the file currently
   holds the Expo starter screen.
2. **Sign-up flow** — a `signup` screen (Name / Email / Password, navigating to a
   logged-in home) was created earlier but **no `signup` route exists** now.
3. **Logged-in events home** (Luma-style past-events list) — discussed/built
   earlier; not present in the current routes.
4. **Push notifications** — `profile.tsx` imports `expo-notifications` /
   `expo-device` (and `expo-notifications` was added to dependencies), but the
   `setNotificationHandler`, permission-registration, and
   `schedulePushNotification` wiring is **not present**; `handleSave` only shows
   an alert. This wiring should be re-added if notifications on save are desired.
5. **Profile icon asset** — the Profile tab uses the home icon as a placeholder.
6. **Persistence everywhere** — profile data and event connections are in-memory
   only (`TODO`s mark the save points).
7. **Passphrase strictness** — challenge matching is deliberately lenient for the
   demo (any 3 words connect). Restoring exact per-person matching is a small
   change isolated to `checkPassphrase` in `lobby.tsx`.

---

## Suggested Next Steps

- Re-establish the intended entry experience: custom landing page → sign-up →
  logged-in events home, and decide which routes should hide the tab bar.
- Reinstate push-notification wiring in `profile.tsx` (handler + permissions +
  `scheduleNotificationAsync` on save).
- Add a dedicated profile tab icon.
- Introduce a persistence layer (context/store or backend) for profile + connections.
- Add an entrance animation to the challenge view and randomize/strengthen the
  passphrase logic when moving beyond the demo.
