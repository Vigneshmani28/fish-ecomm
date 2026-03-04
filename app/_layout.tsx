import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && isNewUser && !inAuthGroup) {
      // New user hasn't provided name yet — send back to auth for name collection
      router.replace('/(auth)/login');
    } else if (session && !isNewUser && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, isNewUser, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
  screenOptions={{
    headerShown: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  }}
>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <CustomThemeProvider>
          <RootLayoutNav />
        </CustomThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
