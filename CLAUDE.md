# MpcMobile - Claude Code Guide

## Project Overview

React Native (Expo) iOS application demonstrating OAuth 2.0 Authorization Code Flow with PKCE using Keycloak SSO and backend API integration with JWT tokens.

## Tech Stack

- **Framework**: Expo SDK 54
- **Language**: TypeScript (strict mode)
- **Navigation**: expo-router v6
- **OAuth/OIDC**: expo-auth-session
- **Secure Storage**: expo-secure-store (iOS Keychain)
- **State Management**: React Context

## Project Structure

```
MpcMobile/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with AuthProvider
│   ├── index.tsx                # Sign-in page (entry point)
│   └── home.tsx                 # Protected home page
├── src/
│   ├── config/auth.ts           # Keycloak OAuth configuration
│   ├── context/AuthContext.tsx  # Auth provider with token management
│   ├── hooks/useAuth.ts         # Custom hook for auth context
│   ├── screens/
│   │   ├── SignInScreen.tsx     # Login screen
│   │   └── HomeScreen.tsx       # Main authenticated screen
│   ├── components/
│   │   ├── CountdownTimer.tsx   # Token expiration countdown
│   │   └── TokenDisplay.tsx     # JWT token viewer
│   ├── services/api.ts          # Backend API client
│   └── types/index.ts           # TypeScript type definitions
├── app.json                      # Expo config (URL scheme, env vars)
├── package.json
└── tsconfig.json
```

## Commands

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# TypeScript type check
npm run typecheck
```

## Configuration

Environment variables are in `app.json` under `expo.extra`:

```json
{
  "KEYCLOAK_URL": "http://localhost:8080",
  "KEYCLOAK_REALM": "mpc",
  "KEYCLOAK_CLIENT_ID": "mpc-mobile",
  "BACKEND_API_URL": "http://localhost:14444"
}
```

### OAuth Redirect URLs

- **Callback**: `com.mpcmobile.auth://callback`
- **Logout**: `com.mpcmobile.auth://logout`

These must be configured in Keycloak client settings.

## Key Implementation Details

### Authentication Flow

1. User taps "Sign In" → Opens system browser via `expo-auth-session`
2. User authenticates with Keycloak
3. Keycloak redirects back via custom URL scheme
4. App exchanges auth code for tokens (PKCE verified)
5. Tokens stored in iOS Keychain via `expo-secure-store`
6. Access token used for API calls

### Token Management

- **Auto-refresh**: Tokens refresh automatically before expiration (60s interval)
- **AppState handling**: Token validity checked when app returns to foreground
- **Secure storage**: Never stored in AsyncStorage, only Keychain

### Navigation Guard Pattern

Routes are protected in `app/home.tsx` - if not authenticated, redirects to sign-in.

## API Endpoints

Backend API base URL configured in `app.json`. Main endpoint:

- `GET /api/v1/users/me` - Fetch authenticated user profile

## Keycloak Client Requirements

```
Client Type: OpenID Connect
Client Authentication: Off (public client)
Standard Flow: Enabled
PKCE Code Challenge Method: S256
Valid Redirect URIs: com.mpcmobile.auth://callback
Valid Post Logout Redirect URIs: com.mpcmobile.auth://logout
```

## Development Notes

- Uses Expo's managed workflow
- iOS App Transport Security allows HTTP for local development (disable in production)
- The `scheme` in app.json registers the custom URL scheme for OAuth callbacks
