import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Heart, Smile, MoreVertical, Edit3, Trash2, Copy, Check, CheckCheck, 
  Shield, Wifi, WifiOff, User, Phone, LogOut, Video, PhoneOff, UserX, AlertCircle,
  Loader
} from 'lucide-react';
import { io } from 'socket.io-client';
import CallInterface from './CallInterface';

const LoveChat = ({ roomData, userData, onLeaveChat, onNavigateHome, onNavigateToGame }) => {
  // ============ VALIDATION STATE ============
  const [roomValidated, setRoomValidated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(true);

  // ============ CHAT STATE ============
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenuOptions, setShowMenuOptions] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ============ REFS ============
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const menuRef = useRef(null);
  const validationChecked = useRef(false);

  // ============ CONSTANTS ============
  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;
  const quickEmojis = ['❤️', '💕', '😘', '🥰', '😍', '💖', '💋', '🌹', '💝', '✨', '🔥', '😊', '😂', '🤗', '😉', '💯'];

  // ============ HELPER FUNCTIONS ============
  const showErrorMsg = (message, duration = 5000) => {
    setError(message);
    console.error('❌ Error:', message);
    setTimeout(() => setError(''), duration);
  };

  const showSuccessMsg = (message, duration = 3000) => {
    setSuccess(message);
    console.log('✅ Success:', message);
    setTimeout(() => setSuccess(''), duration);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const isMyMessage = (message) => {
    return message.senderId === userData.id || message.senderId === userData._id;
  };

  const getPartnerName = () => {
    return roomData?.userName || 'Partner';
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ============ ROOM VALIDATION (RUNS ONCE) ============
  useEffect(() => {
    if (validationChecked.current) {
      console.log('✅ Validation already checked, skipping...');
      return;
    }
    validationChecked.current = true;

    const validateRoom = async () => {
      setIsValidating(true);
      setValidationError('');
      
      try {
        // ✅ Validate inputs
        if (!roomData?.roomCode) {
          throw new Error('No room code provided');
        }

        if (!userData?.id) {
          throw new Error('No user information available');
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found. Please login again.');
        }

        console.log('🔐 Starting room validation...', {
          roomCode: roomData.roomCode,
          userId: userData.id,
          userName: userData.name || userData.email
        });

        // ✅ Call validation endpoint
        const normalizedCode = roomData.roomCode.toUpperCase();
        const response = await fetch(
          `${API_BASE_URL}/love-room/rooms/status/${normalizedCode}?userId=${encodeURIComponent(userData.id)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Room validation failed');
        }

        if (!data.success) {
          throw new Error(data.error || data.message || 'Room validation failed');
        }

        console.log('✅ Room validation successful!', {
          status: data.data.status,
          isConnected: data.data.isConnected,
          creatorName: data.data.creator?.name,
          joinerName: data.data.joiner?.name
        });

        // ✅ Validation passed
        setRoomValidated(true);
        setValidationError('');

      } catch (error) {
        console.error('❌ Room validation failed:', error.message);
        setValidationError(error.message || 'Failed to validate room access');
        setRoomValidated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateRoom();
  }, [roomData?.roomCode, userData?.id]);

  // ============ CLOSE MENU WHEN CLICKING OUTSIDE ============
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuOptions(false);
      }
      if (!event.target.closest('.message-menu')) {
        setMessageMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ============ REQUEST NOTIFICATION PERMISSION ============
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('📢 Notification permission:', permission);
      });
    }
  }, []);

  // ============ INITIALIZE SOCKET CONNECTION ============
  useEffect(() => {
    if (!roomValidated || !roomData?.roomCode || !userData?.id) {
      console.log('⏳ Waiting for validation before initializing socket...');
      return;
    }

    console.log('🔌 Initializing socket connection...');
    const token = localStorage.getItem('authToken');

    const socketInstance = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // ✅ Socket: Connect
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError('');
      
      // Join the room
      socketInstance.emit('join-room', roomData.roomCode);
      console.log('📨 Joined room:', roomData.roomCode);
    });

    // ✅ Socket: Disconnect
    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected, attempting to reconnect...');
        socketInstance.connect();
      }
    });

    // ✅ Socket: Connection Error
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      showErrorMsg('Connection failed. Retrying...');
    });

    // ✅ Socket: New Message
    socketInstance.on('new-message', (message) => {
      console.log('💬 New message received:', message._id);
      setMessages(prev => [...prev, message]);
      
      // Auto-mark as read if from partner and window is focused
      if (message.senderId !== userData.id && document.hasFocus()) {
        setTimeout(() => {
          markMessageAsRead(message._id);
        }, 1000);
      }
    });

    // ✅ Socket: Message Sent Confirmation
    socketInstance.on('message-sent', (response) => {
      console.log('✅ Message sent confirmation:', response.messageId);
      if (response.success) {
        showSuccessMsg('Message sent', 1500);
      }
    });

    // ✅ Socket: Message Error
    socketInstance.on('message-error', (errorData) => {
      console.error('❌ Message error:', errorData);
      showErrorMsg(errorData.error || 'Failed to send message');
    });

    // ✅ Socket: Message Deleted
    socketInstance.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data.messageId);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, deleted: true, deletedAt: data.deletedAt, message: 'This message was deleted' }
          : msg
      ));
    });

    // ✅ Socket: Message Edited
    socketInstance.on('message-edited', (data) => {
      console.log('✏️ Message edited:', data.messageId);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, message: data.newMessage, edited: true, editedAt: data.editedAt }
          : msg
      ));
    });

    // ✅ Socket: Typing Status
    socketInstance.on('user-typing', (data) => {
      if (data.userId !== userData.id) {
        console.log('⌨️ Partner is typing:', data.isTyping);
        setPartnerTyping(data.isTyping);
      }
    });

    // ✅ Socket: Incoming Call
    socketInstance.on('incoming-call', (data) => {
      console.log('☎️ Incoming call:', data);
      const callMessage = {
        _id: data.callMessageId || `call-${Date.now()}`,
        messageType: 'call',
        callType: data.callType,
        senderId: data.callerId,
        senderName: data.callerName,
        timestamp: new Date(),
        message: `Incoming ${data.callType} call`,
        callData: {
          status: 'initiated',
          callType: data.callType,
          callerId: data.callerId,
          callerName: data.callerName
        }
      };
      
      setMessages(prev => [...prev, callMessage]);
      
      if (Notification.permission === 'granted') {
        new Notification(`Incoming ${data.callType} call`, {
          body: `${data.callerName} wants to ${data.callType} chat with you`,
          icon: '/favicon.ico'
        });
      }
    });

    // ✅ Socket: Call Ended
    socketInstance.on('call-ended', (data) => {
      console.log('📞 Call ended:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.callMessageId 
          ? { 
              ...msg, 
              message: `Call ended`,
              callData: { 
                ...msg.callData, 
                status: 'ended',
                duration: data.duration
              }
            }
          : msg
      ));
    });

    setSocket(socketInstance);

    return () => {
      console.log('🧹 Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, [roomValidated, roomData?.roomCode, userData?.id]);

  // ============ LOAD INITIAL MESSAGES ============
  useEffect(() => {
    if (roomData?.roomCode && roomValidated) {
      loadMessages();
    }
  }, [roomData?.roomCode, roomValidated]);

  // ============ AUTO-SCROLL TO BOTTOM ============
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ============ LOAD MESSAGES FROM API ============
  const loadMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/messages/room/${roomData.roomCode}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('📨 Messages loaded:', data.data.messages.length);
        setMessages(data.data.messages || []);
      } else {
        throw new Error(data.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      showErrorMsg('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // ============ SEND MESSAGE ============
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      showErrorMsg('Message cannot be empty');
      return;
    }

    if (!socket || !isConnected) {
      showErrorMsg('Not connected to chat server');
      return;
    }

    // ✅ Use roomCode as roomId (they are the same)
    const messageData = {
      roomId: roomData.roomCode.toUpperCase(), // Send as roomId
      roomCode: roomData.roomCode.toUpperCase(), // Also send as roomCode for socket
      message: newMessage.trim(),
      messageType: 'text',
      senderId: userData.id
    };

    console.log('📤 Sending message:', messageData);
    socket.emit('send-message', messageData);
    
    setNewMessage('');
    setShowEmojiPicker(false);
    handleTypingStop();
  };

  // ============ HANDLE TYPING ============
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket && isConnected) {
      setIsTyping(true);
      socket.emit('typing', {
        roomId: roomData.roomCode.toUpperCase(),
        roomCode: roomData.roomCode.toUpperCase(),
        isTyping: true
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1500);
  };

  const handleTypingStop = () => {
    if (isTyping && socket && isConnected) {
      setIsTyping(false);
      socket.emit('typing', {
        roomId: roomData.roomCode.toUpperCase(),
        roomCode: roomData.roomCode.toUpperCase(),
        isTyping: false
      });
    }
  };

  // ============ MARK MESSAGE AS READ ============
  const markMessageAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(
        `${API_BASE_URL}/messages/mark-read/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: userData.id
          })
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // ============ DELETE MESSAGE ============
  const deleteMessage = async (messageId) => {
    if (!socket || !isConnected) {
      showErrorMsg('Not connected. Cannot delete message.');
      return;
    }

    console.log('🗑️ Deleting message:', messageId);
    socket.emit('delete-message', { messageId });
  };

  // ============ START EDIT MESSAGE ============
  const startEditMessage = (message) => {
    setEditingMessage(message._id);
    setEditText(message.message);
  };

  // ============ SAVE EDIT MESSAGE ============
  const saveEditMessage = async () => {
    if (!editText.trim()) {
      showErrorMsg('Message cannot be empty');
      return;
    }

    if (!socket || !isConnected) {
      showErrorMsg('Not connected. Cannot edit message.');
      return;
    }

    console.log('✏️ Editing message:', editingMessage);
    socket.emit('edit-message', {
      messageId: editingMessage,
      newMessage: editText.trim()
    });

    setEditingMessage(null);
    setEditText('');
  };

  // ============ CANCEL EDIT MESSAGE ============
  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // ============ COPY MESSAGE ============
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showSuccessMsg('Message copied to clipboard', 2000);
    }).catch(() => {
      showErrorMsg('Failed to copy message');
    });
  };

  // ============ DELETE ROOM ============
  const deleteRoom = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/love-room/reset/${roomData.roomCode}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: userData.id
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        console.log('✅ Room deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  // ============ HANDLE LEAVE ROOM ============
  const handleLeaveRoom = async () => {
    if (roomData.isCreator) {
      await deleteRoom();
    }
    
    localStorage.removeItem('activeRoomData');
    setShowMenuOptions(false);
    
    if (socket) {
      socket.disconnect();
    }
    
    setTimeout(() => {
      onLeaveChat();
    }, 500);
  };

  // ============ HANDLE LOGOUT ============
  const handleLogout = () => {
    setShowMenuOptions(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeRoomData');
    localStorage.removeItem('userData');
    
    if (socket) {
      socket.disconnect();
    }
    
    setTimeout(() => {
      onNavigateHome();
    }, 500);
  };

  // ============ VALIDATION LOADING SCREEN ============
  if (isValidating) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-white text-lg font-mono font-bold mb-2">Validating Room Access</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Loader className="w-4 h-4 text-pink-400 animate-spin" />
            <p className="text-gray-400 text-sm">Please wait...</p>
          </div>
          <p className="text-gray-500 text-xs">Room Code: {roomData?.roomCode}</p>
        </div>
      </div>
    );
  }

  // ============ VALIDATION FAILED SCREEN ============
  if (!roomValidated) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center px-4">
        <div className="text-center bg-gray-800/50 border border-red-500/30 rounded-2xl p-8 max-w-md w-full backdrop-blur-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2 font-mono">ROOM ACCESS DENIED</h2>
          <p className="text-red-400 text-sm mb-6 leading-relaxed">{validationError}</p>
          
          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-gray-400 text-xs font-mono mb-2">
              <span className="text-pink-400">Room Code:</span> {roomData?.roomCode}
            </p>
            <p className="text-gray-400 text-xs font-mono">
              <span className="text-pink-400">User ID:</span> {userData?.id || 'Unknown'}
            </p>
          </div>

          <button
            onClick={onNavigateHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold hover:from-pink-700 hover:to-purple-700 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ============ MAIN CHAT UI ============
  return (
    <div className="h-screen bg-black flex flex-col relative">
      {/* ============ HEADER ============ */}
      <header className="flex-shrink-0 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 p-4 relative z-[80] shadow-lg">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Heart className="w-5 h-5 text-white" />
            </div>
            
            <div>
              <h1 className="text-white font-bold text-lg">Love Room</h1>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs text-gray-400 font-mono">Code: {roomData.roomCode}</span>
                
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400 font-mono">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-400" />
                      <span className="text-xs text-red-400 font-mono">{connectionStatus}</span>
                    </>
                  )}
                </div>

                {partnerTyping && (
                  <span className="text-xs text-pink-400 animate-pulse font-mono">
                    ✏️ Typing...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowCallInterface(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg transition-all flex items-center gap-2 font-bold"
              title="Start Voice/Video Call"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </button>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenuOptions(!showMenuOptions)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Menu"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>

              {showMenuOptions && (
                <div className="absolute right-0 top-12 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 py-2 w-56 z-[70] animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setShowMenuOptions(false);
                      onNavigateToGame();
                    }}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3 transition-colors text-sm"
                  >
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>Game Center</span>
                  </button>
                  
                  <div className="border-t border-gray-700 my-1"></div>
                  
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-3 transition-colors text-sm"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Leave Chat Room</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-3 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ============ ERROR ALERT ============ */}
      {error && (
        <div className="flex-shrink-0 bg-red-900/60 border-b border-red-500/50 p-3 relative z-[75] backdrop-blur-sm">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* ============ SUCCESS ALERT ============ */}
      {success && (
        <div className="flex-shrink-0 bg-green-900/60 border-b border-green-500/50 p-3 relative z-[75] backdrop-blur-sm">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm font-mono">{success}</p>
          </div>
        </div>
      )}

      {/* ============ MESSAGES CONTAINER ============ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 relative z-[10] bg-gradient-to-b from-black via-gray-900 to-black">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-400 text-lg font-mono font-bold">Your Love Story Begins Here</p>
              <p className="text-gray-500 text-sm mt-2">Send your first message to start the conversation 💖</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMsg = isMyMessage(message);
            const showDate = index === 0 || formatDate(messages[index - 1].timestamp) !== formatDate(message.timestamp);

            return (
              <div key={message._id}>
                {/* ============ DATE SEPARATOR ============ */}
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-800/80 text-gray-400 text-xs px-4 py-1 rounded-full font-mono backdrop-blur-sm border border-gray-700">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                )}

                {/* ============ MESSAGE BUBBLE ============ */}
                <div className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-xs lg:max-w-md ${isMyMsg ? 'order-2' : 'order-1'}`}>
                    {message.deleted ? (
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 backdrop-blur-sm">
                        <p className="text-gray-500 text-sm italic">This message was deleted</p>
                        <p className="text-gray-600 text-xs mt-1 font-mono">{formatTime(message.deletedAt || message.timestamp)}</p>
                      </div>
                    ) : (
                      <div
                        className={`rounded-lg p-3 relative transition-all message-menu ${
                          isMyMsg 
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-none shadow-lg shadow-pink-500/30' 
                            : 'bg-gray-800 text-gray-100 rounded-bl-none shadow-lg shadow-gray-900/50'
                        }`}
                        onClick={() => {
                          setMessageMenuId(messageMenuId === message._id ? null : message._id);
                        }}
                      >
                        {/* ============ EDITING MODE ============ */}
                        {editingMessage === message._id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-black/30 text-white px-3 py-2 rounded text-sm border border-white/20 focus:outline-none focus:border-white/50"
                              autoFocus
                              maxLength={1000}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={saveEditMessage}
                                className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditMessage}
                                className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="break-words whitespace-pre-wrap">{message.message}</p>
                        )}

                        {/* ============ MESSAGE FOOTER ============ */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs opacity-70 font-mono">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.edited && (
                              <span className="text-xs opacity-50 font-mono">(edited)</span>
                            )}
                            
                            {isMyMsg && (
                              <div className="flex items-center ml-1">
                                {message.readBy && message.readBy.length > 0 ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-gray-300 opacity-70" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* ============ MESSAGE MENU ============ */}
                          {messageMenuId === message._id && !message.deleted && (
                            <div className="absolute -top-1 right-0 bg-gray-700 rounded-lg shadow-2xl border border-gray-600 py-1 z-[60] min-w-max animate-fadeIn">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyMessage(message.message);
                                  setMessageMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-2 text-xs transition-colors whitespace-nowrap"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </button>
                              
                              {isMyMsg && message.messageType === 'text' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditMessage(message);
                                    setMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-2 text-xs transition-colors whitespace-nowrap"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}
                              
                              {isMyMsg && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMessage(message._id);
                                    setMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-red-400 hover:bg-gray-600 flex items-center space-x-2 text-xs transition-colors whitespace-nowrap"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ============ EMOJI PICKER ============ */}
      {showEmojiPicker && (
        <div className="flex-shrink-0 bg-gray-800/90 border-t border-gray-700 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2">
            {quickEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(prev => prev + emoji);
                  messageInputRef.current?.focus();
                }}
                className="text-2xl hover:bg-gray-700 p-2 rounded transition-colors hover:scale-125 duration-200"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============ MESSAGE INPUT ============ */}
      <div className="flex-shrink-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 p-4 shadow-lg">
        <div className="flex items-center space-x-2 max-w-6xl mx-auto">
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5 text-gray-400 hover:text-pink-400 transition-colors" />
          </button>

          {/* Input Field */}
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder={
              isConnected && roomValidated 
                ? "Type your message... (Enter to send)" 
                : "Connecting to chat server..."
            }
            disabled={!isConnected || !roomValidated}
            maxLength={1000}
            className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder-gray-500 text-sm"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected || !roomValidated}
            className="p-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 active:scale-95"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* ============ CALL INTERFACE MODAL ============ */}
      {showCallInterface && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-4xl h-[600px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            <CallInterface
              socket={socket}
              isConnected={isConnected}
              roomData={roomData}
              userData={userData}
              getPartnerName={getPartnerName}
              onClose={() => setShowCallInterface(false)}
            />
          </div>
        </div>
      )}

      {/* ============ TAILWIND ANIMATIONS ============ */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .hover\:bg-gray-750:hover {
          background-color: #2d3748;
        }

        .animate-in {
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Custom scrollbar */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: transparent;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.5);
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
};

export default LoveChat;