import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { theme } from '../src/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen not found</Text>
      <Text style={styles.body}>
        The page you are looking for does not exist.
      </Text>
      <Link href="/" asChild>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityLabel="Go back to the landing screen"
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Go Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  body: {
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
  },
  btn: {
    marginTop: 12,
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
