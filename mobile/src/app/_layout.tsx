import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { MonitorProvider } from '../state/MonitorProvider';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <MonitorProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.secondaryBackground },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event', presentation: 'modal' }} />
      </Stack>
    </MonitorProvider>
  );
}
