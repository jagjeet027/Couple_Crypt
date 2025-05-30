import React from 'react';
import { useState } from 'react';
import HomePage from './HomePage';
import SecureRoomPortal from './SecureRoomPortal';

// Assuming you have some styles for the app
const PrivacyChatApp = () => {
  const [currentView, setCurrentView] = useState('home');

  const navigateToSecureRoom = () => {
    setCurrentView('secure-room');
  };

  const navigateToHome = () => {
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen">
      {currentView === 'home' && (
        <HomePage onNavigateToSecureRoom={navigateToSecureRoom} />
      )}
      {currentView === 'secure-room' && (
        <SecureRoomPortal onNavigateHome={navigateToHome} />
      )}
    </div>
  );
};

export default PrivacyChatApp;