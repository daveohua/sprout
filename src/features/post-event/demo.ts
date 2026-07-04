/**
 * Demo / smoke test for the post-event slice. Runs the whole flow against
 * the mock data and prints the output:
 *
 *   npx tsx src/features/post-event/demo.ts
 */

import {
  getCalendarItems,
  getGoogleCalendarUrl,
  getPendingReviews,
  getPlannedEvents,
  optOutOfEvent,
  planFollowUps,
  resetPostEventState,
  submitReviews,
} from './services/post-event';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function main() {
  resetPostEventState();

  console.log('=== 1. Review phase: connections from the last activity ===');
  const pending = await getPendingReviews();
  for (const { connection, otherUser } of pending) {
    console.log(
      `  ${otherUser.name.padEnd(8)} interests: ${otherUser.interests.join(', ')}  (connection ${connection.id})`,
    );
  }

  // Approve everyone except Dev (no shared interests with "You" anyway,
  // but decline him to exercise the review filter).
  const verdicts = pending.map(({ connection, otherUser }) => ({
    connectionId: connection.id,
    verdict: (otherUser.name === 'Dev' ? 'declined' : 'approved') as 'approved' | 'declined',
  }));
  await submitReviews(verdicts);
  console.log(
    `\n  Verdicts: ${verdicts.map((v) => `${v.connectionId}=${v.verdict}`).join(', ')}`,
  );

  console.log('\n=== 2. Autonomous planning (auto-confirmed, opt-out) ===');
  const events = await planFollowUps();
  for (const event of events) {
    console.log(`\n  ${event.name}  [${event.status}]`);
    console.log(`    when:      ${fmt(event.startTime)} -> ${fmt(event.endTime)}`);
    console.log(`    where:     ${event.location.name}, ${event.location.address}`);
    console.log(`    attendees: ${event.attendeeIds.join(', ')}`);
    console.log(`    tags:      ${event.activityTags.join(', ')}`);
    console.log(`    why:       ${event.description.split('\n\n')[1]}`);
    console.log(`    google:    ${getGoogleCalendarUrl(event).slice(0, 100)}...`);
  }
  if (events.length === 0) console.log('  (no events planned)');

  console.log('\n=== 3. My sprout calendar ===');
  for (const item of await getCalendarItems()) {
    console.log(`  ${fmt(item.start)}  ${item.summary} @ ${item.location}`);
  }

  console.log('\n=== 4. Opt out of the first event ===');
  if (events.length > 0) {
    const updated = await optOutOfEvent(events[0].id);
    console.log(
      `  ${updated?.name}: status=${updated?.status}, remaining attendees: ${updated?.attendeeIds.join(', ') || '(none)'}`,
    );
  }

  console.log('\n=== 5. Calendar after opt-out ===');
  const after = await getCalendarItems();
  if (after.length === 0) console.log('  (empty)');
  for (const item of after) {
    console.log(`  ${fmt(item.start)}  ${item.summary} @ ${item.location}`);
  }

  console.log('\n=== 6. Final event states ===');
  for (const event of await getPlannedEvents()) {
    console.log(`  ${event.name}: ${event.status} (${event.attendeeIds.length} attending)`);
  }
}

main();
