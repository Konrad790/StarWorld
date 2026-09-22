import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppInitProvider } from '../src/hooks/useAppInit';
import { CollectionProvider } from '../src/hooks/useCollection';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
    <AppInitProvider>
      <CollectionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0f' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="info"
          options={{
            headerShown: true,
            title: 'About',
            headerStyle: { backgroundColor: '#13131a' },
            headerTintColor: '#e8e8f0',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="search/[id]"
          options={{
            headerShown: true,
            title: '',
            headerStyle: { backgroundColor: '#13131a' },
            headerTintColor: '#e8e8f0',
          }}
        />
        <Stack.Screen
          name="collection/add"
          options={{
            headerShown: true,
            title: 'Add to Collection',
            headerStyle: { backgroundColor: '#13131a' },
            headerTintColor: '#e8e8f0',
            presentation: 'modal',
          }}
        />
      </Stack>
      </CollectionProvider>
    </AppInitProvider>
    </ErrorBoundary>
  );
}
