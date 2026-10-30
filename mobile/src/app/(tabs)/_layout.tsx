import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useMonitor } from '../../state/MonitorProvider';
import { colors } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  // Tab bar colours are always plain strings here; the wider ColorValue type comes from React Navigation.
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  const { events } = useMonitor();
  const alertCount = events.filter((e) => e.isAlert).length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.secondaryBackground },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', letterSpacing: 1 },
        tabBarStyle: { backgroundColor: colors.secondaryBackground, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'MAP', tabBarLabel: 'Map', tabBarIcon: icon('globe-outline') }} />
      <Tabs.Screen name="feed" options={{ title: 'LIVE FEED', tabBarLabel: 'Feed', tabBarIcon: icon('newspaper-outline') }} />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'ACTIVE ALERTS',
          tabBarLabel: 'Alerts',
          tabBarIcon: icon('warning-outline'),
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.alert },
        }}
      />
      <Tabs.Screen name="intel" options={{ title: 'INTEL', tabBarLabel: 'Intel', tabBarIcon: icon('shield-outline') }} />
    </Tabs>
  );
}
