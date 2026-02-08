# MPC Mobile — Project Documentation

MPC Mobile is a React Native (Expo) iOS application that provides multi-party computation (MPC) vault management. It authenticates users via OAuth 2.0 Authorization Code Flow with PKCE against Keycloak SSO, integrates with a backend API using JWT tokens, and delivers vault listing, detail views, member management (CRUD with role-based permissions), vault settings, and per-vault user profiles.

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Routing**: expo-router v6 (file-based)
- **Auth**: OAuth 2.0 PKCE via `expo-auth-session`
- **SSO Provider**: Keycloak
- **Token Storage**: iOS Keychain via `expo-secure-store`
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Architecture**: React New Architecture enabled

## Documentation Map

| Document | Audience | Description |
|----------|----------|-------------|
| [Architecture Overview](./01-architecture-overview.md) | PM, Dev | System context, application layers, project structure |
| [Page Flow](./02-page-flow.md) | PM, QA | Screen navigation, auth guards, feature matrix |
| [Sequence Diagrams](./03-sequence-diagrams.md) | Dev, QA | 10 sequence diagrams for all key user flows |
| [API Reference](./04-api-reference.md) | Dev, QA | All REST API endpoints, types, error handling |
| [SSO Integration](./05-sso-integration.md) | Dev | OAuth 2.0 PKCE flow, Keycloak config, token lifecycle |
| [Role & Permissions](./06-role-permissions.md) | PM, QA | Role hierarchy, permission matrix, test matrix |
| [Sprint Retro Report](./07-sprint-retro-report.md) | PM, Dev, QA | Project analysis, effort estimation (90 SP), ticket mapping |

### By Audience

- **Product Manager**: README, Architecture Overview, Page Flow, Role & Permissions
- **Developer**: Architecture Overview, Sequence Diagrams, API Reference, SSO Integration
- **QA Engineer**: Page Flow, Sequence Diagrams, API Reference, Role & Permissions

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Expo dev server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# TypeScript type check
pnpm typecheck

# Lint
pnpm lint
```

## Environment Configuration

All environment variables are configured in `app.json` under `expo.extra` (not `.env` files):

| Variable | Description | Default |
|----------|-------------|---------|
| `KEYCLOAK_URL` | Keycloak server base URL | `http://localhost:8080` |
| `KEYCLOAK_REALM` | Keycloak realm name | `mpc` |
| `KEYCLOAK_CLIENT_ID` | OAuth 2.0 client identifier | `mpc-mobile` |
| `BACKEND_API_URL` | Backend REST API base URL | `http://localhost:14444` |

### OAuth Redirect URLs

These must match the Keycloak client configuration:

| Purpose | URL |
|---------|-----|
| Callback | `com.mpcmobile.auth://callback` |
| Post-logout | `com.mpcmobile.auth://logout` |

The custom URL scheme `com.mpcmobile.auth` is registered in `app.json` under `expo.scheme`.
