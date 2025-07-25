import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PrivacyChatApp from './components/PrivacyChatApp.jsx'
import AuthPage from './context/AuthPage.jsx'
import SecureRoomPortal from './components/SecureRoomPortal.jsx'
import GameCenter from './components/GameCenter.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PrivacyChatApp />} />
        <Route path="/auth" element={<AuthPage initialPage="signin" onNavigate={(path) => window.location.href = path} />} />
        <Route path="/login" element={<AuthPage initialPage="signin" />} />
        <Route path="/signup" element={<AuthPage initialPage="signup" />} />
        <Route path="/secure-room" element={<SecureRoomPortal />} />
        <Route path="/chat" element={<PrivacyChatApp />} />
        <Route path="/game-center" element={<GameCenter/>}/>
        <Route path="*" element={<Navigate to="/" replace />} />/
      </Routes>
    </Router>
  )
}

export default App