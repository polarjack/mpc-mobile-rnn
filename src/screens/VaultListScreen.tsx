import React, { useState, useCallback, useMemo } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { fetchVaults, fetchUserProfile } from '../services/api';
import { getRoleColor } from '../utils/permissions';
import type { Vault, VaultRole, VaultMembership } from '../types';

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
            { backgroundColor: item.activated ? '#e8f5e9' : '#fce4ec' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.activated ? '#4caf50' : '#f44336' },
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
  const { accessToken, logout, isLoading } = useAuth();
  const router = useRouter();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [memberships, setMemberships] = useState<VaultMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [vaultsRes, profileRes] = await Promise.all([
        fetchVaults(accessToken),
        fetchUserProfile(accessToken),
      ]);
      if (vaultsRes._status === 200 && vaultsRes.data) {
        setVaults(vaultsRes.data);
      } else {
        Alert.alert('Error', vaultsRes.error?.message || 'Failed to load vaults');
      }
      if (profileRes._status === 200 && profileRes.data) {
        setMemberships(profileRes.data.vaultMemberships);
      }
    } catch {
      Alert.alert('Error', 'Failed to load vaults');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const membershipMap = useMemo(() => {
    const map = new Map<string, VaultRole>();
    for (const m of memberships) {
      map.set(m.vaultId, m.role);
    }
    return map;
  }, [memberships]);

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
          <ActivityIndicator size="large" color="#1976d2" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1976d2" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Vaults</Text>
            <Text style={styles.emptySubtitle}>
              You don't have access to any vaults yet.
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
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f44336',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
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
    color: '#333',
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
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
});
