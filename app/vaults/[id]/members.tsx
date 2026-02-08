import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { VaultMembersScreen } from '../../../src/screens/VaultMembersScreen';

export default function VaultMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VaultMembersScreen vaultId={id!} />;
}
