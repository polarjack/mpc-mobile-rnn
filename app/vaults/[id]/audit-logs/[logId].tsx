import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AuditLogDetailScreen } from '../../../../src/screens/AuditLogDetailScreen';

export default function AuditLogDetailRoute() {
  const { id, logId } = useLocalSearchParams<{ id: string; logId: string }>();
  return <AuditLogDetailScreen vaultId={id!} logId={logId!} />;
}
