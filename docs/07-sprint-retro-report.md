# MPC Mobile — Project Analysis, Effort Estimation & Sprint Retro Report

---

## 1. Project Summary

**App**: MPC Mobile — a React Native (Expo SDK 54) iOS app for MPC vault management
**Stack**: Expo Router v6, TypeScript (strict), OAuth 2.0 PKCE with Keycloak SSO, JWT-authenticated REST API
**Codebase Size**: ~2,600 LOC across 25 source files, 7 documentation files
**Maturity**: Feature-complete MVP with no test framework configured yet

### What It Does

Users authenticate via Keycloak SSO and manage cryptographic vaults — listing vaults, viewing details, managing members (add/edit/remove with role-based permissions), editing vault settings, and viewing per-vault profiles.

### Architecture at a Glance

```
Sign-In (PKCE OAuth) → Vault List → Vault Detail
                                        ├── Members (CRUD, search, pagination)
                                        ├── Settings (form with validation)
                                        └── Profile (read-only)
```

- **Auth**: React Context with auto-refresh (60s interval), iOS Keychain storage
- **API**: Generic `authenticatedFetch<T>()` wrapper, 9 REST endpoints
- **Permissions**: 4-level role hierarchy (OWNER > ADMIN > SIGNER > VIEWER)
- **Routing**: File-based via expo-router with navigation guards

---

## 2. Feature Inventory & Story Point Estimation

Story points use a Fibonacci scale (1, 2, 3, 5, 8, 13) based on complexity, uncertainty, and effort.

### Epic 1: Authentication & Token Management

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 1.1 | OAuth 2.0 PKCE Login | System browser auth via Keycloak, code exchange, token storage | **8** | High |
| 1.2 | Secure Token Storage | Split storage across 4 Keychain items (avoids 2KB limit) | **3** | Medium |
| 1.3 | Auto Token Refresh | 60s interval check, refresh when <2min to expiry | **5** | High |
| 1.4 | App Foreground Resume | AppState listener validates tokens on foreground | **3** | Medium |
| 1.5 | Cold Start Initialization | Load tokens from Keychain, validate, restore session | **3** | Medium |
| 1.6 | Logout Flow | Token revocation, Keychain clear, Keycloak session end | **3** | Medium |
| 1.7 | JWT Decoding & User Info | Extract user profile from access token payload | **2** | Low |
| | **Epic Total** | | **27** | |

### Epic 2: Navigation & Routing

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 2.1 | File-based Routing Setup | Expo Router v6 with nested Stack layouts | **3** | Medium |
| 2.2 | Auth Navigation Guards | Redirect logic on index, home, vault routes | **2** | Low |
| 2.3 | Dynamic Route Parameters | `[id]` segments for vault detail pages | **1** | Low |
| | **Epic Total** | | **6** | |

### Epic 3: Vault List & Detail

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 3.1 | Vault List Screen | FlatList with parallel API calls, role lookup, pull-to-refresh | **5** | Medium |
| 3.2 | Vault Detail Screen | Parallel data fetch, permission-gated UI, info display | **5** | Medium |
| 3.3 | Navigation Between Screens | Detail → Members/Settings/Profile with back nav | **2** | Low |
| | **Epic Total** | | **12** | |

### Epic 4: Vault Member Management

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 4.1 | Member List with Pagination | Infinite scroll (onEndReached), loading states | **5** | Medium |
| 4.2 | Debounced Search | 300ms debounce, separate search state management | **3** | Medium |
| 4.3 | Add Member Modal | Modal with email input, role picker, permission-filtered roles | **5** | Medium |
| 4.4 | Edit Member Role | ActionSheet, role selection filtered by canManageMember | **3** | Medium |
| 4.5 | Remove Member | ActionSheet → Alert confirmation → API DELETE | **2** | Low |
| 4.6 | Role-based Permission Gating | Conditional UI rendering based on role hierarchy | **3** | Medium |
| | **Epic Total** | | **21** | |

### Epic 5: Vault Settings & Profile

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 5.1 | Vault Settings Form | 4-field form with validation (name, email, phone, website) | **3** | Medium |
| 5.2 | Vault User Profile | Read-only profile display with role badge, permissions list | **3** | Medium |
| | **Epic Total** | | **6** | |

### Epic 6: API Client & Types

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 6.1 | Typed API Client | Generic authenticatedFetch\<T\>, 9 endpoint functions | **5** | Medium |
| 6.2 | TypeScript Type System | 24 interfaces covering all domain models & API contracts | **3** | Medium |
| 6.3 | Permission Utility Functions | 4 role-based helpers with hierarchy mapping | **2** | Low |
| | **Epic Total** | | **10** | |

### Epic 7: Dev Infrastructure & Docs

| # | Feature | Description | SP | Complexity |
|---|---------|-------------|----|------------|
| 7.1 | Expo Project Setup | app.json, tsconfig, path aliases, Keycloak config | **2** | Low |
| 7.2 | Documentation Suite | 7 docs covering arch, flows, API, SSO, permissions | **5** | Medium |
| 7.3 | Dev Tooling (lint, typecheck) | ESLint + strict TypeScript checking | **1** | Low |
| | **Epic Total** | | **8** | |

### Effort Summary

| Epic | Story Points | % of Total |
|------|-------------|------------|
| 1. Auth & Token Management | 27 | 30% |
| 2. Navigation & Routing | 6 | 7% |
| 3. Vault List & Detail | 12 | 13% |
| 4. Member Management | 21 | 23% |
| 5. Settings & Profile | 6 | 7% |
| 6. API Client & Types | 10 | 11% |
| 7. Infrastructure & Docs | 8 | 9% |
| **TOTAL** | **90** | **100%** |

**Velocity Benchmark**: For a single developer, this represents approximately **2–3 sprints** of work (assuming 35–45 SP/sprint capacity). The heaviest investment is in auth (30%) and member management (23%).

---

## 3. Sprint Retro Report

### What Was Delivered (Completed Features)

**Sprint Goal**: Build a functional MPC vault management iOS app with SSO authentication and role-based member management.

**Status**: MVP Feature-Complete

#### Delivered Capabilities

1. **Full OAuth 2.0 PKCE auth flow** — login, token refresh, foreground resume, cold start, logout
2. **Vault CRUD** — list, detail view, settings edit with form validation
3. **Member management** — add/edit/remove with infinite scroll, search, role-based permissions
4. **Per-vault user profiles** — role display, permissions visibility
5. **4-level RBAC system** — OWNER > ADMIN > SIGNER > VIEWER with UI gating
6. **Comprehensive documentation** — 7 docs covering architecture, API, SSO, permissions, flows
7. **Strict TypeScript** — 24 interfaces, full type coverage

#### Complexity Hotspots Encountered

- **Token refresh logic** — Multiple conditions (expiry calc, interval management, AppState lifecycle)
- **VaultMembersScreen** (544 LOC) — Largest file; combines pagination, search, modal, ActionSheet, role filtering
- **Keychain storage** — Required splitting tokens across 4 items due to 2KB limit

---

### What Went Well

- Clean separation of concerns: routing (`app/`) vs logic (`src/screens/`) vs services (`src/services/`)
- Centralized auth via React Context avoids prop drilling across 7 screens
- Generic `authenticatedFetch<T>()` provides consistent API handling
- Well-structured documentation covering all stakeholder perspectives (PM, Dev, QA)
- Strict TypeScript catches errors early with 24 domain-model interfaces
- Role permission system is simple but effective (31 LOC utility)

### What Could Be Improved

- **No test coverage** — No Jest/testing-library setup; auth flow and permissions logic are high-risk untested areas
- **VaultMembersScreen is oversized** (544 LOC) — Could be decomposed into MemberList, MemberSearch, AddMemberModal subcomponents
- **No error boundary** — App-level crashes have no graceful recovery
- **No offline handling** — Network failures show raw errors via Alert.alert
- **Token refresh edge cases** — No retry backoff on failed refresh; could cascade to logout
- **Inline styles** — All screens use inline StyleSheet; no shared theme/design system
- **No loading skeletons** — ActivityIndicator is used everywhere; skeleton screens would improve perceived performance

### Action Items for Next Sprint

| Priority | Action Item | Estimated SP |
|----------|-------------|-------------|
| P0 | Set up Jest + React Testing Library, write tests for auth flow | 8 |
| P0 | Add tests for permissions utility (canManageMember matrix) | 3 |
| P1 | Extract VaultMembersScreen into composable subcomponents | 5 |
| P1 | Add error boundary with crash recovery UI | 3 |
| P1 | Implement network error handling with retry | 5 |
| P2 | Create shared theme/design tokens (colors, spacing, shadows) | 3 |
| P2 | Add loading skeleton components | 3 |
| P2 | Add token refresh retry with exponential backoff | 3 |
| P3 | Android support testing and fixes | 5 |

---

## 4. Ticket Mapping — Feature Breakdown for Backlog

Below is a ticket-ready breakdown organized by epic. Each item maps to a discrete, shippable unit of work.

### Auth Tickets

| Ticket ID | Title | Type | SP | Dependencies |
|-----------|-------|------|----|-------------|
| AUTH-01 | Implement OAuth 2.0 PKCE login with Keycloak | Feature | 8 | Keycloak client config |
| AUTH-02 | Secure token storage in iOS Keychain | Feature | 3 | AUTH-01 |
| AUTH-03 | Auto token refresh on 60s interval | Feature | 5 | AUTH-02 |
| AUTH-04 | Validate tokens on app foreground resume | Feature | 3 | AUTH-02 |
| AUTH-05 | Cold start token restoration | Feature | 3 | AUTH-02 |
| AUTH-06 | Implement logout with token revocation | Feature | 3 | AUTH-01 |
| AUTH-07 | JWT decoding for user profile extraction | Feature | 2 | AUTH-01 |

### Vault Tickets

| Ticket ID | Title | Type | SP | Dependencies |
|-----------|-------|------|----|-------------|
| VAULT-01 | Vault list screen with pull-to-refresh | Feature | 5 | AUTH-01 |
| VAULT-02 | Vault detail screen with permission-gated actions | Feature | 5 | VAULT-01 |
| VAULT-03 | Vault settings edit form with validation | Feature | 3 | VAULT-02 |
| VAULT-04 | Vault user profile display | Feature | 3 | VAULT-02 |

### Member Management Tickets

| Ticket ID | Title | Type | SP | Dependencies |
|-----------|-------|------|----|-------------|
| MEMBER-01 | Member list with infinite scroll pagination | Feature | 5 | VAULT-02 |
| MEMBER-02 | Debounced member search (300ms) | Feature | 3 | MEMBER-01 |
| MEMBER-03 | Add member modal with role picker | Feature | 5 | MEMBER-01 |
| MEMBER-04 | Edit member role via ActionSheet | Feature | 3 | MEMBER-01 |
| MEMBER-05 | Remove member with confirmation dialog | Feature | 2 | MEMBER-01 |
| MEMBER-06 | Role-based UI permission gating | Feature | 3 | MEMBER-01 |

### Infrastructure Tickets

| Ticket ID | Title | Type | SP | Dependencies |
|-----------|-------|------|----|-------------|
| INFRA-01 | Expo project setup with Keycloak config | Chore | 2 | None |
| INFRA-02 | Typed API client with authenticatedFetch | Feature | 5 | AUTH-01 |
| INFRA-03 | TypeScript type system (24 interfaces) | Chore | 3 | None |
| INFRA-04 | Permission utility functions | Feature | 2 | INFRA-03 |
| INFRA-05 | File-based routing with nav guards | Feature | 3 | AUTH-01 |
| INFRA-06 | Project documentation suite | Chore | 5 | All features |
| INFRA-07 | ESLint + TypeScript strict mode setup | Chore | 1 | INFRA-01 |

### Tech Debt / Improvement Tickets (Next Sprint)

| Ticket ID | Title | Type | SP | Priority |
|-----------|-------|------|----|----------|
| DEBT-01 | Set up Jest + RTL test framework | Chore | 3 | P0 |
| DEBT-02 | Unit tests for auth context & token refresh | Test | 5 | P0 |
| DEBT-03 | Unit tests for permissions utility | Test | 3 | P0 |
| DEBT-04 | Decompose VaultMembersScreen into subcomponents | Refactor | 5 | P1 |
| DEBT-05 | Add app-level error boundary | Feature | 3 | P1 |
| DEBT-06 | Network error handling with retry logic | Feature | 5 | P1 |
| DEBT-07 | Shared design token system (theme) | Refactor | 3 | P2 |
| DEBT-08 | Token refresh retry with backoff | Feature | 3 | P2 |
| DEBT-09 | Android compatibility testing | Test | 5 | P3 |

---

## 5. Key Metrics

| Metric | Value |
|--------|-------|
| Total source files | 25 |
| Total LOC (approx) | ~2,600 |
| TypeScript interfaces | 24 |
| API endpoints integrated | 9 |
| Screens | 7 |
| Reusable components | 2 |
| Documentation pages | 7 |
| Test coverage | 0% |
| Total estimated effort (SP) | 90 |
| Largest complexity area | Auth (30%) |
| Highest-risk untested area | Token refresh + permissions |
