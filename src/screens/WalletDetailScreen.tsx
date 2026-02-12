import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import {
  fetchWallets,
  fetchVaultUserProfile,
  fetchWalletAddresses,
  fetchWalletBalances,
  renameWallet,
  archiveWallet,
  unarchiveWallet,
  addWalletAddress,
} from '../services/api';
import { canManageWallets, getNetworkColor } from '../utils/permissions';
import type { Wallet, WalletAddress, WalletBalance, VaultRole, Network } from '../types';

const AVAILABLE_NETWORKS: Network[] = ['BITCOIN', 'SOLANA'];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

interface Props {
  vaultId: string;
  walletId: string;
}

export const WalletDetailScreen: React.FC<Props> = ({ vaultId, walletId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [myRole, setMyRole] = useState<VaultRole | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const [showAddNetworkModal, setShowAddNetworkModal] = useState(false);
  const [addNetworks, setAddNetworks] = useState<Network[]>([]);
  const [addNetworkLoading, setAddNetworkLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [walletsRes, profileRes, addressesRes, balancesRes] = await Promise.all([
        fetchWallets(accessToken, vaultId, { search: undefined }),
        fetchVaultUserProfile(accessToken, vaultId),
        fetchWalletAddresses(accessToken, vaultId, walletId),
        fetchWalletBalances(accessToken, vaultId, walletId),
      ]);

      if (walletsRes._status === 200 && walletsRes.data) {
        const found = walletsRes.data.find((w) => w.id === walletId);
        if (found) {
          setWallet(found);
        } else {
          Alert.alert('Error', 'Wallet not found');
        }
      } else {
        Alert.alert('Error', walletsRes.error?.message || 'Failed to load wallet');
      }

      if (profileRes._status === 200 && profileRes.data) {
        setMyRole(profileRes.data.role);
      }

      if (addressesRes._status === 200 && addressesRes.data) {
        setAddresses(addressesRes.data);
      }

      if (balancesRes._status === 200 && balancesRes.data) {
        setBalances(balancesRes.data);
      }
    } catch {
      Alert.alert('Error', 'Failed to load wallet details');
    } finally {
      setLoading(false);
    }
  }, [accessToken, vaultId, walletId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  const handleRename = async () => {
    if (!accessToken || !renameName.trim()) return;
    setRenameLoading(true);
    const res = await renameWallet(accessToken, vaultId, walletId, {
      name: renameName.trim(),
    });
    setRenameLoading(false);
    if (res._status === 200) {
      setShowRenameModal(false);
      setRenameName('');
      setLoading(true);
      loadData();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to rename wallet');
    }
  };

  const handleArchiveToggle = () => {
    if (!wallet) return;
    if (wallet.archived) {
      handleUnarchive();
    } else {
      Alert.alert('Archive Wallet', `Are you sure you want to archive "${wallet.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: handleArchive },
      ]);
    }
  };

  const handleArchive = async () => {
    if (!accessToken) return;
    const res = await archiveWallet(accessToken, vaultId, walletId);
    if (res._status === 200) {
      setLoading(true);
      loadData();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to archive wallet');
    }
  };

  const handleUnarchive = async () => {
    if (!accessToken) return;
    const res = await unarchiveWallet(accessToken, vaultId, walletId);
    if (res._status === 200) {
      setLoading(true);
      loadData();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to unarchive wallet');
    }
  };

  const toggleAddNetwork = (network: Network) => {
    setAddNetworks((prev) =>
      prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network],
    );
  };

  const handleAddNetwork = async () => {
    if (!accessToken || addNetworks.length === 0) return;
    setAddNetworkLoading(true);
    const res = await addWalletAddress(accessToken, vaultId, walletId, {
      networks: addNetworks,
    });
    setAddNetworkLoading(false);
    if (res._status === 200 || res._status === 201) {
      Alert.alert('Success', 'Network added');
      setShowAddNetworkModal(false);
      setAddNetworks([]);
      setLoading(true);
      loadData();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to add network');
    }
  };

  const truncateAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  const canManage = myRole ? canManageWallets(myRole) : false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>

        {wallet ? (
          <>
            {/* Wallet Info */}
            <View style={styles.section}>
              <View style={styles.titleRow}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                {wallet.archived ? (
                  <View style={styles.archivedBadgeContainer}>
                    <Text style={styles.archivedBadgeText}>Archived</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.networksRow}>
                {wallet.networks.map((network) => (
                  <View
                    key={network}
                    style={[
                      styles.networkBadge,
                      { backgroundColor: getNetworkColor(network) + '20' },
                    ]}
                  >
                    <Text style={[styles.networkText, { color: getNetworkColor(network) }]}>
                      {network}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <InfoRow label="Account Index" value={String(wallet.accountIndex)} />
                <InfoRow
                  label="Created"
                  value={new Date(wallet.createdAt).toLocaleDateString()}
                />
                <InfoRow
                  label="Updated"
                  value={new Date(wallet.updatedAt).toLocaleDateString()}
                  isLast
                />
              </View>
            </View>

            {/* Total Value */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Total Value</Text>
              <View style={styles.valueCard}>
                <Text style={styles.totalValue}>
                  {currencyFormatter.format(parseFloat(wallet.convertedValue.amount) || 0)}
                </Text>
                <Text style={styles.currencyCode}>{wallet.convertedValue.currencyCode}</Text>
              </View>
            </View>

            {/* Actions */}
            {canManage ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.renameButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setRenameName(wallet.name);
                      setShowRenameModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Rename</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      wallet.archived ? styles.unarchiveButton : styles.archiveButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={handleArchiveToggle}
                  >
                    <Text style={styles.actionButtonText}>
                      {wallet.archived ? 'Unarchive' : 'Archive'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.addNetworkButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setShowAddNetworkModal(true)}
                  >
                    <Text style={styles.actionButtonText}>Add Network</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Addresses */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Addresses{addresses.length > 0 ? ` (${addresses.length})` : ''}
              </Text>
              {addresses.length > 0 ? (
                addresses.map((addr) => (
                  <View key={addr.id} style={styles.addressCard}>
                    <View style={styles.addressTop}>
                      <View
                        style={[
                          styles.networkBadge,
                          { backgroundColor: getNetworkColor(addr.network) + '20' },
                        ]}
                      >
                        <Text
                          style={[styles.networkText, { color: getNetworkColor(addr.network) }]}
                        >
                          {addr.network}
                        </Text>
                      </View>
                      <Text style={styles.addressType}>{addr.address.addressType}</Text>
                    </View>
                    <Text style={styles.addressValue} selectable>
                      {truncateAddress(addr.address.address)}
                    </Text>
                    <Text style={styles.derivationPath}>{addr.derivationPath}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No addresses</Text>
              )}
            </View>

            {/* Balances */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Balances{balances.length > 0 ? ` (${balances.length})` : ''}
              </Text>
              {balances.length > 0 ? (
                balances.map((balance, index) => (
                  <View key={balance.assetId + String(index)} style={styles.balanceCard}>
                    <View style={styles.balanceTop}>
                      <Text style={styles.assetId} numberOfLines={1}>
                        {balance.assetId}
                      </Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>Amount</Text>
                      <Text style={styles.balanceValue}>{balance.amount}</Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>Value</Text>
                      <Text style={styles.balanceValue}>
                        {currencyFormatter.format(
                          parseFloat(balance.convertedValue.amount) || 0,
                        )}
                      </Text>
                    </View>
                    {balance.lockedAmount ? (
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>Locked</Text>
                        <Text style={styles.balanceValueLocked}>{balance.lockedAmount}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No balances</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Wallet not found</Text>
          </View>
        )}
      </ScrollView>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        presentationStyle="formSheet"
        animationType="slide"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Rename Wallet</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="New wallet name"
            value={renameName}
            onChangeText={setRenameName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholderTextColor="#999"
            autoFocus
          />
          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowRenameModal(false);
                setRenameName('');
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                styles.submitBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleRename}
              disabled={renameLoading || !renameName.trim()}
            >
              {renameLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Rename</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add Network Modal */}
      <Modal
        visible={showAddNetworkModal}
        presentationStyle="formSheet"
        animationType="slide"
        onRequestClose={() => setShowAddNetworkModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Network</Text>
          <Text style={styles.modalLabel}>Select networks to add</Text>
          <View style={styles.networkPickerRow}>
            {AVAILABLE_NETWORKS.map((network) => {
              const selected = addNetworks.includes(network);
              return (
                <Pressable
                  key={network}
                  style={({ pressed }) => [
                    styles.networkOption,
                    selected && {
                      backgroundColor: getNetworkColor(network) + '20',
                      borderColor: getNetworkColor(network),
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => toggleAddNetwork(network)}
                >
                  <Text
                    style={[
                      styles.networkOptionText,
                      selected && { color: getNetworkColor(network) },
                    ]}
                  >
                    {network}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowAddNetworkModal(false);
                setAddNetworks([]);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                styles.submitBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleAddNetwork}
              disabled={addNetworkLoading || addNetworks.length === 0}
            >
              {addNetworkLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Add</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  walletName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  archivedBadgeContainer: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  archivedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9800',
  },
  networksRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  networkText: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  valueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 20,
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  currencyCode: {
    fontSize: 14,
    color: '#999',
  },
  actionsRow: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  renameButton: {
    backgroundColor: '#1976d2',
  },
  archiveButton: {
    backgroundColor: '#ff9800',
  },
  unarchiveButton: {
    backgroundColor: '#4caf50',
  },
  addNetworkButton: {
    backgroundColor: '#4caf50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 8,
    gap: 6,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  addressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressType: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    fontFamily: 'Courier',
  },
  derivationPath: {
    fontSize: 12,
    color: '#999',
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 8,
    gap: 6,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  balanceTop: {
    marginBottom: 4,
  },
  assetId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  balanceValueLocked: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff9800',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  networkPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  networkOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  networkOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitBtn: {
    backgroundColor: '#1976d2',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
