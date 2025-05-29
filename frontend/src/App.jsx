import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PrivacyChatApp from './components/PrivacyChatApp.jsx'
import AuthPage from './context/AuthPage.jsx'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PrivacyChatApp />} />
        <Route path="/login" element={<AuthPage initialPage="login" />} />
        <Route path="/signup" element={<AuthPage initialPage="signup" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App