// HUD primitives: bracketed panels, section labels, tags, stat readouts, live clock.

import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme';

/** Panel with targeting-bracket corners. */
export function HudPanel({
  children,
  style,
  accent = colors.accent,
  edgeColor,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Colour of the corner brackets. */
  accent?: string;
  /** Optional solid left edge (e.g. severity). */
  edgeColor?: string;
}) {
  return (
    <View style={[styles.panel, edgeColor ? { borderLeftColor: edgeColor, borderLeftWidth: 3 } : null, style]}>
      <View style={[styles.corner, styles.tl, { borderColor: accent }]} />
      <View style={[styles.corner, styles.tr, { borderColor: accent }]} />
      <View style={[styles.corner, styles.bl, { borderColor: accent }]} />
      <View style={[styles.corner, styles.br, { borderColor: accent }]} />
      {children}
    </View>
  );
}

/** "// SECTION TITLE ————— right" */
export function SectionLabel({ children, right }: { children: string; right?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionSlash}>{'//'}</Text>
      <Text style={styles.sectionText}>{children.toUpperCase()}</Text>
      <View style={styles.sectionRule} />
      {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
    </View>
  );
}

/** Bracketed code tag, e.g. [MSL]. */
export function Tag({ label, color = colors.accent, filled = false }: { label: string; color?: string; filled?: boolean }) {
  return (
    <View style={[styles.tag, { borderColor: color }, filled && { backgroundColor: color }]}>
      <Text style={[styles.tagText, { color: filled ? colors.background : color }]}>{label}</Text>
    </View>
  );
}

export function Readout({ label, value, color = colors.accent }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.readout}>
      <Text style={[styles.readoutValue, { color }]}>{value}</Text>
      <Text style={styles.readoutLabel}>{label}</Text>
    </View>
  );
}

/** Blinking status dot. */
export function Blink({ color = colors.accent, size = 7 }: { color?: string; size?: number }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, shadowColor: color, shadowRadius: 4, shadowOpacity: 1 }}
    />
  );
}

/** Live UTC clock, e.g. "09:32:14Z". */
export function ZuluClock({ style }: { style?: object }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    <Text style={[styles.clock, style]}>
      {p(now.getUTCHours())}:{p(now.getUTCMinutes())}:{p(now.getUTCSeconds())}Z
    </Text>
  );
}

const CORNER = 9;

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: 12,
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: -1, left: -1, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  tr: { top: -1, right: -1, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  br: { bottom: -1, right: -1, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  section: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 18, marginBottom: 8, gap: 6 },
  sectionSlash: { color: colors.accentDim, fontFamily: fonts.monoBold, fontSize: 11 },
  sectionText: { color: colors.accent, fontFamily: fonts.displayBold, fontSize: 13, letterSpacing: 2 },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineBright, marginHorizontal: 4 },
  sectionRight: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10 },
  tag: { borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  tagText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.5 },
  readout: { alignItems: 'flex-start' },
  readoutValue: { fontFamily: fonts.monoBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  readoutLabel: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5, marginTop: 1 },
  clock: { color: colors.accent, fontFamily: fonts.mono, fontSize: 12, fontVariant: ['tabular-nums'] },
});
