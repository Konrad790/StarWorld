import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useMinifigSearch } from '../../src/hooks/useMinifigSearch';
import { useCollection } from '../../src/hooks/useCollection';
import { theme } from '../../src/constants/theme';
import { SearchResult } from '../../src/types';

export default function AddToCollectionModal() {
  const { query, setQuery, results, isIndexReady } = useMinifigSearch(150);
  const { addEntry } = useCollection();

  const [selectedFig, setSelectedFig] = useState<SearchResult | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function selectFig(fig: SearchResult) {
    setSelectedFig(fig);
    setQuery('');
  }

  function clearSelection() {
    setSelectedFig(null);
  }

  async function handleSubmit() {
    setFormError(null);

    if (!selectedFig) {
      setFormError('Please select a minifigure.');
      return;
    }
    const price = parseFloat(priceInput.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      setFormError('Purchase price must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await addEntry({
        figNum: selectedFig.figNum,
        purchasePriceEur: price,
      });
      router.back();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add figure.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Minifigure</Text>

        {/* Figure selection */}
        {selectedFig ? (
          <View style={styles.selectedRow}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedFig.name}</Text>
              <Text style={styles.selectedId}>{selectedFig.bricklinkId ?? selectedFig.figNum}</Text>
            </View>
            <Pressable
              onPress={clearSelection}
              style={styles.clearBtn}
              accessibilityLabel="Clear selected minifigure"
            >
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder={isIndexReady ? 'Search minifigure…' : 'Loading…'}
              placeholderTextColor={theme.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              editable={isIndexReady}
              accessibilityLabel="Search for a minifigure to add"
            />
            {results.length > 0 && (
              <View style={styles.dropdown}>
                {results.slice(0, 8).map((r) => (
                  <Pressable
                    key={r.figNum}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && styles.dropdownItemPressed,
                    ]}
                    onPress={() => selectFig(r)}
                    accessibilityLabel={`Select ${r.name}`}
                  >
                    <Text style={styles.dropdownName}>{r.name}</Text>
                    <Text style={styles.dropdownId}>{r.bricklinkId ?? r.figNum}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Purchase price */}
        <Text style={styles.sectionLabel}>Purchase Price (EUR)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12.50"
          placeholderTextColor={theme.muted}
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="decimal-pad"
          accessibilityLabel="Purchase price in euros"
        />

        {/* Error */}
        {formError && <Text style={styles.error}>{formError}</Text>}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            onPress={() => router.back()}
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
            onPress={() => void handleSubmit()}
            disabled={submitting}
            accessibilityLabel="Add minifigure to collection"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Add to Collection</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  selectedId: {
    fontSize: 12,
    color: theme.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    color: theme.muted,
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dropdownItemPressed: {
    backgroundColor: theme.surface,
  },
  dropdownName: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  dropdownId: {
    fontSize: 11,
    color: theme.muted,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  error: {
    color: theme.danger,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  cancelText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.accent,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
