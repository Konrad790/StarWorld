import React from 'react';
import { Tabs, router } from 'expo-router';
import { ColorValue, Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from '../../src/constants/theme';
import { useAppInit } from '../../src/hooks/useAppInit';

// ─── Simple SVG-free icons using text glyphs ─────────────────────────────────

function SearchIcon({ color }: { color: ColorValue }) {
  return <Text style={{ color, fontSize: 22 }}>🔍</Text>;
}
function CollectionIcon({ color }: { color: ColorValue }) {
  return <Text style={{ color, fontSize: 22 }}>📦</Text>;
}

export default function TabLayout() {
  const { engineState } = useAppInit();
  const hasFailedModels =
    engineState !== null && engineState.failedHorizons.length > 0;

  return (
    <>
      {hasFailedModels && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠️ Some forecast horizons unavailable
          </Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.surface as string,
            borderTopColor: theme.border as string,
          },
          tabBarActiveTintColor: theme.accent as string,
          tabBarInactiveTintColor: theme.muted as string,
          headerStyle: { backgroundColor: theme.surface as string },
          headerTitleStyle: { color: theme.text as string },
          headerTintColor: theme.text as string,
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/info')}
              style={{ marginRight: 16 }}
              accessibilityLabel="About StarWorld"
              accessibilityRole="button"
            >
              <Text style={{ color: theme.accent, fontSize: 20 }}>ℹ️</Text>
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <SearchIcon color={color} />,
            headerTitle: 'StarWorld',
          }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: 'Collection',
            tabBarIcon: ({ color }) => <CollectionIcon color={color} />,
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
