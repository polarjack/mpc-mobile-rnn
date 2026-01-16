import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { AppState, AppStateStatus } from 'react-native';
import { authConfig, getDiscoveryDocument } from '../config/auth';
import type { AuthContextType, UserInfo, StoredTokens, JWTPayload } from '../types';

// Complete browser auth session
WebBrowser.maybeCompleteAuthSession();

// Secure storage keys
const TOKENS_KEY = 'auth_tokens';

// Token refresh interval (60 seconds before expiry check)
const TOKEN_REFRESH_INTERVAL = 60000;

// Default context value
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  refreshToken: null,
  user: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  login: async () => {},
  logout: async () => {},
  refreshAccessToken: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

// Decode JWT payload
const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// Extract user info from JWT payload
const extractUserInfo = (payload: JWTPayload): UserInfo => ({
  sub: payload.sub || '',
  email: payload.email,
  name: payload.name,
  preferred_username: payload.preferred_username,
  email_verified: payload.email_verified,
  given_name: payload.given_name,
  family_name: payload.family_name,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<Date | null>(null);
  const [refreshTokenExpiresAt, setRefreshTokenExpiresAt] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const discovery = getDiscoveryDocument();

  // PKCE request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: authConfig.clientId,
      scopes: authConfig.scopes,
      redirectUri: authConfig.redirectUrl,
      usePKCE: true,
    },
    discovery
  );

  // Save tokens to secure storage
  const saveTokens = async (tokens: StoredTokens) => {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  };

  // Load tokens from secure storage
  const loadTokens = async (): Promise<StoredTokens | null> => {
    try {
      const stored = await SecureStore.getItemAsync(TOKENS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
    return null;
  };

  // Clear tokens from secure storage
  const clearTokens = async () => {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  };

  // Update state with token data
  const setTokenState = useCallback((
    access: string,
    refresh: string,
    accessExpiry: Date,
    refreshExpiry: Date
  ) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    setAccessTokenExpiresAt(accessExpiry);
    setRefreshTokenExpiresAt(refreshExpiry);

    const payload = decodeJWT(access);
    if (payload) {
      setUser(extractUserInfo(payload));
    }
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      console.log('No refresh token available');
      return;
    }

    try {
      const tokenResponse = await AuthSession.refreshAsync(
        {
          clientId: authConfig.clientId,
          refreshToken,
        },
        discovery
      );

      if (tokenResponse.accessToken) {
        const newAccessExpiry = tokenResponse.expiresIn
          ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
          : new Date(Date.now() + 300000); // Default 5 min

        // Refresh token expiry - typically longer, use existing or extend
        const newRefreshExpiry = refreshTokenExpiresAt || new Date(Date.now() + 86400000); // 24h default

        const newRefresh = tokenResponse.refreshToken || refreshToken;

        setTokenState(
          tokenResponse.accessToken,
          newRefresh,
          newAccessExpiry,
          newRefreshExpiry
        );

        await saveTokens({
          accessToken: tokenResponse.accessToken,
          refreshToken: newRefresh,
          accessTokenExpiresAt: newAccessExpiry.toISOString(),
          refreshTokenExpiresAt: newRefreshExpiry.toISOString(),
        });

        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear auth state on refresh failure
      await logout();
    }
  }, [refreshToken, refreshTokenExpiresAt, setTokenState, discovery]);

  // Check if token needs refresh
  const checkTokenExpiration = useCallback(async () => {
    if (!accessToken || !accessTokenExpiresAt) return;

    const now = new Date();
    const timeUntilExpiry = accessTokenExpiresAt.getTime() - now.getTime();

    // Refresh if less than 2 minutes until expiry
    if (timeUntilExpiry < 120000 && timeUntilExpiry > 0) {
      console.log('Token expiring soon, refreshing...');
      await refreshAccessToken();
    } else if (timeUntilExpiry <= 0) {
      console.log('Token expired, attempting refresh...');
      await refreshAccessToken();
    }
  }, [accessToken, accessTokenExpiresAt, refreshAccessToken]);

  // Login function
  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await promptAsync();

      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: authConfig.clientId,
            code: result.params.code,
            redirectUri: authConfig.redirectUrl,
            extraParams: request?.codeVerifier
              ? { code_verifier: request.codeVerifier }
              : undefined,
          },
          discovery
        );

        if (tokenResponse.accessToken && tokenResponse.refreshToken) {
          const accessExpiry = tokenResponse.expiresIn
            ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
            : new Date(Date.now() + 300000);

          // Parse refresh token for expiry (typically in JWT or assume 24h)
          const refreshPayload = decodeJWT(tokenResponse.refreshToken);
          const refreshExpiry = refreshPayload?.exp
            ? new Date(refreshPayload.exp * 1000)
            : new Date(Date.now() + 86400000);

          setTokenState(
            tokenResponse.accessToken,
            tokenResponse.refreshToken,
            accessExpiry,
            refreshExpiry
          );

          await saveTokens({
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            accessTokenExpiresAt: accessExpiry.toISOString(),
            refreshTokenExpiresAt: refreshExpiry.toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [promptAsync, request, setTokenState, discovery]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Revoke tokens with Keycloak if possible
      if (accessToken && discovery.revocationEndpoint) {
        try {
          await AuthSession.revokeAsync(
            { token: accessToken, clientId: authConfig.clientId },
            discovery
          );
        } catch (error) {
          console.log('Token revocation failed (may be expected):', error);
        }
      }

      // Clear local state
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setAccessTokenExpiresAt(null);
      setRefreshTokenExpiresAt(null);

      // Clear stored tokens
      await clearTokens();

      // End session with Keycloak
      if (discovery.endSessionEndpoint) {
        await WebBrowser.openAuthSessionAsync(
          `${discovery.endSessionEndpoint}?client_id=${authConfig.clientId}&post_logout_redirect_uri=${encodeURIComponent(authConfig.postLogoutRedirectUrl)}`,
          authConfig.postLogoutRedirectUrl
        );
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, discovery]);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = await loadTokens();
        if (storedTokens) {
          const accessExpiry = new Date(storedTokens.accessTokenExpiresAt);
          const refreshExpiry = new Date(storedTokens.refreshTokenExpiresAt);
          const now = new Date();

          // Check if refresh token is still valid
          if (refreshExpiry > now) {
            setTokenState(
              storedTokens.accessToken,
              storedTokens.refreshToken,
              accessExpiry,
              refreshExpiry
            );

            // If access token expired, refresh it
            if (accessExpiry <= now) {
              setRefreshToken(storedTokens.refreshToken);
              // Will trigger refresh in next effect
            }
          } else {
            // Refresh token expired, clear everything
            await clearTokens();
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [setTokenState]);

  // Set up token refresh interval
  useEffect(() => {
    if (accessToken) {
      refreshIntervalRef.current = setInterval(checkTokenExpiration, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [accessToken, checkTokenExpiration]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground, check token expiration
        checkTokenExpiration();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription?.remove();
    };
  }, [checkTokenExpiration]);

  const contextValue: AuthContextType = {
    isAuthenticated: !!accessToken,
    isLoading,
    accessToken,
    refreshToken,
    user,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    login,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
