import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import {
  PRIMARY,
  WARNING,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
  BG_MAIN,
  BG_WHITE,
  BG_LIGHT_ORANGE,
  BORDER_MID,
} from '@/constants/colors';
import {
  fetchWallets,
  fetchVaultUserProfile,
  createWallet,
  renameWallet,
  archiveWallet,
  unarchiveWallet,
} from '../services/api';
import { canManageWallets, getNetworkColor } from '../utils/permissions';
import type { Wallet, VaultRole, Network } from '../types';

const AVAILABLE_NETWORKS: Network[] = ['BITCOIN', 'SOLANA'];
const PAGE_SIZE = 20;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const keyExtractor = (item: Wallet) => item.id;

interface WalletCardProps {
  id: string;
  name: string;
  networks: Network[];
  archived: boolean;
  convertedAmount: string;
  currencyCode: string;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
}

const WalletCard = React.memo(function WalletCard({
  id,
  name,
  networks,
  archived,
  convertedAmount,
  onPress,
  onLongPress,
}: WalletCardProps) {
  const handlePress = useCallback(() => onPress(id), [onPress, id]);
  const handleLongPress = useCallback(() => onLongPress(id), [onLongPress, id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.walletCard, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <View style={styles.walletCardTop}>
        <Text style={styles.walletName} numberOfLines={1}>
          {name}
        </Text>
        {archived ? <Text style={styles.archivedBadge}>Archived</Text> : null}
      </View>
      <View style={styles.walletCardMiddle}>
        {networks.map((network) => (
          <View
            key={network}
            style={[styles.networkBadge, { backgroundColor: getNetworkColor(network) + '20' }]}
          >
            <Text style={[styles.networkText, { color: getNetworkColor(network) }]}>
              {network}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.walletValue}>
        {currencyFormatter.format(parseFloat(convertedAmount) || 0)}
      </Text>
    </Pressable>
  );
});

interface Props {
  vaultId: string;
  embedded?: boolean;
  role?: VaultRole | null;
}

export const WalletListScreen: React.FC<Props> = ({ vaultId, embedded, role: roleProp }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [myRole, setMyRole] = useState<VaultRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createNetworks, setCreateNetworks] = useState<Network[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletsRef = useRef<Wallet[]>([]);

  const loadMyRole = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetchVaultUserProfile(accessToken, vaultId);
    if (res._status === 200 && res.data) {
      setMyRole(res.data.role);
    }
  }, [accessToken, vaultId]);

  const loadWallets = useCallback(
    async (page: number, searchQuery: string, append: boolean) => {
      if (!accessToken) return;
      const res = await fetchWallets(accessToken, vaultId, {
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
      });
      if (res._status === 200 && res.data) {
        const newWallets = append ? [...walletsRef.current, ...res.data] : res.data;
        walletsRef.current = newWallets;
        setWallets(newWallets);
        setCurrentPage(page);
        setHasMore(res.data.length >= PAGE_SIZE);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to load wallets');
      }
    },
    [accessToken, vaultId],
  );

  useEffect(() => {
    const init = async () => {
      if (roleProp !== undefined) {
        setMyRole(roleProp);
      } else {
        await loadMyRole();
      }
      await loadWallets(1, '', false);
      setLoading(false);
    };
    init();
  }, [loadMyRole, loadWallets, roleProp]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      loadWallets(1, text, false).then(() => setLoading(false));
    }, 300);
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadWallets(currentPage + 1, search, true).then(() => setLoadingMore(false));
  }, [hasMore, loadingMore, loadWallets, currentPage, search]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    loadWallets(1, search, false).then(() => setLoading(false));
  }, [loadWallets, search]);

  const handleWalletPress = useCallback(
    (walletId: string) => {
      router.push(`/vaults/${vaultId}/wallets/${walletId}`);
    },
    [router, vaultId],
  );

  const handleWalletLongPress = useCallback(
    (walletId: string) => {
      if (!myRole || !canManageWallets(myRole)) return;
      const wallet = walletsRef.current.find((w) => w.id === walletId);
      if (!wallet) return;

      const options: Array<{
        text: string;
        onPress?: () => void;
        style?: 'cancel' | 'destructive';
      }> = [
        {
          text: 'Rename',
          onPress: () => promptRename(wallet),
        },
        wallet.archived
          ? {
              text: 'Unarchive',
              onPress: () => handleUnarchive(wallet),
            }
          : {
              text: 'Archive',
              style: 'destructive',
              onPress: () => confirmArchive(wallet),
            },
        { text: 'Cancel', style: 'cancel' },
      ];

      Alert.alert(wallet.name, `Networks: ${wallet.networks.join(', ')}`, options);
    },
    [myRole],
  );

  const promptRename = (wallet: Wallet) => {
    Alert.prompt('Rename Wallet', `Current name: ${wallet.name}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Rename',
        onPress: async (newName?: string) => {
          if (!accessToken || !newName?.trim()) return;
          const res = await renameWallet(accessToken, vaultId, wallet.id, {
            name: newName.trim(),
          });
          if (res._status === 200) {
            handleRefresh();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to rename wallet');
          }
        },
      },
    ], 'plain-text', wallet.name);
  };

  const confirmArchive = (wallet: Wallet) => {
    Alert.alert('Archive Wallet', `Are you sure you want to archive "${wallet.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          if (!accessToken) return;
          const res = await archiveWallet(accessToken, vaultId, wallet.id);
          if (res._status === 200) {
            handleRefresh();
          } else {
            Alert.alert('Error', res.error?.message || 'Failed to archive wallet');
          }
        },
      },
    ]);
  };

  const handleUnarchive = async (wallet: Wallet) => {
    if (!accessToken) return;
    const res = await unarchiveWallet(accessToken, vaultId, wallet.id);
    if (res._status === 200) {
      handleRefresh();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to unarchive wallet');
    }
  };

  const toggleNetwork = (network: Network) => {
    setCreateNetworks((prev) =>
      prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network],
    );
  };

  const handleCreateWallet = async () => {
    if (!accessToken || !createName.trim() || createNetworks.length === 0) return;
    setCreateLoading(true);
    const res = await createWallet(accessToken, vaultId, {
      name: createName.trim(),
      networks: createNetworks,
    });
    setCreateLoading(false);
    if (res._status === 200 || res._status === 201) {
      Alert.alert('Success', 'Wallet created');
      setShowCreateModal(false);
      setCreateName('');
      setCreateNetworks([]);
      handleRefresh();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to create wallet');
    }
  };

  const renderWallet = useCallback(
    ({ item }: { item: Wallet }) => (
      <WalletCard
        id={item.id}
        name={item.name}
        networks={item.networks}
        archived={item.archived}
        convertedAmount={item.convertedValue.amount}
        currencyCode={item.convertedValue.currencyCode}
        onPress={handleWalletPress}
        onLongPress={handleWalletLongPress}
      />
    ),
    [handleWalletPress, handleWalletLongPress],
  );

  const Wrapper = embedded ? View : SafeAreaView;

  if (loading && wallets.length === 0) {
    return (
      <Wrapper style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={styles.container}>
      {/* Header (standalone mode only) */}
      {!embedded && (
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Wallets</Text>
          {myRole && canManageWallets(myRole) ? (
            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.7 }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>+ Create</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={embedded ? styles.searchRow : undefined}>
          <TextInput
            style={[styles.searchInput, embedded && styles.searchInputFlex]}
            placeholder="Search wallets..."
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor={TEXT_TERTIARY}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {embedded && myRole && canManageWallets(myRole) ? (
            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.7 }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>+ Create</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={wallets}
        keyExtractor={keyExtractor}
        renderItem={renderWallet}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={PRIMARY} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No wallets found</Text>
          </View>
        }
      />

      {/* Create Wallet Modal */}
      <Modal
        visible={showCreateModal}
        presentationStyle="formSheet"
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Wallet</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Wallet name"
            value={createName}
            onChangeText={setCreateName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholderTextColor={TEXT_TERTIARY}
          />

          <Text style={styles.modalLabel}>Networks</Text>
          <View style={styles.networkPickerRow}>
            {AVAILABLE_NETWORKS.map((network) => {
              const selected = createNetworks.includes(network);
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
                  onPress={() => toggleNetwork(network)}
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
                styles.cancelButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setShowCreateModal(false);
                setCreateName('');
                setCreateNetworks([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                styles.submitButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleCreateWallet}
              disabled={createLoading || !createName.trim() || createNetworks.length === 0}
            >
              {createLoading ? (
                <ActivityIndicator color={TEXT_WHITE} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </Wrapper>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  createButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: TEXT_WHITE,
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputFlex: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: BG_WHITE,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT_PRIMARY,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  walletCard: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 8,
    gap: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  walletCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  archivedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: WARNING,
    backgroundColor: BG_LIGHT_ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  walletCardMiddle: {
    flexDirection: 'row',
    gap: 6,
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
  walletValue: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  footerLoader: {
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: TEXT_TERTIARY,
  },
  modalContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
    backgroundColor: BG_WHITE,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: BG_MAIN,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
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
    borderColor: BORDER_MID,
  },
  networkOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
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
  cancelButton: {
    backgroundColor: BG_MAIN,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  submitButton: {
    backgroundColor: PRIMARY,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
});
