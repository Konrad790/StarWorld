import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { theme } from '../src/constants/theme';

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>StarWorld</Text>
          <Text style={styles.subtitle}>
            LEGO® Star Wars™ Minifigure Portfolio
          </Text>
          <Text style={styles.tagline}>
            Track value. Forecast prices. All offline.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.replace('/(tabs)/search')}
          accessibilityLabel="Enter StarWorld app"
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>Enter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.accent,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 15,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  cta: {
    width: '100%',
    backgroundColor: theme.accent,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
