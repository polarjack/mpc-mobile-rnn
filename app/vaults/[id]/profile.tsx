import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VaultUserProfileScreen } from '../../../src/screens/VaultUserProfileScreen';

export default function VaultProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VaultUserProfileScreen vaultId={id!} />;
}
