import Constants from 'expo-constants';

// Environment configuration with fallbacks
const getEnvVar = (key: string, defaultValue: string): string => {
  const extra = Constants.expirationDate ? {} : (Constants.expoConfig?.extra || {});
  return (extra as Record<string, string>)[key] || defaultValue;
};

export const authConfig = {
  // Keycloak configuration
  keycloakUrl: getEnvVar('KEYCLOAK_URL', 'http://localhost:8080'),
  keycloakRealm: getEnvVar('KEYCLOAK_REALM', 'mpc'),
  clientId: getEnvVar('KEYCLOAK_CLIENT_ID', 'mpc-mobile'),

  // Backend API
  backendApiUrl: getEnvVar('BACKEND_API_URL', 'http://localhost:14444'),

  // OAuth redirect URLs
  redirectUrl: 'com.mpcmobile.auth://callback',
  postLogoutRedirectUrl: 'com.mpcmobile.auth://logout',

  // OAuth scopes
  scopes: ['openid', 'profile', 'email', 'offline_access'],
};

// Keycloak discovery endpoints
export const getKeycloakEndpoints = () => {
  const baseUrl = `${authConfig.keycloakUrl}/realms/${authConfig.keycloakRealm}`;

  return {
    issuer: baseUrl,
    authorizationEndpoint: `${baseUrl}/protocol/openid-connect/auth`,
    tokenEndpoint: `${baseUrl}/protocol/openid-connect/token`,
    revocationEndpoint: `${baseUrl}/protocol/openid-connect/revoke`,
    endSessionEndpoint: `${baseUrl}/protocol/openid-connect/logout`,
    userInfoEndpoint: `${baseUrl}/protocol/openid-connect/userinfo`,
  };
};

// Auth session discovery document for expo-auth-session
export const getDiscoveryDocument = () => {
  const endpoints = getKeycloakEndpoints();

  return {
    issuer: endpoints.issuer,
    authorizationEndpoint: endpoints.authorizationEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint,
    revocationEndpoint: endpoints.revocationEndpoint,
    endSessionEndpoint: endpoints.endSessionEndpoint,
    userInfoEndpoint: endpoints.userInfoEndpoint,
  };
};
