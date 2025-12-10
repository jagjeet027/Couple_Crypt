import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, LogOut, ChevronDown, MessageCircle, Sparkles } from 'lucide-react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:2004';
axios.defaults.timeout = 10000;

const Header = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

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
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    setIsAuthenticated(false);
    setUserData(null);
    setShowDropdown(false);
    
    window.dispatchEvent(new Event('authStateChanged'));
    
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

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.post('/api/auth/signout', {}, config);
      
      if (response.status === 200 || response.status === 201) {
        const data = response.data || { success: true };
        console.log('SignOut successful:', data.message || 'Logged out successfully');
        clearAuthData();
        navigate('/signin');
      }
    } catch (error) {
      console.error('SignOut error:', error);
      
      if (error.response) {
        const { status } = error.response;
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

  const getProfileImageUrl = () => {
    if (!userData?.profileImage) return null;
    
    // If it's a data URL (preview), return as is
    if (userData.profileImage.startsWith('data:')) {
      return userData.profileImage;
    }
    
    // If it's a path, prepend the base URL
    if (userData.profileImage.startsWith('/uploads')) {
      return `http://localhost:2004${userData.profileImage}`;
    }
    
    return userData.profileImage;
  };

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
    <header className="relative z-20 px-6 py-4 md:py-4 pt-6 md:pt-4 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/30 shadow-lg shadow-purple-500/10">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={handleLogoClick}
        >
          <div className="relative w-12 h-12 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/50 group-hover:shadow-red-400/70 transition-all duration-300 transform group-hover:scale-110">
            <Heart className="w-7 h-7 text-white drop-shadow-lg animate-pulse" fill="white" />
            <Sparkles className="absolute w-5 h-5 text-yellow-300 top-0 right-0 animate-bounce" />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 font-mono drop-shadow-lg">LoveVault</span>
            <span className="text-xs text-purple-300 font-semibold tracking-widest">MEMORIES PROTECTED</span>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-gray-300 hover:text-red-400 transition-colors font-mono text-sm font-semibold relative group">
            FEATURES
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="#" className="text-gray-300 hover:text-red-400 transition-colors font-mono text-sm font-semibold relative group">
            SECURITY
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="#" className="text-gray-300 hover:text-red-400 transition-colors font-mono text-sm font-semibold relative group">
            STORIES
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-400 to-pink-400 group-hover:w-full transition-all duration-300"></span>
          </a>
          
          {isAuthenticated && userData ? (
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-red-500/50 hover:shadow-red-400/70 transform hover:scale-105"
              >
                {userData.profileImage ? (
                  <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover border-2 border-white/30"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="max-w-20 truncate">{userData.username}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-56 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-purple-500/30 py-3 z-50 backdrop-blur-sm">
                  <div className="px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-red-500/10 to-purple-500/10">
                    <p className="text-sm font-bold text-red-300">{userData.username}</p>
                    <p className="text-xs text-purple-300/70">{userData.email}</p>
                  </div>
                  
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:text-red-300 hover:bg-red-500/10 flex items-center space-x-3 transition-all group"
                  >
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={handleChatClick}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:text-pink-300 hover:bg-pink-500/10 flex items-center space-x-3 transition-all group"
                  >
                    <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Chat</span>
                  </button>
                  
                  <div className="border-t border-purple-500/20 mt-2 pt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center space-x-3 transition-all group font-semibold"
                    >
                      <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-red-500/50 hover:shadow-red-400/70 transform hover:scale-105 relative overflow-hidden group"
            >
              <span className="relative z-10">GET STARTED</span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-pink-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="md:hidden">
          {isAuthenticated && userData ? (
            <div className="relative dropdown-container">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-red-500/50"
              >
                {userData.profileImage ? (
                  <img
                    src={getProfileImageUrl()}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover border-2 border-white/30"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-48 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-purple-500/30 py-3 z-50 backdrop-blur-sm">
                  <div className="px-4 py-3 border-b border-purple-500/20 bg-gradient-to-r from-red-500/10 to-purple-500/10">
                    <p className="text-sm font-bold text-red-300">{userData.username}</p>
                    <p className="text-xs text-purple-300/70">{userData.email}</p>
                  </div>
                  
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:text-red-300 hover:bg-red-500/10 flex items-center space-x-3 transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  
                  <button
                    onClick={handleChatClick}
                    className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:text-pink-300 hover:bg-pink-500/10 flex items-center space-x-3 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat</span>
                  </button>
                  
                  <div className="border-t border-purple-500/20 mt-2 pt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center space-x-3 transition-all font-semibold"
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
              className="px-4 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-red-700 hover:via-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-red-500/50 text-sm transform hover:scale-105"
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