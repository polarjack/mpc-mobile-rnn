import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { VaultProvider } from '../src/context/VaultContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <VaultProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="vaults" />
        </Stack>
      </VaultProvider>
    </AuthProvider>
  );
}
