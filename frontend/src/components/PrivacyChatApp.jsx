import React from 'react';
import Header from './Header';
import HomePage from './HomePage';
import Footer from './Footer';

// Assuming you have some styles for the app

const PrivacyChatApp = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <HomePage />
      <Footer />
    </div>
  );
};

export default PrivacyChatApp;