import type { VaultRole, Network } from '../types';

const ROLE_HIERARCHY: Record<VaultRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  SIGNER: 2,
  VIEWER: 1,
};

export const canManageMembers = (role: VaultRole): boolean =>
  role === 'OWNER' || role === 'ADMIN';

export const canEditVault = (role: VaultRole): boolean =>
  role === 'OWNER' || role === 'ADMIN';

export const canManageMember = (currentRole: VaultRole, targetRole: VaultRole): boolean =>
  ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[targetRole]; // currently setup as can only manage members with same or lower role.

export const getRoleColor = (role: VaultRole): string => {
  switch (role) {
    case 'OWNER':
      return '#1976d2';
    case 'ADMIN':
      return '#ff9800';
    case 'SIGNER':
      return '#4caf50';
    case 'VIEWER':
      return '#9e9e9e';
  }
};

export const canManageWallets = (role: VaultRole): boolean =>
  role === 'OWNER' || role === 'ADMIN';

export const getNetworkColor = (network: Network): string => {
  switch (network) {
    case 'BITCOIN':
      return '#f7931a';
    case 'SOLANA':
      return '#9945ff';
  }
};
