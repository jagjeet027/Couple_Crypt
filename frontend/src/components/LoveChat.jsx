
import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, Smile, Paperclip, Camera, FileText, File, Image, Send, ArrowLeft, MoreVertical } from 'lucide-react';

// Real Socket.io implementation
const createSocketConnection = (serverUrl = 'http://localhost:2004') => {
  // In a real app, you would import socket.io-client
  // For now, we'll create a more realistic mock that handles connection properly
  const eventHandlers = {};
  let connected = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  const socket = {
    connected: false,
    
    on: (event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    },
    
    emit: (event, data) => {
      console.log(`Socket emit: ${event}`, data);
      
      if (!connected && event !== 'connect') {
        console.warn('Socket not connected, queuing message:', event);
        return;
      }
      
      // Simulate more realistic responses
      setTimeout(() => {
        switch (event) {
          case 'join-room':
            if (eventHandlers['joined-room']) {
              eventHandlers['joined-room'].forEach(handler => 
                handler({ success: true, roomId: data.roomId, userId: data.userId })
              );
            }
            break;
            
          case 'send-message':
            // Don't echo back user's own messages
            setTimeout(() => {
              if (eventHandlers['message-sent']) {
                eventHandlers['message-sent'].forEach(handler => 
                  handler({ messageId: Date.now(), success: true })
                );
              }
            }, 100);
            break;
            
          case 'typing-start':
            // Simulate partner typing back occasionally
            if (Math.random() > 0.7) {
              setTimeout(() => {
                if (eventHandlers['user-typing']) {
                  eventHandlers['user-typing'].forEach(handler => 
                    handler({ userId: 'partner', typing: true })
                  );
                }
                
                setTimeout(() => {
                  if (eventHandlers['user-typing']) {
                    eventHandlers['user-typing'].forEach(handler => 
                      handler({ userId: 'partner', typing: false })
                    );
                  }
                }, 2000);
              }, 1000);
            }
            break;
        }
      }, 200 + Math.random() * 300); // Realistic network delay
    },
    
    disconnect: () => {
      connected = false;
      socket.connected = false;
      console.log('Socket disconnected');
      if (eventHandlers['disconnect']) {
        eventHandlers['disconnect'].forEach(handler => handler());
      }
    },
    
    connect: () => {
      if (!connected) {
        connected = true;
        socket.connected = true;
        reconnectAttempts = 0;
        console.log('Socket connected');
        if (eventHandlers['connect']) {
          eventHandlers['connect'].forEach(handler => handler());
        }
      }
    }
  };
  
  // Simulate initial connection attempt
  setTimeout(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      socket.connect();
    }
  }, 1000 + Math.random() * 2000);
  
  return socket;
};

// API Configuration
const API_BASE_URL = 'http://localhost:2004/api';

// Improved API Helper Functions
const apiCall = async (endpoint, options = {}) => {
  try {
    const mockToken = 'mock-auth-token-12345';
    
    console.log(`API Call: ${API_BASE_URL}${endpoint}`, options);
    
    // Add realistic delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    
    // Simulate more realistic API responses
    if (endpoint.includes('/rtc/initialize')) {
      return { 
        success: true, 
        data: { 
          sessionId: `session_${Date.now()}`,
          serverTime: new Date().toISOString()
        } 
      };
    } else if (endpoint.includes('/rtc/messages/')) {
      return { 
        success: true, 
        data: { 
          messages: [
            {
              messageId: 1,
              sender: { role: 'system' },
              message: 'Welcome to Love Chat! 💕 Your secure connection is ready.',
              timestamp: new Date(Date.now() - 60000).toISOString()
            }
          ] 
        } 
      };
    } else if (endpoint.includes('/rtc/message/send')) {
      return { 
        success: true, 
        messageId: Date.now(),
        timestamp: new Date().toISOString()
      };
    } else if (endpoint.includes('/rtc/call/start')) {
      return { 
        success: true, 
        callId: `call_${Date.now()}`,
        sdpOffer: 'mock-sdp-offer'
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
};

// Love Chat Component
const LoveChat = ({ 
  roomData = { roomCode: 'DEMO123', partnerName: 'Your Love', userRole: 'creator' }, 
  userData = { userId: 'user123' }, 
  onLeaveChat = () => console.log('Leave chat'), 
  onNavigateHome = () => console.log('Navigate home') 
}) => {
  // Extract data from props with fallbacks
  const userRole = roomData?.userRole || 'creator';
  const roomCode = roomData?.roomCode || roomData?.roomId || 'DEMO123';
  const partnerName = roomData?.partnerName || roomData?.partnerEmail || 'Your Love';
  const userId = userData?.userId || userData?.id || 'user123';
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [notifications, setNotifications] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [rtcInitialized, setRtcInitialized] = useState(false);
  const [authToken] = useState('mock-auth-token-12345');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const emojis = ['😀', '😂', '😍', '😘', '💕', '💖', '💗', '💓', '💞', '💝', '🌹', '🌺', '🌻', '🌼', '🦋', '🌈', '⭐', '💫', '✨', '💎'];

  const fileOptions = [
    { icon: Image, label: 'Image', color: 'text-purple-400' },
    { icon: FileText, label: 'PDF', color: 'text-red-400' },
    { icon: File, label: 'Document', color: 'text-blue-400' },
    { icon: Video, label: 'Video', color: 'text-green-400' }
  ];

  // Initialize socket connection with proper error handling
  useEffect(() => {
    console.log('Initializing socket connection for room:', roomCode);
    
    const socketConnection = createSocketConnection();
    setSocket(socketConnection);

    // Socket event listeners
    socketConnection.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      showNotification('💕 Connected to Love Chat!');
      
      // Join room after connection
      setTimeout(() => {
        joinRoom();
      }, 500);
    });

    socketConnection.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
      showNotification('💔 Connection lost. Trying to reconnect...');
      
      // Attempt to reconnect
      if (reconnectAttempts < 5) {
        setReconnectAttempts(prev => prev + 1);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          setConnectionStatus('connecting');
          socketConnection.connect();
        }, 2000 * (reconnectAttempts + 1));
      }
    });

    socketConnection.on('joined-room', (data) => {
      console.log('Successfully joined room:', data);
      setConnectionStatus('connected');
      showNotification(`💕 Successfully joined room ${roomCode}`);
      loadChatHistory();
    });

    socketConnection.on('new-message', (messageData) => {
      console.log('Received new message:', messageData);
      
      // Don't add messages from the current user (avoid duplicates)
      if (messageData.sender?.userId !== userId) {
        const formattedMessage = {
          id: messageData.messageId || Date.now(),
          sender: messageData.sender?.role || 'partner',
          text: messageData.message,
          timestamp: new Date(messageData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, formattedMessage]);
      }
    });

    socketConnection.on('message-sent', (data) => {
      console.log('Message sent confirmation:', data);
    });

    socketConnection.on('user-typing', (data) => {
      if (data.userId !== userId) {
        setPartnerTyping(data.typing);
        
        if (data.typing) {
          // Auto-clear typing indicator after 3 seconds
          setTimeout(() => {
            setPartnerTyping(false);
          }, 3000);
        }
      }
    });

    socketConnection.on('incoming-call', (data) => {
      showNotification(`📞 Incoming ${data.callType} call from ${partnerName}`);
    });

    socketConnection.on('call-accepted', () => {
      showNotification('📞 Call accepted! Connecting...');
    });

    socketConnection.on('call-rejected', () => {
      showNotification('📞 Call was declined');
    });

    socketConnection.on('call-ended', () => {
      showNotification('📞 Call ended');
    });

    socketConnection.on('user-joined', () => {
      showNotification(`💕 ${partnerName} joined the chat`);
    });

    socketConnection.on('user-left', () => {
      showNotification(`💔 ${partnerName} left the chat`);
      setConnectionStatus('disconnected');
    });

    socketConnection.on('error', (error) => {
      console.error('Socket error:', error);
      showNotification(`❌ Connection error: ${error.message || 'Unknown error'}`);
      setConnectionStatus('error');
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketConnection.disconnect();
    };
  }, [roomCode, userId, reconnectAttempts]);

  // Initialize RTC session
  const initializeRTC = async () => {
    try {
      console.log('Initializing RTC session...');
      const response = await apiCall('/rtc/initialize', {
        method: 'POST',
        body: JSON.stringify({
          roomId: roomCode,
          userId: userId
        })
      });

      if (response.success) {
        setRtcInitialized(true);
        console.log('RTC initialized successfully:', response.data);
        showNotification('🔒 Secure connection established');
      } else {
        throw new Error(response.error || 'Failed to initialize RTC');
      }
    } catch (error) {
      console.error('Failed to initialize RTC:', error);
      showNotification('❌ Failed to initialize secure connection');
      setConnectionStatus('error');
    }
  };

  // Join room via socket
  const joinRoom = () => {
    if (socket && socket.connected && roomCode && userId) {
      console.log('Joining room:', roomCode, 'as user:', userId);
      socket.emit('join-room', {
        roomId: roomCode,
        userId: userId,
        userRole: userRole,
        token: authToken
      });
    } else {
      console.warn('Cannot join room - socket not ready:', {
        hasSocket: !!socket,
        connected: socket?.connected,
        roomCode,
        userId
      });
    }
  };

  // Load chat history
  const loadChatHistory = async () => {
    try {
      console.log('Loading chat history...');
      const response = await apiCall(`/rtc/messages/${roomCode}/${userId}`);
      
      if (response.success && response.data.messages) {
        const formattedMessages = response.data.messages.map(msg => ({
          id: msg.messageId,
          sender: msg.sender.role,
          text: msg.message,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formattedMessages);
        console.log('Chat history loaded:', formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      showNotification('⚠️ Could not load previous messages');
    }
  };

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize RTC when connected
  useEffect(() => {
    if (connectionStatus === 'connected' && !rtcInitialized) {
      setTimeout(() => {
        initializeRTC();
      }, 1000);
    }
  }, [connectionStatus, rtcInitialized]);

  const showNotification = (message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '' || !socket || !socket.connected) {
      if (!socket?.connected) {
        showNotification('❌ Not connected to chat server');
      }
      return;
    }

    const messageText = newMessage.trim();
    
    try {
      // Add message to local state immediately for better UX
      const newMsg = {
        id: Date.now(),
        sender: userRole,
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setShowEmojiPicker(false);

      // Send via socket for real-time delivery
      socket.emit('send-message', {
        roomId: roomCode,
        senderId: userId,
        message: messageText,
        messageType: 'text',
        timestamp: new Date().toISOString()
      });

      // Also send via API for persistence
      const response = await apiCall('/rtc/message/send', {
        method: 'POST',
        body: JSON.stringify({
          roomId: roomCode,
          senderId: userId,
          message: messageText,
          messageType: 'text'
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('typing-stop', { roomId: roomCode, userId });
        setIsTyping(false);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      showNotification('❌ Failed to send message. Please try again.');
      
      // Remove the message from local state on failure
      setMessages(prev => prev.filter(msg => msg.text !== messageText || msg.id !== newMsg.id));
      setNewMessage(messageText); // Restore the message text
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (socket && socket.connected && !isTyping) {
      socket.emit('typing-start', { roomId: roomCode, userId });
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && socket.connected && isTyping) {
        socket.emit('typing-stop', { roomId: roomCode, userId });
        setIsTyping(false);
      }
    }, 1000);
  };

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleFileShare = (fileType) => {
    showNotification(`💕 ${fileType} sharing feature coming soon!`);
    setShowFileOptions(false);
  };

  const handleCall = async (type) => {
    if (!socket || !socket.connected) {
      showNotification('❌ Not connected to chat server');
      return;
    }

    try {
      showNotification(`📞 Starting ${type.toLowerCase()} call...`);
      
      // Start call via API
      const response = await apiCall('/rtc/call/start', {
        method: 'POST',
        body: JSON.stringify({
          roomId: roomCode,
          callerId: userId,
          callType: type.toLowerCase()
        })
      });

      if (response.success) {
        // Send call request via socket
        const recipientId = roomData?.partnerId || roomData?.partnerUserId || 'partner';
        socket.emit('call-request', {
          roomId: roomCode,
          callerId: userId,
          recipientId: recipientId,
          callType: type.toLowerCase(),
          callId: response.callId
        });

        showNotification(`📞 ${type} call request sent to ${partnerName}...`);
      } else {
        throw new Error(response.error || 'Failed to start call');
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      showNotification(`❌ Failed to start ${type.toLowerCase()} call`);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      // Notify other users before leaving
      if (socket && socket.connected) {
        socket.emit('leave-room', { roomId: roomCode, userId });
        socket.disconnect();
      }

      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Call the provided leave function
      if (typeof onLeaveChat === 'function') {
        onLeaveChat();
      } else if (typeof onNavigateHome === 'function') {
        onNavigateHome();
      } else {
        console.warn('No leave function provided');
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  // Get connection status display
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: '💕 Connected', color: 'text-green-400 border-green-400 bg-green-900/20' };
      case 'connecting':
        return { text: '🔄 Connecting...', color: 'text-yellow-400 border-yellow-400 bg-yellow-900/20' };
      case 'disconnected':
        return { text: '💔 Disconnected', color: 'text-red-400 border-red-400 bg-red-900/20' };
      case 'error':
        return { text: '❌ Error', color: 'text-red-400 border-red-400 bg-red-900/20' };
      default:
        return { text: '🔄 Initializing...', color: 'text-gray-400 border-gray-400 bg-gray-900/20' };
    }
  };

  const connectionDisplay = getConnectionDisplay();

  // Mobile Header Component
  const MobileHeader = () => (
    <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 border-b-2 border-pink-400/30 p-4 flex items-center justify-between">
      <button
        onClick={handleLeaveRoom}
        className="text-pink-400 hover:text-pink-300 transition-colors"
      >
        <ArrowLeft size={24} />
      </button>
      
      <div className="flex flex-col items-center">
        <h1 className="text-xl font-bold text-pink-400">💖 {partnerName}</h1>
        <span className={`text-xs px-2 py-1 rounded-full border ${connectionDisplay.color}`}>
          {connectionDisplay.text}
        </span>
        {partnerTyping && <span className="text-xs text-pink-300 animate-pulse">typing...</span>}
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          onClick={() => handleCall('Audio')}
          className="text-pink-400 hover:text-pink-300 transition-colors disabled:opacity-50"
          disabled={connectionStatus !== 'connected'}
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => handleCall('Video')}
          className="text-pink-400 hover:text-pink-300 transition-colors disabled:opacity-50"
          disabled={connectionStatus !== 'connected'}
        >
          <Video size={20} />
        </button>
        <button className="text-pink-400 hover:text-pink-300 transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );

  // Desktop Header Component
  const DesktopHeader = () => (
    <header className="text-center mb-8">
      <h1 className="text-4xl md:text-5xl font-black text-pink-400 mb-2 tracking-wider">
        💖 LOVE CHAT 💖
      </h1>
      <p className="text-lg text-gray-300">Private • Secure • Just for Two</p>
      <p className="text-sm text-pink-400 mt-2">Room: {roomCode} • Connected with {partnerName}</p>
      {partnerTyping && <p className="text-xs text-pink-300 mt-1 animate-pulse">💕 {partnerName} is typing...</p>}
      <div className="flex justify-center space-x-4 mt-4">
        <button
          onClick={() => handleCall('Audio')}
          className="bg-pink-400/20 border border-pink-400 rounded-lg px-4 py-2 text-pink-400 hover:bg-pink-400/30 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
          disabled={connectionStatus !== 'connected'}
        >
          <Phone size={20} />
          <span>Audio Call</span>
        </button>
        <button
          onClick={() => handleCall('Video')}
          className="bg-pink-400/20 border border-pink-400 rounded-lg px-4 py-2 text-pink-400 hover:bg-pink-400/30 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
          disabled={connectionStatus !== 'connected'}
        >
          <Video size={20} />
          <span>Video Call</span>
        </button>
      </div>
    </header>
  );

  // Mobile Footer Component
  const MobileFooter = () => (
    <div className="bg-gradient-to-r from-pink-900/30 to-rose-900/30 border-t-2 border-pink-400/30 p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="mb-4 bg-black/70 border-2 border-pink-400 rounded-lg p-4">
          <div className="grid grid-cols-8 gap-2">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-pink-400/20 rounded p-1 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Options */}
      {showFileOptions && (
        <div className="mb-4 bg-black/70 border-2 border-pink-400 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-3">
            {fileOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleFileShare(option.label)}
                className="flex items-center space-x-2 bg-pink-400/20 border border-pink-400 rounded-lg p-3 hover:bg-pink-400/30 transition-all"
              >
                <option.icon size={20} className={option.color} />
                <span className="text-pink-400">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-lg border-2 transition-all ${
            showEmojiPicker ? 'bg-pink-400/30 border-pink-300' : 'bg-black/70 border-pink-400'
          }`}
        >
          <Smile size={20} className="text-pink-400" />
        </button>
        
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={connectionStatus === 'connected' ? "Type your love message..." : "Connecting..."}
          className="flex-1 bg-black/70 border-2 border-pink-400 rounded-lg p-3 text-pink-400 focus:outline-none focus:border-pink-300 transition-all disabled:opacity-50"
          disabled={connectionStatus !== 'connected'}
        />
        
        <button
          onClick={() => setShowFileOptions(!showFileOptions)}
          className={`p-2 rounded-lg border-2 transition-all ${
            showFileOptions ? 'bg-pink-400/30 border-pink-300' : 'bg-black/70 border-pink-400'
          }`}
          disabled={connectionStatus !== 'connected'}
        >
          <Paperclip size={20} className="text-pink-400" />
        </button>
        
        <button
          onClick={sendMessage}
          disabled={connectionStatus !== 'connected' || !newMessage.trim()}
          className="bg-gradient-to-r from-pink-400 to-rose-500 text-white p-3 rounded-lg hover:from-pink-300 hover:to-rose-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-950 text-pink-400 font-mono relative overflow-hidden">
      {/* Background Grid - Fixed JSX attribute issue */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10"></div>
      </div>
      
      {/* Desktop Leave Button */}
      {!isMobile && (
        <button
          onClick={handleLeaveRoom}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-800/80 border border-pink-400 rounded-lg text-pink-400 hover:bg-pink-400/10 transition-all duration-300"
        >
          ← Leave Room
        </button>
      )}
      
      {/* Desktop Connection Status */}
      {!isMobile && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-4">
          <div className={`border rounded-lg px-3 py-2 text-sm ${connectionDisplay.color}`}>
            {connectionDisplay.text}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-xs">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-pink-900/20 border-2 border-pink-400 rounded-lg px-4 py-3 text-pink-400 text-sm animate-slide-in shadow-lg"
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="flex flex-col h-screen">
          <MobileHeader />
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === userRole ? 'justify-end' : 
                  message.sender === 'system' ? 'justify-center' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.sender === userRole
                      ? 'bg-pink-400 text-white rounded-br-none'
                      : message.sender === 'system'
                      ? 'bg-gray-800/50 text-pink-400 border border-pink-400'
                      : 'bg-gray-800 text-pink-400 border border-pink-400 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <MobileFooter />
        </div>
      ) : (
        /* Desktop Layout */
        <div className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
          <DesktopHeader />

          <div className="bg-gradient-to-br from-pink-900/20 to-pink-800/10 border-2 border-pink-400 rounded-2xl p-6 mb-4 h-96 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === userRole ? 'justify-end' : 
                    message.sender === 'system' ? 'justify-center' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === userRole
                        ? 'bg-pink-400 text-white'
                        : message.sender === 'system'
                        ? 'bg-gray-800/50 text-pink-400 border border-pink-400'
                        : 'bg-gray-800 text-pink-400 border border-pink-400'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Desktop Input Section */}
          <div className="space-y-4">
            {/* Desktop Emoji Picker */}
            {showEmojiPicker && (
              <div className="bg-black/70 border-2 border-pink-400 rounded-lg p-4">
                <div className="grid grid-cols-10 gap-2">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:bg-pink-400/20 rounded p-2 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showFileOptions && (
              <div className="bg-black/70 border-2 border-pink-400 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4">
                  {fileOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleFileShare(option.label)}
                      className="flex flex-col items-center space-y-2 bg-pink-400/20 border border-pink-400 rounded-lg p-4 hover:bg-pink-400/30 transition-all"
                    >
                      <option.icon size={24} className={option.color} />
                      <span className="text-pink-400 text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop Input Bar */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  showEmojiPicker ? 'bg-pink-400/30 border-pink-300' : 'bg-black/70 border-pink-400'
                }`}
              >
                <Smile size={20} className="text-pink-400" />
              </button>
              
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your love message..."
                className="flex-1 bg-black/70 border-2 border-pink-400 rounded-lg p-4 text-pink-400 focus:outline-none focus:border-pink-300 focus:shadow-lg focus:shadow-pink-400/30 transition-all duration-300"
                disabled={connectionStatus !== 'connected'}
              />
              
              <button
                onClick={() => setShowFileOptions(!showFileOptions)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  showFileOptions ? 'bg-pink-400/30 border-pink-300' : 'bg-black/70 border-pink-400'
                }`}
              >
                <Paperclip size={20} className="text-pink-400" />
              </button>
              
              <button
                onClick={sendMessage}
                disabled={connectionStatus !== 'connected' || !newMessage.trim()}
                className="bg-gradient-to-r from-pink-400 to-rose-500 text-white px-6 py-4 rounded-lg font-bold hover:from-pink-300 hover:to-rose-400 hover:shadow-lg hover:shadow-pink-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send size={20} />
                <span>Send</span>
              </button>
            </div>
          </div>

          {connectionStatus !== 'connected' && (
            <div className="text-center mt-4 text-gray-400 text-sm">
              🔄 Establishing secure connection...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoveChat;