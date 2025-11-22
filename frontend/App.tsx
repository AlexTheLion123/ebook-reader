import React, { useState } from 'react';
import { HeroSection } from './components/HeroSection';
import { MainApp } from './components/MainApp';

// The cozy dark library for the Landing Page
const LANDING_BG_URL = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2828&auto=format&fit=crop";

// A reliable high-quality library bookshelf image
// We will tint this heavily with CSS to match the "Orange Vector" aesthetic provided
const APP_BG_URL = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2690&auto=format&fit=crop";

function App() {
  const [showApp, setShowApp] = useState(false);

  const handleEnterApp = (query: string) => {
    setShowApp(true);
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#3E2723]">
      {!showApp ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[3s] scale-105"
            style={{ backgroundImage: `url(${LANDING_BG_URL})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a110e] via-[#2a1d18]/95 to-transparent w-full md:w-[70%] skew-x-12 -translate-x-24 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a110e] via-transparent to-black/20" />
          <div className="relative z-10 flex items-center min-h-screen">
            <HeroSection onEnterApp={handleEnterApp} />
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${APP_BG_URL})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#8D6E63]/90 via-[#5D4037]/90 to-[#3E2723]/95 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[#3E2723]/30 backdrop-blur-[1px]" />
          <div className="relative z-10 w-full min-h-screen">
            <MainApp initialQuery="" />
          </div>
        </>
      )}
    </div>
  );
}

export default App;