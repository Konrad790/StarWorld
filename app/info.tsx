import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Constants from 'expo-constants';
import { theme } from '../src/constants/theme';

export default function InfoScreen() {
  const appVersion =
    (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── App header ─────────────────────────────────────────────── */}
        <Text style={styles.appName}>StarWorld</Text>
        <Text style={styles.version}>Version {appVersion}</Text>

        <View style={styles.divider} />

        {/* ── Rebrickable attribution ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Data Attribution</Text>
        <Text style={styles.body}>
          Minifigure data is sourced from{' '}
          <Text style={styles.link}>Rebrickable</Text>{' '}
          (rebrickable.com) and is used under the{' '}
          <Text style={styles.bold}>
            Creative Commons Attribution 4.0 International (CC BY 4.0)
          </Text>{' '}
          licence. No modifications have been made to the underlying dataset.
        </Text>

        <View style={styles.divider} />

        {/* ── Trademark disclaimer ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Trademark Disclaimer</Text>
        <Text style={styles.body}>
          StarWorld is an <Text style={styles.bold}>unofficial fan project</Text>{' '}
          and is <Text style={styles.bold}>not affiliated with, endorsed by,
          or sponsored by</Text> The LEGO Group, Lucasfilm Ltd., or The Walt
          Disney Company.
        </Text>
        <Text style={[styles.body, styles.mt8]}>
          <Text style={styles.bold}>LEGO®</Text> is a registered trademark of
          The LEGO Group.{' '}
          <Text style={styles.bold}>Star Wars™</Text> is a trademark of
          Lucasfilm Ltd. All LEGO and Star Wars related marks, characters, and
          elements are the property of their respective owners.
        </Text>
        <Text style={[styles.body, styles.mt8]}>
          This application is created for personal, non-commercial use only.
        </Text>

        <View style={styles.divider} />

        {/* ── Technical info ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>About This App</Text>
        <Text style={styles.body}>
          StarWorld operates entirely offline. All price data, forecasts, and
          collection records are stored locally on your device. No data is
          transmitted to any server. The app uses on-device machine learning
          models to generate price forecasts and requires no internet connection.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: theme.muted,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.accent,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  body: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    color: theme.text,
  },
  link: {
    color: theme.accent,
    textDecorationLine: 'underline',
  },
  mt8: {
    marginTop: 8,
  },
});
