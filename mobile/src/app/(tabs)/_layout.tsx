import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HudHeader } from '../../components/HudHeader';
import { useMonitor } from '../../state/MonitorProvider';
import { colors, fonts } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; label: string; icon: IconName }[] = [
  { name: 'index', title: 'TACTICAL MAP', label: 'MAP', icon: 'locate-outline' },
  { name: 'feed', title: 'SIGINT FEED', label: 'FEED', icon: 'pulse-outline' },
  { name: 'alerts', title: 'ACTIVE ALERTS', label: 'ALERTS', icon: 'warning-outline' },
  { name: 'intel', title: 'INTEL', label: 'INTEL', icon: 'layers-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: ({ options }) => <HudHeader title={options.title ?? ''} />,
        sceneStyle: { backgroundColor: colors.background },
      }}
      tabBar={(props) => <HudTabBar {...props} />}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}

/** Tab bar styled as a console: mono labels, glowing bar over the active tab, alert count. */
function HudTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { events } = useMonitor();
  const alertCount = events.filter((e) => e.isAlert).length;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, i) => {
        const tab = TABS.find((t) => t.name === route.name)!;
        const active = state.index === i;
        const color = active ? colors.accent : colors.textFaint;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigateToTab(route.key)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.indicator, active && styles.indicatorActive]} />
            <View>
              <Ionicons name={tab.icon} size={21} color={color} />
              {tab.name === 'alerts' && alertCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alertCount > 99 ? '99+' : alertCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  item: { flex: 1, alignItems: 'center', paddingTop: 8, gap: 3 },
  indicator: { position: 'absolute', top: -1, height: 2, width: '46%', backgroundColor: 'transparent' },
  indicatorActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  label: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: colors.alert,
    paddingHorizontal: 4,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontFamily: fonts.monoBold, fontSize: 9 },
});
