import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useMinifigSearch } from '../../src/hooks/useMinifigSearch';
import MinifigCard from '../../src/components/MinifigCard';
import { theme } from '../../src/constants/theme';
import { SearchResult } from '../../src/types';

export default function SearchTab() {
  const { query, setQuery, results, isSearching, isIndexReady } =
    useMinifigSearch(150);

  const showLoading = !isIndexReady || isSearching;
  const showEmpty =
    isIndexReady && !isSearching && query.trim().length > 1 && results.length === 0;
  const showPlaceholder =
    isIndexReady && !isSearching && query.trim().length <= 1;

  const renderItem = ({ item }: { item: SearchResult }) => (
    <MinifigCard
      result={item}
      currentPrice={undefined}
      onPress={() => router.push(`/search/${item.figNum}`)}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder={
            isIndexReady ? 'Search by ID or name…' : 'Loading database…'
          }
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          editable={isIndexReady}
          accessibilityLabel="Search minifigures"
        />
        {showLoading && (
          <ActivityIndicator
            size="small"
            color={theme.accent}
            style={styles.spinner}
          />
        )}
      </View>

      {/* Results */}
      {showPlaceholder && (
        <View style={styles.center}>
          <Text style={styles.hint}>
            {isIndexReady
              ? 'Type a BrickLink ID or name to search'
              : 'Loading…'}
          </Text>
        </View>
      )}

      {showEmpty && (
        <View style={styles.center}>
          <Text style={styles.hint}>No results for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.figNum}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  spinner: {
    marginLeft: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: theme.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  list: {
    paddingBottom: 24,
  },
});
