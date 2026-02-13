import type { VaultRole, Network } from '../types';
import { PRIMARY, WARNING, SUCCESS, GREY, BITCOIN, SOLANA } from '../constants/colors';

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
      return PRIMARY;
    case 'ADMIN':
      return WARNING;
    case 'SIGNER':
      return SUCCESS;
    case 'VIEWER':
      return GREY;
  }
};

export const canManageWallets = (role: VaultRole): boolean =>
  role === 'OWNER' || role === 'ADMIN';

export const getNetworkColor = (network: Network): string => {
  switch (network) {
    case 'BITCOIN':
      return BITCOIN;
    case 'SOLANA':
      return SOLANA;
  }
};
