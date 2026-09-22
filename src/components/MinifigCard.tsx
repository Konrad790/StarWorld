import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SearchResult } from '../types';
import { theme } from '../constants/theme';

interface MinifigCardProps {
  result: SearchResult;
  currentPrice: number | null | undefined;
  onPress: () => void;
}

export default function MinifigCard({ result, currentPrice, onPress }: MinifigCardProps) {
  const priceLabel =
    currentPrice != null ? `€ ${currentPrice.toFixed(2)}` : 'N/A';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityLabel={`${result.name}, BrickLink ID ${result.bricklinkId ?? result.figNum}, current price ${priceLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {result.name}
        </Text>
        <Text style={styles.id}>{result.bricklinkId ?? result.figNum}</Text>
      </View>
      <Text style={styles.price}>{priceLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pressed: {
    opacity: 0.7,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  id: {
    fontSize: 12,
    color: theme.muted,
    fontFamily: 'monospace',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.accent,
  },
});
