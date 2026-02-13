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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { fetchVault, updateVault } from '../services/api';
import type { Vault } from '../types';
import {
  BG_MAIN,
  BG_WHITE,
  PRIMARY,
  SHADOW,
  TEXT_PRIMARY,
  TEXT_TERTIARY,
  TEXT_WHITE,
} from '@/constants/colors';

interface Props {
  vaultId: string;
}

export const VaultSettingsScreen: React.FC<Props> = ({ vaultId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const loadVault = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetchVault(accessToken, vaultId);
    if (res._status === 200 && res.data) {
      const v = res.data;
      setVault(v);
      setName(v.name);
      setBusinessEmail(v.businessEmail || '');
      setPhone(v.phone || '');
      setWebsiteUrl(v.websiteUrl || '');
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to load vault');
    }
    setLoading(false);
  }, [accessToken, vaultId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadVault();
    }, [loadVault]),
  );

  const handleSave = async () => {
    if (!accessToken || !vault) return;
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    if (!businessEmail.trim()) {
      Alert.alert('Validation', 'Business email is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone is required');
      return;
    }

    setSaving(true);
    const res = await updateVault(accessToken, vaultId, {
      name: name.trim(),
      businessEmail: businessEmail.trim(),
      phone: phone.trim(),
      websiteUrl: websiteUrl.trim() || null,
    });
    setSaving(false);

    if (res._status === 200 && res.data) {
      setVault(res.data);
      Alert.alert('Success', 'Vault settings updated');
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to update vault');
    }
  };

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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Vault name"
            placeholderTextColor={TEXT_TERTIARY}
          />

          <Text style={styles.label}>Business Email *</Text>
          <TextInput
            style={styles.input}
            value={businessEmail}
            onChangeText={setBusinessEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={TEXT_TERTIARY}
          />

          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
            placeholderTextColor={TEXT_TERTIARY}
          />

          <Text style={styles.label}>Website URL</Text>
          <TextInput
            style={styles.input}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://example.com"
            keyboardType="url"
            autoCapitalize="none"
            placeholderTextColor={TEXT_TERTIARY}
          />

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={TEXT_WHITE} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  card: {
    backgroundColor: BG_WHITE,
    borderRadius: 12,
    padding: 20,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: BG_MAIN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  saveButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: TEXT_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
