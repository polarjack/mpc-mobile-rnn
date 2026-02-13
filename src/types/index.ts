// User information from JWT token
export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

// Auth context type
export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

// Token storage structure
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

// API response types
export interface ApiResponse<T> {
  _status: number;
  data?: T;
  error?: {
    type: string;
    message: string;
  };
}

export type VaultRole = 'OWNER' | 'ADMIN' | 'SIGNER' | 'VIEWER';

export interface VaultMembership {
  vaultId: string;
  vaultName: string;
  role: VaultRole;
  joinedAt: string;
}

export interface UserData {
  userId: string;
  keycloakUserId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  vaultMemberships: VaultMembership[];
}

export interface Vault {
  id: string;
  name: string;
  businessEmail: string;
  phone: string;
  websiteUrl: string;
  tssCoordinatorEndpoint: string;
  activated: boolean;
  updatedAt: string;
}

export interface VaultUserData {
  userId: string;
  keycloakUserId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  vaultId: string;
  role: VaultRole;
  permissions: string[];
}

export interface VaultMember {
  userId: string;
  name: string;
  email: string;
  role: VaultRole;
  joinedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface VaultMembersData {
  vaultId: string;
  members: VaultMember[];
  pagination: Pagination;
}

export interface UpdateVaultRequest {
  name: string;
  businessEmail: string;
  phone: string;
  websiteUrl?: string | null;
}

export interface AddVaultMemberRequest {
  email: string;
  role: VaultRole;
}

export interface AddVaultMemberResponse {
  vaultId: string;
  userId: string;
  role: string;
  message: string;
}

export interface UpdateVaultMemberRoleRequest {
  role: VaultRole;
}

export interface UpdateVaultMemberRoleResponse {
  vaultId: string;
  userId: string;
  role: string;
  message: string;
}

export interface DeleteVaultMemberResponse {
  vaultId: string;
  userId: string;
  message: string;
}

export interface FetchVaultMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ─── Wallet Types ───

export type Network = 'BITCOIN' | 'SOLANA';

export interface DisplayedAddress {
  address: string;
  addressType: string;
}

export interface ConvertedValue {
  amount: string;
  currencyCode: string;
}

export interface Wallet {
  id: string;
  vaultId: string;
  name: string;
  networks: Network[];
  convertedValue: ConvertedValue;
  addresses: DisplayedAddress[];
  balancedAssets: string[];
  accountIndex: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletAddress {
  id: string;
  network: Network;
  address: DisplayedAddress;
  derivationPath: string;
}

export interface WalletBalance {
  assetId: string;
  rawValue: string;
  amount: string;
  convertedValue: ConvertedValue;
  walletId: string;
  walletName: string;
  lockedAmount?: string;
  lockedConvertedValue?: ConvertedValue;
}

export interface VaultBalance {
  assetId: string;
  rawValue: string;
  amount: string;
  convertedValue: ConvertedValue;
  lockedAmount?: string;
  lockedConvertedValue?: ConvertedValue;
  vaultId: string;
  walletBalances: WalletBalance[];
}

export interface WalletPagination {
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
}

export interface WalletsData {
  wallets: Wallet[];
  pagination: WalletPagination;
}

export interface CreateWalletRequest {
  name: string;
  networks: Network[];
}

export interface UpdateWalletRequest {
  name: string;
}

export interface CreateWalletAddressRequest {
  networks: Network[];
}

export interface FetchWalletsParams {
  page?: number;
  limit?: number;
  search?: string;
  network?: Network;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Audit Log Types ───

export type AuditEventType =
  | 'INITIATE_TRANSACTION' | 'SIGN_TRANSACTION' | 'APPROVE_TRANSACTION'
  | 'REJECT_TRANSACTION' | 'CANCEL_TRANSACTION' | 'UPDATE_TRANSACTION_NOTE'
  | 'INITIATE_VAULT_ACTION' | 'SIGN_VAULT_ACTION' | 'APPROVE_VAULT_ACTION'
  | 'REJECT_VAULT_ACTION' | 'CANCEL_VAULT_ACTION'
  | 'CHANGE_ADMIN_QUORUM_SIZE' | 'CREATE_WALLET' | 'UPDATE_VAULT_INFO' | 'UNKNOWN';

export type SortOrder = 'ASC' | 'DESC';

export type ActorInfo =
  | { type: 'USER'; parameters: { id: string; name: string; email: string } }
  | { type: 'SERVICE_ACCOUNT'; parameters: { id: string; name: string } };

export interface AuditLogListItem {
  id: string;
  createdAt: string;
  actor: ActorInfo;
  eventType: AuditEventType;
  payload: Record<string, unknown>;
}

export interface AuditLogDetail extends AuditLogListItem {
  ipAddress: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
}

export interface AuditLogsResponse {
  _status: number;
  data?: AuditLogListItem[];
  pagination?: AuditLogPagination;
  error?: {
    type: string;
    message: string;
  };
}

export interface FetchAuditLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  startTime?: string;
  endTime?: string;
  actorIds?: string[];
  eventTypes?: AuditEventType[];
  sortOrder?: SortOrder;
}

// ─── Vault Action Types ───

export type VaultActionType =
  | 'CHANGE_ADMIN_QUORUM_SIZE'
  | 'CHANGE_VAULT_OWNER'
  | 'CREATE_ADDRESS_BOOK_ENTRIES'
  | 'CREATE_WALLET'
  | 'DELETE_ADDRESS_BOOK_ENTRIES'
  | 'INVITE_MEMBERS'
  | 'REMOVE_MEMBERS'
  | 'RENAME_VAULT'
  | 'RENAME_WALLET'
  | 'UPDATE_ADDRESS_BOOK_ENTRIES'
  | 'UPDATE_MEMBER_ROLES'
  | 'UPDATE_VAULT_INFO'
  | 'ARCHIVE_WALLET'
  | 'UNARCHIVE_WALLET';

export type VaultActionStatus =
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'PENDING_SIGNATURE'
  | 'PENDING_EXECUTION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'EXPIRED';

export interface UserBrief {
  id: string;
  name: string;
  email: string;
}

export interface VaultActionApproval {
  id: string;
  vaultActionId: string;
  approver: UserBrief;
  approved: boolean;
  reason?: string;
  createdAt: string;
}

export type VaultActionContent = ChangeAdminQuorumSizeContent | Record<string, unknown>;

export interface ChangeAdminQuorumSizeContent {
  newQuorumSize: number;
}

export interface VaultActionTimeline {
  id: string;
  vaultActionId: string;
  vaultActionStatus: VaultActionStatus;
  createdAt: string;
  description?: string;
}

export interface VaultAction {
  id: string;
  vaultId: string;
  initiator: UserBrief;
  type: VaultActionType;
  status: VaultActionStatus;
  requiredApprovers: number;
  createdAt: string;
  updatedAt: string;
  approvals: VaultActionApproval[];
  content: VaultActionContent;
  timelines: VaultActionTimeline[];
}

export interface VaultActionPagination {
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
}

export interface VaultActionsResponse {
  _status: number;
  data?: VaultAction[];
  pagination?: VaultActionPagination;
  error?: {
    type: string;
    message: string;
  };
}

export interface FetchVaultActionsParams {
  page?: number;
  limit?: number;
  initiator?: string;
  types?: VaultActionType[];
  statuses?: VaultActionStatus[];
  sortOrder?: SortOrder;
}

export interface RejectVaultActionRequest {
  reason?: string;
}

// Vault context type
export interface VaultContextType {
  vaults: Vault[];
  memberships: VaultMembership[];
  membershipMap: Map<string, VaultRole>;
  isLoading: boolean;
  isInitialized: boolean;
  refreshVaults: () => Promise<void>;
}

// JWT token parts
export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

export interface JWTPayload extends UserInfo {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  auth_time?: number;
  azp?: string;
  scope?: string;
  sid?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
}

// Decoded JWT structure
export interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  raw: string;
}
