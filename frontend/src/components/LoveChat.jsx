import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Smile, MoreVertical,
  Edit3,Trash2,Copy,Check,CheckCheck,Shield,Wifi,WifiOff,User,Phone,LogOut,Video,PhoneOff,UserX,AlertCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import CallInterface from './CallInterface';
import axios from 'axios';

const LoveChat = ({ roomData, userData, onLeaveChat, onNavigateHome, onNavigateToGame }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenuOptions, setShowMenuOptions] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [roomValidated, setRoomValidated] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const menuRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const hasValidatedRoom = useRef(false);

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

  // Emojis for quick selection
  const quickEmojis = ['❤️', '💕', '😘', '🥰', '😍', '💖', '💋', '🌹', '💝', '✨', '🔥', '😊', '😂', '🤗', '😉', '💯'];

  // Helper function to show error with auto-clear
  const showError = (message, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(''), duration);
  };

  // Helper function to show success with auto-clear
  const showSuccess = (message, duration = 3000) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), duration);
  };

  useEffect(() => {
  if (hasValidatedRoom.current) {
    return;
  }

  const initialValidation = async () => {
    console.log('🔐 Starting initial room validation...');
    hasValidatedRoom.current = true;  // ← MARK AS DONE
    
    if (roomData && userData) {
      const isValid = await validateRoomAccess();
      if (!isValid) {
        setIsValidating(false);
        return;
      }
    }
    
    setIsValidating(false);
  };

  initialValidation();
}, [roomData, userData]);
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuOptions(false);
      }
      if (!event.target.closest('.relative')) {
        setMessageMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Room validation function
  const validateRoomAccess = async () => {
    if (!roomData || !userData) {
      console.error('Missing roomData or userData');
      return false;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        showError('Authentication required. Please login again.');
        setTimeout(() => {
          localStorage.removeItem('activeRoomData');
          onLeaveChat();
        }, 2000);
        return false;
      }

      const userId = userData.id || userData.email;
     const url = `${API_BASE_URL}/love-room/rooms/status/${roomData.roomCode}?userId=...`;
//                                                     ^^^^^^^^^^^ CORRECT! 
      
      console.log('Validating room access:', { 
        roomCode: roomData.roomCode, 
        userId: userId,
        url: url 
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Room validation response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Room access validation failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Room validation error data:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        console.error('Room validation failed:', response.status, errorMessage);
        
        if (response.status === 404) {
          showError('Room not found. It may have been deleted or expired.');
        } else if (response.status === 403) {
          showError('You do not have access to this room.');
        } else if (response.status === 401) {
          showError('Authentication failed. Please login again.');
        } else {
          showError(errorMessage);
        }

        setTimeout(() => {
          localStorage.removeItem('activeRoomData');
          onLeaveChat();
        }, 3000);
        return false;
      }
      
      const data = await response.json();
      console.log('Room validation success:', data);
      
      if (!data.success) {
        showError(data.error || 'Room validation failed');
        setTimeout(() => {
          localStorage.removeItem('activeRoomData');
          onLeaveChat();
        }, 2000);
        return false;
      }

      setRoomValidated(true);
      return true;
    } catch (error) {
      console.error('Error validating room:', error);
      showError('Connection issues detected. Please check your internet connection.');
      return false;
    }
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Initial room validation
  useEffect(() => {
    const initialValidation = async () => {
      if (roomData && userData && !roomValidated) {
        console.log('Starting initial room validation...');
        const isValid = await validateRoomAccess();
        if (!isValid) {
          return; // Component will be unmounted by onLeaveChat
        }
      }
    };

    initialValidation();
  }, [roomData, userData]);

  // Periodic room validation (every 30 seconds)
  useEffect(() => {
    if (!roomValidated) return;

    const periodicValidation = async () => {
      const isValid = await validateRoomAccess();
      if (!isValid) {
        return; // Component will be unmounted
      }
    };

    // Set up periodic validation
    validationTimeoutRef.current = setInterval(periodicValidation, 30000);

    return () => {
      if (validationTimeoutRef.current) {
        clearInterval(validationTimeoutRef.current);
      }
    };
  }, [roomValidated, roomData, userData]);

  // Initialize socket connection only after room validation
  useEffect(() => {
    if (!roomData || !userData || !roomValidated) return;

    console.log('Initializing socket connection...');
    const token = localStorage.getItem('authToken');
    
    const socketInstance = io(SOCKET_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'], // ✅ Add polling fallback
        timeout: 20000,
        forceNew: true
      });

    socketInstance.on('messages-auto-cleaned', (data) => {
      console.log('Messages auto-cleaned:', data);
      loadMessages();
      showSuccess('Old messages were automatically removed');
    });

    socketInstance.on('connect', (socketId) => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError('');
      socketInstance.emit('join-room', roomData.roomCode);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
      setIsConnected(false);
      showError('Connection failed. Retrying...');
    });

    socketInstance.on('new-message', (message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
      
      if (message.senderId !== (userData.id || userData.email) && document.hasFocus()) {
        setTimeout(() => {
          markMessageAsRead(message._id);
        }, 1000);
      }
    });

    socketInstance.on('message-sent', (response) => {
      console.log('Message sent confirmation:', response);
      if (response.success) {
        showSuccess('Message sent successfully', 2000);
      }
    });

    socketInstance.on('message-error', (error) => {
      console.error('Message error:', error);
      showError(error.error || 'Failed to send message');
    });

    socketInstance.on('message-deleted', (data) => {
      console.log('Message deleted:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, deleted: true, deletedAt: data.deletedAt }
          : msg
      ));
    });

    socketInstance.on('message-edited', (data) => {
      console.log('Message edited:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, message: data.newMessage, edited: true, editedAt: data.editedAt }
          : msg
      ));
    });

    socketInstance.on('user-typing', (data) => {
      console.log('User typing:', data);
      if (data.userId !== (userData.id || userData.email)) {
        setPartnerTyping(data.isTyping);
      }
    });

    socketInstance.on('incoming-call', (data) => {
      console.log('Incoming call for popup:', data);
      // This will be handled by CallInterface component
    });

    // Add these inside the existing socket event listeners useEffect
    socketInstance.on('incoming-call-notification', (data) => {
      console.log('Incoming call notification for chat:', data);
      
      // Add call message to chat
      const callMessage = {
        _id: data.callMessageId,
        messageType: 'call',
        callType: data.callType,
        senderId: data.callerId,
        senderName: data.callerName,
        timestamp: data.timestamp,
        message: `Incoming ${data.callType} call`,
        callData: {
          status: 'initiated',
          callType: data.callType,
          callerId: data.callerId,
          callerName: data.callerName
        }
      };
      
      setMessages(prev => [...prev, callMessage]);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(`Incoming ${data.callType} call`, {
          body: `${data.callerName} wants to ${data.callType} chat with you`,
          icon: '/favicon.ico',
          tag: 'love-room-call'
        });
      }
      
      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(e => console.log('Could not play notification sound'));
      } catch (e) {
        console.log('Notification sound not available');
      }
    });

    socketInstance.on('message-updated', (updatedMessage) => {
      console.log('Message updated:', updatedMessage);
      setMessages(prev => prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      ));
    });

    // Handle call status notifications
    socketInstance.on('call-accepted-notification', (data) => {
      console.log('Call accepted notification:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.callMessageId 
          ? { 
              ...msg, 
              message: 'Call accepted',
              callData: { 
                ...msg.callData, 
                status: 'accepted',
                acceptedBy: data.acceptedBy,
                acceptedAt: data.acceptedAt
              }
            }
          : msg
      ));
    });

    socketInstance.on('call-rejected-notification', (data) => {
      console.log('Call rejected notification:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.callMessageId 
          ? { 
              ...msg, 
              message: data.reason === 'timeout' ? 'Call timed out' : 'Call declined',
              callData: { 
                ...msg.callData, 
                status: data.reason === 'timeout' ? 'timeout' : 'rejected',
                rejectedBy: data.rejectedBy,
                rejectedAt: data.rejectedAt
              }
            }
          : msg
      ));
    });

    socketInstance.on('call-ended-notification', (data) => {
      console.log('Call ended notification:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.callMessageId 
          ? { 
              ...msg, 
              message: `Call ended ${data.duration ? `(${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')})` : ''}`,
              callData: { 
                ...msg.callData, 
                status: 'ended',
                duration: data.duration,
                endedBy: data.endedBy,
                endedAt: data.endedAt
              }
            }
          : msg
      ));
    });

    socketInstance.on('message-read', (data) => {
      console.log('Message read:', data);
      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId) {
          const updatedReadBy = [...(msg.readBy || [])];
          if (!updatedReadBy.find(read => read.userId === data.userId)) {
            updatedReadBy.push({ userId: data.userId, readAt: data.readAt });
          }
          return { ...msg, readBy: updatedReadBy };
        }
        return msg;
      }));
    });

    setSocket(socketInstance);

    return () => {
      console.log('Cleaning up socket connection...');
      socketInstance.disconnect();
    };
  }, [roomData, userData, roomValidated]);

  // Load initial messages only after room validation
  useEffect(() => {
    if (roomData?.roomCode && roomValidated) {
      loadMessages();
    }
  }, [roomData?.roomCode, roomValidated]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLeaveRoom = async () => {
    if (roomData.isCreator) {
      await deleteRoom();
    }
    
    localStorage.removeItem('activeRoomData');
    setShowMenuOptions(false);
    onNavigateHome();
  };

  const handleLogout = () => {
    setShowMenuOptions(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeRoomData');
    onNavigateHome();
  };

  // Load messages from API
  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/messages/room/${roomData.roomCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Include all message types including call messages
          const allMessages = data.data.messages;
          setMessages(allMessages);
          console.log('Messages loaded:', allMessages.length);
        }
      } else {
        console.error('Failed to load messages:', response.status);
        showError('Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showError('Failed to load messages');
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !isConnected) return;

    // Validate room access before sending
    const isValid = await validateRoomAccess();
    if (!isValid) return;

    const messageData = {
      roomId: roomData.roomCode,
      message: newMessage.trim(),
      messageType: 'text'
    };

    console.log('Sending message:', messageData);
    socket.emit('send-message', messageData);
    
    setNewMessage('');
    setShowEmojiPicker(false);
    handleTypingStop();
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket && isConnected) {
      setIsTyping(true);
      socket.emit('typing', {
        roomId: roomData.roomCode,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleTypingStop = () => {
    if (isTyping && socket && isConnected) {
      setIsTyping(false);
      socket.emit('typing', {
        roomId: roomData.roomCode,
        isTyping: false
      });
    }
  };

  const deleteRoom = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/love-room/reset/${roomData.roomCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userData.id || userData.email
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('Room deleted successfully');
      } else {
        console.log('Room deletion failed:', data.message);
      }
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/messages/read/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userData.id || userData.email
        })
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!socket || !isConnected) return;
    socket.emit('delete-message', { messageId });
  };

  // Edit message
  const startEditMessage = (message) => {
    setEditingMessage(message._id);
    setEditText(message.message);
  };

  const saveEditMessage = async () => {
    if (!editText.trim() || !socket || !isConnected) return;

    socket.emit('edit-message', {
      messageId: editingMessage,
      newMessage: editText.trim()
    });

    setEditingMessage(null);
    setEditText('');
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Copy message
  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess('Message copied to clipboard', 2000);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
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
      return date.toLocaleDateString();
    }
  };

  // Check if message is from current user
  const isMyMessage = (message) => {
    return message.senderId === (userData.id || userData.email);
  };

  // Get partner name
  const getPartnerName = () => {
    return roomData.isCreator ? 'Partner' : 'Creator';
  };

 
if (!roomValidated) {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-white text-lg font-mono mb-2">Room Validation Failed</p>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={onNavigateHome}
          className="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}
  return (
    <div className="h-screen bg-black flex flex-col relative">
      
      <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4 relative z-[80]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">Love Room</h1>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Room: {roomData.roomCode}</span>
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="w-3 h-3 text-green-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionStatus}
                  </span>
                </div>
                {partnerTyping && (
                  <span className="text-xs text-pink-400 animate-pulse">
                    {getPartnerName()} is typing...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
  onClick={() => {
    console.log('Opening call interface for testing...');
    setShowCallInterface(true);
  }}
  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
>
  Test Call UI
</button>
            </div>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenuOptions(!showMenuOptions)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>

              {showMenuOptions && (
                <div className="absolute right-0 top-12 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 w-48 z-[70]">
                  <button
                    onClick={() => {
                      setShowMenuOptions(false);
                      onNavigateToGame();
                    }}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Game Center</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenuOptions(false);
                      setShowCallInterface(true);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Start Call</span>
                  </button>
                  
                  <div className="border-t border-gray-700 my-1"></div>
                  
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Leave Chat Room</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-3 transition-colors"
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

      {error && (
        <div className="flex-shrink-0 bg-red-900/50 border-b border-red-500/30 p-3 relative z-[75]">
          <p className="text-red-400 text-sm text-center font-mono">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex-shrink-0 bg-green-900/50 border-b border-green-500/30 p-3 relative z-[75]">
          <p className="text-green-400 text-sm text-center font-mono">{success}</p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 relative z-[10]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-400 text-lg font-mono">Your love story begins here...</p>
            <p className="text-gray-500 text-sm mt-2">Send your first message to start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMsg = isMyMessage(message);
            const showDate = index === 0 || formatDate(messages[index - 1].timestamp) !== formatDate(message.timestamp);

            return (
              <div key={message._id}>
                {/* Date separator */}
                {showDate && (
                  <div className="text-center my-4">
                    <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message */}
                <div className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${isMyMsg ? 'order-2' : 'order-1'}`}>
                    {message.deleted ? (
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <p className="text-gray-500 text-sm italic">Message deleted</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {formatTime(message.deletedAt || message.timestamp)}
                        </p>
                      </div>
                    ) : message.messageType === 'call' ? (
                      <div className={`rounded-lg p-3 relative border-2 ${isMyMsg 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400' 
                        : 'bg-gray-800 text-gray-100 border-gray-600'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {message.callData?.callType === 'video' ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                          <span className="font-medium text-sm">
                            {message.callData?.callType === 'video' ? 'Video Call' : 'Voice Call'}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-2">{message.message}</p>
                        
                        {/* Call action buttons - only show for incoming calls that are still pending */}
                        {message.callData?.status === 'initiated' && !isMyMessage(message) && (
                          <div className="flex space-x-2 mt-2">
                            <button
                              onClick={() => {
                                if (socket && isConnected) {
                                  // Accept call and open call interface
                                  socket.emit('accept-call', {
                                    roomId: roomData.roomCode,
                                    callMessageId: message._id,
                                    answer: null // Will be set by CallInterface
                                  });
                                  setShowCallInterface(true);
                                }
                              }}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-xs transition-colors flex items-center space-x-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                if (socket && isConnected) {
                                  socket.emit('reject-call', {
                                    roomId: roomData.roomCode,
                                    callMessageId: message._id
                                  });
                                }
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs transition-colors flex items-center space-x-1"
                            >
                              <PhoneOff className="w-3 h-3" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}

                        {/* Message footer */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs opacity-75">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.callData?.status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                message.callData.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                                message.callData.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                                message.callData.status === 'timeout' ? 'bg-yellow-500/20 text-yellow-300' :
                                message.callData.status === 'ended' ? 'bg-gray-500/20 text-gray-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {message.callData.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-lg p-3 relative ${isMyMsg 
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' 
                        : 'bg-gray-800 text-gray-100'
                      }`}
                      onClick={() => {
                        setMessageMenuId(messageMenuId === message._id ? null : message._id);
                        }}>

                        {editingMessage === message._id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-black/30 text-white px-2 py-1 rounded text-sm"
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={saveEditMessage}
                                className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditMessage}
                                className="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="break-words">{message.message}</p>
                        )}

                        {/* Message footer */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs opacity-75">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.edited && (
                              <span className="text-xs opacity-50">(edited)</span>
                            )}
                            
                            {isMyMsg && (
                              <div className="flex items-center">
                                {message.readBy && message.readBy.length > 0 ? (
                                  <CheckCheck className={`w-3 h-3 ${
                                    message.readBy.some(read => read.userId !== (userData.id || userData.email)) 
                                      ? 'text-blue-400' 
                                      : 'text-gray-400'
                                  }`} />
                                ) : (
                                  <Check className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>

                          {messageMenuId === message._id && !message.deleted && message.messageType !== 'call' && (
                            <div className="absolute top-full right-0 mt-1 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-1 z-[60] min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyMessage(message.message);
                                  setMessageMenuId(null);
                                }}
                                className="w-full px-3 py-1 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-2 text-sm"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                              
                              {isMyMsg && message.messageType === 'text' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditMessage(message);
                                    setMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-1 text-left text-gray-300 hover:bg-gray-600 flex items-center space-x-2 text-sm"
                                >
                                  <Edit3 className="w-3 h-3" />
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
                                  className="w-full px-3 py-1 text-left text-red-400 hover:bg-gray-600 flex items-center space-x-2 text-sm"
                                >
                                  <Trash2 className="w-3 h-3" />
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

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex flex-wrap gap-2">
            {quickEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                  messageInputRef.current?.focus();
                }}
                className="text-2xl hover:bg-gray-700 p-2 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 p-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Smile className="w-5 h-5 text-gray-400" />
          </button>

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
            placeholder={isConnected && roomValidated ? "Type your message..." : "Connecting..."}
            disabled={!isConnected || !roomValidated}
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected || !roomValidated}
            className="p-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {showCallInterface && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[600px] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            <CallInterface
              socket={socket}
              isConnected={isConnected}
              roomData={roomData}
              userData={userData}
              getPartnerName={getPartnerName}
              onClose={() => {
                console.log('Closing call interface from modal');
                setShowCallInterface(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LoveChat;