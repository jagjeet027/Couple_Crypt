import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage.jsx';
import AuthPage from './context/AuthPage.jsx';
import SecureRoomPortal from './components/SecureRoomPortal.jsx';
import LoveChat from './components/LoveChat.jsx';
import GameCenter from './components/GameCenter.jsx';
import Profile from './components/page/Profile.jsx';

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

// Home Page Wrapper
function HomePageWrapper() {
  const navigate = useNavigate();
  
  const handleNavigateToSecureRoom = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/secure-room', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  };

  const handleNavigateToGame = () => {
    navigate('/game-center', { replace: true });
  };

  return (
    <HomePage
      onNavigateToSecureRoom={handleNavigateToSecureRoom}
      onNavigateToGame={handleNavigateToGame}
    />
  );
}

// Auth Page Wrapper
function AuthPageWrapper() {
  const navigate = useNavigate();
  
  const handleAuthSuccess = () => {
    navigate('/secure-room', { replace: true });
  };

  return (
    <AuthPage
      initialPage="signin"
      onAuthSuccess={handleAuthSuccess}
      onNavigate={(path) => navigate(path, { replace: true })}
    />
  );
}

function SignupPageWrapper() {
  const navigate = useNavigate();
  
  const handleAuthSuccess = () => {
    navigate('/secure-room', { replace: true });
  };

  return (
    <AuthPage
      initialPage="signup"
      onAuthSuccess={handleAuthSuccess}
      onNavigate={(path) => navigate(path, { replace: true })}
    />
  );
}

// Secure Room Wrapper
function SecureRoomWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigateHome = () => {
    setIsNavigating(true);
    localStorage.removeItem('activeRoomData');
    navigate('/', { replace: true });
  };

  const handleJoinChat = (roomData) => {
    // Prevent multiple navigations
    if (isNavigating) {
      console.warn('⚠️ Navigation already in progress - skipping');
      return;
    }

    setIsNavigating(true);
    console.log('📍 Navigating to chat with room:', roomData.roomCode);
    localStorage.setItem('activeRoomData', JSON.stringify(roomData));
    
    // Use replace to prevent back button issues
    navigate('/chat', { 
      replace: true,
      state: { roomData } 
    });
  };

  const handleLogout = () => {
    setIsNavigating(true);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('activeRoomData');
    navigate('/', { replace: true });
  };

  const userData = (() => {
    try {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  return (
    <SecureRoomPortal
      onNavigateHome={handleNavigateHome}
      onJoinChat={handleJoinChat}
      userEmail={userData?.email}
      onLogout={handleLogout}
      userData={userData}
    />
  );
}

// Chat Wrapper
function ChatWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [roomData, setRoomData] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    try {
      // Get room data from state first
      const state = location.state?.roomData;
      
      if (state) {
        console.log('✅ Room data from navigation state:', state.roomCode);
        setRoomData(state);
        setIsReady(true);
        return;
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('activeRoomData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('✅ Room data from localStorage:', parsed.roomCode);
          setRoomData(parsed);
          setIsReady(true);
          return;
        } catch (e) {
          console.error('❌ Failed to parse activeRoomData:', e);
          localStorage.removeItem('activeRoomData');
        }
      }

      // No room data found
      console.warn('❌ No room data found - redirecting to secure room');
      setIsNavigating(true);
      navigate('/secure-room', { replace: true });
    } catch (error) {
      console.error('❌ Error in ChatWrapper useEffect:', error);
      localStorage.removeItem('activeRoomData');
      setIsNavigating(true);
      navigate('/secure-room', { replace: true });
    }
  }, [navigate, location.state]);

  const handleLeaveChat = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    localStorage.removeItem('activeRoomData');
    navigate('/secure-room', { replace: true });
  };

  const handleNavigateHome = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    localStorage.removeItem('activeRoomData');
    navigate('/', { replace: true });
  };

  const handleNavigateToGame = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    navigate('/game-center', { replace: true });
  };

  const userData = (() => {
    try {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  // Show loading while preparing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl">💖</span>
          </div>
          <p className="text-white text-lg font-mono">Loading Love Room...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  // Safety check - if still no room data, redirect
  if (!roomData) {
    return <Navigate to="/secure-room" replace />;
  }

  return (
    <LoveChat
      roomData={roomData}
      userData={userData}
      onLeaveChat={handleLeaveChat}
      onNavigateHome={handleNavigateHome}
      onNavigateToGame={handleNavigateToGame}
    />
  );
}

// Game Center Wrapper
function GameCenterWrapper() {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const userData = (() => {
    try {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const handleNavigateBack = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    const roomData = localStorage.getItem('activeRoomData');
    
    if (roomData) {
      navigate('/chat', { replace: true });
    } else {
      navigate('/secure-room', { replace: true });
    }
  };

  const handleNavigateHome = () => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    localStorage.removeItem('activeRoomData');
    navigate('/', { replace: true });
  };

  return (
    <GameCenter
      userData={userData}
      roomData={null}
      onNavigateBack={handleNavigateBack}
      onNavigateHome={handleNavigateHome}
    />
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Home */}
        <Route path="/" element={<HomePageWrapper />} />

        {/* Auth */}
        <Route path="/auth" element={<AuthPageWrapper />} />
        <Route path="/login" element={<AuthPageWrapper />} />
        <Route path="/signup" element={<SignupPageWrapper />} />

        {/* Secure Room - Protected */}
        <Route 
          path="/secure-room" 
          element={
            <ProtectedRoute>
              <SecureRoomWrapper />
            </ProtectedRoute>
          } 
        />

        {/* Profile - Protected */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Chat - Protected */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatWrapper />
            </ProtectedRoute>
          } 
        />

        {/* Game Center - Protected */}
        <Route 
          path="/game-center" 
          element={
            <ProtectedRoute>
              <GameCenterWrapper />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;