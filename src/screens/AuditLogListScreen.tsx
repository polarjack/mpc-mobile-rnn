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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { fetchAuditLogs } from '../services/api';
import {
  AUDIT_EVENT_LABELS,
  getEventTypeColor,
  getActorDisplayName,
  formatAuditTimestamp,
  ALL_AUDIT_EVENT_TYPES,
} from '../utils/auditLog';
import type { AuditLogListItem, AuditLogPagination, AuditEventType, SortOrder } from '../types';

const PAGE_SIZE = 20;

const keyExtractor = (item: AuditLogListItem) => item.id;

interface Filters {
  eventTypes: AuditEventType[];
  startTime: string;
  endTime: string;
  sortOrder: SortOrder;
}

const DEFAULT_FILTERS: Filters = {
  eventTypes: [],
  startTime: '',
  endTime: '',
  sortOrder: 'DESC',
};

interface AuditLogRowProps {
  item: AuditLogListItem;
  onPress: (item: AuditLogListItem) => void;
}

const AuditLogRow = React.memo<AuditLogRowProps>(({ item, onPress }) => {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const color = getEventTypeColor(item.eventType);

  return (
    <Pressable
      style={({ pressed }) => [styles.logRow, pressed && { opacity: 0.7 }]}
      onPress={handlePress}
    >
      <View style={[styles.eventDot, { backgroundColor: color }]} />
      <View style={styles.logInfo}>
        <Text style={styles.eventLabel} numberOfLines={1}>
          {AUDIT_EVENT_LABELS[item.eventType] || item.eventType}
        </Text>
        <Text style={styles.actorName} numberOfLines={1}>
          {getActorDisplayName(item.actor)}
        </Text>
      </View>
      <Text style={styles.timestamp}>{formatAuditTimestamp(item.createdAt)}</Text>
    </Pressable>
  );
});

interface Props {
  vaultId: string;
}

export const AuditLogListScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLogListItem[]>([]);
  const [pagination, setPagination] = useState<AuditLogPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.eventTypes.length > 0) count++;
    if (filters.startTime) count++;
    if (filters.endTime) count++;
    if (filters.sortOrder !== 'DESC') count++;
    return count;
  }, [filters]);

  const loadLogs = useCallback(
    async (page: number, searchQuery: string, currentFilters: Filters, append: boolean) => {
      if (!accessToken) return;
      const res = await fetchAuditLogs(accessToken, vaultId, {
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        startTime: currentFilters.startTime || undefined,
        endTime: currentFilters.endTime || undefined,
        eventTypes: currentFilters.eventTypes.length > 0 ? currentFilters.eventTypes : undefined,
        sortOrder: currentFilters.sortOrder,
      });

      console.log('Fetched audit logs:', res);

      if (res._status === 200 && res.data) {
        setLogs((prev) => (append ? [...prev, ...res.data!] : res.data!));
        setPagination(res.pagination ?? null);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to load audit logs');
      }
    },
    [accessToken, vaultId],
  );

  useEffect(() => {
    setLoading(true);
    loadLogs(1, search, filters, false).then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadLogs]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      loadLogs(1, text, filters, false).then(() => setLoading(false));
    }, 300);
  };

  const handleLoadMore = useCallback(() => {
    if (!pagination || pagination.page >= pagination.totalPage || loadingMore) return;
    setLoadingMore(true);
    loadLogs(pagination.page + 1, search, filters, true).then(() => setLoadingMore(false));
  }, [pagination, loadingMore, loadLogs, search, filters]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs(1, search, filters, false).then(() => setRefreshing(false));
  }, [loadLogs, search, filters]);

  const handleLogPress = useCallback(
    (item: AuditLogListItem) => {
      router.push(`/vaults/${vaultId}/audit-logs/${item.id}`);
    },
    [router, vaultId],
  );

  const handleOpenFilters = useCallback(() => {
    setDraftFilters(filters);
    setShowFilterModal(true);
  }, [filters]);

  const handleApplyFilters = useCallback(() => {
    setFilters(draftFilters);
    setShowFilterModal(false);
    setLoading(true);
    loadLogs(1, search, draftFilters, false).then(() => setLoading(false));
  }, [draftFilters, loadLogs, search]);

  const handleClearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
  }, []);

  const toggleDraftEventType = useCallback((eventType: AuditEventType) => {
    setDraftFilters((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(eventType)
        ? prev.eventTypes.filter((et) => et !== eventType)
        : [...prev.eventTypes, eventType],
    }));
  }, []);

  const renderLog = useCallback(
    ({ item }: { item: AuditLogListItem }) => (
      <AuditLogRow item={item} onPress={handleLogPress} />
    ),
    [handleLogPress],
  );

  if (loading && logs.length === 0) {
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Audit Logs</Text>
        <Pressable
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.7 }]}
          onPress={handleOpenFilters}
        >
          <Text style={styles.filterButtonText}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search audit logs..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* List */}
      <FlatList
        data={logs}
        keyExtractor={keyExtractor}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color="#1976d2" />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No audit logs found</Text>
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

              {/* Date Range */}
              <Text style={styles.modalLabel}>Start Time (ISO 8601)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2024-01-01T00:00:00Z"
                value={draftFilters.startTime}
                onChangeText={(text) =>
                  setDraftFilters((prev) => ({ ...prev, startTime: text }))
                }
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.modalLabel}>End Time (ISO 8601)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2024-12-31T23:59:59Z"
                value={draftFilters.endTime}
                onChangeText={(text) =>
                  setDraftFilters((prev) => ({ ...prev, endTime: text }))
                }
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Event Types */}
              <Text style={styles.modalLabel}>Event Types</Text>
              <View style={styles.chipRow}>
                {ALL_AUDIT_EVENT_TYPES.map((eventType) => {
                  const selected = draftFilters.eventTypes.includes(eventType);
                  const color = getEventTypeColor(eventType);
                  return (
                    <Pressable
                      key={eventType}
                      style={({ pressed }) => [
                        styles.chip,
                        selected && { backgroundColor: color + '20', borderColor: color },
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => toggleDraftEventType(eventType)}
                    >
                      <Text
                        style={[styles.chipText, selected && { color }]}
                        numberOfLines={1}
                      >
                        {AUDIT_EVENT_LABELS[eventType]}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#607d8b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  logRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  actorName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
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
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
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
    borderColor: '#ddd',
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: '#1976d2' + '20',
    borderColor: '#1976d2',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sortOptionTextActive: {
    color: '#1976d2',
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
    borderColor: '#ddd',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f44336',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#1976d2',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
