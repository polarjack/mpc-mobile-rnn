import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  fetchVaultMembers,
  fetchVaultUserProfile,
  addVaultMember,
  updateVaultMemberRole,
  deleteVaultMember,
} from '../services/api';
import { canManageMembers, canManageMember, getRoleColor } from '../utils/permissions';
import type { VaultMember, VaultRole, Pagination } from '../types';

const ROLES: VaultRole[] = ['OWNER', 'ADMIN', 'SIGNER', 'VIEWER'];
const PAGE_SIZE = 20;

interface Props {
  vaultId: string;
}

export const VaultMembersScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<VaultMember[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [myRole, setMyRole] = useState<VaultRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<VaultRole>('VIEWER');
  const [addLoading, setAddLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMyRole = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetchVaultUserProfile(accessToken, vaultId);
    if (res._status === 200 && res.data) {
      setMyRole(res.data.role);
    }
  }, [accessToken, vaultId]);

  const loadMembers = useCallback(
    async (page: number, searchQuery: string, append: boolean) => {
      if (!accessToken) return;
      const res = await fetchVaultMembers(accessToken, vaultId, {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
      });
      if (res._status === 200 && res.data) {
        setMembers((prev) => (append ? [...prev, ...res.data!.members] : res.data!.members));
        setPagination(res.data.pagination);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to load members');
      }
    },
    [accessToken, vaultId],
  );

  useEffect(() => {
    const init = async () => {
      await loadMyRole();
      await loadMembers(1, '', false);
      setLoading(false);
    };
    init();
  }, [loadMyRole, loadMembers]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      loadMembers(1, text, false).then(() => setLoading(false));
    }, 300);
  };

  const handleLoadMore = () => {
    if (!pagination || pagination.page >= pagination.totalPages || loadingMore) return;
    setLoadingMore(true);
    loadMembers(pagination.page + 1, search, true).then(() => setLoadingMore(false));
  };

  const handleMemberPress = (member: VaultMember) => {
    if (!myRole || !canManageMembers(myRole) || !canManageMember(myRole, member.role)) return;

    const options: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> =
      [
        {
          text: 'Edit Role',
          onPress: () => showRolePicker(member),
        },
        {
          text: 'Remove Member',
          style: 'destructive',
          onPress: () => confirmRemoveMember(member),
        },
        { text: 'Cancel', style: 'cancel' },
      ];

    Alert.alert(member.name || member.email, `Current role: ${member.role}`, options);
  };

  const showRolePicker = (member: VaultMember) => {
    const availableRoles = ROLES.filter(
      (r) => r !== member.role && (!myRole || canManageMember(myRole, r)),
    );
    const buttons: Array<{ text: string; onPress?: () => void }> = availableRoles.map((role) => ({
      text: role,
      onPress: () => handleUpdateRole(member, role),
    }));
    buttons.push({ text: 'Cancel' });
    Alert.alert('Select Role', `Change role for ${member.name || member.email}`, buttons);
  };

  const handleUpdateRole = async (member: VaultMember, newRole: VaultRole) => {
    if (!accessToken) return;
    const res = await updateVaultMemberRole(accessToken, vaultId, member.userId, {
      role: newRole,
    });
    if (res._status === 200) {
      Alert.alert('Success', 'Role updated');
      setLoading(true);
      await loadMembers(1, search, false);
      setLoading(false);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to update role');
    }
  };

  const confirmRemoveMember = (member: VaultMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.name || member.email} from this vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleRemoveMember(member),
        },
      ],
    );
  };

  const handleRemoveMember = async (member: VaultMember) => {
    if (!accessToken) return;
    const res = await deleteVaultMember(accessToken, vaultId, member.userId);
    if (res._status === 200) {
      Alert.alert('Success', 'Member removed');
      setLoading(true);
      await loadMembers(1, search, false);
      setLoading(false);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to remove member');
    }
  };

  const handleAddMember = async () => {
    if (!accessToken || !addEmail.trim()) return;
    setAddLoading(true);
    const res = await addVaultMember(accessToken, vaultId, {
      email: addEmail.trim(),
      role: addRole,
    });
    setAddLoading(false);
    if (res._status === 200 || res._status === 201) {
      Alert.alert('Success', 'Member added');
      setShowAddModal(false);
      setAddEmail('');
      setAddRole('VIEWER');
      setLoading(true);
      await loadMembers(1, search, false);
      setLoading(false);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to add member');
    }
  };

  const renderMember = ({ item }: { item: VaultMember }) => {
    const pressable =
      myRole && canManageMembers(myRole) && canManageMember(myRole, item.role);
    return (
      <TouchableOpacity
        style={styles.memberRow}
        onPress={() => handleMemberPress(item)}
        disabled={!pressable}
        activeOpacity={pressable ? 0.7 : 1}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.name || item.email}
          </Text>
          {item.name ? (
            <Text style={styles.memberEmail} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
        </View>
        <View
          style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}
        >
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {item.role}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && members.length === 0) {
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        {myRole && canManageMembers(myRole) && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          value={search}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerLoader} color="#1976d2" />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Member</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email address"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Role</Text>
            <View style={styles.rolePickerRow}>
              {ROLES.filter((r) => myRole && canManageMember(myRole, r)).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    addRole === role && {
                      backgroundColor: getRoleColor(role) + '20',
                      borderColor: getRoleColor(role),
                    },
                  ]}
                  onPress={() => setAddRole(role)}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      addRole === role && { color: getRoleColor(role) },
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setAddEmail('');
                  setAddRole('VIEWER');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddMember}
                disabled={addLoading || !addEmail.trim()}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add</Text>
                )}
              </TouchableOpacity>
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
  addButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
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
  memberRow: {
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
  memberInfo: {
    flex: 1,
    marginRight: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
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
  rolePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  roleOptionText: {
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
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#1976d2',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
