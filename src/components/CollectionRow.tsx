import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CollectionEntryView } from '../types';
import { theme } from '../constants/theme';

interface CollectionRowProps {
  view: CollectionEntryView;
  onEditPrice: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatRoi(roi: number | null): string {
  if (roi === null) return '—';
  const sign = roi >= 0 ? '+' : '';
  return `${sign}${roi.toFixed(1)} %`;
}

function roiColor(roi: number | null): string {
  if (roi === null) return theme.muted;
  if (roi > 0) return theme.success;
  if (roi < 0) return theme.danger;
  return theme.muted;
}

export default function CollectionRow({ view, onEditPrice, onDelete }: CollectionRowProps) {
  const { entry, minifig, roi } = view;

  const displayName = minifig?.name ?? (minifig?.bricklinkId ?? entry.figNum);
  const currentPriceLabel =
    minifig?.pFirstObservedEu != null
      ? `€ ${minifig.pFirstObservedEu.toFixed(2)}`
      : 'N/A';
  const purchaseLabel = `€ ${entry.purchasePriceEur.toFixed(2)}`;
  const roiLabel = formatRoi(roi);
  const roiStyle = { color: roiColor(roi) };

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.roi, roiStyle]}>{roiLabel}</Text>
        </View>
        <Text style={styles.id}>{minifig?.bricklinkId ?? entry.figNum}</Text>
        <View style={styles.prices}>
          <Text style={styles.priceItem}>
            <Text style={styles.priceLabel}>Paid </Text>
            <Text style={styles.priceValue}>{purchaseLabel}</Text>
          </Text>
          <Text style={styles.priceSep}>·</Text>
          <Text style={styles.priceItem}>
            <Text style={styles.priceLabel}>Now </Text>
            <Text style={styles.priceValue}>{currentPriceLabel}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={() => onEditPrice(entry.id)}
          accessibilityLabel={`Edit purchase price for ${displayName}`}
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={() => onDelete(entry.id)}
          accessibilityLabel={`Delete ${displayName} from collection`}
          accessibilityRole="button"
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  main: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    marginRight: 8,
  },
  roi: {
    fontSize: 14,
    fontWeight: '700',
  },
  id: {
    fontSize: 11,
    color: theme.muted,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  prices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceItem: {
    fontSize: 13,
  },
  priceLabel: {
    color: theme.muted,
  },
  priceValue: {
    color: theme.text,
    fontWeight: '500',
  },
  priceSep: {
    color: theme.border,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  actionBtnPressed: {
    opacity: 0.6,
  },
  actionIcon: {
    fontSize: 16,
  },
  deleteIcon: {
    fontSize: 16,
  },
});
