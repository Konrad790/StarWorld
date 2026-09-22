import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useCollection } from '../../src/hooks/useCollection';
import { usePortfolioChart } from '../../src/hooks/usePortfolioChart';
import CollectionRow from '../../src/components/CollectionRow';
import PortfolioChart from '../../src/components/PortfolioChart';
import { CollectionEntryView } from '../../src/types';
import { theme } from '../../src/constants/theme';

export default function CollectionTab() {
  const { entries, isLoading, error, updatePrice, deleteEntry } = useCollection();
  const { trajectory, isLoading: chartLoading } = usePortfolioChart(entries);

  const [editTarget, setEditTarget] = useState<{
    id: number;
    name: string;
    currentPrice: string;
  } | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  function openEditModal(id: number) {
    const view = entries.find((e) => e.entry.id === id);
    if (!view) return;
    setEditTarget({
      id,
      name: view.minifig?.name ?? view.entry.figNum,
      currentPrice: view.entry.purchasePriceEur.toFixed(2),
    });
    setEditInput(view.entry.purchasePriceEur.toFixed(2));
    setEditError(null);
  }

  async function handleSavePrice() {
    if (!editTarget) return;
    const val = parseFloat(editInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setEditError('Price must be greater than 0.');
      return;
    }
    setEditSaving(true);
    try {
      await updatePrice(editTarget.id, val);
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update price.');
    } finally {
      setEditSaving(false);
    }
  }

  function openDeleteModal(id: number) {
    const view = entries.find((e) => e.entry.id === id);
    if (!view) return;
    setDeleteTarget({
      id,
      name: view.minifig?.name ?? (view.minifig?.bricklinkId ?? view.entry.figNum),
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteDeleting(true);
    try {
      await deleteEntry(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleteDeleting(false);
    }
  }

  const renderItem = ({ item }: { item: CollectionEntryView }) => (
    <CollectionRow view={item} onEditPrice={openEditModal} onDelete={openDeleteModal} />
  );

  const isEmpty = !isLoading && entries.length === 0;

  return (
    <View style={styles.root}>
      {/* Portfolio chart */}
      <PortfolioChart
        trajectory={trajectory}
        isLoading={chartLoading && entries.length > 0}
      />

      {/* Collection list */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Your collection is empty.</Text>
          <Text style={styles.emptyHint}>Tap + to add your first minifigure.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.entry.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/collection/add')}
        accessibilityLabel="Add minifigure to collection"
        accessibilityRole="button"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Remove from Collection</Text>
            {deleteTarget && (
              <Text style={styles.modalSubtitle}>
                Remove {deleteTarget.name} from your collection?
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalDelete]}
                onPress={() => void handleDelete()}
                disabled={deleteDeleting}
              >
                {deleteDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Remove</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit price modal */}
      <Modal
        visible={editTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditTarget(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Purchase Price</Text>
            {editTarget && (
              <Text style={styles.modalSubtitle}>{editTarget.name}</Text>
            )}
            <TextInput
              style={styles.modalInput}
              value={editInput}
              onChangeText={setEditInput}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              placeholder="e.g. 12.50"
              placeholderTextColor={theme.muted}
              accessibilityLabel="New purchase price"
            />
            {editError && <Text style={styles.modalError}>{editError}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setEditTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalSave]}
                onPress={() => void handleSavePrice()}
                disabled={editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  errorText: {
    color: theme.danger,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    color: theme.muted,
    fontSize: 14,
    marginTop: 6,
  },
  list: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.8,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: theme.surfaceElevated,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: theme.text,
    marginBottom: 8,
  },
  modalError: {
    color: theme.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalCancelText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: theme.accent,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalDelete: {
    backgroundColor: theme.danger,
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
