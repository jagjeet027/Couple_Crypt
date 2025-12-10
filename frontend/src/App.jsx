import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import HomePage from './components/HomePage.jsx';
import AuthPage from './context/AuthPage.jsx';
import SecureRoomPortal from './components/SecureRoomPortal.jsx';
import LoveChat from './components/LoveChat.jsx';
import GameCenter from './components/GameCenter.jsx';
import Profile from './components/page/Profile.jsx';

// Home Page Wrapper
function HomePageWrapper() {
  const navigate = useNavigate();
  
  const handleNavigateToSecureRoom = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/secure-room');
    } else {
      navigate('/auth');
    }
  };

  const handleNavigateToGame = () => {
    navigate('/game-center');
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
    navigate('/secure-room');
  };

  return (
    <AuthPage
      initialPage="signin"
      onAuthSuccess={handleAuthSuccess}
      onNavigate={(path) => navigate(path)}
    />
  );
}

function SignupPageWrapper() {
  const navigate = useNavigate();
  
  const handleAuthSuccess = () => {
    navigate('/secure-room');
  };

  return (
    <AuthPage
      initialPage="signup"
      onAuthSuccess={handleAuthSuccess}
      onNavigate={(path) => navigate(path)}
    />
  );
}

// Secure Room Wrapper
function SecureRoomWrapper() {
  const navigate = useNavigate();
  const [chatRoomData, setChatRoomData] = useState(null);

  const handleNavigateHome = () => {
    navigate('/');
  };

  const handleJoinChat = (roomData) => {
    setChatRoomData(roomData);
    navigate('/chat', { state: { roomData } });
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
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
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    // Try to get room data from state
    const state = window.history.state?.state;
    if (state?.roomData) {
      setRoomData(state.roomData);
    } else {
      // Try to get from sessionStorage
      const saved = sessionStorage.getItem('activeRoomData');
      if (saved) {
        try {
          setRoomData(JSON.parse(saved));
        } catch {
          navigate('/secure-room');
        }
      } else {
        navigate('/secure-room');
      }
    }
  }, [navigate]);

  const handleLeaveChat = () => {
    sessionStorage.removeItem('activeRoomData');
    navigate('/secure-room');
  };

  const handleNavigateHome = () => {
    sessionStorage.removeItem('activeRoomData');
    navigate('/');
  };

  const handleNavigateToGame = () => {
    navigate('/game-center');
  };

  const userData = (() => {
    try {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  if (!roomData) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
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

  const userData = (() => {
    try {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const handleNavigateBack = () => {
    console.log('✅ Back button clicked - Going to previous page');
    // Check if there's a room data, if yes go to chat, else go to home
    const roomData = sessionStorage.getItem('activeRoomData');
    if (roomData) {
      navigate('/chat');
    } else {
      navigate('/');
    }
  };

  const handleNavigateHome = () => {
    console.log('✅ Home button clicked - Going to home');
    sessionStorage.removeItem('activeRoomData');
    navigate('/');
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

        {/* Secure Room */}
        <Route path="/secure-room" element={<SecureRoomWrapper />} />
        <Route path = "/profile" element={<Profile/>}/>
         {/* Chat */}
        <Route path="/chat" element={<ChatWrapper />} />

        {/* Game Center */}
        <Route path="/game-center" element={<GameCenterWrapper />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;