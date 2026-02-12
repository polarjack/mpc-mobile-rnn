import type { AuditEventType, ActorInfo } from '../types';

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  INITIATE_TRANSACTION: 'Initiate Transaction',
  SIGN_TRANSACTION: 'Sign Transaction',
  APPROVE_TRANSACTION: 'Approve Transaction',
  REJECT_TRANSACTION: 'Reject Transaction',
  CANCEL_TRANSACTION: 'Cancel Transaction',
  UPDATE_TRANSACTION_NOTE: 'Update Transaction Note',
  INITIATE_VAULT_ACTION: 'Initiate Vault Action',
  SIGN_VAULT_ACTION: 'Sign Vault Action',
  APPROVE_VAULT_ACTION: 'Approve Vault Action',
  REJECT_VAULT_ACTION: 'Reject Vault Action',
  CANCEL_VAULT_ACTION: 'Cancel Vault Action',
  CHANGE_ADMIN_QUORUM_SIZE: 'Change Admin Quorum',
  CREATE_WALLET: 'Create Wallet',
  UPDATE_VAULT_INFO: 'Update Vault Info',
  UNKNOWN: 'Unknown Event',
};

export const getEventTypeColor = (eventType: AuditEventType): string => {
  switch (eventType) {
    case 'INITIATE_TRANSACTION':
    case 'APPROVE_TRANSACTION':
    case 'INITIATE_VAULT_ACTION':
    case 'APPROVE_VAULT_ACTION':
      return '#4caf50'; // green - positive actions
    case 'REJECT_TRANSACTION':
    case 'CANCEL_TRANSACTION':
    case 'REJECT_VAULT_ACTION':
    case 'CANCEL_VAULT_ACTION':
      return '#f44336'; // red - negative actions
    case 'SIGN_TRANSACTION':
    case 'SIGN_VAULT_ACTION':
      return '#7b1fa2'; // purple - signing actions
    case 'CREATE_WALLET':
    case 'UPDATE_TRANSACTION_NOTE':
      return '#1976d2'; // blue - neutral actions
    case 'CHANGE_ADMIN_QUORUM_SIZE':
    case 'UPDATE_VAULT_INFO':
      return '#ff9800'; // orange - config changes
    default:
      return '#9e9e9e'; // grey - unknown
  }
};

export const getActorDisplayName = (actor: ActorInfo): string => {
  if (actor.type === 'USER') {
    return actor.parameters.name || actor.parameters.email;
  }
  return actor.parameters.name;
};

export const getActorSubtitle = (actor: ActorInfo): string | null => {
  if (actor.type === 'USER') {
    return actor.parameters.name ? actor.parameters.email : null;
  }
  return 'Service Account';
};

export const ALL_AUDIT_EVENT_TYPES: AuditEventType[] = [
  'INITIATE_TRANSACTION',
  'SIGN_TRANSACTION',
  'APPROVE_TRANSACTION',
  'REJECT_TRANSACTION',
  'CANCEL_TRANSACTION',
  'UPDATE_TRANSACTION_NOTE',
  'INITIATE_VAULT_ACTION',
  'SIGN_VAULT_ACTION',
  'APPROVE_VAULT_ACTION',
  'REJECT_VAULT_ACTION',
  'CANCEL_VAULT_ACTION',
  'CHANGE_ADMIN_QUORUM_SIZE',
  'CREATE_WALLET',
  'UPDATE_VAULT_INFO',
];

export const formatAuditTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
