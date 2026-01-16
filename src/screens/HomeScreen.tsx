import React, { useState } from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { CountdownTimer } from '../components/CountdownTimer';
import { TokenDisplay } from '../components/TokenDisplay';
import { fetchUserProfile } from '../services/api';
import type { ApiResponse, UserData } from '../types';

export const HomeScreen: React.FC = () => {
  const {
    user,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    logout,
    refreshAccessToken,
    isLoading,
  } = useAuth();

  const [apiResponse, setApiResponse] = useState<ApiResponse<UserData> | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      await refreshAccessToken();
      Alert.alert('Success', 'Token refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh token');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFetchProfile = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'No access token available');
      return;
    }

    setIsLoadingApi(true);
    try {
      const response = await fetchUserProfile(accessToken);
      setApiResponse(response);
    } catch (error) {
      setApiResponse({
        _status: 500,
        error: {
          type: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } finally {
      setIsLoadingApi(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MPC Mobile</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.preferred_username || user?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Subject ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user?.sub || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Token Expiration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Status</Text>
          <CountdownTimer
            label="Access Token Expires"
            expiresAt={accessTokenExpiresAt}
            warningThreshold={120}
          />
          <CountdownTimer
            label="Refresh Token Expires"
            expiresAt={refreshTokenExpiresAt}
            warningThreshold={3600}
          />
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.refreshButton]}
              onPress={handleRefreshToken}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Refresh Token</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.apiButton]}
              onPress={handleFetchProfile}
              disabled={isLoadingApi}
            >
              {isLoadingApi ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Backend API</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* API Response */}
        {apiResponse && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>API Response</Text>
            <View style={[
              styles.responseCard,
              apiResponse._status === 200 ? styles.successCard : styles.errorCard
            ]}>
              <View style={styles.responseHeader}>
                <Text style={styles.responseStatus}>Status: {apiResponse._status}</Text>
              </View>
              <ScrollView style={styles.responseBody} horizontal>
                <Text style={styles.responseText}>
                  {JSON.stringify(apiResponse, null, 2)}
                </Text>
              </ScrollView>
            </View>
          </View>
        )}

        {/* JWT Token Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JWT Details</Text>
          <TokenDisplay token={accessToken} title="Access Token" />
          <TokenDisplay token={refreshToken} title="Refresh Token" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f44336',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#ff9800',
  },
  apiButton: {
    backgroundColor: '#4caf50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  responseCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
  },
  successCard: {
    borderColor: '#4caf50',
  },
  errorCard: {
    borderColor: '#f44336',
  },
  responseHeader: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  responseStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  responseBody: {
    maxHeight: 200,
    backgroundColor: '#1e1e1e',
    padding: 12,
  },
  responseText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d4d4d4',
    lineHeight: 18,
  },
});
