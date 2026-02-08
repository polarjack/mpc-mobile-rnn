import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { fetchVault, fetchVaultUserProfile } from '../services/api';
import { canManageMembers, getRoleColor } from '../utils/permissions';
import type { Vault, VaultUserData } from '../types';

interface Props {
  vaultId: string;
}

export const VaultDetailScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [vault, setVault] = useState<Vault | null>(null);
  const [vaultUser, setVaultUser] = useState<VaultUserData | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
  }, [accessToken, vaultId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
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

  const role = vaultUser?.role;
  const showSettings = role ? canManageMembers(role) : false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Vault Info */}
        {vault && (
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.vaultName}>{vault.name}</Text>
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
            </View>

            {role && (
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(role) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(role) }]}>{role}</Text>
              </View>
            )}

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

          <TouchableOpacity
            style={[styles.navButton, styles.primaryButton]}
            onPress={() => router.push(`/vaults/${vaultId}/members`)}
          >
            <Text style={styles.navButtonText}>Members</Text>
          </TouchableOpacity>

          {showSettings && (
            <TouchableOpacity
              style={[styles.navButton, styles.settingsButton]}
              onPress={() => router.push(`/vaults/${vaultId}/settings`)}
            >
              <Text style={styles.navButtonText}>Settings</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navButton, styles.profileButton]}
            onPress={() => router.push(`/vaults/${vaultId}/profile`)}
          >
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  vaultName: {
    fontSize: 22,
    fontWeight: 'bold',
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
    marginBottom: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
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
});
