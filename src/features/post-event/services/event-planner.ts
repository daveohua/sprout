/**
 * The follow-up event planner.
 *
 * Given the connections a user approved in the post-event review, the planner:
 *   1. groups people by shared interests (group events, not just pairs)
 *   2. intersects everyone's free calendar slots
 *   3. picks a concrete activity + venue for the group
 *
 * `EventPlanner` is the interface the rest of the app depends on. The default
 * implementation is a deterministic catalog lookup (demo-safe, offline). An
 * LLM-backed implementation can replace it later without touching the UI —
 * it just has to return the same `SproutEvent` shape.
 */

import type { AvailabilitySlot, Connection, SproutEvent, User } from "@/features/post-event/types";

import {
  activityCatalog,
  fallbackActivity,
  type ActivityTemplate,
} from "./mock-data";

export interface PlanRequest {
  /** The user whose review session just finished. */
  currentUserId: string;
  /** Connections the current user approved. */
  approvedConnections: Connection[];
  /** Profiles (interests + availability) for everyone involved. */
  users: User[];
}

export interface EventPlanner {
  planFollowUpEvents(request: PlanRequest): Promise<SproutEvent[]>;
}

/** Minimum overlap for an event to be schedulable. */
const MIN_OVERLAP_HOURS = 1;

/**
 * Intersect two sets of free slots, keeping overlaps of at least
 * `minHours` hours.
 */
export function intersectAvailability(
  a: AvailabilitySlot[],
  b: AvailabilitySlot[],
  minHours: number = MIN_OVERLAP_HOURS,
): AvailabilitySlot[] {
  const result: AvailabilitySlot[] = [];
  for (const slotA of a) {
    for (const slotB of b) {
      const start =
        new Date(slotA.start) > new Date(slotB.start)
          ? slotA.start
          : slotB.start;
      const end =
        new Date(slotA.end) < new Date(slotB.end) ? slotA.end : slotB.end;
      const overlapHours =
        (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
      if (overlapHours >= minHours) {
        result.push({ start, end });
      }
    }
  }
  return result;
}

/** Intersect the availability of a whole group of users. */
export function groupAvailability(users: User[]): AvailabilitySlot[] {
  if (users.length === 0) return [];
  return users
    .slice(1)
    .reduce(
      (acc, user) => intersectAvailability(acc, user.availability),
      users[0].availability,
    );
}

/** Interests shared by every user in the group. */
export function sharedInterests(users: User[]): string[] {
  if (users.length === 0) return [];
  return users
    .slice(1)
    .reduce(
      (acc, user) =>
        acc.filter((interest) => user.interests.includes(interest)),
      users[0].interests,
    );
}

interface CandidateGroup {
  /** The approved connections represented in this group. */
  connections: Connection[];
  /** Everyone in the group, including the current user. */
  members: User[];
  interests: string[];
  slots: AvailabilitySlot[];
}

/**
 * Build candidate groups from approved connections.
 *
 * Strategy: for each interest the current user has, gather all approved
 * matches who share it, then shrink the group until a common free slot
 * exists. Larger groups are preferred; each match is placed in at most one
 * group (their best one) so people aren't double-booked, and leftover
 * matches fall back to one-on-one events.
 */
function buildGroups(
  currentUser: User,
  matches: Map<string, { user: User; connection: Connection }>,
): CandidateGroup[] {
  const groups: CandidateGroup[] = [];
  const placed = new Set<string>();

  // Candidate groupings per interest, biggest groups first.
  const byInterest = currentUser.interests
    .map((interest) => ({
      interest,
      members: [...matches.values()].filter(({ user }) =>
        user.interests.includes(interest),
      ),
    }))
    .filter(({ members }) => members.length > 0)
    .sort((a, b) => b.members.length - a.members.length);

  for (const { members } of byInterest) {
    let candidates = members.filter(({ user }) => !placed.has(user.id));

    // Shrink the group (dropping the least-available member) until everyone
    // shares a free slot.
    while (candidates.length > 0) {
      const groupUsers = [currentUser, ...candidates.map(({ user }) => user)];
      const slots = groupAvailability(groupUsers);
      if (slots.length > 0) {
        groups.push({
          connections: candidates.map(({ connection }) => connection),
          members: groupUsers,
          interests: sharedInterests(groupUsers),
          slots,
        });
        candidates.forEach(({ user }) => placed.add(user.id));
        break;
      }
      candidates = candidates
        .slice()
        .sort((a, b) => b.user.availability.length - a.user.availability.length)
        .slice(0, -1);
    }
  }

  // Leftover pass: approved matches with no shared interest (or who were
  // dropped from every group) still get a one-on-one proposal if any time
  // overlap exists. The planner never silently drops an approved connection
  // it can schedule.
  for (const { user, connection } of matches.values()) {
    if (placed.has(user.id)) continue;
    const groupUsers = [currentUser, user];
    const slots = groupAvailability(groupUsers);
    if (slots.length > 0) {
      groups.push({
        connections: [connection],
        members: groupUsers,
        interests: sharedInterests(groupUsers),
        slots,
      });
      placed.add(user.id);
    }
  }

  return groups;
}

/**
 * Pick the catalog activity that best fits the group's shared interests.
 * Always returns something — the planner is autonomous, so a group with a
 * time overlap but no catalog match still gets a generic catch-up proposed.
 */
function chooseActivity(interests: string[]): ActivityTemplate {
  for (const interest of interests) {
    const match = activityCatalog.find(
      (activity) => activity.interest === interest,
    );
    if (match) return match;
  }
  return fallbackActivity;
}

let planCounter = 0;

/**
 * Deterministic catalog-lookup planner. Swap for an LLM-backed
 * implementation by providing another `EventPlanner`.
 */
export const lookupPlanner: EventPlanner = {
  async planFollowUpEvents({ currentUserId, approvedConnections, users }) {
    const userById = new Map(users.map((user) => [user.id, user]));
    const currentUser = userById.get(currentUserId);
    if (!currentUser) return [];

    const matches = new Map<string, { user: User; connection: Connection }>();
    for (const connection of approvedConnections) {
      const otherId = connection.userIds.find((id) => id !== currentUserId);
      const other = otherId ? userById.get(otherId) : undefined;
      if (other) matches.set(other.id, { user: other, connection });
    }

    const events: SproutEvent[] = [];
    for (const group of buildGroups(currentUser, matches)) {
      const activity = chooseActivity(group.interests);

      // Book into the earliest common slot, trimmed to the activity length.
      const slot = group.slots
        .slice()
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        )[0];
      const start = new Date(slot.start);
      const maxHours =
        (new Date(slot.end).getTime() - start.getTime()) / 3_600_000;
      const end = new Date(start);
      end.setHours(end.getHours() + Math.min(activity.durationHours, maxHours));

      const names = group.members
        .filter((member) => member.id !== currentUserId)
        .map((member) => member.name);
      const reason =
        group.interests.length > 0
          ? `you all share an interest in ${group.interests.join(", ")}`
          : "you hit it off and your calendars line up";

      events.push({
        id: `evt-${Date.now()}-${planCounter++}`,
        name: activity.name,
        description: `${activity.description}\n\nPlanned for you and ${names.join(", ")} — ${reason}.`,
        location: { name: activity.venueName, address: activity.venueAddress },
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        activityTags:
          group.interests.length > 0
            ? group.interests
            : [fallbackActivity.interest],
        attendeeIds: group.members.map((member) => member.id),
        acceptedIds: [currentUserId],
        sourceConnectionIds: group.connections.map(
          (connection) => connection.id,
        ),
        status: "proposed",
      });
    }

    return events;
  },
};
