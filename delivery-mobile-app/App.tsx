import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { OfflineNotice } from "./src/components/OfflineNotice";
import { colors } from "./src/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar barStyle="light-content" />
        <OfflineNotice />
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
