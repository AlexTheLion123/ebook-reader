import React, { useState, createContext, useContext } from 'react';
import { HeroSection } from './components/HeroSection';
import { MainApp } from './components/MainApp';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { Loader2 } from 'lucide-react';

// The cozy dark library for the Landing Page
const LANDING_BG_URL = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2828&auto=format&fit=crop";

// A reliable high-quality library bookshelf image
// We will tint this heavily with CSS to match the "Orange Vector" aesthetic provided
const APP_BG_URL = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2690&auto=format&fit=crop";

type ViewState = 'LANDING' | 'APP' | 'LOGIN';

// Context for app-level navigation
interface AppNavigationContextType {
  requestLogin: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextType>({ requestLogin: () => {} });

export const useAppNavigation = () => useContext(AppNavigationContext);

// Inner app component that uses auth context
function AppContent() {
  const { isAuthenticated, isLoading, isConfigured } = useAuth();
  const [view, setView] = useState<ViewState>('LANDING');
  const [initialQuery, setInitialQuery] = useState('');

  const handleEnterApp = (query: string) => {
    setInitialQuery(query);
    setView('APP');
  };

  const handleRequestLogin = () => {
    setView('LOGIN');
  };

  const handleCancelLogin = () => {
    setView('APP');
  };

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#3E2723]">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
      </div>
    );
  }

  // If auth is configured and user is not authenticated, always show login
  if (isConfigured && !isAuthenticated) {
    return <LoginPage />;
  }

  // If user manually requested login (even if auth not configured)
  if (view === 'LOGIN') {
    return <LoginPage onCancel={handleCancelLogin} />;
  }

  // Main app (either auth not configured, or user is authenticated)
  return (
    <AppNavigationContext.Provider value={{ requestLogin: handleRequestLogin }}>
      <div className="relative w-full min-h-screen overflow-hidden bg-[#3E2723]">
      {/* 
        Background Rendering Logic:
        - Landing: Cozy dark image with curved overlay
        - App: Bookshelf image with heavy brown tint to mimic vector art
      */}
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 transition-opacity duration-700 ease-in-out">
        {view === 'LANDING' ? (
          <>
            {/* Landing Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] scale-105"
              style={{ backgroundImage: `url(${LANDING_BG_URL})` }}
            />
            {/* Landing Overlay (Curved Dark) */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a110e] via-[#2a1d18]/95 to-transparent w-full md:w-[70%] skew-x-12 -translate-x-24 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a110e] via-transparent to-black/20" />
          </>
        ) : (
          <>
            {/* App Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${APP_BG_URL})` }}
            />
            {/* 
              App Overlay - Earthy Brown Tint 
              Changed from Orange/Red to Brown shades as requested.
              Gradient goes from Light Brown -> Medium Brown -> Dark Brown
            */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8D6E63]/90 via-[#5D4037]/90 to-[#3E2723]/95 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-[1px]" />
          </>
        )}
      </div>

      {/* Content Render */}
      <div className="relative z-10 w-full min-h-screen">
        {view === 'LANDING' ? (
          <div className="flex items-center min-h-screen">
             <HeroSection onEnterApp={handleEnterApp} />
          </div>
        ) : (
          <MainApp initialQuery={initialQuery} />
        )}
      </div>
    </div>
    </AppNavigationContext.Provider>
  );
}

// Root app component with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;