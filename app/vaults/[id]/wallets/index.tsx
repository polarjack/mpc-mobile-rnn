import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WalletListScreen } from '../../../../src/screens/WalletListScreen';

export default function Wallets() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WalletListScreen vaultId={id!} />;
}
