import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMinifigDetail } from '../../src/hooks/useMinifigDetail';
import PriceChart from '../../src/components/PriceChart';
import { theme } from '../../src/constants/theme';
import { WarningIcon } from '../../src/components/Icons';

const PLACEHOLDER_IMAGE = require('../../assets/icon.png') as number;

export default function MinifigDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const figNum = Array.isArray(id) ? id[0] : (id ?? '');

  const { minifig, snapshots, forecasts, isLoading, error } =
    useMinifigDetail(figNum);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (error || !minifig) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error ?? `Minifigure "${figNum}" not found`}
        </Text>
      </View>
    );
  }

  const latestSnapshot =
    snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const currentPrice =
    latestSnapshot?.avgPriceEu ??
    minifig.currentPrice ??
    minifig.pFirstObservedEu;

  const priceLabel =
    currentPrice != null
      ? `€ ${currentPrice.toFixed(2)}`
      : 'N/A';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: image + identity */}
        <View style={styles.header}>
          <Image
            source={
              minifig.imageUrl ? { uri: minifig.imageUrl } : PLACEHOLDER_IMAGE
            }
            style={styles.image}
            resizeMode="contain"
            // Fall back to placeholder on load error
            onError={() => { /* imageUrl failed — placeholder already shown */ }}
            accessibilityLabel={`Image of ${minifig.name}`}
          />
          <View style={styles.identity}>
            <Text style={styles.name}>{minifig.name}</Text>
            <Text style={styles.bricklinkId}>{minifig.bricklinkId ?? minifig.figNum}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Current price</Text>
              <Text style={styles.price}>{priceLabel}</Text>
            </View>
          </View>
        </View>

        {/* Price trajectory chart */}
        <Text style={styles.sectionTitle}>Price Trajectory</Text>
        <PriceChart snapshots={snapshots} forecasts={forecasts} />

        {/* Forecast availability note */}
        {forecasts.some((f) => !f.modelAvailable) && (
          <View style={styles.fcNoteRow}>
            <WarningIcon size={14} color={theme.warning} />
            <Text style={styles.fcNote}>
              Some forecast horizons are unavailable
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: theme.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  image: {
    width: 100,
    height: 130,
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  identity: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    lineHeight: 26,
  },
  bricklinkId: {
    fontSize: 13,
    color: theme.muted,
    fontFamily: 'monospace',
  },
  priceRow: {
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.accent,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  fcNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(247, 201, 79, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  fcNote: {
    color: theme.warning,
    fontSize: 12,
    fontWeight: '500',
  },
});
