/**
 * Post-event service: the single entry point the UI uses for the post-event
 * flow. Backed by in-memory mock data for now — replace the internals with
 * real API calls at integration time without changing the function
 * signatures.
 *
 * Flow:
 *   1. `getPendingReviews()` — connections from the last activity awaiting review
 *   2. `submitReviews()` — record approved/declined verdicts
 *   3. `planFollowUps()` — run the planner over approved connections.
 *      Planned events are AUTO-CONFIRMED: everyone is attending by default
 *      and calendar items are written immediately. Attendance is opt-out
 *      (`optOutOfEvent`), not opt-in — the point is to remove friction from
 *      connection.
 */

import type {
  CalendarItem,
  Connection,
  ConnectionReview,
  SproutEvent,
  User,
} from "@/features/post-event/types";

import { lookupPlanner, type EventPlanner } from "./event-planner";
import { CURRENT_USER_ID, mockConnections, mockUsers } from "./mock-data";

// ---------------------------------------------------------------------------
// In-memory state (stands in for the backend)
// ---------------------------------------------------------------------------

const reviews: ConnectionReview[] = [];
let plannedEvents: SproutEvent[] = [];
const calendarItems: CalendarItem[] = [];

/** Swappable planner implementation (lookup now, LLM later). */
let planner: EventPlanner = lookupPlanner;

export function setPlanner(customPlanner: EventPlanner) {
  planner = customPlanner;
}

// ---------------------------------------------------------------------------
// Users & connections
// ---------------------------------------------------------------------------

export function getCurrentUserId(): string {
  return CURRENT_USER_ID;
}

export async function getUser(id: string): Promise<User | undefined> {
  return mockUsers.find((user) => user.id === id);
}

export async function getUsers(ids: string[]): Promise<User[]> {
  return mockUsers.filter((user) => ids.includes(user.id));
}

/** Connections from the latest activity that the current user hasn't reviewed yet. */
export async function getPendingReviews(): Promise<
  { connection: Connection; otherUser: User }[]
> {
  const reviewedIds = new Set(
    reviews
      .filter((review) => review.reviewerId === CURRENT_USER_ID)
      .map((review) => review.connectionId),
  );

  const pending: { connection: Connection; otherUser: User }[] = [];
  for (const connection of mockConnections) {
    if (reviewedIds.has(connection.id)) continue;
    if (!connection.userIds.includes(CURRENT_USER_ID)) continue;
    const otherId = connection.userIds.find((id) => id !== CURRENT_USER_ID);
    const otherUser = mockUsers.find((user) => user.id === otherId);
    if (otherUser) pending.push({ connection, otherUser });
  }
  return pending;
}

// ---------------------------------------------------------------------------
// Review phase
// ---------------------------------------------------------------------------

export async function submitReviews(
  verdicts: { connectionId: string; verdict: ConnectionReview["verdict"] }[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const { connectionId, verdict } of verdicts) {
    reviews.push({
      connectionId,
      reviewerId: CURRENT_USER_ID,
      verdict,
      reviewedAt: now,
    });
  }
}

/** Connections the current user approved in review. */
export async function getApprovedConnections(): Promise<Connection[]> {
  const approvedIds = new Set(
    reviews
      .filter(
        (review) =>
          review.reviewerId === CURRENT_USER_ID &&
          review.verdict === "approved",
      )
      .map((review) => review.connectionId),
  );
  return mockConnections.filter((connection) => approvedIds.has(connection.id));
}

// ---------------------------------------------------------------------------
// Planning & event responses
// ---------------------------------------------------------------------------

/**
 * Run the planner over the approved connections. Every planned event is
 * confirmed immediately with all attendees accepted, and calendar items are
 * written for everyone — attending is the default.
 */
export async function planFollowUps(): Promise<SproutEvent[]> {
  const approvedConnections = await getApprovedConnections();
  const events = await planner.planFollowUpEvents({
    currentUserId: CURRENT_USER_ID,
    approvedConnections,
    users: mockUsers,
  });
  for (const event of events) {
    event.status = "confirmed";
    event.acceptedIds = [...event.attendeeIds];
    createCalendarItems(event);
  }
  plannedEvents = events;
  return events;
}

export async function getPlannedEvents(): Promise<SproutEvent[]> {
  return plannedEvents;
}

/**
 * Opt the current user out of a confirmed event (attendance is the default;
 * leaving is the action). Removes them from the attendee/accepted lists and
 * deletes their calendar item. If fewer than two attendees remain, the event
 * is cancelled outright.
 */
export async function optOutOfEvent(
  eventId: string,
): Promise<SproutEvent | undefined> {
  const event = plannedEvents.find((candidate) => candidate.id === eventId);
  if (!event) return undefined;

  event.attendeeIds = event.attendeeIds.filter((id) => id !== CURRENT_USER_ID);
  event.acceptedIds = event.acceptedIds.filter((id) => id !== CURRENT_USER_ID);

  const itemIndex = calendarItems.findIndex(
    (item) => item.eventId === eventId && item.userId === CURRENT_USER_ID,
  );
  if (itemIndex !== -1) calendarItems.splice(itemIndex, 1);

  if (event.attendeeIds.length < 2) {
    event.status = "cancelled";
  }
  return event;
}

function createCalendarItems(event: SproutEvent) {
  for (const userId of event.attendeeIds) {
    calendarItems.push({
      id: `cal-${event.id}-${userId}`,
      userId,
      eventId: event.id,
      summary: event.name,
      description: event.description,
      location: `${event.location.name}, ${event.location.address}`,
      start: event.startTime,
      end: event.endTime,
    });
  }
}

/** The current user's sprout calendar entries (Google-sync-ready shape). */
export async function getCalendarItems(): Promise<CalendarItem[]> {
  return calendarItems.filter((item) => item.userId === CURRENT_USER_ID);
}

/** Format an ISO datetime as the compact UTC form Google Calendar links expect. */
function toGoogleCalendarDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, "");
}

/**
 * Build a Google Calendar "add event" URL for an event. No OAuth or API key
 * needed — opening the link lets the user import the event into their own
 * Google Calendar in one tap. Full two-way sync is a stretch goal.
 */
export function getGoogleCalendarUrl(event: SproutEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    details: event.description,
    location: `${event.location.name}, ${event.location.address}`,
    dates: `${toGoogleCalendarDate(event.startTime)}/${toGoogleCalendarDate(event.endTime)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Reset all in-memory state — handy for demos and tests. */
export function resetPostEventState() {
  reviews.length = 0;
  plannedEvents = [];
  calendarItems.length = 0;
}
