# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native (Expo SDK 54) iOS app implementing OAuth 2.0 Authorization Code Flow with PKCE against Keycloak SSO, with backend API integration using JWT tokens. Includes vault management features — vault listing, detail view, member management (CRUD with role-based permissions), vault settings, and per-vault user profiles.

## Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Start Expo dev server
pnpm ios              # Run on iOS simulator
pnpm android          # Run on Android emulator
pnpm typecheck        # TypeScript type check (tsc --noEmit)
pnpm lint             # ESLint for .ts/.tsx files
```

## Architecture

**Routing**: File-based routing via expo-router v6. Pages live in `app/`, with `_layout.tsx` as root layout wrapping everything in `AuthProvider`.

**Auth flow** (`src/context/AuthContext.tsx`): Central auth state management via React Context. Handles the full PKCE OAuth lifecycle — login opens system browser via `expo-auth-session`, exchanges auth code for tokens, stores them in iOS Keychain via `expo-secure-store`, auto-refreshes on a 60s interval (triggers when < 2min until expiry), and checks token validity on app foreground via AppState listener. Each token field is stored as a separate Keychain item to avoid the 2KB item limit.

**Navigation guards**: `app/index.tsx` redirects to `/vaults` if authenticated, `app/home.tsx` redirects to `/vaults` (authenticated) or `/` (unauthenticated). The actual UI lives in `src/screens/`.

**Navigation flow**:
```
/ (sign-in) → /vaults (list) → /vaults/[id] (detail)
                                    ├── /vaults/[id]/members
                                    ├── /vaults/[id]/settings
                                    └── /vaults/[id]/profile
```

Vault routes use a nested Stack layout in `app/vaults/_layout.tsx`. Dynamic segments use `useLocalSearchParams<{ id: string }>()`.

**API client** (`src/services/api.ts`): Provides `authenticatedFetch<T>()` generic wrapper. All responses use the `ApiResponse<T>` envelope (`{ _status, data?, error? }`). Bearer token passed via Authorization header. Vault API functions: `fetchVaults`, `fetchVault`, `updateVault`, `fetchVaultUserProfile`, `fetchVaultMembers`, `addVaultMember`, `updateVaultMemberRole`, `deleteVaultMember`.

**Permissions** (`src/utils/permissions.ts`): Role-based helpers for UI gating — `canManageMembers(role)`, `canEditVault(role)`, `canManageMember(currentRole, targetRole)`, `getRoleColor(role)`. Role hierarchy: OWNER > ADMIN > SIGNER > VIEWER.

**Path alias**: `@/*` maps to `src/*` (configured in tsconfig.json).

## Configuration

Environment variables are in `app.json` under `expo.extra` (not `.env` files):
- `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` — Keycloak OIDC settings
- `BACKEND_API_URL` — Backend API base URL

OAuth redirect URLs (must match Keycloak client config):
- Callback: `com.mpcmobile.auth://callback`
- Logout: `com.mpcmobile.auth://logout`

Custom URL scheme `com.mpcmobile.auth` is registered in `app.json` under `expo.scheme`.

## Key Patterns

- **Strict TypeScript**: All types in `src/types/index.ts`. Strict mode enabled.
- **Vault types**: `VaultRole` (`OWNER | ADMIN | SIGNER | VIEWER`), `Vault`, `VaultUserData`, `VaultMember`, `VaultMembership`, `Pagination`, `VaultMembersData`, plus request/response types for all vault CRUD operations.
- **Token storage keys**: `auth_access_token`, `auth_refresh_token`, `auth_access_token_expiry`, `auth_refresh_token_expiry` (stored individually in Keychain).
- **OAuth scopes**: `openid`, `profile`, `email`, `offline_access`.
- **Keycloak endpoints**: Built dynamically from realm URL in `src/config/auth.ts` via `getDiscoveryDocument()`.
- **Screen patterns**: `SafeAreaView` + `ScrollView`/`FlatList` container, white cards with `borderRadius: 12` and shadow, `ActivityIndicator` for loading, `Alert.alert` for confirmations/errors. Colors: blue `#1976d2`, green `#4caf50`, orange `#ff9800`, red `#f44336`, bg `#f5f5f5`.
- **Vault members screen**: Debounced search (300ms), infinite scroll pagination via `onEndReached`, modal for adding members, ActionSheet for edit/remove (permission-gated).
- **No test framework configured** — no test files or Jest config exist yet.
- **New Architecture enabled** in app.json.
