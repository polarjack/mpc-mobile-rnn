import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useVault } from '../src/hooks/useVault';
import { SignInScreen } from '../src/screens/SignInScreen';

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { vaults, isInitialized: vaultInitialized } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!vaultInitialized) return;

    if (vaults.length > 0) {
      router.replace(`/vaults/${vaults[0].id}`);
    } else {
      router.replace('/vaults');
    }
  }, [isAuthenticated, authLoading, vaultInitialized, vaults, router]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <SignInScreen />;
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1976d2" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
