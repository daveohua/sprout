import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Easing,
    Modal,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

// How often a new prompt appears (ms). Kept generous so it feels occasional.
const PROMPT_INTERVAL = 30000;

// Pool of demo prompts/challenges the host might push to the crowd.
const PROMPTS = [
    { emoji: "🟠", text: "Find three other people wearing orange" },
    {
        emoji: "🎂",
        text: "Find someone whose birthday is the same month as yours",
    },
    { emoji: "🐶", text: "Group up with other dog owners" },
    {
        emoji: "✈️",
        text: "Find someone who has visited the same country as you",
    },
    { emoji: "🎸", text: "Find someone who plays an instrument" },
    { emoji: "☕", text: "Find your coffee-order twin" },
    { emoji: "🎮", text: "Team up with fellow gamers" },
    { emoji: "📚", text: "Find someone reading the same book as you" },
];

// Preseeded ice breaker questions shown after a successful connection.
// Later these could come from the host's event config or a server.
const ICE_BREAKERS = [
    "Are you a dog or cat person?",
    "What's the last show you binged?",
    "Coffee or tea — and how do you take it?",
    "What's your most controversial food opinion?",
    "If you could live anywhere for a year, where would it be?",
    "What's a skill you'd love to learn?",
    "Early bird or night owl?",
    "What's the best concert or event you've ever been to?",
];

// Every user has their OWN passphrase. To connect with someone you enter
// THEIR passphrase (they read it out). A prompt is shared by 2-5 users, so
// during one challenge you might connect with several people.
type Person = {
    id: string;
    name: string;
    emoji: string;
    passphrase: string[];
};

const PEOPLE: Person[] = [
    {
        id: "p1",
        name: "Alex Rivera",
        emoji: "🦊",
        passphrase: ["Sunset", "Tiger", "Ember"],
    },
    {
        id: "p2",
        name: "Sam Chen",
        emoji: "🐼",
        passphrase: ["Candle", "Wish", "Confetti"],
    },
    {
        id: "p3",
        name: "Jordan Blake",
        emoji: "🦉",
        passphrase: ["Fetch", "Biscuit", "Wagtail"],
    },
    {
        id: "p4",
        name: "Priya Nair",
        emoji: "🦋",
        passphrase: ["Compass", "Voyage", "Passport"],
    },
    {
        id: "p5",
        name: "Marcus Lee",
        emoji: "🐺",
        passphrase: ["Chord", "Encore", "Rhythm"],
    },
    {
        id: "p6",
        name: "Nadia Osei",
        emoji: "🦜",
        passphrase: ["Roast", "Bean", "Crema"],
    },
    {
        id: "p7",
        name: "Tom Fischer",
        emoji: "🐢",
        passphrase: ["Respawn", "Loot", "Combo"],
    },
    {
        id: "p8",
        name: "Lena Ivanova",
        emoji: "🦢",
        passphrase: ["Chapter", "Spine", "Plot"],
    },
];

// The current user's own passphrase — displayed so others can enter it.
const MY_PASSPHRASE = ["Willow", "Harbor", "Lantern"];

// Number of words in a passphrase.
const PASSPHRASE_LENGTH = 3;

// Decoy words mixed into the wordbank so matching isn't trivial.
const DECOY_WORDS = [
    "Meadow",
    "Lantern",
    "Pebble",
    "Marble",
    "Cinder",
    "Thistle",
];

function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export type Connection = {
    id: string;
    name: string;
    emoji: string;
    metVia: string;
};

export default function LobbyScreen() {
    const { code } = useLocalSearchParams<{ code?: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [activePrompt, setActivePrompt] = useState<
        (typeof PROMPTS)[number] | null
    >(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    // The group of people who share the active prompt (2-5 of them).
    const [promptGroup, setPromptGroup] = useState<Person[]>([]);
    // IDs of group members already connected with during this prompt.
    const [connectedIds, setConnectedIds] = useState<string[]>([]);
    const [entered, setEntered] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<{
        type: "error" | "success";
        message: string;
    } | null>(null);
    // Ice breaker popup shown after a successful connection.
    const [iceBreaker, setIceBreaker] = useState<{
        question: string;
        person: Connection;
    } | null>(null);
    const promptIndex = useRef(0);
    const iceBreakerIndex = useRef(0);

    // The wordbank: every word needed to spell any group member's passphrase,
    // plus a few decoys, de-duplicated and shuffled. Recomputed per prompt.
    const wordbank = useMemo(() => {
        if (promptGroup.length === 0) return [];
        const words = new Set<string>();
        promptGroup.forEach((p) => p.passphrase.forEach((w) => words.add(w)));
        shuffle(DECOY_WORDS)
            .slice(0, 3)
            .forEach((w) => words.add(w));
        return shuffle(Array.from(words));
    }, [promptGroup]);

    // Animation for the pulsing "waiting" dot in the lobby
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    const showNextPrompt = useCallback(() => {
        const next = PROMPTS[promptIndex.current % PROMPTS.length];
        promptIndex.current += 1;
        // Assign a random group of 2-5 people who share this prompt.
        const size = 2 + Math.floor(Math.random() * 4);
        setPromptGroup(shuffle(PEOPLE).slice(0, size));
        setConnectedIds([]);
        setEntered([]);
        setFeedback(null);
        setIceBreaker(null);
        setActivePrompt(next);
    }, []);

    // Tap a wordbank word to append it; tap an already-chosen word to remove it.
    const toggleWord = (word: string) => {
        setFeedback(null);
        setEntered((prev) =>
            prev.includes(word)
                ? prev.filter((w) => w !== word)
                : [...prev, word],
        );
    };

    // Check the entered passphrase and connect with a group member.
    // DEMO: any combination of PASSPHRASE_LENGTH words is accepted — it simply
    // connects with the next group member you haven't met yet.
    const checkPassphrase = () => {
        if (!activePrompt) return;

        if (entered.length !== PASSPHRASE_LENGTH) {
            setFeedback({
                type: "error",
                message: `Pick ${PASSPHRASE_LENGTH} words to make a passphrase.`,
            });
            return;
        }

        const match = promptGroup.find((p) => !connectedIds.includes(p.id));

        if (!match) {
            setFeedback({
                type: "error",
                message: "You're already connected with everyone here!",
            });
            setEntered([]);
            return;
        }

        const connection: Connection = {
            id: match.id,
            name: match.name,
            emoji: match.emoji,
            metVia: activePrompt.text,
        };
        setConnectedIds((prev) => [...prev, match.id]);
        setConnections((prev) => [...prev, connection]);
        setEntered([]);

        // Surface an ice breaker to kick off the conversation.
        const question =
            ICE_BREAKERS[iceBreakerIndex.current % ICE_BREAKERS.length];
        iceBreakerIndex.current += 1;
        setIceBreaker({ question, person: connection });
    };

    // Periodically surface a prompt to the user.
    useEffect(() => {
        const interval = setInterval(showNextPrompt, PROMPT_INTERVAL);
        return () => clearInterval(interval);
    }, [showNextPrompt]);

    // Leave the challenge and return to the lobby. Connections made via
    // passphrase are already saved, so we just reset the challenge state.
    const dismissPrompt = () => {
        setEntered([]);
        setFeedback(null);
        setIceBreaker(null);
        setPromptGroup([]);
        setConnectedIds([]);
        setActivePrompt(null);
    };

    // Ending the event stops prompts and moves the user to the post-event view.
    // Using replace so this lobby unmounts (clearing the prompt interval).
    const endEvent = () => {
        router.replace({
            pathname: "/join/post-event",
            params: {
                code: code ?? "",
                connections: JSON.stringify(connections),
            },
        });
    };

    const pulseScale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.4],
    });
    const pulseOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 0.15],
    });

    // ---- Prompt (challenge) view ----
    if (activePrompt) {
        const allConnected =
            promptGroup.length > 0 &&
            connectedIds.length === promptGroup.length;
        return (
            <SafeAreaView
                style={[styles.container, styles.promptContainer]}
                edges={["top", "left", "right", "bottom"]}
            >
                <View style={styles.promptContent}>
                    <Text style={styles.promptEmoji}>{activePrompt.emoji}</Text>
                    <Text style={styles.promptLabel}>Challenge!</Text>
                    <Text style={styles.promptText}>{activePrompt.text}</Text>

                    {/* Share your own passphrase so others can connect with you. */}
                    <View style={styles.passShareRow}>
                        <Text style={styles.passShareLabel}>
                            Your passphrase
                        </Text>
                        <Text style={styles.passShareValue}>
                            {MY_PASSPHRASE.join(" · ")}
                        </Text>
                    </View>

                    <Text style={styles.connectProgress}>
                        {connectedIds.length} / {promptGroup.length} connected
                    </Text>

                    {!allConnected ? (
                        <>
                            <Text style={styles.enterPrompt}>
                                Enter someone's 3-word passphrase to connect
                            </Text>
                            <View style={styles.enteredRow}>
                                {entered.length === 0 ? (
                                    <Text style={styles.enteredPlaceholder}>
                                        Tap the words below…
                                    </Text>
                                ) : (
                                    entered.map((word, i) => (
                                        <TouchableOpacity
                                            key={`${word}-${i}`}
                                            style={styles.enteredChip}
                                            onPress={() => toggleWord(word)}
                                        >
                                            <Text
                                                style={styles.enteredChipText}
                                            >
                                                {word}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>

                            <View style={styles.wordbank}>
                                {wordbank.map((word) => {
                                    const chosen = entered.includes(word);
                                    return (
                                        <TouchableOpacity
                                            key={word}
                                            style={[
                                                styles.wordChip,
                                                chosen && styles.wordChipChosen,
                                            ]}
                                            onPress={() => toggleWord(word)}
                                        >
                                            <Text
                                                style={[
                                                    styles.wordChipText,
                                                    chosen &&
                                                        styles.wordChipTextChosen,
                                                ]}
                                            >
                                                {word}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {feedback ? (
                                <Text
                                    style={
                                        feedback.type === "success"
                                            ? styles.passSuccessInline
                                            : styles.passError
                                    }
                                >
                                    {feedback.message}
                                </Text>
                            ) : null}

                            <View style={styles.challengeButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.connectButton,
                                        entered.length !== PASSPHRASE_LENGTH &&
                                            styles.doneButtonDisabled,
                                    ]}
                                    onPress={checkPassphrase}
                                    disabled={
                                        entered.length !== PASSPHRASE_LENGTH
                                    }
                                >
                                    <Text style={styles.doneButtonText}>
                                        Connect
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.doneButtonOutline}
                                    onPress={dismissPrompt}
                                >
                                    <Text style={styles.doneButtonOutlineText}>
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.passSuccess}>
                                🎉 You connected with everyone!
                            </Text>
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={dismissPrompt}
                            >
                                <Text style={styles.doneButtonText}>Done!</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Ice breaker popup after a successful connection */}
                <Modal
                    visible={iceBreaker !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIceBreaker(null)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            {iceBreaker ? (
                                <>
                                    <Text style={styles.iceBreakerConnected}>
                                        🎉 Connected with{" "}
                                        {iceBreaker.person.emoji}{" "}
                                        {iceBreaker.person.name}!
                                    </Text>
                                    <Text style={styles.iceBreakerLabel}>
                                        Ice breaker
                                    </Text>
                                    <Text style={styles.iceBreakerQuestion}>
                                        {iceBreaker.question}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.doneButton}
                                        onPress={() => setIceBreaker(null)}
                                    >
                                        <Text style={styles.doneButtonText}>
                                            Let's chat!
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : null}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    // ---- Lobby (waiting) view ----
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.pulseWrapper}>
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            {
                                transform: [{ scale: pulseScale }],
                                opacity: pulseOpacity,
                            },
                        ]}
                    />
                    <View style={styles.pulseCore}>
                        <Text style={styles.pulseEmoji}>🥂</Text>
                    </View>
                </View>

                <Text style={styles.title}>You're in!</Text>
                {code ? (
                    <Text style={styles.codeBadge}>Event {code}</Text>
                ) : null}
                <Text style={styles.subtitle}>
                    Hang tight — challenges will pop up during the event. Keep
                    an eye out!
                </Text>
            </View>

            {/* Discreet corner button to trigger a prompt for demo purposes */}
            <TouchableOpacity
                style={[styles.demoButton, { top: insets.top + 16 }]}
                onPress={showNextPrompt}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Text style={styles.demoButtonText}>demo ▸</Text>
            </TouchableOpacity>

            {/* Discreet corner button to end the event for demo purposes */}
            <TouchableOpacity
                style={[styles.endButton, { top: insets.top + 16 }]}
                onPress={endEvent}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <Text style={styles.demoButtonText}>end event ▸</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#46178f",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    pulseWrapper: {
        width: 160,
        height: 160,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
    },
    pulseRing: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#ffffff",
    },
    pulseCore: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#5a2bb0",
        justifyContent: "center",
        alignItems: "center",
    },
    pulseEmoji: {
        fontSize: 56,
    },
    title: {
        fontSize: 40,
        fontWeight: "900",
        color: "#ffffff",
        marginBottom: 12,
        textAlign: "center",
    },
    codeBadge: {
        fontSize: 14,
        fontWeight: "700",
        color: "#46178f",
        backgroundColor: "#ffffff",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 20,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 18,
        color: "#f2f2f2",
        textAlign: "center",
        opacity: 0.9,
        lineHeight: 26,
    },
    demoButton: {
        position: "absolute",
        left: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    endButton: {
        position: "absolute",
        right: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    demoButtonText: {
        fontSize: 12,
        color: "#f2f2f2",
        opacity: 0.6,
        fontWeight: "600",
    },
    // Prompt / challenge view
    promptContainer: {
        backgroundColor: "#ff9500", // orange to match the example challenge energy
    },
    promptContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
        paddingVertical: 16,
    },
    promptEmoji: {
        fontSize: 72,
        marginBottom: 12,
    },
    promptLabel: {
        fontSize: 18,
        fontWeight: "800",
        color: "#ffffff",
        textTransform: "uppercase",
        letterSpacing: 3,
        marginBottom: 10,
        opacity: 0.9,
    },
    promptText: {
        fontSize: 24,
        fontWeight: "900",
        color: "#ffffff",
        textAlign: "center",
        marginBottom: 16,
        lineHeight: 30,
    },
    doneButton: {
        backgroundColor: "#ffffff",
        paddingVertical: 16,
        paddingHorizontal: 50,
        borderRadius: 30,
    },
    doneButtonDisabled: {
        opacity: 0.5,
    },
    doneButtonText: {
        fontSize: 22,
        fontWeight: "800",
        color: "#ff9500",
        textTransform: "uppercase",
    },
    // Passphrase / wordbank
    passShareRow: {
        alignItems: "center",
        marginBottom: 8,
    },
    passShareLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#ffffff",
        opacity: 0.8,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 6,
    },
    passShareValue: {
        fontSize: 20,
        fontWeight: "900",
        color: "#ffffff",
        letterSpacing: 1,
    },
    enteredRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        minHeight: 40,
        marginBottom: 12,
    },
    enteredPlaceholder: {
        fontSize: 14,
        color: "#ffffff",
        opacity: 0.7,
        fontStyle: "italic",
    },
    enteredChip: {
        backgroundColor: "#ffffff",
        borderRadius: 18,
        paddingVertical: 8,
        paddingHorizontal: 14,
        margin: 4,
    },
    enteredChipText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#ff9500",
    },
    wordbank: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 16,
    },
    wordChip: {
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 16,
        margin: 5,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.7)",
    },
    wordChipChosen: {
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        borderColor: "#ffffff",
    },
    wordChipText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#ffffff",
    },
    wordChipTextChosen: {
        opacity: 0.6,
    },
    passError: {
        fontSize: 14,
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: 16,
        textAlign: "center",
    },
    passSuccess: {
        fontSize: 20,
        fontWeight: "800",
        color: "#ffffff",
        marginBottom: 24,
        textAlign: "center",
    },
    passSuccessInline: {
        fontSize: 14,
        fontWeight: "800",
        color: "#ffffff",
        marginBottom: 16,
        textAlign: "center",
    },
    connectProgress: {
        fontSize: 13,
        fontWeight: "700",
        color: "#ffffff",
        opacity: 0.85,
        letterSpacing: 1,
        marginBottom: 10,
    },
    enterPrompt: {
        fontSize: 14,
        fontWeight: "700",
        color: "#ffffff",
        opacity: 0.9,
        marginBottom: 8,
        textAlign: "center",
    },
    challengeButtons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    connectButton: {
        backgroundColor: "#ffffff",
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 30,
    },
    doneButtonOutline: {
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#ffffff",
    },
    doneButtonOutlineText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#ffffff",
        textTransform: "uppercase",
    },
    // Ice breaker popup
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    modalCard: {
        backgroundColor: "#46178f",
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 28,
        alignItems: "center",
        width: "100%",
        maxWidth: 400,
    },
    iceBreakerConnected: {
        fontSize: 18,
        fontWeight: "800",
        color: "#7bd88f",
        textAlign: "center",
        marginBottom: 20,
    },
    iceBreakerLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#ffffff",
        textTransform: "uppercase",
        letterSpacing: 3,
        marginBottom: 12,
        opacity: 0.7,
    },
    iceBreakerQuestion: {
        fontSize: 26,
        fontWeight: "900",
        color: "#ffffff",
        textAlign: "center",
        lineHeight: 34,
        marginBottom: 28,
    },
});
