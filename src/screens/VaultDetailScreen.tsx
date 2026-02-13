import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { fetchVault, fetchVaultUserProfile, fetchVaultBalances } from '../services/api';
import { canManageMembers } from '../utils/permissions';
import { VaultSwitcherHeader } from '../components/VaultSwitcherHeader';
import { WalletListScreen } from './WalletListScreen';
import { VaultActionsContent } from './VaultActionsContent';
import {
  PRIMARY,
  SUCCESS,
  DANGER,
  WARNING,
  BLUE_GREY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
  BG_MAIN,
  BG_WHITE,
  BG_LIGHT_BLUE,
  BG_LIGHT_GREEN,
  BG_LIGHT_PINK,
  BORDER,
  DIVIDER,
  SHADOW,
  TRANSPARENT,
} from '@/constants/colors';
import type { Vault, VaultUserData, VaultRole, VaultBalance } from '../types';

type TabKey = 'wallets' | 'balances' | 'actions' | 'settings';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

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
  const [balances, setBalances] = useState<VaultBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesRefreshing, setBalancesRefreshing] = useState(false);

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

  const loadBalances = useCallback(async () => {
    if (!accessToken) return;
    setBalancesLoading(true);
    try {
      const res = await fetchVaultBalances(accessToken, vaultId);
      if (res._status === 200 && res.data) {
        setBalances(res.data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load balances');
    } finally {
      setBalancesLoading(false);
      setBalancesRefreshing(false);
    }
  }, [accessToken, vaultId]);

  const onRefreshBalances = useCallback(() => {
    setBalancesRefreshing(true);
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    if (activeTab === 'balances') {
      loadBalances();
    }
  }, [activeTab, loadBalances]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
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
        ) : activeTab === 'balances' ? (
          <VaultBalancesContent
            balances={balances}
            loading={balancesLoading}
            refreshing={balancesRefreshing}
            onRefresh={onRefreshBalances}
          />
        ) : activeTab === 'actions' ? (
          <VaultActionsContent vaultId={vaultId} role={role} />
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
          label="Balances"
          active={activeTab === 'balances'}
          onPress={() => setActiveTab('balances')}
        />
        <TabButton
          label="Actions"
          active={activeTab === 'actions'}
          onPress={() => setActiveTab('actions')}
        />
        <TabButton
          label="Settings"
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
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
    }
  >
    {/* Vault Info */}
    {vault && (
      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: vault.activated ? BG_LIGHT_GREEN : BG_LIGHT_PINK },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: vault.activated ? SUCCESS : DANGER },
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

// ─── Balances Tab ───

interface VaultBalancesContentProps {
  balances: VaultBalance[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const balanceKeyExtractor = (item: VaultBalance) => item.assetId;

const BalanceCard = React.memo(function BalanceCard({ balance }: { balance: VaultBalance }) {
  return (
    <View style={balanceStyles.card}>
      <View style={balanceStyles.cardHeader}>
        <Text style={balanceStyles.assetId} numberOfLines={1}>
          {balance.assetId}
        </Text>
      </View>
      <View style={balanceStyles.row}>
        <Text style={balanceStyles.label}>Amount</Text>
        <Text style={balanceStyles.value}>{balance.amount}</Text>
      </View>
      <View style={balanceStyles.row}>
        <Text style={balanceStyles.label}>Value</Text>
        <Text style={balanceStyles.value}>
          {currencyFormatter.format(parseFloat(balance.convertedValue.amount) || 0)}
        </Text>
      </View>
      {balance.lockedAmount ? (
        <View style={balanceStyles.row}>
          <Text style={balanceStyles.label}>Locked</Text>
          <Text style={balanceStyles.valueLocked}>{balance.lockedAmount}</Text>
        </View>
      ) : null}
      {balance.walletBalances.length > 0 && (
        <View style={balanceStyles.walletBreakdown}>
          <Text style={balanceStyles.breakdownTitle}>Per Wallet</Text>
          {balance.walletBalances.map((wb) => (
            <View key={wb.walletId} style={balanceStyles.walletRow}>
              <Text style={balanceStyles.walletName} numberOfLines={1}>
                {wb.walletName}
              </Text>
              <View style={balanceStyles.walletValues}>
                <Text style={balanceStyles.walletAmount}>{wb.amount}</Text>
                <Text style={balanceStyles.walletConverted}>
                  {currencyFormatter.format(parseFloat(wb.convertedValue.amount) || 0)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const renderBalanceItem = ({ item }: { item: VaultBalance }) => (
  <BalanceCard balance={item} />
);

const VaultBalancesContent: React.FC<VaultBalancesContentProps> = ({
  balances,
  loading,
  refreshing,
  onRefresh,
}) => {
  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <FlatList
      data={balances}
      keyExtractor={balanceKeyExtractor}
      renderItem={renderBalanceItem}
      contentContainerStyle={balanceStyles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
      }
      ListEmptyComponent={
        <View style={balanceStyles.emptyState}>
          <Text style={balanceStyles.emptyText}>No balances</Text>
        </View>
      }
    />
  );
};

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  label: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    maxWidth: '60%',
    textAlign: 'right',
  },
});

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
    backgroundColor: BG_LIGHT_BLUE,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  card: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    padding: 16,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: PRIMARY,
  },
  auditLogsButton: {
    backgroundColor: BLUE_GREY,
  },
  settingsButton: {
    backgroundColor: WARNING,
  },
  profileButton: {
    backgroundColor: SUCCESS,
  },
  navButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  // Bottom Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BG_WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingBottom: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: TRANSPARENT,
  },
  tabButtonActive: {
    borderTopColor: PRIMARY,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_TERTIARY,
  },
  tabButtonTextActive: {
    color: PRIMARY,
  },
});

const balanceStyles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 6,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    marginBottom: 4,
  },
  assetId: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  valueLocked: {
    fontSize: 14,
    fontWeight: '500',
    color: WARNING,
  },
  walletBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_TERTIARY,
    marginBottom: 6,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  walletName: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    flex: 1,
    marginRight: 8,
  },
  walletValues: {
    alignItems: 'flex-end',
  },
  walletAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  walletConverted: {
    fontSize: 12,
    color: TEXT_TERTIARY,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_TERTIARY,
  },
});
