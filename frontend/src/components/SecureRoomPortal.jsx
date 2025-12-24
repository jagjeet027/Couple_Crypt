import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { ActiveSessionsPanel } from './ActiveSessionsPanel';
import ActiveSessionsPopup from './ActiveSessionsPopup';

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
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [popupTimer, setPopupTimer] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showActiveSessions, setShowActiveSessions] = useState(false);
  const [showSessionsPopup, setShowSessionsPopup] = useState(false);

  const hasCheckedActiveRoom = useRef(false);

  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

  // ✅ Check for active sessions on mount (ONLY ONCE)
  useEffect(() => {
    if (hasCheckedActiveRoom.current) return;
    hasCheckedActiveRoom.current = true;

    try {
      const activeRoomData = localStorage.getItem('activeRoomData');
      if (activeRoomData) {
        try {
          const roomData = JSON.parse(activeRoomData);
          console.log('✅ Found active room:', roomData.roomCode);
          setShowSessionsPopup(true);
        } catch (parseError) {
          console.error('❌ Invalid activeRoomData:', parseError);
          localStorage.removeItem('activeRoomData');
        }
      }
    } catch (error) {
      console.error('❌ Error checking active room:', error);
    }
  }, []);

  // ✅ Validate room code format
  const validateCodeFormat = (code) => {
    return code && code.length === 6 && /^[A-Z0-9]{6}$/.test(code);
  };

  // ✅ Generate random 6-character room code
  const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // ✅ Create new room
  const createRoom = async () => {
    if (!userData?.email || !userData?.id) {
      setError('User information is required. Please login again.');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const newRoomCode = generateRoomCode();
      const token = localStorage.getItem('authToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔐 Creating room with code:', newRoomCode);

      const response = await fetch(`${API_BASE_URL}/love-room/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorEmail: userData.email,
          creatorName: userData.name || userData.email.split('@')[0],
          userId: userData.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create room');
      }

      if (!data.success) {
        throw new Error(data.message || 'Room creation failed');
      }

      console.log('✅ Room created successfully:', data.data);

      // ✅ Show popup with code
      setRoomCode(data.data.code);
      setShowCodePopup(true);
      setPopupTimer(15);
      setTimeRemaining(data.data.timeRemaining);

      // Auto-join after 15 seconds
      const timer = setInterval(() => {
        setPopupTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowCodePopup(false);
            handleJoinRoom(data.data.code, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Error creating room:', error);
      setError(error.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // ✅ Join existing room
  const joinRoom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();

    if (!validateCodeFormat(normalizedCode)) {
      setError('Room code must be 6 characters (letters and numbers)');
      return;
    }

    if (!userData?.email || !userData?.id) {
      setError('User information is required. Please login again.');
      return;
    }

    setIsJoining(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔗 Joining room with code:', normalizedCode);

      // ✅ First validate the code
      const validationResponse = await fetch(
        `${API_BASE_URL}/love-room/validate/${normalizedCode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!validationResponse.ok) {
        const validationData = await validationResponse.json();
        throw new Error(validationData.message || 'Invalid room code');
      }

      // ✅ Now join the room
      const response = await fetch(`${API_BASE_URL}/love-room/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: normalizedCode,
          userEmail: userData.email,
          userName: userData.name || userData.email.split('@')[0],
          userId: userData.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join room');
      }

      if (!data.success) {
        throw new Error(data.message || 'Join failed');
      }

      console.log('✅ Successfully joined room:', normalizedCode);

      setSuccess('Joined successfully! Redirecting to LoveChat...');
      setJoinCode('');

      setTimeout(() => {
        handleJoinRoom(normalizedCode, false);
      }, 1000);

    } catch (error) {
      console.error('❌ Error joining room:', error);
      setError(error.message || 'Failed to join room. Please check the code.');
    } finally {
      setIsJoining(false);
    }
  };

  // ✅ Handle joining room
  const handleJoinRoom = (code, isCreator = false) => {
    const roomData = {
      roomCode: code,
      userEmail: userData.email,
      userName: userData.name || userData.email.split('@')[0],
      isCreator: isCreator,
      userId: userData.id,
      joinedAt: new Date().toISOString()
    };

    console.log('📍 Room data prepared:', roomData);
    localStorage.setItem('activeRoomData', JSON.stringify(roomData));
    
    // Call parent to navigate
    if (onJoinChat) {
      onJoinChat(roomData);
    }
  };

  // ✅ Copy code to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback
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

  // ✅ Handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setJoinCode('');
    setRoomCode('');
  };

   // ✅ Format join code input
  const formatJoinCodeInput = (value) => {
    // Allow lowercase letters during typing, then convert to uppercase
    return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  };
  // ✅ Format time remaining
  const formatTimeRemaining = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return 'Expired';
    
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
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
              <p className="text-xs text-green-400 mb-6 font-mono">Expires in 30 days</p>
              
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
            </div>
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900"></div>
        <div className="absolute top-10 left-10 text-4xl md:text-6xl text-pink-500 animate-bounce">💖</div>
        <div className="absolute top-20 right-20 text-3xl md:text-4xl text-purple-400 opacity-20 animate-pulse">✨</div>
        <div className="absolute bottom-20 left-20 text-4xl md:text-5xl text-pink-400 animate-pulse">💕</div>
      </div>

      {/* Header */}
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
            <button
              onClick={() => setShowActiveSessions(true)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs md:text-sm rounded-lg transition-colors flex items-center gap-2"
              title="View Active Sessions"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </button>

            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <User className="w-4 h-4 text-pink-400" />
              <span className="text-xs md:text-sm text-gray-300 font-mono hidden sm:inline">
                {userData?.name || userEmail?.split('@')[0] || 'User'}
              </span>
            </div>
            
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-500/30 p-3 relative z-[75] flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm text-center font-mono flex-1">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-900/50 border-b border-green-500/30 p-3 relative z-[75] flex items-center gap-3">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm text-center font-mono flex-1">{success}</p>
        </div>
      )}

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
              Create unlimited secure rooms or join your partner's room.
              <br />
              <span className="text-pink-400 font-mono text-xs md:text-sm">Your privacy is our priority. Rooms expire in 30 days.</span>
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 rounded-lg p-1 sm:p-2 backdrop-blur-sm w-full max-w-md">
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
                    Generate a secure room code
                    <br />
                    <span className="text-xs text-green-400">✓ Create unlimited rooms!</span>
                  </p>
                </div>
                
                {roomCode && !showCodePopup ? (
                  <div className="space-y-6">
                    <CodeVisualization code={roomCode} />
                    
                    <div className="text-center">
                      <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4">
                        <p className="text-green-400 text-sm font-mono">✓ ROOM CREATED SUCCESSFULLY!</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setRoomCode('');
                          setError('');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Another Room</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={createRoom}
                    disabled={isCreating}
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
                  <p className="text-gray-400 text-sm">Enter your partner's room code</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-400 font-mono text-sm mb-3">
                      ROOM CODE (6 CHARACTERS):
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(formatJoinCodeInput(e.target.value))}
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
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="text-center p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:border-pink-500/30 transition-colors">
              <Shield className="w-8 h-8 text-pink-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2">END-TO-END ENCRYPTED</h4>
              <p className="text-gray-400 text-sm">Military-grade AES-256 protection</p>
            </div>
            
            <div className="text-center p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:border-purple-500/30 transition-colors">
              <Heart className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2">COUPLE-FOCUSED</h4>
              <p className="text-gray-400 text-sm">Designed for intimate connections</p>
            </div>
            
            <div className="text-center p-6 bg-gray-900/30 border border-gray-700/50 rounded-xl backdrop-blur-sm hover:border-green-500/30 transition-colors">
              <Lock className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h4 className="text-white font-mono font-bold mb-2">UNLIMITED ROOMS</h4>
              <p className="text-gray-400 text-sm">Create as many rooms as you want</p>
            </div>
          </div>
        </div>
      </main>

      {/* Active Sessions Popup */}
      {showSessionsPopup && (
        <ActiveSessionsPopup 
          userData={userData}
          onResumeSession={(roomData) => {
            setShowSessionsPopup(false);
            handleJoinRoom(roomData.roomCode, roomData.isCreator);
          }}
          onClose={() => {
            setShowSessionsPopup(false);
            localStorage.removeItem('activeRoomData');
          }}
          onSkip={() => {
            setShowSessionsPopup(false);
            setActiveTab('create');
          }}
        />
      )}

      {/* Active Sessions Panel */}
      {showActiveSessions && (
        <ActiveSessionsPanel 
          userData={userData}
          onResumeSession={(roomData) => handleJoinRoom(roomData.roomCode, roomData.isCreator)}
          onClose={() => setShowActiveSessions(false)}
        />
      )}
    </div>
  );
};

export default SecureRoomPortal;