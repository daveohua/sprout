import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function JoinEventScreen() {
    const router = useRouter();
    const [code, setCode] = useState("");

    const handleJoin = () => {
        if (!code.trim()) {
            Alert.alert(
                "Enter Code",
                "Please enter the event code to continue.",
            );
            return;
        }
        // Navigate to the lobby (nested in the join stack), passing along the event code
        router.push({
            pathname: "/join/lobby",
            params: { code: code.toUpperCase() },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.content}>
                    <Text style={styles.emoji}>🎉</Text>
                    <Text style={styles.title}>Join Event</Text>
                    <Text style={styles.subtitle}>
                        Enter the code to check in
                    </Text>

                    <TextInput
                        style={styles.codeInput}
                        placeholder="ABC123"
                        value={code}
                        onChangeText={(text) => setCode(text.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={8}
                        textAlign="center"
                        placeholderTextColor="#b8b8b8"
                    />

                    <TouchableOpacity
                        style={styles.joinButton}
                        onPress={handleJoin}
                    >
                        <Text style={styles.joinButtonText}>Let's Go!</Text>
                    </TouchableOpacity>

                    <Text style={styles.hint}>
                        Ask the host for the event code
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    emoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 48,
        fontWeight: "900",
        color: "#000000",
        marginBottom: 10,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 20,
        color: "#60646C",
        marginBottom: 40,
        textAlign: "center",
    },
    codeInput: {
        width: "100%",
        height: 70,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        fontSize: 32,
        fontWeight: "700",
        color: "#000000",
        letterSpacing: 8,
        marginBottom: 24,
        borderWidth: 3,
        borderColor: "#5BAD79",
    },
    joinButton: {
        width: "100%",
        height: 60,
        backgroundColor: "#5BAD79",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    joinButtonText: {
        fontSize: 24,
        fontWeight: "800",
        color: "#ffffff",
        textTransform: "uppercase",
    },
    hint: {
        fontSize: 14,
        color: "#60646C",
        textAlign: "center",
    },
});
