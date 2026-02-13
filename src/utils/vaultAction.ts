import type { VaultActionType, VaultActionStatus, VaultActionApproval } from '../types';
import { SUCCESS, DANGER, PURPLE, PRIMARY, WARNING, GREY, BLUE_GREY } from '../constants/colors';

export const VAULT_ACTION_TYPE_LABELS: Record<VaultActionType, string> = {
  CHANGE_ADMIN_QUORUM_SIZE: 'Change Admin Quorum',
  CHANGE_VAULT_OWNER: 'Change Vault Owner',
  CREATE_ADDRESS_BOOK_ENTRIES: 'Create Address Book Entries',
  CREATE_WALLET: 'Create Wallet',
  DELETE_ADDRESS_BOOK_ENTRIES: 'Delete Address Book Entries',
  INVITE_MEMBERS: 'Invite Members',
  REMOVE_MEMBERS: 'Remove Members',
  RENAME_VAULT: 'Rename Vault',
  RENAME_WALLET: 'Rename Wallet',
  UPDATE_ADDRESS_BOOK_ENTRIES: 'Update Address Book Entries',
  UPDATE_MEMBER_ROLES: 'Update Member Roles',
  UPDATE_VAULT_INFO: 'Update Vault Info',
  ARCHIVE_WALLET: 'Archive Wallet',
  UNARCHIVE_WALLET: 'Unarchive Wallet',
};

export const VAULT_ACTION_STATUS_LABELS: Record<VaultActionStatus, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  REJECTED: 'Rejected',
  PENDING_SIGNATURE: 'Pending Signature',
  PENDING_EXECUTION: 'Pending Execution',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
};

export const getActionStatusColor = (status: VaultActionStatus): string => {
  switch (status) {
    case 'COMPLETED':
      return SUCCESS;
    case 'PENDING_APPROVAL':
    case 'PENDING_SIGNATURE':
    case 'PENDING_EXECUTION':
      return WARNING;
    case 'REJECTED':
    case 'FAILED':
      return DANGER;
    case 'CANCELED':
      return BLUE_GREY;
    case 'EXPIRED':
      return GREY;
    default:
      return GREY;
  }
};

export const getActionTypeColor = (type: VaultActionType): string => {
  switch (type) {
    case 'CREATE_WALLET':
    case 'CREATE_ADDRESS_BOOK_ENTRIES':
    case 'INVITE_MEMBERS':
    case 'UNARCHIVE_WALLET':
      return SUCCESS;
    case 'REMOVE_MEMBERS':
    case 'DELETE_ADDRESS_BOOK_ENTRIES':
    case 'ARCHIVE_WALLET':
      return DANGER;
    case 'CHANGE_ADMIN_QUORUM_SIZE':
    case 'CHANGE_VAULT_OWNER':
    case 'UPDATE_MEMBER_ROLES':
      return PURPLE;
    case 'RENAME_VAULT':
    case 'RENAME_WALLET':
    case 'UPDATE_VAULT_INFO':
    case 'UPDATE_ADDRESS_BOOK_ENTRIES':
      return WARNING;
    default:
      return PRIMARY;
  }
};

export const ALL_VAULT_ACTION_TYPES: VaultActionType[] = [
  'CHANGE_ADMIN_QUORUM_SIZE',
  'CHANGE_VAULT_OWNER',
  'CREATE_ADDRESS_BOOK_ENTRIES',
  'CREATE_WALLET',
  'DELETE_ADDRESS_BOOK_ENTRIES',
  'INVITE_MEMBERS',
  'REMOVE_MEMBERS',
  'RENAME_VAULT',
  'RENAME_WALLET',
  'UPDATE_ADDRESS_BOOK_ENTRIES',
  'UPDATE_MEMBER_ROLES',
  'UPDATE_VAULT_INFO',
  'ARCHIVE_WALLET',
  'UNARCHIVE_WALLET',
];

export const ALL_VAULT_ACTION_STATUSES: VaultActionStatus[] = [
  'PENDING_APPROVAL',
  'REJECTED',
  'PENDING_SIGNATURE',
  'PENDING_EXECUTION',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'EXPIRED',
];

export const canRespondToAction = (status: VaultActionStatus): boolean =>
  status === 'PENDING_APPROVAL';

export const canCancelAction = (status: VaultActionStatus): boolean =>
  status === 'PENDING_APPROVAL' || status === 'PENDING_SIGNATURE' || status === 'PENDING_EXECUTION';

export const getApprovalProgress = (
  approvals: VaultActionApproval[],
  requiredApprovers: number,
): string => {
  const approved = approvals.filter((a) => a.approved).length;
  return `${approved}/${requiredApprovers} approved`;
};
