/**
 * Mock data for the post-event flow. The team is working in parallel with no
 * shared backend yet, so this stands in for whatever data layer we integrate
 * later. Everything is consumed through the service functions in
 * `post-event.ts` — screens should never import this file directly.
 */

import type { Connection, User } from "../types";

/** The signed-in user, until auth exists. */
export const CURRENT_USER_ID = "u-me";

/**
 * Availability slots are generated relative to "now" so the demo always has
 * plausible upcoming overlap regardless of when it runs.
 */
function daysFromNow(days: number, hour: number, durationHours: number) {
  const start = new Date();
  start.setDate(start.getDate() + days);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + durationHours);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const mockUsers: User[] = [
  {
    id: CURRENT_USER_ID,
    name: "You",
    interests: ["climbing", "board games", "coffee", "hiking"],
    availability: [
      daysFromNow(2, 18, 3), // evening in 2 days
      daysFromNow(4, 10, 4), // morning in 4 days
      daysFromNow(6, 12, 6), // weekend afternoon
    ],
  },
  {
    id: "u-amara",
    name: "Amara",
    interests: ["climbing", "photography", "coffee"],
    availability: [daysFromNow(2, 17, 4), daysFromNow(6, 11, 5)],
  },
  {
    id: "u-ben",
    name: "Ben",
    interests: ["board games", "cooking", "climbing"],
    availability: [daysFromNow(2, 18, 2), daysFromNow(4, 9, 3)],
  },
  {
    id: "u-chloe",
    name: "Chloe",
    interests: ["hiking", "photography", "coffee"],
    availability: [daysFromNow(6, 10, 8)],
  },
  {
    id: "u-dev",
    name: "Dev",
    interests: ["running", "cooking"],
    availability: [daysFromNow(3, 7, 2)],
  },
];

/**
 * Connections made at the last activity ("origin event") via passphrase.
 * The current user met four people; the review phase decides which of these
 * feed the follow-up planner.
 */
export const mockConnections: Connection[] = [
  {
    id: "c-1",
    userIds: [CURRENT_USER_ID, "u-amara"],
    originEventId: "e-origin-1",
    connectedAt: daysFromNow(-1, 19, 0).start,
  },
  {
    id: "c-2",
    userIds: [CURRENT_USER_ID, "u-ben"],
    originEventId: "e-origin-1",
    connectedAt: daysFromNow(-1, 19, 0).start,
  },
  {
    id: "c-3",
    userIds: [CURRENT_USER_ID, "u-chloe"],
    originEventId: "e-origin-1",
    connectedAt: daysFromNow(-1, 20, 0).start,
  },
  {
    id: "c-4",
    userIds: [CURRENT_USER_ID, "u-dev"],
    originEventId: "e-origin-1",
    connectedAt: daysFromNow(-1, 20, 0).start,
  },
];

/** A small catalog the lookup planner chooses from, keyed by interest tag. */
export interface ActivityTemplate {
  interest: string;
  name: string;
  description: string;
  venueName: string;
  venueAddress: string;
  durationHours: number;
}

/**
 * Used when a group has availability overlap but no catalog match — the
 * planner must always figure something out autonomously.
 */
export const fallbackActivity: ActivityTemplate = {
  interest: "catching up",
  name: "Coffee catch-up",
  description: "A casual coffee to keep the conversation going after you met.",
  venueName: "Northern Roast Co.",
  venueAddress: "7 Bean Street",
  durationHours: 1,
};

export const activityCatalog: ActivityTemplate[] = [
  {
    interest: "climbing",
    name: "Bouldering session",
    description:
      "An easygoing indoor bouldering session — all levels welcome, shoes available to rent.",
    venueName: "Depot Climbing",
    venueAddress: "13 Arch St, City Centre",
    durationHours: 2,
  },
  {
    interest: "board games",
    name: "Board game night",
    description:
      "A relaxed board game night with a big library of games — from quick party games to strategy epics.",
    venueName: "The Dice Box Café",
    venueAddress: "42 Meeple Lane",
    durationHours: 3,
  },
  {
    interest: "coffee",
    name: "Coffee tasting",
    description:
      "A guided cupping session at a local roastery, followed by time to chat over a brew.",
    venueName: "Northern Roast Co.",
    venueAddress: "7 Bean Street",
    durationHours: 2,
  },
  {
    interest: "hiking",
    name: "Group hike",
    description:
      "A scenic half-day hike at an easy-moderate pace, ending at a country pub.",
    venueName: "Peak Trailhead Car Park",
    venueAddress: "Hope Valley",
    durationHours: 4,
  },
  {
    interest: "photography",
    name: "Photo walk",
    description:
      "A golden-hour photo walk around the city — bring any camera, phones included.",
    venueName: "City Hall Steps",
    venueAddress: "Town Square",
    durationHours: 2,
  },
  {
    interest: "cooking",
    name: "Cooking class",
    description:
      "A hands-on group cooking class — make it together, then eat it together.",
    venueName: "The Shared Table",
    venueAddress: "3 Market Row",
    durationHours: 3,
  },
  {
    interest: "running",
    name: "Social 5k",
    description: "A no-pressure social 5k with a coffee stop at the end.",
    venueName: "Riverside Park Gates",
    venueAddress: "Riverside Park",
    durationHours: 1,
  },
];
