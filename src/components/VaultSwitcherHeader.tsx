import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { getRoleColor } from '../utils/permissions';
import type { Vault, VaultRole } from '../types';
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_WHITE,
  DANGER,
  BG_WHITE,
  OVERLAY,
  BG_LIGHT_BLUE,
  PRIMARY,
  BORDER_LIGHT,
} from '@/constants/colors';

const keyExtractor = (item: Vault) => item.id;

interface Props {
  currentVaultId: string;
  currentVaultName?: string;
  currentRole?: VaultRole;
}

export const VaultSwitcherHeader: React.FC<Props> = ({
  currentVaultId,
  currentVaultName,
  currentRole,
}) => {
  const { logout, isLoading } = useAuth();
  const { vaults, membershipMap } = useVault();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const hasMultipleVaults = vaults.length > 1;

  const handleLogout = useCallback(() => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  const handleVaultSelect = useCallback(
    (vaultId: string) => {
      setModalVisible(false);
      if (vaultId !== currentVaultId) {
        router.replace(`/vaults/${vaultId}`);
      }
    },
    [currentVaultId, router],
  );

  const renderVaultItem = useCallback(
    ({ item }: { item: Vault }) => {
      const role = membershipMap.get(item.id);
      const isActive = item.id === currentVaultId;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.vaultItem,
            isActive && styles.vaultItemActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => handleVaultSelect(item.id)}
        >
          <View style={styles.vaultItemContent}>
            <Text
              style={[styles.vaultItemName, isActive && styles.vaultItemNameActive]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {role && (
              <View style={[styles.vaultItemRole, { backgroundColor: getRoleColor(role) + '20' }]}>
                <Text style={[styles.vaultItemRoleText, { color: getRoleColor(role) }]}>
                  {role}
                </Text>
              </View>
            )}
          </View>
          {isActive && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
      );
    },
    [membershipMap, currentVaultId, handleVaultSelect],
  );

  const displayName = currentVaultName || 'Loading...';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.switcherButton,
            hasMultipleVaults && styles.switcherButtonTappable,
            pressed && hasMultipleVaults && { opacity: 0.7 },
          ]}
          onPress={hasMultipleVaults ? () => setModalVisible(true) : undefined}
          disabled={!hasMultipleVaults}
        >
          <Text style={styles.vaultName} numberOfLines={1}>
            {displayName}
          </Text>
          {currentRole && (
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(currentRole) + '20' }]}>
              <Text style={[styles.roleText, { color: getRoleColor(currentRole) }]}>
                {currentRole}
              </Text>
            </View>
          )}
          {hasMultipleVaults && <Text style={styles.chevron}>▾</Text>}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Vault</Text>
            <FlatList
              data={vaults}
              keyExtractor={keyExtractor}
              renderItem={renderVaultItem}
              style={styles.modalList}
            />
            <Pressable
              style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switcherButtonTappable: {
    paddingVertical: 4,
  },
  vaultName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    flexShrink: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginLeft: 2,
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DANGER,
  },
  logoutText: {
    color: TEXT_WHITE,
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: BG_WHITE,
    borderRadius: 16,
    width: '85%',
    maxHeight: '60%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  vaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  vaultItemActive: {
    backgroundColor: BG_LIGHT_BLUE,
  },
  vaultItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    flexShrink: 1,
    marginRight: 8,
  },
  vaultItemNameActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  vaultItemRole: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vaultItemRoleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
  },
  modalCloseText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
});
