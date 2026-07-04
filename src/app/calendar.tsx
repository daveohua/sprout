import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getCalendarItems,
  getMyAvailability,
} from '@/features/post-event/services/post-event';
import type { AvailabilitySlot, CalendarItem } from '@/features/post-event/types';

/** One row in the agenda: either a free slot or a booked event. */
type AgendaEntry =
  | { kind: 'free'; start: string; end: string }
  | { kind: 'booked'; start: string; end: string; item: CalendarItem };

function buildAgenda(slots: AvailabilitySlot[], items: CalendarItem[]): AgendaEntry[] {
  const entries: AgendaEntry[] = [
    ...slots.map((slot) => ({ kind: 'free' as const, start: slot.start, end: slot.end })),
    ...items.map((item) => ({
      kind: 'booked' as const,
      start: item.start,
      end: item.end,
      item,
    })),
  ];
  return entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeRange(start: string, end: string) {
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${new Date(start).toLocaleTimeString(undefined, options)} – ${new Date(
    end,
  ).toLocaleTimeString(undefined, options)}`;
}

export default function CalendarScreen() {
  const [agenda, setAgenda] = useState<AgendaEntry[]>([]);

  // Refresh whenever the tab gains focus so events booked in the post-event
  // flow show up immediately.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getMyAvailability(), getCalendarItems()]).then(([slots, items]) => {
        if (active) setAgenda(buildAgenda(slots, items));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // Group entries by day for display.
  const byDay = new Map<string, AgendaEntry[]>();
  for (const entry of agenda) {
    const day = formatDay(entry.start);
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">My calendar</ThemedText>
          <ThemedText themeColor="textSecondary">
            Your free slots and booked sprout events.
          </ThemedText>

          {agenda.length === 0 && (
            <ThemedText themeColor="textSecondary">
              Nothing here yet — add free slots to your profile, or plan follow-ups
              from the Post-event tab.
            </ThemedText>
          )}

          {[...byDay.entries()].map(([day, entries]) => (
            <View key={day} style={styles.daySection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {day}
              </ThemedText>
              {entries.map((entry, index) =>
                entry.kind === 'booked' ? (
                  <ThemedView
                    key={`${day}-${index}`}
                    type="backgroundSelected"
                    style={styles.card}>
                    <ThemedText type="smallBold">{entry.item.summary}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatTimeRange(entry.start, entry.end)} · {entry.item.location}
                    </ThemedText>
                    <ThemedText type="small">Booked 🌱</ThemedText>
                  </ThemedView>
                ) : (
                  <ThemedView
                    key={`${day}-${index}`}
                    type="backgroundElement"
                    style={[styles.card, styles.freeCard]}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Free
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatTimeRange(entry.start, entry.end)}
                    </ThemedText>
                  </ThemedView>
                ),
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  daySection: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  freeCard: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
  },
});
