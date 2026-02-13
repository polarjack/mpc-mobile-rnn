import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { fetchVaultUserProfile } from '../services/api';
import { getRoleColor } from '../utils/permissions';
import {
  BG_MAIN,
  BG_WHITE,
  DIVIDER,
  PRIMARY,
  SHADOW,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from '@/constants/colors';
import type { VaultUserData } from '../types';

interface Props {
  vaultId: string;
}

export const VaultUserProfileScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<VaultUserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetchVaultUserProfile(accessToken, vaultId);
    if (res._status === 200 && res.data) {
      setProfile(res.data);
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to load profile');
    }
    setLoading(false);
  }, [accessToken, vaultId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProfile();
    }, [loadProfile]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>My Vault Profile</Text>
        </View>

        {profile && (
          <>
            {/* User Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>User Information</Text>
              <View style={styles.card}>
                <InfoRow label="Username" value={profile.username} />
                <InfoRow label="Email" value={profile.email} />
                <InfoRow
                  label="Email Verified"
                  value={profile.emailVerified ? 'Yes' : 'No'}
                  isLast
                />
              </View>
            </View>

            {/* Role */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vault Role</Text>
              <View style={styles.card}>
                <View style={styles.roleContainer}>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(profile.role) + '20' },
                    ]}
                  >
                    <Text style={[styles.roleText, { color: getRoleColor(profile.role) }]}>
                      {profile.role}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Permissions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              <View style={styles.card}>
                {profile.permissions.length > 0 ? (
                  profile.permissions.map((perm, index) => (
                    <View
                      key={perm}
                      style={[
                        styles.permRow,
                        index < profile.permissions.length - 1 && styles.permBorder,
                      ]}
                    >
                      <Text style={styles.permText}>{perm}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No permissions assigned</Text>
                )}
              </View>
            </View>
          </>
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 12,
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
  roleContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  permRow: {
    paddingVertical: 10,
  },
  permBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  permText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_TERTIARY,
    fontStyle: 'italic',
  },
});
