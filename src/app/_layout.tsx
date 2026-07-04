import { Stack, SplashScreen, useSegments } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();

  // Always render tabs except for specific routes like landing/signup
  // For now, always render tabs
  const renderTabs = true;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {/* Conditionally render AppTabs or Stack. Stack will render the header by default. */}
        {/* We want to remove the header for the root route (index.tsx), so we only render AppTabs when not on the root. */}
        {renderTabs ? (
          <AppTabs />
        ) : (
          <Stack screenOptions={{ headerShown: false }} />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
