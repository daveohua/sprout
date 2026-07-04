import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const logoSource = require("@/assets/images/logo.png");

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image source={logoSource} style={styles.logo} contentFit="contain" />
        <Text style={styles.subtitle}>
          Meet the people around you, one moment at a time.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 600,
    height: 600,
    marginBottom: -120,
  },
  subtitle: {
    fontSize: 16,
    color: "#5B6B60",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
