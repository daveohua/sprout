import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [expoPushToken, setExpoPushToken] = useState("");
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token || ""),
    );

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      setInterestInput("");
      return;
    }
    setInterests([...interests, trimmed]);
    setInterestInput("");
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert("Missing Information", "Please fill in your name and email.");
      return;
    }
    // TODO: Persist profile data
    Alert.alert("Profile Saved", "Your profile has been updated.");

    // Trigger a local push notification
    await schedulePushNotification();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header}>Profile</Text>
          <Text style={styles.subtitle}>Tell us a bit about yourself.</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SW1, E1, N1"
            value={location}
            onChangeText={setLocation}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Interests</Text>
          <View style={styles.tagsContainer}>
            {interests.map((interest) => (
              <View key={interest} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
                <TouchableOpacity
                  onPress={() => removeInterest(interest)}
                  style={styles.tagClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.tagCloseText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Type an interest and press add"
            value={interestInput}
            onChangeText={setInterestInput}
            onSubmitEditing={addInterest}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addTagButton} onPress={addInterest}>
            <Text style={styles.addTagButtonText}>+ Add Interest</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#343a40",
    marginTop: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6c757d",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    width: "100%",
    height: 48,
    borderColor: "#dee2e6",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    fontSize: 15,
    color: "#212529",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: "#2E7D32",
    marginRight: 6,
    fontWeight: "500",
  },
  tagClose: {
    justifyContent: "center",
    alignItems: "center",
  },
  tagCloseText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "bold",
  },
  addTagButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  addTagButtonText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 32,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

// Function to schedule a local push notification
async function schedulePushNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Profile Updated! 🎉",
      body: "Your profile information has been saved successfully.",
      data: { data: "goes here" },
    },
    trigger: { seconds: 2 }, // Trigger after 2 seconds
  });
}

// Function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token:", token);
  } else {
    alert("Must use physical device for Push Notifications");
  }

  return token;
}
