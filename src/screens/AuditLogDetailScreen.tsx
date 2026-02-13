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
import { fetchAuditLogDetail } from '../services/api';
import {
  AUDIT_EVENT_LABELS,
  getEventTypeColor,
  getActorDisplayName,
  getActorSubtitle,
} from '../utils/auditLog';
import type { AuditLogDetail } from '../types';
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

const InfoRow: React.FC<{ label: string; value: string; isLast?: boolean; selectable?: boolean }> = ({
  label,
  value,
  isLast,
  selectable,
}) => (
  <View style={[infoStyles.row, !isLast && infoStyles.border]}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value} numberOfLines={selectable ? undefined : 1} selectable={selectable}>
      {value}
    </Text>
  </View>
);

interface Props {
  vaultId: string;
  logId: string;
}

export const AuditLogDetailScreen: React.FC<Props> = ({ vaultId, logId }) => {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetchAuditLogDetail(accessToken, vaultId, logId);
      if (res._status === 200 && res.data) {
        setLog(res.data);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to load audit log');
      }
    } catch {
      Alert.alert('Error', 'Failed to load audit log details');
    } finally {
      setLoading(false);
    }
  }, [accessToken, vaultId, logId]);

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
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Audit log not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const eventColor = getEventTypeColor(log.eventType);
  const actorSubtitle = getActorSubtitle(log.actor);

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

        {/* Event Badge */}
        <View style={styles.section}>
          <View style={[styles.eventBadge, { backgroundColor: eventColor + '20' }]}>
            <Text style={[styles.eventBadgeText, { color: eventColor }]}>
              {AUDIT_EVENT_LABELS[log.eventType] || log.eventType}
            </Text>
          </View>
          <Text style={styles.eventTypeRaw}>{log.eventType}</Text>
        </View>

        {/* Actor Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actor</Text>
          <View style={styles.card}>
            <InfoRow label="Type" value={log.actor.type} />
            <InfoRow label="Name" value={getActorDisplayName(log.actor)} />
            {actorSubtitle && (
              <InfoRow
                label={log.actor.type === 'USER' ? 'Email' : 'Info'}
                value={actorSubtitle}
              />
            )}
            <InfoRow label="ID" value={log.actor.parameters.id} isLast selectable />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <InfoRow label="Log ID" value={log.id} selectable />
            <InfoRow
              label="Timestamp"
              value={new Date(log.createdAt).toLocaleString()}
            />
            <InfoRow label="IP Address" value={log.ipAddress} isLast selectable />
          </View>
        </View>

        {/* Payload Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payload</Text>
          <View style={styles.card}>
            <Text style={styles.payloadText} selectable>
              {JSON.stringify(log.payload, null, 2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  errorText: {
    fontSize: 16,
    color: TEXT_TERTIARY,
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
    color: PRIMARY,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
  },
  eventBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventTypeRaw: {
    fontSize: 12,
    color: TEXT_TERTIARY,
    marginTop: 4,
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
  payloadText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontFamily: 'Courier',
    lineHeight: 20,
  },
});
