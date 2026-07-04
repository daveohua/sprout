import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import {
  getGoogleCalendarUrl,
  getPendingReviews,
  optOutOfEvent,
  planFollowUps,
  submitReviews,
} from "@/features/post-event/services/post-event";
import type { Connection, SproutEvent, User } from "@/features/post-event/types";

type Phase = "review" | "planning" | "planned";

interface PendingReview {
  connection: Connection;
  otherUser: User;
}

export default function PostEventScreen() {
  const [phase, setPhase] = useState<Phase>("review");
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [verdicts, setVerdicts] = useState<
    Record<string, "approved" | "declined">
  >({});
  const [events, setEvents] = useState<SproutEvent[]>([]);

  useEffect(() => {
    getPendingReviews().then(setPending);
  }, []);

  const setVerdict = useCallback(
    (connectionId: string, verdict: "approved" | "declined") => {
      setVerdicts((current) => ({ ...current, [connectionId]: verdict }));
    },
    [],
  );

  const finishReview = useCallback(async () => {
    setPhase("planning");
    await submitReviews(
      Object.entries(verdicts).map(([connectionId, verdict]) => ({
        connectionId,
        verdict,
      })),
    );
    const planned = await planFollowUps();
    setEvents(planned);
    setPhase("planned");
  }, [verdicts]);

  const optOut = useCallback(async (eventId: string) => {
    const updated = await optOutOfEvent(eventId);
    if (updated) {
      setEvents((current) =>
        current.map((event) =>
          event.id === updated.id ? { ...updated } : event,
        ),
      );
    }
  }, []);

  const addToGoogle = useCallback((event: SproutEvent) => {
    WebBrowser.openBrowserAsync(getGoogleCalendarUrl(event));
  }, []);

  const allReviewed =
    pending.length > 0 &&
    pending.every(({ connection }) => verdicts[connection.id]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {phase === "review" && (
            <>
              <ThemedText type="subtitle">Who did you click with?</ThemedText>
              <ThemedText themeColor="textSecondary">
                Approve the people you&apos;d like to see again. We&apos;ll plan
                something for you based on shared interests and free time.
              </ThemedText>
              {pending.map(({ connection, otherUser }) => (
                <ReviewCard
                  key={connection.id}
                  user={otherUser}
                  verdict={verdicts[connection.id]}
                  onVerdict={(verdict) => setVerdict(connection.id, verdict)}
                />
              ))}
              {pending.length === 0 && (
                <ThemedText themeColor="textSecondary">
                  No new connections to review right now.
                </ThemedText>
              )}
              <PrimaryButton
                label="Plan my follow-ups"
                disabled={!allReviewed}
                onPress={finishReview}
              />
            </>
          )}

          {phase === "planning" && (
            <ThemedText type="subtitle">Planting seeds…</ThemedText>
          )}

          {phase === "planned" && (
            <>
              <ThemedText type="subtitle">You&apos;re booked in 🌱</ThemedText>
              <ThemedText themeColor="textSecondary">
                {events.length > 0
                  ? "These are on your calendar — based on shared interests and everyone’s free slots. Can’t make one? Just opt out."
                  : "No overlapping availability found — try approving more connections or adding free slots to your calendar."}
              </ThemedText>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOptOut={optOut}
                  onAddToGoogle={addToGoogle}
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ReviewCard({
  user,
  verdict,
  onVerdict,
}: {
  user: User;
  verdict?: "approved" | "declined";
  onVerdict: (verdict: "approved" | "declined") => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{user.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {user.interests.join(" · ")}
      </ThemedText>
      <View style={styles.buttonRow}>
        <ChoiceButton
          label="Good match"
          selected={verdict === "approved"}
          onPress={() => onVerdict("approved")}
        />
        <ChoiceButton
          label="Not for me"
          selected={verdict === "declined"}
          onPress={() => onVerdict("declined")}
        />
      </View>
    </ThemedView>
  );
}

function EventCard({
  event,
  onOptOut,
  onAddToGoogle,
}: {
  event: SproutEvent;
  onOptOut: (eventId: string) => void;
  onAddToGoogle: (event: SproutEvent) => void;
}) {
  const start = new Date(event.startTime);
  const when = start.toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{event.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {when} · {event.location.name}
      </ThemedText>
      <ThemedText type="small">{event.description}</ThemedText>
      {event.status === "confirmed" && (
        <View style={styles.buttonRow}>
          <ChoiceButton
            label="Add to Google Calendar"
            onPress={() => onAddToGoogle(event)}
          />
          <ChoiceButton
            label="Can't make it"
            onPress={() => onOptOut(event.id)}
          />
        </View>
      )}
      {event.status === "cancelled" && (
        <ThemedText type="small" themeColor="textSecondary">
          You opted out
        </ThemedText>
      )}
    </ThemedView>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView
        type={selected ? "backgroundSelected" : "background"}
        style={styles.choiceButton}
      >
        <ThemedText type="small">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function PrimaryButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedView type="backgroundSelected" style={styles.primaryButton}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
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
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  choiceButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  primaryButton: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
