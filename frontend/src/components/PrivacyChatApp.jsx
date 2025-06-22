import React, { useState, useEffect } from 'react';
import HomePage from './HomePage';
import SecureRoomPortal from './SecureRoomPortal';
import AuthPage from '../context/AuthPage';
import LoveChat from './LoveChat'; // Import your LoveChat component

const PrivacyChatApp = () => {
  const [currentView, setCurrentView] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [chatRoomData, setChatRoomData] = useState(null); // Store chat room data

  // Function to check if user is authenticated
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
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  // Get user data from storage
  const getUserData = () => {
    try {
      const userData = localStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const navigateToSecureRoom = async () => {
    setIsLoading(true);
    
    try {
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
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setPendingRedirect(true);
      setCurrentView('auth');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = (userData) => {
    console.log('Authentication successful:', userData);
    setIsAuthenticated(true);
    
    if (pendingRedirect) {
      setCurrentView('secure-room');
      setPendingRedirect(false);
    } else {
      setCurrentView('home');
    }
  };

  // Handle logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      setIsAuthenticated(false);
      setPendingRedirect(false);
      setChatRoomData(null); 
      setCurrentView('home');
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Navigate back to home
  const navigateToHome = () => {
    setCurrentView('home');
    setPendingRedirect(false);
    setChatRoomData(null); 
  };

  const navigateToAuth = () => {
    setCurrentView('auth');
  };

  const handleJoinChat = (roomData) => {
    console.log('Joining chat with room data:', roomData);
    setChatRoomData(roomData);
    setCurrentView('chat');
  };

  // NEW: Handle leaving chat room
  const handleLeaveChat = () => {
    setChatRoomData(null);
    setCurrentView('secure-room');
  };

  const handleAuthNavigation = (path) => {
    if (path === '/') {
      navigateToHome();
    } else if (path === '/secure-room') {
      if (isAuthenticated) {
        setCurrentView('secure-room');
      } else {
        navigateToSecureRoom();
      }
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      const authenticated = checkAuthentication();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
      
      if (authenticated) {
        console.log('User is already authenticated');
      } else {
        console.log('User is not authenticated');
      }
    };

    setTimeout(initializeAuth, 100);
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthStateChange = () => {
      const authenticated = checkAuthentication();
      setIsAuthenticated(authenticated);
      
      if (!authenticated && (currentView === 'secure-room' || currentView === 'chat')) {
        setCurrentView('home');
        setPendingRedirect(false);
        setChatRoomData(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    window.addEventListener('storage', handleAuthStateChange);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      window.removeEventListener('storage', handleAuthStateChange);
    };
  }, [currentView]);

  // Loading state
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
          onNavigateToAuth={navigateToAuth}
          isAuthenticated={isAuthenticated}
          userData={getUserData()}
        />
      )}
      
      {currentView === 'auth' && (
        <AuthPage 
          initialPage="signin"
          onNavigate={handleAuthNavigation}
          onAuthSuccess={handleAuthSuccess}
          pendingRedirect={pendingRedirect}
        />
      )}
      
      {currentView === 'secure-room' && isAuthenticated && (
        <SecureRoomPortal 
          onNavigateHome={navigateToHome}
          onJoinChat={handleJoinChat} // ✅ Now properly passing onJoinChat
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
        />
      )}
      
      {/* Fallback for when user tries to access secure room without auth */}
      {currentView === 'secure-room' && !isAuthenticated && (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🔒</div>
            <h2 className="text-white text-2xl font-mono mb-4">ACCESS DENIED</h2>
            <p className="text-gray-400 mb-8">Please sign in to access the secure room</p>
            <button 
              onClick={navigateToAuth}
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