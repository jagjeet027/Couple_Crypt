import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import SecureRoomPortal from './SecureRoomPortal';
import AuthPage from '../context/AuthPage';
import LoveChat from './LoveChat';
import GameCenter from './GameCenter';

const PrivacyChatApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [chatRoomData, setChatRoomData] = useState(null);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');

      if (token && userData) {
        try {
          JSON.parse(userData);
          return true;
        } catch (e) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  };

  const getUserData = () => {
    try {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  };

  const getPersistedRoomData = () => {
    try {
      const roomData = localStorage.getItem('activeRoomData');
      return roomData ? JSON.parse(roomData) : null;
    } catch (error) {
      return null;
    }
  };

  const saveRoomData = (roomData) => {
    try {
      localStorage.setItem('activeRoomData', JSON.stringify(roomData));
    } catch (error) {
      console.error('Save room error:', error);
    }
  };

  const clearRoomData = () => {
    try {
      localStorage.removeItem('activeRoomData');
    } catch (error) {
      console.error('Clear room error:', error);
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      const authenticated = checkAuthentication();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const persistedRoomData = getPersistedRoomData();
        if (persistedRoomData) {
          setChatRoomData(persistedRoomData);
          setCurrentView('chat');
        }
      }

      setIsLoading(false);
    };

    setTimeout(initializeAuth, 100);
  }, []);

  const navigateToSecureRoom = () => {
    setIsLoading(true);

    const authenticated = checkAuthentication();

    if (authenticated) {
      setIsAuthenticated(true);
      setCurrentView('secure-room');
      setPendingRedirect(false);
    } else {
      setIsAuthenticated(false);
      setPendingRedirect(true);
      setCurrentView('auth');
    }

    setIsLoading(false);
  };

  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);

    if (pendingRedirect) {
      setCurrentView('secure-room');
      setPendingRedirect(false);
    } else {
      setCurrentView('home');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    clearRoomData();

    setIsAuthenticated(false);
    setPendingRedirect(false);
    setChatRoomData(null);
    setCurrentView('home');
  };

  const navigateToHome = () => {
    const persistedRoomData = getPersistedRoomData();
    if (persistedRoomData && isAuthenticated) {
      setCurrentView('chat');
      setChatRoomData(persistedRoomData);
    } else {
      setCurrentView('home');
      setPendingRedirect(false);
      setChatRoomData(null);
    }
  };

  const handleJoinChat = (roomData) => {
    setChatRoomData(roomData);
    saveRoomData(roomData);
    setCurrentView('chat');
  };

  const handleLeaveChat = () => {
    setChatRoomData(null);
    clearRoomData();
    setCurrentView('secure-room');
  };

  const handleNavigateToGame = () => {
    setCurrentView('game-center');
  };

  const handleNavigateBack = () => {
    if (chatRoomData) {
      setCurrentView('chat');
    } else {
      setCurrentView('secure-room');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-mono text-lg">INITIALIZING LOVE VAULT...</p>
          <p className="text-pink-400 font-mono text-sm mt-2">Checking authentication status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentView === 'home' && (
        <HomePage
          onNavigateToSecureRoom={navigateToSecureRoom}
        />
      )}

      {currentView === 'auth' && (
        <AuthPage
          initialPage="signin"
          onAuthSuccess={handleAuthSuccess}
          pendingRedirect={pendingRedirect}
        />
      )}

      {currentView === 'secure-room' && isAuthenticated && (
        <SecureRoomPortal
          onNavigateHome={navigateToHome}
          onJoinChat={handleJoinChat}
          userEmail={getUserData()?.email}
          onLogout={handleLogout}
          userData={getUserData()}
        />
      )}

      {currentView === 'chat' && isAuthenticated && chatRoomData && (
        <LoveChat
          roomData={chatRoomData}
          userData={getUserData()}
          onLeaveChat={handleLeaveChat}
          onNavigateHome={navigateToHome}
          onNavigateToGame={handleNavigateToGame}
        />
      )}

      {currentView === 'game-center' && isAuthenticated && (
        <GameCenter
          userData={getUserData()}
          roomData={chatRoomData}
          onNavigateBack={handleNavigateBack}
          onNavigateHome={navigateToHome}
        />
      )}

      {currentView === 'secure-room' && !isAuthenticated && (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🔒</div>
            <h2 className="text-white text-2xl font-mono mb-4">ACCESS DENIED</h2>
            <p className="text-gray-400 mb-8">Please sign in to access the secure room</p>
            <button
              onClick={() => setCurrentView('auth')}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg font-mono hover:bg-pink-700 transition-colors"
            >
              SIGN IN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyChatApp;