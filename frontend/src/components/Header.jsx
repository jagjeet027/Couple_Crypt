import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, LogOut, ChevronDown, MessageCircle} from 'lucide-react';
import { createIcons, icons } from 'lucide';
import axios from 'axios';

// Configure axios defaults - Change this to your actual backend port
axios.defaults.baseURL = 'http://localhost:2004'; // Change to your backend port
axios.defaults.timeout = 10000; // 10 seconds timeout

const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Check authentication status on component mount and when auth state changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('userData');
      
      if (token && user) {
        try {
          setIsAuthenticated(true);
          setUserData(JSON.parse(user));
        } catch (error) {
          console.error('Error parsing user data:', error);
          setIsAuthenticated(false);
          setUserData(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    };

    checkAuthStatus();

    // Listen for auth state changes
    const handleAuthStateChange = () => {
      checkAuthStatus();
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/auth', { state: { redirectTo: '/' } });
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const clearAuthData = () => {
    // Remove tokens from storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Update state
    setIsAuthenticated(false);
    setUserData(null);
    setShowDropdown(false);
    
    // Dispatch auth state change event
    window.dispatchEvent(new Event('authStateChanged'));
    
    // Navigate to home
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.warn('No auth token found, clearing local data');
        clearAuthData();
        return;
      }

      // Configure axios request with token
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      // Call the backend signout endpoint using axios
      const response = await axios.post('/api/auth/signout', {}, config);
      
      // Handle successful response
      if (response.status === 200 || response.status === 201) {
        const data = response.data || { success: true };
        console.log('SignOut successful:', data.message || 'Logged out successfully');
        clearAuthData();
        navigate('/signin'); // Redirect to sign-in page
      }
    } catch (error) {
      console.error('SignOut error:', error);
      
      // Handle different types of axios errors
      if (error.response) {
        const { status, data } = error.response;
        console.warn(`Server responded with status ${status}, clearing local authentication data`);
        
        if (status === 404) {
          console.warn('SignOut endpoint not found');
        } else if (status === 401) {
          console.warn('Token expired or invalid');
        } else if (status >= 500) {
          console.warn('Server error occurred');
        }
      } else if (error.request) {
        console.warn('Network error - unable to reach server');
      } else {
        console.warn('Unexpected error during signout');
      }
      
      // Always clear auth data for security, regardless of error
      clearAuthData();
    }
  };

  const handleProfileClick = () => {
    setShowDropdown(false);
    navigate('/profile');
  };

  const handleChatClick = () => {
    setShowDropdown(false);
    navigate('/chat');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <header className="relative z-20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={handleLogoClick}
        >
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
            <ticketcheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white font-mono">LoveVault</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-gray-300 hover:text-pink-400 transition-colors font-mono">FEATURES</a>
          <a href="#" className="text-gray-300 hover:text-pink-400 transition-colors font-mono">SECURITY</a>
          <a href="#" className="text-gray-300 hover:text-pink-400 transition-colors font-mono">STORIES</a>
          
          {isAuthenticated && userData ? (
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all"
              >
                {userData.profileImage ? (
                  <img
                    src={userData.profileImage}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="max-w-20 truncate">{userData.username}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userData.username}</p>
                    <p className="text-xs text-gray-500">{userData.email}</p>
                  </div>
                  
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={handleChatClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                      <i data-lucide="ticket-check"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              GET STARTED

            </button>
            
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden">
          {isAuthenticated && userData ? (
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all"
              >
                {userData.profileImage ? (
                  <img
                    src={userData.profileImage}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userData.username}</p>
                    <p className="text-xs text-gray-500">{userData.email}</p>
                  </div>
                  
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={handleChatClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGetStarted}
              className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all text-sm"
            >
              GET STARTED
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;