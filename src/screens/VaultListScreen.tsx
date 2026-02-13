import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { getRoleColor } from '../utils/permissions';
import type { Vault, VaultRole } from '../types';
import {
  PRIMARY,
  SUCCESS,
  DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
  BG_MAIN,
  BG_WHITE,
  BG_LIGHT_GREEN,
  BG_LIGHT_PINK,
  SHADOW,
} from '@/constants/colors';

const keyExtractor = (item: Vault) => item.id;

interface VaultCardProps {
  item: Vault;
  role: VaultRole | undefined;
  onPress: (id: string) => void;
}

const VaultCard = React.memo<VaultCardProps>(({ item, role, onPress }) => {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.vaultName} numberOfLines={1}>
          {item.name}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.activated ? BG_LIGHT_GREEN : BG_LIGHT_PINK },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.activated ? SUCCESS : DANGER },
            ]}
          >
            {item.activated ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      {role && (
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(role) }]}>{role}</Text>
        </View>
      )}
      {item.businessEmail ? (
        <Text style={styles.vaultEmail} numberOfLines={1}>
          {item.businessEmail}
        </Text>
      ) : null}
    </Pressable>
  );
});

export const VaultListScreen: React.FC = () => {
  const { logout, isLoading } = useAuth();
  const { vaults, membershipMap, isLoading: vaultLoading, refreshVaults } = useVault();
  const router = useRouter();

  const loading = vaultLoading && vaults.length === 0;

  const onRefresh = useCallback(() => {
    refreshVaults();
  }, [refreshVaults]);

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleVaultPress = useCallback(
    (id: string) => {
      router.push(`/vaults/${id}`);
    },
    [router],
  );

  const renderVaultCard = useCallback(
    ({ item }: { item: Vault }) => {
      const role = membershipMap.get(item.id);
      return <VaultCard item={item} role={role} onPress={handleVaultPress} />;
    },
    [membershipMap, handleVaultPress],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MPC Mobile</Text>
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Pressable>
      </View>
      <FlatList
        data={vaults}
        keyExtractor={keyExtractor}
        renderItem={renderVaultCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={vaultLoading} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Vaults</Text>
            <Text style={styles.emptySubtitle}>
              You don&apos;t have access to any vaults yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_MAIN,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DANGER,
  },
  logoutButtonText: {
    color: TEXT_WHITE,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaultName: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vaultEmail: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_TERTIARY,
  },
});
