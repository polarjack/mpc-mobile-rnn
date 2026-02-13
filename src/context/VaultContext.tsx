import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchVaults, fetchUserProfile } from '../services/api';
import type { VaultContextType, Vault, VaultMembership, VaultRole } from '../types';

const defaultContextValue: VaultContextType = {
  vaults: [],
  memberships: [],
  membershipMap: new Map(),
  isLoading: false,
  isInitialized: false,
  refreshVaults: async () => {},
};

export const VaultContext = createContext<VaultContextType>(defaultContextValue);

interface VaultProviderProps {
  children: React.ReactNode;
}

export const VaultProvider: React.FC<VaultProviderProps> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [memberships, setMemberships] = useState<VaultMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const membershipMap = useMemo(() => {
    const map = new Map<string, VaultRole>();
    for (const m of memberships) {
      map.set(m.vaultId, m.role);
    }
    return map;
  }, [memberships]);

  const refreshVaults = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [vaultsRes, profileRes] = await Promise.all([
        fetchVaults(accessToken),
        fetchUserProfile(accessToken),
      ]);
      if (vaultsRes._status === 200 && vaultsRes.data) {
        setVaults(vaultsRes.data);
      }
      if (profileRes._status === 200 && profileRes.data) {
        setMemberships(profileRes.data.vaultMemberships);
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      refreshVaults();
    } else {
      setVaults([]);
      setMemberships([]);
      setIsInitialized(false);
    }
  }, [isAuthenticated, accessToken, refreshVaults]);

  const contextValue: VaultContextType = {
    vaults,
    memberships,
    membershipMap,
    isLoading,
    isInitialized,
    refreshVaults,
  };

  return <VaultContext.Provider value={contextValue}>{children}</VaultContext.Provider>;
};
