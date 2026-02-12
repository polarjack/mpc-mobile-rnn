# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native (Expo SDK 54) iOS app implementing OAuth 2.0 Authorization Code Flow with PKCE against Keycloak SSO, with backend API integration using JWT tokens. Includes vault management features — vault listing, detail view, member management (CRUD with role-based permissions), vault settings, per-vault user profiles, wallet management (list, create, rename, archive, addresses, balances), and audit log viewing with filtering.

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
                                    ├── /vaults/[id]/wallets → /vaults/[id]/wallets/[walletId]
                                    ├── /vaults/[id]/audit-logs → /vaults/[id]/audit-logs/[logId]
                                    ├── /vaults/[id]/settings
                                    └── /vaults/[id]/profile
```

Wallet and audit-log routes each have their own nested Stack layout (`app/vaults/[id]/wallets/_layout.tsx`, `app/vaults/[id]/audit-logs/_layout.tsx`).

Vault routes use a nested Stack layout in `app/vaults/_layout.tsx`. Dynamic segments use `useLocalSearchParams<{ id: string }>()`.

**API client** (`src/services/api.ts`): Provides `authenticatedFetch<T>()` generic wrapper. All responses use the `ApiResponse<T>` envelope (`{ _status, data?, error? }`). Bearer token passed via Authorization header. Vault API functions: `fetchVaults`, `fetchVault`, `updateVault`, `fetchVaultUserProfile`, `fetchVaultMembers`, `addVaultMember`, `updateVaultMemberRole`, `deleteVaultMember`. Wallet API functions: `fetchWallets`, `createWallet`, `renameWallet`, `archiveWallet`, `unarchiveWallet`, `fetchWalletAddresses`, `addWalletAddress`, `fetchWalletBalances`. Audit log API functions: `fetchAuditLogs`, `fetchAuditLogDetail`.

**Permissions** (`src/utils/permissions.ts`): Role-based helpers for UI gating — `canManageMembers(role)`, `canEditVault(role)`, `canManageWallets(role)`, `canManageMember(currentRole, targetRole)`, `getRoleColor(role)`, `getNetworkColor(network)`. Role hierarchy: OWNER > ADMIN > SIGNER > VIEWER.

**Audit log utilities** (`src/utils/auditLog.ts`): Display helpers for audit events — `AUDIT_EVENT_LABELS` (human-readable labels), `getEventTypeColor(eventType)`, `getActorDisplayName(actor)`, `getActorSubtitle(actor)`, `formatAuditTimestamp(isoString)` (relative time formatting), `ALL_AUDIT_EVENT_TYPES`.

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
- **Wallet types**: `Network` (`BITCOIN | SOLANA`), `Wallet`, `WalletAddress`, `WalletBalance`, `DisplayedAddress`, `ConvertedValue`, `WalletPagination`, `WalletsData`, `CreateWalletRequest`, `UpdateWalletRequest`, `CreateWalletAddressRequest`, `FetchWalletsParams`.
- **Audit log types**: `AuditEventType` (15 event types covering transactions, vault actions, and config changes), `ActorInfo` (discriminated union: `USER | SERVICE_ACCOUNT`), `AuditLogListItem`, `AuditLogDetail`, `AuditLogPagination`, `AuditLogsResponse`, `FetchAuditLogsParams`.
- **Token storage keys**: `auth_access_token`, `auth_refresh_token`, `auth_access_token_expiry`, `auth_refresh_token_expiry` (stored individually in Keychain).
- **OAuth scopes**: `openid`, `profile`, `email`, `offline_access`.
- **Keycloak endpoints**: Built dynamically from realm URL in `src/config/auth.ts` via `getDiscoveryDocument()`.
- **Pressable over TouchableOpacity**: All touchable elements use `Pressable` with `style={({pressed}) => [baseStyle, pressed && {opacity: 0.7}]}`. No `TouchableOpacity` usage in the codebase.
- **Memoized list items**: FlatList `renderItem` components are extracted as `React.memo` components (`VaultCard`, `MemberRow`) with stable `onPress` callbacks via `useCallback`.
- **Stable FlatList callbacks**: `keyExtractor` hoisted to module scope, `renderItem`/`onRefresh`/`onEndReached` wrapped in `useCallback`.
- **O(1) membership lookup**: `VaultListScreen` uses a `useMemo` `Map<string, VaultRole>` for vault-to-role mapping instead of `.find()`.
- **Screen patterns**: `SafeAreaView` + `ScrollView`/`FlatList` container, white cards with `borderRadius: 12` and shadow, `ActivityIndicator` for loading, `Alert.alert` for confirmations/errors. Colors: blue `#1976d2`, green `#4caf50`, orange `#ff9800`, red `#f44336`, purple `#7b1fa2`, blue-grey `#607d8b`, bg `#f5f5f5`. Network colors: Bitcoin `#f7931a`, Solana `#9945ff`.
- **Vault members screen**: Debounced search (300ms), infinite scroll pagination via `onEndReached`, modal for adding members, ActionSheet for edit/remove (permission-gated).
- **Wallet screens**: `WalletListScreen` — paginated list with search and network filter, create wallet modal, archive/unarchive support. `WalletDetailScreen` — shows addresses, balances, converted values; supports rename, archive/unarchive, and add address actions.
- **Audit log screens**: `AuditLogListScreen` — paginated list with search, date range filter, event type filter, color-coded event badges, relative timestamps. `AuditLogDetailScreen` — full event detail with actor info, IP address, and JSON payload display.
- **No test framework configured** — no test files or Jest config exist yet.
- **New Architecture enabled** in app.json.
