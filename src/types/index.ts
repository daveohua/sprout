/**
 * Shared domain types for sprout.
 *
 * These are the contracts between the profile, matching, and post-event
 * slices of the app. Keep changes coordinated with the rest of the team.
 */

/** A user of the app. Owned by the profile slice. */
export interface User {
  id: string;
  name: string;
  /** Free-form interest tags, e.g. "climbing", "board games". */
  interests: string[];
  /** Free slots in the in-app calendar. Google sync is a stretch goal. */
  availability: AvailabilitySlot[];
}

/** A block of free time in a user's in-app calendar. */
export interface AvailabilitySlot {
  /** ISO 8601 datetime. */
  start: string;
  /** ISO 8601 datetime. */
  end: string;
}

/**
 * A connection made in person during an activity, confirmed via passphrase.
 * Owned by the matching slice.
 */
export interface Connection {
  id: string;
  userIds: [string, string];
  /** The activity/event where the two users met. */
  originEventId: string;
  /** ISO 8601 datetime of when the passphrase was exchanged. */
  connectedAt: string;
}

/**
 * The post-event review of a connection: after an activity, each user
 * reviews who they got along with. Only mutually approved connections
 * feed the follow-up event planner.
 */
export interface ConnectionReview {
  connectionId: string;
  /** The user submitting the review. */
  reviewerId: string;
  verdict: 'approved' | 'declined';
  reviewedAt: string;
}

export type SproutEventStatus =
  | 'proposed' // planner has suggested it, awaiting attendee responses
  | 'confirmed' // enough attendees accepted; on everyone's calendar
  | 'cancelled'
  | 'completed';

/** Where an event takes place. */
export interface EventLocation {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

/**
 * A follow-up event planned by the system (LLM or catalog lookup) for a
 * group of mutually-approved connections.
 */
export interface SproutEvent {
  id: string;
  name: string;
  description: string;
  location: EventLocation;
  /** ISO 8601 datetime. */
  startTime: string;
  /** ISO 8601 datetime. */
  endTime: string;
  /** Interests this event satisfies, e.g. ["climbing", "fitness"]. */
  activityTags: string[];
  /** Users invited to this event. */
  attendeeIds: string[];
  /** Attendees who have accepted the proposal. */
  acceptedIds: string[];
  /** The approved connections that spawned this event. */
  sourceConnectionIds: string[];
  status: SproutEventStatus;
}

/**
 * An entry in a user's in-app sprout calendar. Shaped so it can be
 * exported to Google Calendar later (summary/description/location/start/end
 * map directly onto the Google Calendar API event resource).
 */
export interface CalendarItem {
  id: string;
  userId: string;
  eventId: string;
  summary: string;
  description: string;
  location: string;
  /** ISO 8601 datetime. */
  start: string;
  /** ISO 8601 datetime. */
  end: string;
}
