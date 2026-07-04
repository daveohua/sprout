import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getGoogleCalendarUrl,
  getPendingReviews,
  optOutOfEvent,
  planFollowUps,
  seedConnectionsFromLobby,
  submitReviews,
} from "@/features/post-event/services/post-event";
import type {
  Connection,
  SproutEvent,
  User,
} from "@/features/post-event/types";

import type { Connection as LobbyConnection } from "./lobby";

type Phase = "review" | "planning" | "planned";

interface PendingReview {
  connection: Connection;
  otherUser: User;
  emoji?: string;
  metVia?: string;
}

export default function PostEventScreen() {
  const { code, connections } = useLocalSearchParams<{
    code?: string;
    connections?: string;
  }>();
  const router = useRouter();

  const lobbyPeople = useMemo<LobbyConnection[]>(() => {
    if (!connections) return [];
    try {
      return JSON.parse(connections) as LobbyConnection[];
    } catch {
      return [];
    }
  }, [connections]);

  const [phase, setPhase] = useState<Phase>("review");
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [verdicts, setVerdicts] = useState<
    Record<string, "approved" | "declined">
  >({});
  const [events, setEvents] = useState<SproutEvent[]>([]);

  // Seed the post-event service with the connections we made in the lobby,
  // then load them back as the review backlog.
  useEffect(() => {
    seedConnectionsFromLobby(
      lobbyPeople.map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        metVia: p.metVia,
      })),
    );
    getPendingReviews().then((backlog) => {
      const byLobbyId = new Map(lobbyPeople.map((p) => [p.id, p]));
      setPending(
        backlog.map((entry) => {
          // Synthetic ids are prefixed with `u-lobby-` in the service.
          const lobbyId = entry.otherUser.id.replace(/^u-lobby-/, "");
          const original = byLobbyId.get(lobbyId);
          return {
            ...entry,
            emoji: original?.emoji,
            metVia: original?.metVia,
          };
        }),
      );
    });
  }, [lobbyPeople]);

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

  const finish = useCallback(() => {
    router.replace("/join");
  }, [router]);

  const allReviewed =
    pending.length > 0 &&
    pending.every(({ connection }) => verdicts[connection.id]);

  const approvedCount = Object.values(verdicts).filter(
    (v) => v === "approved",
  ).length;

  const eyebrow = `That's a wrap${code ? ` · ${code}` : ""}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>
          {phase === "review"
            ? "Keep the vibe going"
            : phase === "planning"
              ? "Planting seeds…"
              : "You're booked in 🌱"}
        </Text>
        <Text style={styles.subtitle}>
          {phase === "review"
            ? "Approve the people you'd like to see again. We'll plan something for you based on shared interests and free time."
            : phase === "planning"
              ? "Finding shared interests and matching your free slots…"
              : events.length > 0
                ? "These are on your calendar. Can't make one? Just opt out."
                : "No overlapping availability found — approve more next time or add free slots to your calendar."}
        </Text>
      </View>

      {phase === "review" && pending.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🤷</Text>
          <Text style={styles.emptyText}>
            You didn't connect with anyone this time. Jump into the next event
            to meet people!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {phase === "review" &&
            pending.map(({ connection, otherUser, emoji, metVia }) => (
              <ReviewCard
                key={connection.id}
                name={otherUser.name}
                interests={otherUser.interests}
                emoji={emoji}
                metVia={metVia}
                verdict={verdicts[connection.id]}
                onVerdict={(v) => setVerdict(connection.id, v)}
              />
            ))}

          {phase === "planned" && events.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyText}>
                Nothing to plan yet. Approve more connections or add free slots
                and try again.
              </Text>
            </View>
          )}

          {phase === "planned" &&
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onOptOut={optOut}
                onAddToGoogle={addToGoogle}
              />
            ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {phase === "review" && (
          <TouchableOpacity
            style={[
              styles.primary,
              (!allReviewed || pending.length === 0) && styles.primarySecondary,
            ]}
            onPress={pending.length === 0 ? finish : finishReview}
            disabled={pending.length > 0 && !allReviewed}
          >
            <Text style={styles.primaryText}>
              {pending.length === 0
                ? "Back to events"
                : approvedCount > 0
                  ? `Plan follow-ups (${approvedCount})`
                  : allReviewed
                    ? "Maybe next time"
                    : "Review everyone to continue"}
            </Text>
          </TouchableOpacity>
        )}
        {phase === "planned" && (
          <TouchableOpacity style={styles.primary} onPress={finish}>
            <Text style={styles.primaryText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function ReviewCard({
  name,
  interests,
  emoji,
  metVia,
  verdict,
  onVerdict,
}: {
  name: string;
  interests: string[];
  emoji?: string;
  metVia?: string;
  verdict?: "approved" | "declined";
  onVerdict: (verdict: "approved" | "declined") => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{emoji ?? "🌱"}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name}>{name}</Text>
          {metVia ? (
            <Text style={styles.metVia} numberOfLines={1}>
              Met via: {metVia}
            </Text>
          ) : null}
          {interests.length > 0 ? (
            <Text style={styles.interests} numberOfLines={1}>
              {interests.join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.buttonRow}>
        <VerdictChip
          label="Good match"
          tone="approve"
          selected={verdict === "approved"}
          onPress={() => onVerdict("approved")}
        />
        <VerdictChip
          label="Not for me"
          tone="decline"
          selected={verdict === "declined"}
          onPress={() => onVerdict("declined")}
        />
      </View>
    </View>
  );
}

function VerdictChip({
  label,
  tone,
  selected,
  onPress,
}: {
  label: string;
  tone: "approve" | "decline";
  selected?: boolean;
  onPress: () => void;
}) {
  const selectedStyle =
    tone === "approve" ? styles.chipApprove : styles.chipDecline;
  return (
    <TouchableOpacity
      style={[styles.chip, selected && selectedStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
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
  const cancelled = event.status === "cancelled";

  return (
    <View style={[styles.card, cancelled && styles.cardMuted]}>
      <Text style={styles.name}>{event.name}</Text>
      <Text style={styles.when}>
        {when} · {event.location.name}
      </Text>
      <Text style={styles.description}>{event.description}</Text>
      {cancelled ? (
        <Text style={styles.cancelled}>You opted out</Text>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => onAddToGoogle(event)}
            activeOpacity={0.8}
          >
            <Text style={styles.chipText}>Add to Google Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => onOptOut(event.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.chipText}>Can't make it</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#46178f",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f2f2f2",
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#f2f2f2",
    opacity: 0.9,
    lineHeight: 23,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 10,
  },
  cardMuted: {
    opacity: 0.55,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5a2bb0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  cardBody: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  metVia: {
    fontSize: 13,
    color: "#f2f2f2",
    opacity: 0.7,
  },
  interests: {
    fontSize: 13,
    color: "#f2f2f2",
    opacity: 0.9,
    marginTop: 2,
  },
  when: {
    fontSize: 13,
    color: "#f2f2f2",
    opacity: 0.85,
  },
  description: {
    fontSize: 14,
    color: "#f2f2f2",
    opacity: 0.9,
    lineHeight: 20,
  },
  cancelled: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f2f2f2",
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipApprove: {
    backgroundColor: "#26890c",
  },
  chipDecline: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#f2f2f2",
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 23,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  primary: {
    height: 58,
    backgroundColor: "#26890c",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primarySecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  primaryText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },
});
