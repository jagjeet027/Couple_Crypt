import React from 'react';    
import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PrivacyChatApp from './components/PrivacyChatApp.jsx'
import AuthPage from './context/AuthPage.jsx'
import HomePage from './components/HomePage.jsx'
import SecureRoomPortal from './components/SecureRoomPortal.jsx'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PrivacyChatApp />} />
        <Route path="/login" element={<AuthPage initialPage="login" />} />
        <Route path="/signup" element={<AuthPage initialPage="signup" />} />
        <Route path="/secure-room" element={<SecureRoomPortal />} />
        <Route path="/chat" element={<PrivacyChatApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
