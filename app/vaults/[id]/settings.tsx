import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VaultSettingsScreen } from '../../../src/screens/VaultSettingsScreen';

export default function VaultSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VaultSettingsScreen vaultId={id!} />;
}
