# Page Flow

This document maps the full navigation flow of the MPC Mobile app, including auth guards, screen transitions, and feature inventory for each page.

## Navigation Flow Diagram

```mermaid
flowchart TD
    Start(("App Launch"))
    Index["/ (index.tsx)\nAuth Guard"]
    SignIn["SignInScreen\nSSO Login"]
    Home["home.tsx\nRedirect Hub"]
    VaultList["/vaults\nVaultListScreen"]
    VaultDetail["/vaults/[id]\nVaultDetailScreen"]
    Members["/vaults/[id]/members\nVaultMembersScreen"]
    Settings["/vaults/[id]/settings\nVaultSettingsScreen"]
    Profile["/vaults/[id]/profile\nVaultUserProfileScreen"]

    Start --> Index

    Index -->|"isLoading"| Loading1["⏳ Loading"]
    Index -->|"!isAuthenticated"| SignIn
    Index -->|"isAuthenticated"| VaultList

    Home -->|"isAuthenticated"| VaultList
    Home -->|"!isAuthenticated"| Index

    SignIn -->|"login() success"| VaultList

    VaultList -->|"Tap vault card"| VaultDetail
    VaultList -->|"Sign Out"| Index

    VaultDetail -->|"← Back"| VaultList
    VaultDetail -->|"Tap Members"| Members
    VaultDetail -->|"Tap Settings\n(OWNER/ADMIN only)"| Settings
    VaultDetail -->|"Tap My Profile"| Profile

    Members -->|"← Back"| VaultDetail
    Settings -->|"← Back"| VaultDetail
    Profile -->|"← Back"| VaultDetail

    style Start fill:#1976d2,stroke:#1976d2,color:#fff
    style SignIn fill:#f44336,stroke:#f44336,color:#fff
    style VaultList fill:#4caf50,stroke:#4caf50,color:#fff
    style VaultDetail fill:#ff9800,stroke:#ff9800,color:#fff
    style Members fill:#9c27b0,stroke:#9c27b0,color:#fff
    style Settings fill:#ff9800,stroke:#ff9800,color:#fff
    style Profile fill:#4caf50,stroke:#4caf50,color:#fff
```

## Screen Inventory

| Route | Component | Description | Auth Required | Role Required |
|-------|-----------|-------------|:------------:|:-------------:|
| `/` | `index.tsx` → `SignInScreen` | Entry point. Shows sign-in if unauthenticated, redirects to `/vaults` if authenticated. | No | — |
| `/home` | `home.tsx` | Redirect hub. Routes to `/vaults` (auth) or `/` (no auth). | No | — |
| `/vaults` | `VaultListScreen` | Lists all vaults with role badges, status, pull-to-refresh, and sign-out. | Yes | Any |
| `/vaults/[id]` | `VaultDetailScreen` | Vault info card, role badge, navigation to members/settings/profile. | Yes | Any |
| `/vaults/[id]/members` | `VaultMembersScreen` | Paginated member list, search, add/edit/remove (permission-gated). | Yes | Any (actions gated) |
| `/vaults/[id]/settings` | `VaultSettingsScreen` | Edit vault name, email, phone, website. Form validation + save. | Yes | OWNER, ADMIN |
| `/vaults/[id]/profile` | `VaultUserProfileScreen` | View own role, permissions, and user info within this vault. | Yes | Any |

## Navigation Guard Logic

### Entry Point (`app/index.tsx`)

```
if isLoading → show spinner
if !isAuthenticated → render SignInScreen
if isAuthenticated → router.replace('/vaults')
```

### Home Redirect (`app/home.tsx`)

```
if isLoading → show spinner
if isAuthenticated → router.replace('/vaults')
if !isAuthenticated → router.replace('/')
```

### Vault List (`app/vaults/index.tsx`)

```
if !isLoading && !isAuthenticated → router.replace('/')
if isLoading || !isAuthenticated → show spinner
else → render VaultListScreen
```

### Vault Sub-Pages (`app/vaults/[id]/*.tsx`)

These pages do not have explicit auth guards in their route files. They receive `vaultId` from `useLocalSearchParams` and rely on the parent vault list guard and API-level authorization.

### Settings Access Guard (In-Screen)

On the vault detail screen, the "Settings" button is conditionally rendered:

```
const showSettings = role ? canManageMembers(role) : false;
// Only OWNER and ADMIN see the Settings button
```

## Screen Feature Matrix

| Feature | Sign In | Vault List | Vault Detail | Members | Settings | Profile |
|---------|:-------:|:----------:|:------------:|:-------:|:--------:|:-------:|
| Loading spinner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pull-to-refresh | — | ✅ | — | — | — | — |
| FlatList | — | ✅ | — | ✅ | — | — |
| ScrollView | — | — | ✅ | — | ✅ | ✅ |
| Search (debounced) | — | — | — | ✅ | — | — |
| Infinite scroll | — | — | — | ✅ | — | — |
| Modal | — | — | — | ✅ | — | — |
| ActionSheet (Alert) | — | ✅ | — | ✅ | — | — |
| Form inputs | — | — | — | ✅ | ✅ | — |
| Form validation | — | — | — | — | ✅ | — |
| Role badges | — | ✅ | ✅ | ✅ | — | ✅ |
| Status badges | — | ✅ | ✅ | — | — | — |
| Permission gating | — | — | ✅ | ✅ | — | — |
| Back navigation | — | — | ✅ | ✅ | ✅ | ✅ |
| Empty state | — | ✅ | — | ✅ | — | — |

## Layout Structure

The app uses a nested Stack navigator pattern:

```
RootLayout (AuthProvider + Stack)
├── index (SignInScreen)
├── home (redirect)
└── vaults (VaultsLayout → Stack)
    ├── index (VaultListScreen)
    └── [id]
        ├── index (VaultDetailScreen)
        ├── members (VaultMembersScreen)
        ├── settings (VaultSettingsScreen)
        └── profile (VaultUserProfileScreen)
```

All Stack navigators use `headerShown: false` — headers are implemented within screen components.
