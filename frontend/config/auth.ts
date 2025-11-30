// Cognito Authentication Configuration
// These values will be populated after deploying the backend

import type { ResourcesConfig } from 'aws-amplify';

// Auto-detect the current origin for redirects
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            import.meta.env.VITE_REDIRECT_SIGN_IN || getCurrentOrigin()
          ],
          redirectSignOut: [
            import.meta.env.VITE_REDIRECT_SIGN_OUT || getCurrentOrigin()
          ],
          responseType: 'code',
          providers: ['Google'],
        },
        email: true,
      },
    },
  },
};

// Helper to check if auth is configured
export const isAuthConfigured = (): boolean => {
  return !!(
    authConfig.Auth?.Cognito?.userPoolId &&
    authConfig.Auth?.Cognito?.userPoolClientId
  );
};

// Auth configuration status for debugging
export const getAuthStatus = () => ({
  configured: isAuthConfigured(),
  userPoolId: authConfig.Auth?.Cognito?.userPoolId ? '✓ Set' : '✗ Missing',
  clientId: authConfig.Auth?.Cognito?.userPoolClientId ? '✓ Set' : '✗ Missing',
  domain: authConfig.Auth?.Cognito?.loginWith?.oauth?.domain ? '✓ Set' : '✗ Missing',
});
