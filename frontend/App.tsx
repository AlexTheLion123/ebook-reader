import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { HeroSection } from './components/HeroSection';
import { MainApp } from './components/MainApp';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LoginPage } from './components/LoginPage';
import { Loader2 } from 'lucide-react';

// The cozy dark library for the Landing Page
const LANDING_BG_URL = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2828&auto=format&fit=crop";

// A reliable high-quality library bookshelf image
const APP_BG_URL = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2690&auto=format&fit=crop";

// Background wrapper component for consistent styling
function AppBackground({ isLanding, children }: { isLanding: boolean; children: React.ReactNode }) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#3E2723]">
      <div className="absolute inset-0 z-0">
        {isLanding ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${LANDING_BG_URL})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a110e] via-[#2a1d18]/95 to-transparent w-full md:w-[70%] skew-x-12 -translate-x-24 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a110e] via-transparent to-black/20" />
          </>
        ) : (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${APP_BG_URL})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#8D6E63]/90 via-[#5D4037]/90 to-[#3E2723]/95 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-[1px]" />
          </>
        )}
      </div>
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}

// Landing page component
function LandingPage() {
  const navigate = useNavigate();
  
  const handleEnterApp = (query: string) => {
    if (query) {
      navigate(`/app?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/app');
    }
  };

  return (
    <AppBackground isLanding={true}>
      <div className="flex items-center min-h-screen">
        <HeroSection onEnterApp={handleEnterApp} />
      </div>
    </AppBackground>
  );
}

// Main app wrapper with navigation context
function AppPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Extract query from URL
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  
  // Extract book/chapter from URL params if present
  const bookId = params.bookId;
  const chapterNumber = params.chapterNumber ? parseInt(params.chapterNumber) : undefined;

  const handleRequestLogin = () => {
    navigate('/login');
  };

  return (
    <AppBackground isLanding={false}>
      <MainApp 
        initialQuery={initialQuery} 
        initialBookId={bookId}
        initialChapter={chapterNumber}
        onRequestLogin={handleRequestLogin}
      />
    </AppBackground>
  );
}

// Dashboard page - dedicated route for study dashboard
function DashboardPage() {
  const navigate = useNavigate();

  const handleRequestLogin = () => {
    navigate('/login');
  };

  return (
    <AppBackground isLanding={false}>
      <MainApp 
        initialView="dashboard"
        onRequestLogin={handleRequestLogin}
      />
    </AppBackground>
  );
}

// Auth pages wrapper
function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // If already authenticated, redirect to app
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const handleSuccess = () => {
    navigate('/app');
  };

  return (
    <LoginPage 
      onCancel={handleCancel} 
      onSuccess={handleSuccess}
      initialMode={mode}
    />
  );
}

// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#3E2723]">
      <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
    </div>
  );
}

// App routes wrapped with auth check
function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Auth routes */}
      <Route path="/login" element={<AuthPage mode="signin" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      
      {/* Main app routes */}
      <Route path="/app" element={<AppPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/book/:bookId" element={<AppPage />} />
      <Route path="/book/:bookId/chapter/:chapterNumber" element={<AppPage />} />
      
      {/* Fallback - redirect to landing */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

// Root app component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
