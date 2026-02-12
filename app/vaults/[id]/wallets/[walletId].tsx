import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WalletDetailScreen } from '../../../../src/screens/WalletDetailScreen';

export default function WalletDetail() {
  const { id, walletId } = useLocalSearchParams<{ id: string; walletId: string }>();
  return <WalletDetailScreen vaultId={id!} walletId={walletId!} />;
}
