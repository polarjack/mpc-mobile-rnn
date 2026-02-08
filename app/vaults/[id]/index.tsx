import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VaultDetailScreen } from '../../../src/screens/VaultDetailScreen';

export default function VaultDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VaultDetailScreen vaultId={id!} />;
}
