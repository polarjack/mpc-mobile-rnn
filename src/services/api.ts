import { authConfig } from '../config/auth';
import type {
  ApiResponse,
  UserData,
  Vault,
  VaultUserData,
  VaultMembersData,
  FetchVaultMembersParams,
  UpdateVaultRequest,
  AddVaultMemberRequest,
  AddVaultMemberResponse,
  UpdateVaultMemberRoleRequest,
  UpdateVaultMemberRoleResponse,
  DeleteVaultMemberResponse,
} from '../types';

const API_BASE_URL = authConfig.backendApiUrl;

/**
 * Fetch user profile from backend API
 */
export const fetchUserProfile = async (accessToken: string): Promise<ApiResponse<UserData>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      _status: 500,
      error: {
        type: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
};

/**
 * Generic authenticated API request
 */
export const authenticatedFetch = async <T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      _status: 500,
      error: {
        type: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
};

export const fetchVaults = (accessToken: string): Promise<ApiResponse<Vault[]>> =>
  authenticatedFetch<Vault[]>('/api/v1/vaults', accessToken);

export const fetchVault = (accessToken: string, vaultId: string): Promise<ApiResponse<Vault>> =>
  authenticatedFetch<Vault>(`/api/v1/vaults/${vaultId}`, accessToken);

export const updateVault = (
  accessToken: string,
  vaultId: string,
  data: UpdateVaultRequest,
): Promise<ApiResponse<Vault>> =>
  authenticatedFetch<Vault>(`/api/v1/vaults/${vaultId}`, accessToken, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const fetchVaultUserProfile = (
  accessToken: string,
  vaultId: string,
): Promise<ApiResponse<VaultUserData>> =>
  authenticatedFetch<VaultUserData>(`/api/v1/vaults/${vaultId}/users/me`, accessToken);

export const fetchVaultMembers = (
  accessToken: string,
  vaultId: string,
  params?: FetchVaultMembersParams,
): Promise<ApiResponse<VaultMembersData>> => {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) searchParams.set('page', params.page.toString());
  if (params?.pageSize !== undefined) searchParams.set('pageSize', params.pageSize.toString());
  if (params?.search) searchParams.set('search', params.search);
  const query = searchParams.toString();
  const endpoint = `/api/v1/vaults/${vaultId}/users${query ? `?${query}` : ''}`;
  return authenticatedFetch<VaultMembersData>(endpoint, accessToken);
};

export const addVaultMember = (
  accessToken: string,
  vaultId: string,
  data: AddVaultMemberRequest,
): Promise<ApiResponse<AddVaultMemberResponse>> =>
  authenticatedFetch<AddVaultMemberResponse>(`/api/v1/vaults/${vaultId}/users`, accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateVaultMemberRole = (
  accessToken: string,
  vaultId: string,
  userId: string,
  data: UpdateVaultMemberRoleRequest,
): Promise<ApiResponse<UpdateVaultMemberRoleResponse>> =>
  authenticatedFetch<UpdateVaultMemberRoleResponse>(
    `/api/v1/vaults/${vaultId}/users/${userId}`,
    accessToken,
    { method: 'PUT', body: JSON.stringify(data) },
  );

export const deleteVaultMember = (
  accessToken: string,
  vaultId: string,
  userId: string,
): Promise<ApiResponse<DeleteVaultMemberResponse>> =>
  authenticatedFetch<DeleteVaultMemberResponse>(
    `/api/v1/vaults/${vaultId}/users/${userId}`,
    accessToken,
    { method: 'DELETE' },
  );
