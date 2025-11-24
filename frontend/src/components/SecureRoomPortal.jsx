
import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Shield, 
  Users, 
  Copy, 
  Check, 
  ArrowRight, 
  Home, 
  LogOut, 
  User,
  Lock,
  Plus,
  Key,
  Clock
} from 'lucide-react';
import { ActiveSessionsPanel } from './ActiveSessionsPanel';

const SecureRoomPortal = ({ 
  onNavigateHome, 
  onJoinChat, 
  userEmail, 
  onLogout, 
  userData 
}) => {
  // State Management
  const [activeTab, setActiveTab] = useState('create');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waitingForJoiner, setWaitingForJoiner] = useState(false);
  const [roomStatus, setRoomStatus] = useState(null);
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [popupTimer, setPopupTimer] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showActiveSessions, setShowActiveSessions] = useState(false);

  // Configuration
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
  const CODE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days

  // Initialize component
  useEffect(() => {
    checkForActiveRoom();
  }, []);

  // Poll room status when waiting for joiner
  useEffect(() => {
    if (!waitingForJoiner || !roomCode) return;

    const interval = setInterval(() => {
      checkRoomStatus(roomCode);
    }, 2000);

    return () => clearInterval(interval);
  }, [waitingForJoiner, roomCode]);

  // Check if user already has an active room
  const checkForActiveRoom = () => {
    try {
      const activeRoomData = localStorage.getItem('activeRoomData');
      if (activeRoomData) {
        const roomData = JSON.parse(activeRoomData);
        console.log('User has active room, redirecting to chat');
        onJoinChat(roomData);
      }
    } catch (error) {
      console.error('Error checking active room:', error);
      localStorage.removeItem('activeRoomData');
    }
  };

  // Check room status for waiting creator
  const checkRoomStatus = async (code) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/love-room/rooms/status/${code}?userId=${userData.id || userData.email}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          setRoomStatus({
            memberCount: data.joiner ? 2 : 1,
            status: data.status,
            timeRemaining: data.timeRemaining
          });
          
          setTimeRemaining(data.timeRemaining);
          
          // If room has joiner, creator can join
          if (data.joiner && data.status === 'connected') {
            setSuccess('Partner joined! Entering the love room...');
            setTimeout(() => {
              handleJoinRoom(code, true);
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error('Error checking room status:', error);
    }
  };

  // Validate room code
  const validateCode = async (code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/love-room/validate/${code}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error validating code:', error);
      return { success: false, message: 'Failed to validate code' };
    }
  };

  // Generate 6-character room code
  const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Create new room
  const createRoom = async () => {
    if (!userData?.email || hasGeneratedCode) return;

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const newRoomCode = generateRoomCode();
      
      const response = await fetch(`${API_BASE_URL}/love-room/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          code: newRoomCode,
          creatorEmail: userData.email,
          creatorName: userData.name || userData.email.split('@')[0],
          userId: userData.id || userData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create room');
      }

      setRoomCode(newRoomCode);
      setHasGeneratedCode(true);
      
      // Save room data
      const roomData = {
        roomCode: newRoomCode,
        userEmail: userData.email,
        userName: userData.name || userData.email.split('@')[0],
        isCreator: true,
        userId: userData.id || userData.email,
        roomId: data.data.roomId
      };
      
      localStorage.setItem('activeRoomData', JSON.stringify(roomData));
      
      // Set expiry time from response
      if (data.data.expiresAt) {
        const expiryTime = new Date(data.data.expiresAt).getTime();
        const now = Date.now();
        setTimeRemaining(Math.max(0, expiryTime - now));
      }
      
      // Show popup with countdown
      setShowCodePopup(true);
      setPopupTimer(15);
      
      const timer = setInterval(() => {
        setPopupTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowCodePopup(false);
            handleJoinRoom(newRoomCode, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error creating room:', error);
      setError(error.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!joinCode.trim() || joinCode.trim().length !== 6 || !userData?.email) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const cleanCode = joinCode.trim().toUpperCase();
      
      // First validate the code
      const validation = await validateCode(cleanCode);
      if (!validation.success) {
        throw new Error(validation.message);
      }
      
      const response = await fetch(`${API_BASE_URL}/love-room/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          code: cleanCode,
          userEmail: userData.email,
          userName: userData.name || userData.email.split('@')[0],
          userId: userData.id || userData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room');
      }

      setSuccess('Joined successfully! Redirecting to LoveChat...');
      
      setTimeout(() => {
        handleJoinRoom(cleanCode, false, data.data.roomId);
      }, 1000);

    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Handle joining room chat
  const handleJoinRoom = (code, isCreator = false, roomId = null) => {
    const roomData = {
      roomCode: code,
      userEmail: userData.email,
      userName: userData.name || userData.email.split('@')[0],
      isCreator: isCreator,
      userId: userData.id || userData.email,
      roomId: roomId
    };

    console.log('Joining room with data:', roomData);
    onJoinChat(roomData);
  };

  // Copy code to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setJoinCode('');
    if (!hasGeneratedCode) {
      setRoomCode('');
    }
  };

  // Format join code input
  const formatJoinCodeInput = (value) => {
    return value.replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return 'Expired';
    
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // Code visualization component
  const CodeVisualization = ({ code }) => (
    <div className="bg-black/70 border-2 border-pink-500/50 rounded-xl p-6 mb-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 animate-pulse"></div>
      <div className="relative z-10">
        <div className="flex justify-center items-center space-x-2 mb-2">
          <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
          <span className="text-pink-400 font-mono text-sm">LOVE CODE GENERATED</span>
          <Heart className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <div className="text-center">
          <div className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 font-mono tracking-wider animate-pulse">
            {code}
          </div>
          <div className="mt-2 text-xs text-gray-400 font-mono">
            Share this code with your partner
          </div>
          {timeRemaining && (
            <div className="mt-2 text-xs text-green-400 font-mono">
              {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Code Popup */}
      {showCodePopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 border-2 border-pink-500/50 rounded-2xl p-6 md:p-8 max-w-md w-full relative">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 md:w-8 md:h-8 text-white animate-pulse" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-mono">ROOM CREATED!</h3>
              <p className="text-gray-400 mb-2 text-sm">Share this code with your partner</p>
              <p className="text-xs text-green-400 mb-6 font-mono">
                Expires in 30 days
              </p>
              
              <div className="bg-black/70 border border-pink-500/50 rounded-xl p-4 mb-6">
                <div className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-mono tracking-wider">
                  {roomCode}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowCodePopup(false);
                    handleJoinRoom(roomCode, true);
                  }}
                  className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Skip ({popupTimer}s)
                </button>
              </div>
              
              <div className="text-xs text-gray-500 font-mono">
                Auto-entering chat in {popupTimer} seconds...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900"></div>
        <div className="absolute top-10 left-10 text-4xl md:text-6xl text-pink-500 animate-bounce">💖</div>
        <div className="absolute top-20 right-20 text-3xl md:text-4xl text-purple-400" style={{animation: 'bounce 3s ease-in-out infinite 1s'}}>✨</div>
        <div className="absolute bottom-20 left-20 text-4xl md:text-5xl text-pink-400 animate-pulse">💕</div>
        <div className="absolute bottom-10 right-10 text-2xl md:text-3xl text-purple-300" style={{animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 1.5s'}}>🌹</div>
      </div>

      {/* Header - Responsive */}
      <header className="relative z-20 p-4 md:p-6 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={onNavigateHome}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <Home className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 font-mono">
              SECURE ROOM
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <User className="w-4 h-4 text-pink-400" />
              <span className="text-xs md:text-sm text-gray-300 font-mono hidden sm:inline">
                {userData?.name || userEmail?.split('@')[0] || 'User'}
              </span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-red-900/30 hover:bg-red-800/50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-6 md:pt-12 pb-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-6">
              <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 font-mono">
              WELCOME TO YOUR
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
                LOVE SANCTUARY
              </span>
            </h2>
            <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto px-4">
              Create a secure room or join your partner's room to begin your encrypted love adventure.
              <br />
              <span className="text-pink-400 font-mono text-xs md:text-sm">Your privacy is our priority. Rooms expire in 30 days.</span>
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 rounded-lg p-1 backdrop-blur-sm w-full max-w-md">
              <div className="flex">
                <button
                  onClick={() => handleTabChange('create')}
                  className={`flex-1 px-3 md:px-6 py-3 rounded-lg font-mono text-xs md:text-sm transition-all ${
                    activeTab === 'create'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-1 md:mr-2" />
                  CREATE
                </button>
                <button
                  onClick={() => handleTabChange('join')}
                  className={`flex-1 px-3 md:px-6 py-3 rounded-lg font-mono text-xs md:text-sm transition-all ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Key className="w-4 h-4 inline mr-1 md:mr-2" />
                  JOIN
                </button>
              </div>
            </div>
          </div>

          {/* Create Room Tab */}
          {activeTab === 'create' && (
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-gray-900/60 to-purple-900/30 border border-pink-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4">
                    <Heart className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-mono">CREATE LOVE ROOM</h3>
                  <p className="text-gray-400 text-sm">
                    Generate a secure room code for you and your partner
                    <br />
                    <span className="text-xs text-green-400">Expires in 30 days</span>
                  </p>
                </div>
                
                {hasGeneratedCode && roomCode ? (
                  <div className="space-y-6">
                    <CodeVisualization code={roomCode} />
                    
                    <div className="text-center">
                      <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4">
                        <p className="text-green-400 text-sm font-mono">✓ REDIRECTING TO LOVECHAT...</p>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={createRoom}
                    disabled={isCreating || hasGeneratedCode}
                    className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold text-sm md:text-lg hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>CREATING ROOM...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-6 h-6" />
                        <span>CREATE SECURE ROOM</span>
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                )}
                
                {error && (
                  <div className="mt-4 bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 text-sm font-mono text-center">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Join Room Tab */}
          {activeTab === 'join' && (
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-gray-900/60 to-purple-900/30 border border-pink-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
                    <Key className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-mono">JOIN LOVE ROOM</h3>
                  <p className="text-gray-400 text-sm">
                    Enter your partner's room code to connect
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-400 font-mono text-sm mb-3">
                      ROOM CODE (6 CHARACTERS):
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(formatJoinCodeInput(e.target.value.toUpperCase()))}
                      placeholder="ABC123"
                      maxLength={6}
                      className="w-full px-4 py-4 bg-black/50 border border-gray-600 rounded-lg text-white font-mono text-xl md:text-2xl text-center tracking-widest placeholder-gray-500 focus:border-pink-500 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center font-mono">
                      {joinCode.length}/6 characters
                    </p>
                  </div>

                  <button
                    onClick={joinRoom}
                    disabled={isJoining || joinCode.length !== 6}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-sm md:text-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                  >
                    {isJoining ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>JOINING ROOM...</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-6 h-6" />
                        <span>JOIN LOVE ROOM</span>
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 text-sm font-mono text-center">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-400 text-sm font-mono text-center">{success}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="text-center p-4 md:p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-pink-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2 text-sm md:text-base">END-TO-END ENCRYPTED</h4>
              <p className="text-gray-400 text-xs md:text-sm">Your conversations are protected with military-grade encryption</p>
            </div>
            
            <div className="text-center p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm">
              <Heart className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2">COUPLE-FOCUSED</h4>
              <p className="text-gray-400 text-sm">Designed specifically for intimate conversations between couples</p>
            </div>
            
            <div className="text-center p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm">
              <Lock className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2">ZERO LOGGING</h4>
              <p className="text-gray-400 text-sm">We don't store your messages or personal information</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SecureRoomPortal;