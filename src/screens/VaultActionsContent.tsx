import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import {
  fetchVaultActions,
  approveVaultAction,
  rejectVaultAction,
  cancelVaultAction,
} from '../services/api';
import {
  PRIMARY,
  DANGER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
  BG_MAIN,
  BG_WHITE,
  BLUE_GREY,
  SHADOW,
  OVERLAY,
  BORDER_MID,
} from '@/constants/colors';
import {
  VAULT_ACTION_TYPE_LABELS,
  VAULT_ACTION_STATUS_LABELS,
  getActionStatusColor,
  getActionTypeColor,
  ALL_VAULT_ACTION_TYPES,
  ALL_VAULT_ACTION_STATUSES,
  canRespondToAction,
  canCancelAction,
  getApprovalProgress,
} from '../utils/vaultAction';
import { formatAuditTimestamp } from '../utils/auditLog';
import type {
  VaultAction,
  VaultActionPagination,
  VaultActionType,
  VaultActionStatus,
  VaultRole,
  SortOrder,
} from '../types';

const PAGE_SIZE = 20;

const keyExtractor = (item: VaultAction) => item.id;

interface Filters {
  types: VaultActionType[];
  statuses: VaultActionStatus[];
  sortOrder: SortOrder;
}

const DEFAULT_FILTERS: Filters = {
  types: [],
  statuses: [],
  sortOrder: 'DESC',
};

interface VaultActionRowProps {
  item: VaultAction;
  onPress: (item: VaultAction) => void;
}

const VaultActionRow = React.memo<VaultActionRowProps>(({ item, onPress }) => {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const statusColor = getActionStatusColor(item.status);

  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
    >
      <View style={styles.actionInfo}>
        <Text style={styles.actionTypeLabel} numberOfLines={1}>
          {VAULT_ACTION_TYPE_LABELS[item.type] || item.type}
        </Text>
        <Text style={styles.initiatorName} numberOfLines={1}>
          {item.initiator.name || item.initiator.email}
        </Text>
        <Text style={styles.approvalProgress}>
          {getApprovalProgress(item.approvals, item.requiredApprovers)}
        </Text>
      </View>
      <View style={styles.actionRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {VAULT_ACTION_STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatAuditTimestamp(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
});

interface Props {
  vaultId: string;
  role: VaultRole | null;
}

export const VaultActionsContent: React.FC<Props> = ({ vaultId, role }) => {
  const { accessToken } = useAuth();

  const [actions, setActions] = useState<VaultAction[]>([]);
  const [pagination, setPagination] = useState<VaultActionPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingAction, setRejectingAction] = useState<VaultAction | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.sortOrder !== 'DESC') count++;
    return count;
  }, [filters]);

  const loadActions = useCallback(
    async (page: number, searchQuery: string, currentFilters: Filters, append: boolean) => {
      if (!accessToken) return;
      const res = await fetchVaultActions(accessToken, vaultId, {
        page,
        limit: PAGE_SIZE,
        initiator: searchQuery || undefined,
        types: currentFilters.types.length > 0 ? currentFilters.types : undefined,
        statuses: currentFilters.statuses.length > 0 ? currentFilters.statuses : undefined,
        sortOrder: currentFilters.sortOrder,
      });

      if (res._status === 200 && res.data) {
        setActions((prev) => (append ? [...prev, ...res.data!] : res.data!));
        setPagination(res.pagination ?? null);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to load vault actions');
      }
    },
    [accessToken, vaultId],
  );

  useEffect(() => {
    setLoading(true);
    loadActions(1, search, filters, false).then(() => setLoading(false));
  }, [loadActions]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearch(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setLoading(true);
        loadActions(1, text, filters, false).then(() => setLoading(false));
      }, 300);
    },
    [loadActions, filters],
  );

  const handleLoadMore = useCallback(() => {
    if (!pagination || pagination.page >= pagination.totalPage || loadingMore) return;
    setLoadingMore(true);
    loadActions(pagination.page + 1, search, filters, true).then(() => setLoadingMore(false));
  }, [pagination, loadingMore, loadActions, search, filters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadActions(1, search, filters, false).then(() => setRefreshing(false));
  }, [loadActions, search, filters]);

  const canAct = role !== 'VIEWER' && role !== null;

  const handleActionPress = useCallback(
    (item: VaultAction) => {
      const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] =
        [];

      if (canAct && canRespondToAction(item.status)) {
        buttons.push({
          text: 'Approve',
          onPress: async () => {
            if (!accessToken) return;
            const res = await approveVaultAction(accessToken, vaultId, item.id);
            if (res._status === 200) {
              Alert.alert('Success', 'Action approved');
              setLoading(true);
              loadActions(1, search, filters, false).then(() => setLoading(false));
            } else {
              Alert.alert('Error', res.error?.message || 'Failed to approve action');
            }
          },
        });
        buttons.push({
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            setRejectingAction(item);
            setRejectReason('');
            setShowRejectModal(true);
          },
        });
      }

      if (canAct && canCancelAction(item.status)) {
        buttons.push({
          text: 'Cancel Action',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Cancel Action', 'Are you sure you want to cancel this action?', [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                  if (!accessToken) return;
                  const res = await cancelVaultAction(accessToken, vaultId, item.id);
                  if (res._status === 200) {
                    Alert.alert('Success', 'Action canceled');
                    setLoading(true);
                    loadActions(1, search, filters, false).then(() => setLoading(false));
                  } else {
                    Alert.alert('Error', res.error?.message || 'Failed to cancel action');
                  }
                },
              },
            ]);
          },
        });
      }

      buttons.push({ text: 'Close', style: 'cancel' });

      Alert.alert(
        VAULT_ACTION_TYPE_LABELS[item.type] || item.type,
        `Status: ${VAULT_ACTION_STATUS_LABELS[item.status]}\nInitiator: ${item.initiator.name || item.initiator.email}\n${getApprovalProgress(item.approvals, item.requiredApprovers)}`,
        buttons,
      );
    },
    [canAct, accessToken, vaultId, loadActions, search, filters],
  );

  const handleRejectSubmit = useCallback(async () => {
    if (!accessToken || !rejectingAction) return;
    const res = await rejectVaultAction(accessToken, vaultId, rejectingAction.id, {
      reason: rejectReason || undefined,
    });
    setShowRejectModal(false);
    setRejectingAction(null);
    if (res._status === 200) {
      Alert.alert('Success', 'Action rejected');
      setLoading(true);
      loadActions(1, search, filters, false).then(() => setLoading(false));
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to reject action');
    }
  }, [accessToken, vaultId, rejectingAction, rejectReason, loadActions, search, filters]);

  // ─── Filter handlers ───

  const handleOpenFilters = useCallback(() => {
    setDraftFilters(filters);
    setShowFilterModal(true);
  }, [filters]);

  const handleApplyFilters = useCallback(() => {
    setFilters(draftFilters);
    setShowFilterModal(false);
    setLoading(true);
    loadActions(1, search, draftFilters, false).then(() => setLoading(false));
  }, [draftFilters, loadActions, search]);

  const handleClearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
  }, []);

  const toggleDraftType = useCallback((type: VaultActionType) => {
    setDraftFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const toggleDraftStatus = useCallback((status: VaultActionStatus) => {
    setDraftFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const renderAction = useCallback(
    ({ item }: { item: VaultAction }) => (
      <VaultActionRow item={item} onPress={handleActionPress} />
    ),
    [handleActionPress],
  );

  if (loading && actions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by initiator..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor={TEXT_TERTIARY}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.7 }]}
          onPress={handleOpenFilters}
        >
          <Text style={styles.filterButtonText}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={actions}
        keyExtractor={keyExtractor}
        renderItem={renderAction}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color={PRIMARY} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No vault actions found</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Filters</Text>

              {/* Sort Order */}
              <Text style={styles.modalLabel}>Sort Order</Text>
              <View style={styles.sortRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sortOption,
                    draftFilters.sortOrder === 'DESC' && styles.sortOptionActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setDraftFilters((prev) => ({ ...prev, sortOrder: 'DESC' }))}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      draftFilters.sortOrder === 'DESC' && styles.sortOptionTextActive,
                    ]}
                  >
                    Newest First
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.sortOption,
                    draftFilters.sortOrder === 'ASC' && styles.sortOptionActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setDraftFilters((prev) => ({ ...prev, sortOrder: 'ASC' }))}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      draftFilters.sortOrder === 'ASC' && styles.sortOptionTextActive,
                    ]}
                  >
                    Oldest First
                  </Text>
                </Pressable>
              </View>

              {/* Action Types */}
              <Text style={styles.modalLabel}>Action Types</Text>
              <View style={styles.chipRow}>
                {ALL_VAULT_ACTION_TYPES.map((type) => {
                  const selected = draftFilters.types.includes(type);
                  const color = getActionTypeColor(type);
                  return (
                    <Pressable
                      key={type}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && { backgroundColor: color + '20', borderColor: color },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => toggleDraftType(type)}
                    >
                      <Text style={[styles.chipText, selected && { color }]} numberOfLines={1}>
                        {VAULT_ACTION_TYPE_LABELS[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Action Statuses */}
              <Text style={styles.modalLabel}>Status</Text>
              <View style={styles.chipRow}>
                {ALL_VAULT_ACTION_STATUSES.map((status) => {
                  const selected = draftFilters.statuses.includes(status);
                  const color = getActionStatusColor(status);
                  return (
                    <Pressable
                      key={status}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && { backgroundColor: color + '20', borderColor: color },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => toggleDraftStatus(status)}
                    >
                      <Text style={[styles.chipText, selected && { color }]} numberOfLines={1}>
                        {VAULT_ACTION_STATUS_LABELS[status]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.clearButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.cancelButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.applyButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Action</Text>
            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholderTextColor={TEXT_TERTIARY}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.cancelButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectingAction(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.rejectButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handleRejectSubmit}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingVertical: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: BG_WHITE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT_PRIMARY,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButton: {
    backgroundColor: BLUE_GREY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    color: TEXT_WHITE,
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  actionRow: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionInfo: {
    flex: 1,
    marginRight: 8,
  },
  actionTypeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  initiatorName: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  approvalProgress: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 2,
  },
  actionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: TEXT_TERTIARY,
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
  // Filter & Reject Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: BG_WHITE,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 8,
    marginTop: 4,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BORDER_MID,
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: PRIMARY + '20',
    borderColor: PRIMARY,
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  sortOptionTextActive: {
    color: PRIMARY,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BORDER_MID,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: BG_WHITE,
    borderWidth: 1,
    borderColor: BORDER_MID,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: DANGER,
  },
  cancelButton: {
    backgroundColor: BG_MAIN,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  applyButton: {
    backgroundColor: PRIMARY,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
  rejectInput: {
    backgroundColor: BG_MAIN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 12,
    minHeight: 80,
  },
  rejectButton: {
    backgroundColor: DANGER,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_WHITE,
  },
});
