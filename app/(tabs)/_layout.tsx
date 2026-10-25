import React from 'react';
import { Tabs, router } from 'expo-router';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '../../src/constants/theme';
import { useAppInit } from '../../src/hooks/useAppInit';
import { SearchIcon, CollectionIcon, InfoIcon, WarningIcon } from '../../src/components/Icons';

export default function TabLayout() {
  const { engineState } = useAppInit();
  const hasFailedModels =
    engineState !== null && engineState.failedHorizons.length > 0;

  return (
    <>
      {hasFailedModels && (
        <View style={styles.banner}>
          <WarningIcon size={16} color={theme.warning} />
          <Text style={styles.bannerText}>
            Some forecast horizons unavailable
          </Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.surface as string,
            borderTopColor: theme.border as string,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: theme.accent as string,
          tabBarInactiveTintColor: theme.muted as string,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          headerStyle: { backgroundColor: theme.surface as string },
          headerTitleStyle: { color: theme.text as string, fontWeight: '700' },
          headerTintColor: theme.text as string,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/info')}
              style={{
                marginRight: 16,
                padding: 6,
                borderRadius: 20,
              }}
              accessibilityLabel="About StarWorld"
              accessibilityRole="button"
            >
              <InfoIcon size={21} color={theme.textSecondary} />
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, focused }) => (
              <SearchIcon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
            headerTitle: 'StarWorld',
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Collection',
            tabBarIcon: ({ color, focused }) => (
              <CollectionIcon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
            headerTitle: 'StarWorld',
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.warning,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
});
