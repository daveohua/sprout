# Decisions log

Running log of design and scope decisions, so integration between team slices
is clean. Newest at the bottom. Format: date — decision — why — impact.

## 2026-07-04 — Git workflow

- Work happens on feature branches (`feature/post-event` for the post-event
  slice); everyone is a collaborator on `daveohua/sprout`.

## 2026-07-04 — No backend yet; mock behind service interfaces

- Team works in parallel with no shared backend. All post-event state lives
  in-memory in `src/services/mock-data.ts` and is only accessed through
  functions in `src/services/post-event.ts`.
- **Integration contract:** screens never import mock data directly. At
  integration time, replace service internals with API calls — signatures
  stay the same.

## 2026-07-04 — Shared domain types in `src/types/index.ts`

- `User { id, name, interests[], availability[] }`
- `Connection { id, userIds, originEventId, connectedAt }` — a passphrase match
- `ConnectionReview { connectionId, reviewerId, verdict, reviewedAt }`
- `SproutEvent { id, name, description, location, startTime, endTime,
  activityTags[], attendeeIds[], acceptedIds[], sourceConnectionIds[], status }`
- `CalendarItem` — one per attendee per confirmed event
- **Needs team sign-off**: profile and matching slices should adopt (or amend)
  these shapes before integration.

## 2026-07-04 — Calendar is in-app free slots; Google sync is a stretch goal

- Users mark *free* slots (`AvailabilitySlot { start, end }`, ISO 8601) rather
  than importing busy times. Matching = intersecting free slots.
- `CalendarItem` fields (summary/description/location/start/end) map 1:1 onto
  the Google Calendar API event resource so sync can be added without a
  reshape.

## 2026-07-04 — Group events, formed from mutually-reviewed connections

- Activities can match you with many people; not all of them become one big
  group. The post-event review phase (approve/decline each connection) filters
  who feeds the planner.
- Planner clusters approved matches by shared interest (largest viable group
  first), each person lands in at most one group per planning run to avoid
  double-booking; leftovers get one-on-one proposals.

## 2026-07-04 — Event planning is autonomous

- When the post-event review completes, planning triggers automatically — no
  user configuration. The planner must always figure something out for any
  approved connection with calendar overlap:
  1. shared interest + common slot → catalog activity (e.g. bouldering)
  2. common slot but no shared interest / no catalog match → fallback
     "coffee catch-up"
  3. no calendar overlap at all → no event (nothing schedulable)
- Users only accept/decline the proposals.

## 2026-07-04 — Planner is a lookup now, LLM-swappable later

- `EventPlanner` interface (`planFollowUpEvents(request) → SproutEvent[]`) in
  `src/services/event-planner.ts`; implementation is a deterministic activity
  catalog lookup. Demo-safe and offline.
- **Hackathon scope:** an LLM-backed planner is a stretch goal, wired in via
  `setPlanner()` in `post-event.ts`. Not in the demo critical path. Where the
  API key lives (backend vs client) is undecided — blocked on backend decision.

## 2026-07-04 — "Booking" means in-app confirmation

- Confirming an event = status `confirmed` + `CalendarItem` written for every
  attendee. No real venue booking in hackathon scope.
- **Demo shortcut:** with mock data, other attendees can't respond, so the
  current user accepting auto-accepts for everyone (`respondToEvent` in
  `post-event.ts`). Replace with real per-attendee responses at integration.
