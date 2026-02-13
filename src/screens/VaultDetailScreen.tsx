import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { fetchVault, fetchVaultUserProfile } from '../services/api';
import { canManageMembers } from '../utils/permissions';
import { VaultSwitcherHeader } from '../components/VaultSwitcherHeader';
import { WalletListScreen } from './WalletListScreen';
import type { Vault, VaultUserData, VaultRole } from '../types';

type TabKey = 'wallets' | 'settings';

interface Props {
  vaultId: string;
}

export const VaultDetailScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const { refreshVaults } = useVault();
  const router = useRouter();

  const [vault, setVault] = useState<Vault | null>(null);
  const [vaultUser, setVaultUser] = useState<VaultUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('wallets');

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [vaultRes, profileRes] = await Promise.all([
        fetchVault(accessToken, vaultId),
        fetchVaultUserProfile(accessToken, vaultId),
      ]);
      if (vaultRes._status === 200 && vaultRes.data) {
        setVault(vaultRes.data);
      } else {
        Alert.alert('Error', vaultRes.error?.message || 'Failed to load vault');
      }
      if (profileRes._status === 200 && profileRes.data) {
        setVaultUser(profileRes.data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load vault details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, vaultId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadData(), refreshVaults()]);
  }, [loadData, refreshVaults]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  const role = vaultUser?.role ?? null;
  const showSettings = role ? canManageMembers(role) : false;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Vault Switcher Header */}
      <View style={styles.headerContainer}>
        <VaultSwitcherHeader
          currentVaultId={vaultId}
          currentVaultName={vault?.name}
          currentRole={role ?? undefined}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'wallets' ? (
          <WalletListScreen vaultId={vaultId} embedded role={role} />
        ) : (
          <VaultOverviewContent
            vault={vault}
            vaultId={vaultId}
            role={role}
            showSettings={showSettings}
            refreshing={refreshing}
            onRefresh={onRefresh}
            router={router}
          />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Wallets"
          active={activeTab === 'wallets'}
          onPress={() => setActiveTab('wallets')}
        />
        <TabButton
          label="Vault Settings"
          active={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
        />
      </View>
    </SafeAreaView>
  );
};

const TabButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <Pressable
    style={({ pressed }) => [
      styles.tabButton,
      active && styles.tabButtonActive,
      pressed && { opacity: 0.7 },
    ]}
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
  </Pressable>
);

interface VaultOverviewProps {
  vault: Vault | null;
  vaultId: string;
  role: VaultRole | null;
  showSettings: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  router: ReturnType<typeof useRouter>;
}

const VaultOverviewContent: React.FC<VaultOverviewProps> = ({
  vault,
  vaultId,
  role,
  showSettings,
  refreshing,
  onRefresh,
  router,
}) => (
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1976d2" />
    }
  >
    {/* Vault Info */}
    {vault && (
      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: vault.activated ? '#e8f5e9' : '#fce4ec' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: vault.activated ? '#4caf50' : '#f44336' },
              ]}
            >
              {vault.activated ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <InfoRow label="Email" value={vault.businessEmail || '—'} />
          <InfoRow label="Phone" value={vault.phone || '—'} />
          <InfoRow label="Website" value={vault.websiteUrl || '—'} />
          <InfoRow
            label="Updated"
            value={new Date(vault.updatedAt).toLocaleDateString()}
            isLast
          />
        </View>
      </View>
    )}

    {/* Navigation */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actions</Text>

      <Pressable
        style={({ pressed }) => [
          styles.navButton,
          styles.primaryButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => router.push(`/vaults/${vaultId}/members`)}
      >
        <Text style={styles.navButtonText}>Members</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.navButton,
          styles.auditLogsButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => router.push(`/vaults/${vaultId}/audit-logs`)}
      >
        <Text style={styles.navButtonText}>Audit Logs</Text>
      </Pressable>

      {showSettings && (
        <Pressable
          style={({ pressed }) => [
            styles.navButton,
            styles.settingsButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.push(`/vaults/${vaultId}/settings`)}
        >
          <Text style={styles.navButtonText}>Settings</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.navButton,
          styles.profileButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => router.push(`/vaults/${vaultId}/profile`)}
      >
        <Text style={styles.navButtonText}>My Profile</Text>
      </Pressable>
    </View>
  </ScrollView>
);

const InfoRow: React.FC<{ label: string; value: string; isLast?: boolean }> = ({
  label,
  value,
  isLast,
}) => (
  <View style={[infoStyles.row, !isLast && infoStyles.border]}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

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
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  tabContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#1976d2',
  },
  auditLogsButton: {
    backgroundColor: '#607d8b',
  },
  settingsButton: {
    backgroundColor: '#ff9800',
  },
  profileButton: {
    backgroundColor: '#4caf50',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabButtonActive: {
    borderTopColor: '#1976d2',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabButtonTextActive: {
    color: '#1976d2',
  },
});
