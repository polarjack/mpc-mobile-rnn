import { authConfig } from '../config/auth';
import type { ApiResponse, UserData } from '../types';

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
