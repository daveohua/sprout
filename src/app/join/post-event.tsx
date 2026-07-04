import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { Connection } from "./lobby";

export default function PostEventScreen() {
  const { code, connections } = useLocalSearchParams<{
    code?: string;
    connections?: string;
  }>();
  const router = useRouter();

  const people = useMemo<Connection[]>(() => {
    if (!connections) return [];
    try {
      return JSON.parse(connections) as Connection[];
    } catch {
      return [];
    }
  }, [connections]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleConfirm = () => {
    const keep = people.filter((p) => selected[p.id]);
    // TODO: Persist selected connections / send connection requests.
    Alert.alert(
      "Connections saved",
      keep.length
        ? `You chose to keep connecting with ${keep
            .map((p) => p.name)
            .join(", ")}.`
        : "You didn't select anyone this time.",
      [{ text: "Done", onPress: () => router.replace("/join") }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>That's a wrap{code ? ` · ${code}` : ""}</Text>
        <Text style={styles.title}>Keep the vibe going</Text>
        <Text style={styles.subtitle}>
          Here are the people you met through challenges. Pick who you'd like to
          stay connected with.
        </Text>
      </View>

      {people.length === 0 ? (
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
          {people.map((person) => {
            const isSelected = !!selected[person.id];
            return (
              <TouchableOpacity
                key={person.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(person.id)}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>{person.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{person.name}</Text>
                  <Text style={styles.metVia} numberOfLines={1}>
                    Met via: {person.metVia}
                  </Text>
                </View>
                <View
                  style={[styles.checkbox, isSelected && styles.checkboxOn]}
                >
                  {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, people.length === 0 && styles.confirmSecondary]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmText}>
            {people.length === 0
              ? "Back to events"
              : selectedCount > 0
                ? `Connect with ${selectedCount}`
                : "Maybe next time"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "#26890c",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#5a2bb0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
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
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  checkboxOn: {
    backgroundColor: "#26890c",
    borderColor: "#26890c",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
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
  confirmButton: {
    height: 58,
    backgroundColor: "#26890c",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  confirmText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    textTransform: "uppercase",
  },
});
