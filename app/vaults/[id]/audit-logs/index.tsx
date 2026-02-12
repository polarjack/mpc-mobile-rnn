import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AuditLogListScreen } from '../../../../src/screens/AuditLogListScreen';

export default function AuditLogs() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AuditLogListScreen vaultId={id!} />;
}
