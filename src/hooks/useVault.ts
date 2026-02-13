import { useContext } from 'react';
import { VaultContext } from '../context/VaultContext';
import type { VaultContextType } from '../types';

export const useVault = (): VaultContextType => {
  const context = useContext(VaultContext);

  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }

  return context;
};
