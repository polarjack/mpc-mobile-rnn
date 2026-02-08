# Sequence Diagrams

This document contains sequence diagrams for all key user flows in the MPC Mobile app. Each diagram shows the interaction between the user, app components, and external services.

## 1. Login (OAuth 2.0 PKCE)

Full flow from the user tapping "Sign In" to being authenticated and navigated to the vault list.

```mermaid
sequenceDiagram
    participant User
    participant SignIn as SignInScreen
    participant Auth as AuthContext
    participant Browser as System Browser
    participant KC as Keycloak
    participant KS as iOS Keychain

    User->>SignIn: Tap "Sign In with SSO"
    SignIn->>Auth: login()
    Auth->>Auth: setIsLoading(true)

    Auth->>Browser: promptAsync() — Open authorization URL
    Browser->>KC: GET /auth (code_challenge, client_id, scopes)
    KC->>User: Show login page
    User->>KC: Enter credentials & submit
    KC->>Browser: Redirect with authorization code
    Browser->>Auth: Deep link callback (code=AUTH_CODE)

    Auth->>KC: exchangeCodeAsync(code, code_verifier)
    KC->>Auth: {access_token, refresh_token, expires_in}

    Auth->>Auth: decodeJWT(access_token) → UserInfo
    Auth->>Auth: Calculate expiry dates
    Auth->>KS: saveTokens() — 4 parallel writes
    Auth->>Auth: setTokenState() — update context
    Auth->>Auth: setIsLoading(false)

    Auth->>SignIn: isAuthenticated = true
    SignIn->>User: Navigate to /vaults
```

## 2. Token Auto-Refresh

The 60-second interval that checks token expiry and refreshes proactively.

```mermaid
sequenceDiagram
    participant Timer as setInterval (60s)
    participant Auth as AuthContext
    participant KC as Keycloak
    participant KS as iOS Keychain

    loop Every 60 seconds
        Timer->>Auth: checkTokenExpiration()

        alt No access token
            Auth->>Auth: Skip (not authenticated)
        else Token expires in > 2 minutes
            Auth->>Auth: Skip (still valid)
        else Token expires in < 2 minutes
            Auth->>Auth: refreshAccessToken()
            Auth->>KC: refreshAsync(clientId, refreshToken)
            KC->>Auth: {access_token, refresh_token?, expires_in}
            Auth->>Auth: setTokenState() — update context
            Auth->>KS: saveTokens() — 4 parallel writes
            Auth->>Auth: Log "Token refreshed successfully"
        else Token already expired
            Auth->>Auth: refreshAccessToken()
            Auth->>KC: refreshAsync(clientId, refreshToken)
            alt Refresh succeeds
                KC->>Auth: New tokens
                Auth->>KS: saveTokens()
            else Refresh fails
                KC-->>Auth: Error
                Auth->>Auth: logout() — clear all state
            end
        end
    end
```

## 3. App Foreground Resume

When the app returns from background, it immediately checks token validity.

```mermaid
sequenceDiagram
    participant OS as iOS System
    participant Listener as AppState Listener
    participant Auth as AuthContext
    participant KC as Keycloak
    participant KS as iOS Keychain

    OS->>Listener: AppState change: "background" → "active"
    Listener->>Auth: checkTokenExpiration()

    alt Token still valid (> 2min remaining)
        Auth->>Auth: No action needed
    else Token expiring soon (< 2min) or expired
        Auth->>Auth: refreshAccessToken()
        Auth->>KC: refreshAsync(clientId, refreshToken)
        alt Success
            KC->>Auth: New tokens
            Auth->>Auth: setTokenState()
            Auth->>KS: saveTokens()
        else Failure
            KC-->>Auth: Error
            Auth->>Auth: logout()
            Auth->>KS: clearTokens()
            Note over Auth: User redirected to sign-in
        end
    end
```

## 4. App Cold Start Initialization

What happens when the app launches for the first time or after being killed.

```mermaid
sequenceDiagram
    participant App as _layout.tsx
    participant Auth as AuthProvider
    participant KS as iOS Keychain
    participant KC as Keycloak

    App->>Auth: Mount AuthProvider
    Auth->>Auth: isLoading = true

    Auth->>KS: loadTokens() — 4 parallel reads
    KS->>Auth: {accessToken, refreshToken, accessExpiry, refreshExpiry}

    alt All 4 tokens present
        Auth->>Auth: Parse expiry dates

        alt Refresh token expired
            Auth->>KS: clearTokens()
            Auth->>Auth: isLoading = false
            Note over Auth: State: Unauthenticated
        else Refresh token valid
            Auth->>Auth: setTokenState(stored values)
            Auth->>Auth: decodeJWT() → set user info

            alt Access token expired
                Note over Auth: Will trigger refresh on next interval
            else Access token valid
                Note over Auth: State: Authenticated
            end

            Auth->>Auth: isLoading = false
            Auth->>Auth: Start 60s refresh interval
            Auth->>Auth: Register AppState listener
        end
    else Missing token(s)
        Auth->>Auth: isLoading = false
        Note over Auth: State: Unauthenticated
    end
```

## 5. Logout

Full logout flow including token revocation, state cleanup, and Keycloak session end.

```mermaid
sequenceDiagram
    participant User
    participant VaultList as VaultListScreen
    participant Auth as AuthContext
    participant KC as Keycloak
    participant KS as iOS Keychain
    participant Browser as System Browser

    User->>VaultList: Tap "Sign Out"
    VaultList->>VaultList: Alert.alert("Confirm Logout")
    User->>VaultList: Confirm "Sign Out"
    VaultList->>Auth: logout()

    Auth->>Auth: setIsLoading(true)

    opt Revocation endpoint available
        Auth->>KC: revokeAsync(accessToken, clientId)
        Note over KC: Token revoked (failure is non-blocking)
    end

    Auth->>Auth: Clear state (accessToken, refreshToken, user, expiries → null)
    Auth->>KS: clearTokens() — delete 4 items in parallel

    opt End session endpoint available
        Auth->>Browser: Open Keycloak logout URL
        Browser->>KC: GET /logout?client_id=...&post_logout_redirect_uri=...
        KC->>Browser: Session ended
        Browser->>Auth: Redirect to com.mpcmobile.auth://logout
    end

    Auth->>Auth: setIsLoading(false)
    Auth->>VaultList: isAuthenticated = false
    VaultList->>User: Redirect to / (sign-in)
```

## 6. Vault List Loading

How the vault list screen fetches data on focus, including parallel API calls.

```mermaid
sequenceDiagram
    participant User
    participant Screen as VaultListScreen
    participant API as api.ts
    participant Backend as Backend API

    User->>Screen: Navigate to /vaults
    Screen->>Screen: useFocusEffect → setLoading(true)

    par Parallel API calls
        Screen->>API: fetchVaults(accessToken)
        API->>Backend: GET /api/v1/vaults (Bearer JWT)
        Backend->>API: ApiResponse<Vault[]>
        API->>Screen: Vault list data
    and
        Screen->>API: fetchUserProfile(accessToken)
        API->>Backend: GET /api/v1/users/me (Bearer JWT)
        Backend->>API: ApiResponse<UserData>
        API->>Screen: User memberships
    end

    alt Both succeed
        Screen->>Screen: setVaults(data)
        Screen->>Screen: setMemberships(data.vaultMemberships)
        Screen->>Screen: setLoading(false)
        Screen->>User: Render vault cards with role badges
    else Error
        Screen->>User: Alert.alert("Error", message)
        Screen->>Screen: setLoading(false)
    end
```

## 7. Add Vault Member

The flow for adding a new member via the modal dialog.

```mermaid
sequenceDiagram
    participant User
    participant Screen as VaultMembersScreen
    participant Modal as Add Member Modal
    participant API as api.ts
    participant Backend as Backend API

    User->>Screen: Tap "+ Add" button
    Note over Screen: Button visible only if canManageMembers(myRole)
    Screen->>Modal: setShowAddModal(true)
    Modal->>User: Show email input + role picker

    User->>Modal: Enter email address
    User->>Modal: Select role (filtered by canManageMember)
    User->>Modal: Tap "Add"

    Modal->>Screen: handleAddMember()
    Screen->>Screen: setAddLoading(true)
    Screen->>API: addVaultMember(token, vaultId, {email, role})
    API->>Backend: POST /api/v1/vaults/:vaultId/users
    Backend->>API: ApiResponse<AddVaultMemberResponse>

    alt Success (200 or 201)
        API->>Screen: Success response
        Screen->>User: Alert.alert("Success", "Member added")
        Screen->>Modal: Close modal, reset form
        Screen->>API: loadMembers(page=1) — refresh list
        API->>Backend: GET /api/v1/vaults/:vaultId/users
        Backend->>API: Updated member list
        Screen->>User: Render updated list
    else Error
        API->>Screen: Error response
        Screen->>User: Alert.alert("Error", message)
    end
```

## 8. Update Member Role

Editing a vault member's role via the ActionSheet pattern.

```mermaid
sequenceDiagram
    participant User
    participant Screen as VaultMembersScreen
    participant API as api.ts
    participant Backend as Backend API

    User->>Screen: Tap on member row
    Note over Screen: Tap enabled only if<br/>canManageMembers(myRole) &&<br/>canManageMember(myRole, member.role)

    Screen->>User: Alert.alert (ActionSheet)<br/>"Edit Role" | "Remove Member" | "Cancel"
    User->>Screen: Select "Edit Role"

    Screen->>Screen: showRolePicker(member)
    Screen->>Screen: Filter roles: canManageMember(myRole, r) && r ≠ current
    Screen->>User: Alert.alert — available roles list

    User->>Screen: Select new role
    Screen->>API: updateVaultMemberRole(token, vaultId, userId, {role})
    API->>Backend: PUT /api/v1/vaults/:vaultId/users/:userId
    Backend->>API: ApiResponse<UpdateVaultMemberRoleResponse>

    alt Success (200)
        API->>Screen: Success
        Screen->>User: Alert.alert("Success", "Role updated")
        Screen->>Screen: setLoading(true)
        Screen->>API: loadMembers(page=1) — refresh list
        API->>Backend: GET /api/v1/vaults/:vaultId/users
        Backend->>Screen: Updated list
        Screen->>User: Render updated member list
    else Error
        API->>Screen: Error
        Screen->>User: Alert.alert("Error", message)
    end
```

## 9. Remove Vault Member

Removing a member via the ActionSheet with confirmation dialog.

```mermaid
sequenceDiagram
    participant User
    participant Screen as VaultMembersScreen
    participant API as api.ts
    participant Backend as Backend API

    User->>Screen: Tap on member row
    Screen->>User: Alert.alert (ActionSheet)<br/>"Edit Role" | "Remove Member" | "Cancel"
    User->>Screen: Select "Remove Member"

    Screen->>User: Alert.alert("Remove Member")<br/>"Are you sure you want to remove<br/>{name} from this vault?"<br/>[Cancel] [Remove]

    User->>Screen: Confirm "Remove"
    Screen->>API: deleteVaultMember(token, vaultId, userId)
    API->>Backend: DELETE /api/v1/vaults/:vaultId/users/:userId
    Backend->>API: ApiResponse<DeleteVaultMemberResponse>

    alt Success (200)
        API->>Screen: Success
        Screen->>User: Alert.alert("Success", "Member removed")
        Screen->>Screen: setLoading(true)
        Screen->>API: loadMembers(page=1) — refresh list
        API->>Backend: GET /api/v1/vaults/:vaultId/users
        Backend->>Screen: Updated list
        Screen->>User: Render updated member list
    else Error
        API->>Screen: Error
        Screen->>User: Alert.alert("Error", message)
    end
```

## 10. Update Vault Settings

Editing vault settings with form validation and API update.

```mermaid
sequenceDiagram
    participant User
    participant Screen as VaultSettingsScreen
    participant API as api.ts
    participant Backend as Backend API

    Note over Screen: Screen loads vault data<br/>via fetchVault() on focus

    User->>Screen: Edit form fields<br/>(name, email, phone, website)
    User->>Screen: Tap "Save Changes"

    Screen->>Screen: Validate form

    alt Name is empty
        Screen->>User: Alert.alert("Validation", "Name is required")
    else Email is empty
        Screen->>User: Alert.alert("Validation", "Business email is required")
    else Phone is empty
        Screen->>User: Alert.alert("Validation", "Phone is required")
    else Validation passes
        Screen->>Screen: setSaving(true)
        Screen->>API: updateVault(token, vaultId, {name, email, phone, website})
        API->>Backend: PUT /api/v1/vaults/:vaultId
        Backend->>API: ApiResponse<Vault>

        alt Success (200)
            API->>Screen: Updated vault data
            Screen->>Screen: setVault(data)
            Screen->>Screen: setSaving(false)
            Screen->>User: Alert.alert("Success", "Vault settings updated")
        else Error
            API->>Screen: Error response
            Screen->>Screen: setSaving(false)
            Screen->>User: Alert.alert("Error", message)
        end
    end
```

## Diagram Index

| # | Diagram | Participants | Key File |
|---|---------|-------------|----------|
| 1 | Login (PKCE) | User, SignIn, Auth, Browser, KC, Keychain | `AuthContext.tsx` |
| 2 | Token Auto-Refresh | Timer, Auth, KC, Keychain | `AuthContext.tsx` |
| 3 | App Foreground Resume | OS, Listener, Auth, KC, Keychain | `AuthContext.tsx` |
| 4 | Cold Start Init | App, Auth, Keychain, KC | `AuthContext.tsx` |
| 5 | Logout | User, VaultList, Auth, KC, Keychain, Browser | `AuthContext.tsx` |
| 6 | Vault List Loading | User, Screen, API, Backend | `VaultListScreen.tsx` |
| 7 | Add Vault Member | User, Screen, Modal, API, Backend | `VaultMembersScreen.tsx` |
| 8 | Update Member Role | User, Screen, API, Backend | `VaultMembersScreen.tsx` |
| 9 | Remove Vault Member | User, Screen, API, Backend | `VaultMembersScreen.tsx` |
| 10 | Update Vault Settings | User, Screen, API, Backend | `VaultSettingsScreen.tsx` |
