# API Reference

This document covers all REST API endpoints consumed by the MPC Mobile app, including authentication patterns, request/response types, and error handling.

## Base URL & Authentication

- **Base URL**: Configured via `BACKEND_API_URL` in `app.json` → `expo.extra`
- **Authentication**: Bearer JWT token in the `Authorization` header
- **Content-Type**: `application/json` for all requests

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Response Envelope

All API responses use the `ApiResponse<T>` envelope:

```typescript
interface ApiResponse<T> {
  _status: number;       // HTTP status code
  data?: T;              // Response payload (on success)
  error?: {
    type: string;        // Error category (e.g., "NETWORK_ERROR")
    message: string;     // Human-readable error message
  };
}
```

**Success check**: `response._status === 200 && response.data`

## Endpoints

### 1. Get User Profile

Retrieves the authenticated user's profile, including all vault memberships.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/users/me` |
| **Auth** | Bearer JWT |
| **Permission** | Any authenticated user |

**Response Type**: `ApiResponse<UserData>`

```typescript
interface UserData {
  userId: string;
  keycloakUserId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  vaultMemberships: VaultMembership[];
}

interface VaultMembership {
  vaultId: string;
  vaultName: string;
  role: VaultRole;
  joinedAt: string;       // ISO 8601
}
```

---

### 2. List Vaults

Retrieves all vaults the authenticated user has access to.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/vaults` |
| **Auth** | Bearer JWT |
| **Permission** | Any authenticated user |

**Response Type**: `ApiResponse<Vault[]>`

```typescript
interface Vault {
  id: string;
  name: string;
  businessEmail: string;
  phone: string;
  websiteUrl: string;
  tssCoordinatorEndpoint: string;
  activated: boolean;
  updatedAt: string;      // ISO 8601
}
```

---

### 3. Get Vault Detail

Retrieves a single vault by ID.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/vaults/:vaultId` |
| **Auth** | Bearer JWT |
| **Permission** | Vault member |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |

**Response Type**: `ApiResponse<Vault>`

---

### 4. Update Vault

Updates vault settings (name, email, phone, website).

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/v1/vaults/:vaultId` |
| **Auth** | Bearer JWT |
| **Permission** | OWNER or ADMIN (`canEditVault`) |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |

**Request Body**: `UpdateVaultRequest`

```typescript
interface UpdateVaultRequest {
  name: string;              // Required
  businessEmail: string;     // Required
  phone: string;             // Required
  websiteUrl?: string | null; // Optional
}
```

**Response Type**: `ApiResponse<Vault>`

---

### 5. Get Vault User Profile

Retrieves the current user's profile within a specific vault, including role and permissions.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/vaults/:vaultId/users/me` |
| **Auth** | Bearer JWT |
| **Permission** | Vault member |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |

**Response Type**: `ApiResponse<VaultUserData>`

```typescript
interface VaultUserData {
  userId: string;
  keycloakUserId: string;
  email: string;
  username: string;
  emailVerified: boolean;
  vaultId: string;
  role: VaultRole;
  permissions: string[];
}
```

---

### 6. List Vault Members

Retrieves paginated vault members with optional search.

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/vaults/:vaultId/users` |
| **Auth** | Bearer JWT |
| **Permission** | Vault member |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `pageSize` | `number` | `20` | Items per page |
| `search` | `string` | — | Search filter (name/email) |

**Response Type**: `ApiResponse<VaultMembersData>`

```typescript
interface VaultMembersData {
  vaultId: string;
  members: VaultMember[];
  pagination: Pagination;
}

interface VaultMember {
  userId: string;
  name: string;
  email: string;
  role: VaultRole;
  joinedAt: string;         // ISO 8601
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
```

---

### 7. Add Vault Member

Adds a new member to a vault by email.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/vaults/:vaultId/users` |
| **Auth** | Bearer JWT |
| **Permission** | OWNER or ADMIN (`canManageMembers`) |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |

**Request Body**: `AddVaultMemberRequest`

```typescript
interface AddVaultMemberRequest {
  email: string;
  role: VaultRole;     // Must be lower than caller's role
}
```

**Response Type**: `ApiResponse<AddVaultMemberResponse>`

```typescript
interface AddVaultMemberResponse {
  vaultId: string;
  userId: string;
  role: string;
  message: string;
}
```

---

### 8. Update Vault Member Role

Changes a vault member's role.

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/api/v1/vaults/:vaultId/users/:userId` |
| **Auth** | Bearer JWT |
| **Permission** | OWNER or ADMIN; target must be lower role (`canManageMember`) |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |
| `userId` | `string` | Target user identifier |

**Request Body**: `UpdateVaultMemberRoleRequest`

```typescript
interface UpdateVaultMemberRoleRequest {
  role: VaultRole;
}
```

**Response Type**: `ApiResponse<UpdateVaultMemberRoleResponse>`

```typescript
interface UpdateVaultMemberRoleResponse {
  vaultId: string;
  userId: string;
  role: string;
  message: string;
}
```

---

### 9. Remove Vault Member

Removes a member from a vault.

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/v1/vaults/:vaultId/users/:userId` |
| **Auth** | Bearer JWT |
| **Permission** | OWNER or ADMIN; target must be lower role (`canManageMember`) |

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | Vault identifier |
| `userId` | `string` | Target user identifier |

**Response Type**: `ApiResponse<DeleteVaultMemberResponse>`

```typescript
interface DeleteVaultMemberResponse {
  vaultId: string;
  userId: string;
  message: string;
}
```

## Endpoint Summary

| # | Method | Path | Description | Permission |
|---|--------|------|-------------|------------|
| 1 | GET | `/api/v1/users/me` | Get user profile | Authenticated |
| 2 | GET | `/api/v1/vaults` | List vaults | Authenticated |
| 3 | GET | `/api/v1/vaults/:vaultId` | Get vault detail | Vault member |
| 4 | PUT | `/api/v1/vaults/:vaultId` | Update vault | OWNER, ADMIN |
| 5 | GET | `/api/v1/vaults/:vaultId/users/me` | Get vault user profile | Vault member |
| 6 | GET | `/api/v1/vaults/:vaultId/users` | List vault members | Vault member |
| 7 | POST | `/api/v1/vaults/:vaultId/users` | Add vault member | OWNER, ADMIN |
| 8 | PUT | `/api/v1/vaults/:vaultId/users/:userId` | Update member role | OWNER, ADMIN* |
| 9 | DELETE | `/api/v1/vaults/:vaultId/users/:userId` | Remove member | OWNER, ADMIN* |

> *\* Target member must have a strictly lower role than the caller.*

## Error Handling

The API client (`src/services/api.ts`) uses a generic `authenticatedFetch<T>()` wrapper that:

1. Appends `Authorization: Bearer <token>` and `Content-Type: application/json` headers
2. Parses the JSON response as `ApiResponse<T>`
3. On network failure, returns a synthetic error response:

```typescript
{
  _status: 500,
  error: {
    type: 'NETWORK_ERROR',
    message: '<error.message or "Network request failed">'
  }
}
```

Screens check `response._status === 200` for success and display `response.error?.message` via `Alert.alert` on failure.

## Type Reference

All types are defined in `src/types/index.ts`:

```typescript
type VaultRole = 'OWNER' | 'ADMIN' | 'SIGNER' | 'VIEWER';
```

See the [Role & Permissions](./06-role-permissions.md) document for detailed role hierarchy and permission rules.
