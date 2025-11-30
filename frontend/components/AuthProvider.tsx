import React, { createContext, useContext, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  signUp, 
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  AuthUser
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { authConfig, isAuthConfigured } from '../config/auth';

// Initialize Amplify
if (isAuthConfigured()) {
  Amplify.configure(authConfig);
}

// User type
export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ isSignUpComplete: boolean; nextStep: any }>;
  confirmSignUpCode: (email: string, code: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isAuthConfigured();

  // Convert Amplify user to our User type
  const mapAmplifyUser = async (amplifyUser: AuthUser): Promise<User> => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const payload = idToken?.payload;
      
      return {
        id: amplifyUser.userId,
        email: (payload?.email as string) || '',
        name: (payload?.name as string) || (payload?.['cognito:username'] as string),
        picture: payload?.picture as string | undefined,
      };
    } catch (error) {
      console.error('Error mapping user:', error);
      return {
        id: amplifyUser.userId,
        email: '',
      };
    }
  };

  // Check current auth state
  const checkAuthState = async () => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const amplifyUser = await getCurrentUser();
      const mappedUser = await mapAmplifyUser(amplifyUser);
      setUser(mappedUser);
    } catch (error) {
      // User is not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for auth events
  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    checkAuthState();

    const unsubscribe = Hub.listen('auth', async ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          await checkAuthState();
          break;
        case 'signedOut':
          setUser(null);
          break;
        case 'tokenRefresh':
          await checkAuthState();
          break;
        case 'tokenRefresh_failure':
          setUser(null);
          break;
      }
    });

    return () => unsubscribe();
  }, [isConfigured]);

  // Sign in with email/password
  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        await checkAuthState();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email/password
  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          ...(name && { name }),
        },
      },
    });
    return result;
  };

  // Confirm sign up code
  const confirmSignUpCode = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    await signInWithRedirect({ provider: 'Google' });
  };

  // Sign out
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Get access token for API calls
  const getAccessToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isConfigured,
        signInWithEmail,
        signUpWithEmail,
        confirmSignUpCode,
        signInWithGoogle,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
