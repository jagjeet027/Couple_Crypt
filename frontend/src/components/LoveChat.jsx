import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Heart, Smile, MoreVertical, Edit3, Trash2, Copy, Check, CheckCheck, 
  Shield, Wifi, WifiOff, User, Phone, LogOut, UserX, AlertCircle, Loader, X, Reply,
  ChevronDown, Bell, PhoneOff, Video, Mic, MicOff, VideoOff, PhoneCall, Search,
  Archive, Pin, Flag, Download, Share2, MoreHorizontal, Clock, Info
} from 'lucide-react';
import { io } from 'socket.io-client';
import CallInterface from './CallInterface';

const LoveChat = ({ roomData, userData, onLeaveChat, onNavigateHome, onNavigateToGame }) => {
  // ============ STATE DECLARATIONS ============
  
  // Validation
  const [roomValidated, setRoomValidated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  
  // Messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  // Connection
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // UI States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMenuOptions, setShowMenuOptions] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState([]);
  
  // Calls
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callRinging, setCallRinging] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const menuRef = useRef(null);
  const validationChecked = useRef(false);
  const messageRefs = useRef({});

  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;
  const quickEmojis = ['❤️', '💕', '😘', '🥰', '😍', '💖', '💋', '🌹', '💝', '✨', '🔥', '😊', '😂', '🤗', '😉', '💯', '👍', '🎉', '🌟', '💪'];
  const CHARACTER_LIMIT = 150;

  // ============ UTILITY FUNCTIONS ============

  const showErrorMsg = (message, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(''), duration);
  };

  const showSuccessMsg = (message, duration = 3000) => {
    setSuccess(message);
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

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isMyMessage = (message) => {
    const myId = userData.id || userData._id;
    const msgId = message.senderId || message.sender?._id;
    return myId === msgId;
  };

  const getPartnerName = () => roomData?.userName || roomData?.partnerName || 'Partner';

  const playRingtone = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Ringtone error:', err);
    }
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }, 100);
  };

  const scrollToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
  };

  // ============ ROOM VALIDATION ============

  useEffect(() => {
    if (validationChecked.current) return;
    validationChecked.current = true;

    const validateRoom = async () => {
      setIsValidating(true);
      try {
        if (!roomData?.roomCode) throw new Error('No room code provided');
        if (!userData?.id && !userData?._id) throw new Error('No user information available');

        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Authentication token not found');

        const userId = userData.id || userData._id;
        const normalizedCode = roomData.roomCode.toUpperCase();
        
        const response = await fetch(
          `${API_BASE_URL}/love-room/rooms/status/${normalizedCode}?userId=${encodeURIComponent(userId)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Room validation failed');
        }

        setRoomValidated(true);
        setValidationError('');
      } catch (error) {
        console.error('Validation error:', error);
        setValidationError(error.message);
        setRoomValidated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateRoom();
  }, [roomData?.roomCode, userData?.id, userData?._id]);

  // ============ EVENT LISTENERS ============

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuOptions(false);
      }
      if (!event.target.closest('.message-menu-container')) {
        setMessageMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ============ MESSAGE SEARCH ============

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = messages.filter(msg => 
      !msg.deleted && msg.message?.toLowerCase().includes(query)
    );
    setFilteredMessages(filtered);
  }, [searchQuery, messages]);

  // ============ SOCKET CONNECTION ============

  useEffect(() => {
    if (!roomValidated || !roomData?.roomCode || (!userData?.id && !userData?._id)) return;

    const token = localStorage.getItem('authToken');
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
      setError('');
      socketInstance.emit('join-room', roomData.roomCode.toUpperCase());
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      showErrorMsg('Connection failed. Retrying...');
    });

    // ============ MESSAGE EVENTS ============

    socketInstance.on('new-message', (message) => {
      console.log('📨 New message received:', message);
      setMessages(prev => {
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      const myId = userData.id || userData._id;
      const msgSenderId = message.senderId || message.sender?._id;
      
      if (msgSenderId !== myId) {
        if (document.hidden && Notification.permission === 'granted') {
          new Notification('New message from ' + getPartnerName(), {
            body: message.message?.substring(0, 50) + (message.message?.length > 50 ? '...' : ''),
            icon: '💕'
          });
        }
        
        if (document.hasFocus()) {
          setTimeout(() => markMessageAsRead(message._id), 1000);
        }
      }
    });

    socketInstance.on('message-sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      showSuccessMsg('Message sent', 1500);
    });

    socketInstance.on('message-error', (data) => {
      console.error('❌ Message error:', data);
      showErrorMsg(data.error || 'Failed to send message');
    });

    socketInstance.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, deleted: true, message: 'This message was deleted' }
          : msg
      ));
      showSuccessMsg('Message deleted');
      setMessageMenuId(null);
    });

    socketInstance.on('message-edited', (data) => {
      console.log('✏️ Message edited:', data);
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, message: data.newMessage, edited: true, editedAt: new Date().toISOString() }
          : msg
      ));
      showSuccessMsg('Message updated');
    });

    socketInstance.on('user-typing', (data) => {
      const myId = userData.id || userData._id;
      if (data.userId !== myId) {
        setPartnerTyping(data.isTyping);
      }
    });

    socketInstance.on('message-read', (data) => {
      console.log('👁️ Message read:', data);
      setMessages(prev => prev.map(msg => {
        if (msg._id === data.messageId) {
          const readBy = msg.readBy || [];
          if (!readBy.includes(data.userId)) {
            return { ...msg, readBy: [...readBy, data.userId] };
          }
        }
        return msg;
      }));
    });

    // ============ CALL EVENTS ============

    socketInstance.on('receive-offer', (data) => {
      console.log('🔔 Incoming call:', data);
      setIncomingCallData({
        callerId: data.senderId,
        callType: data.callType,
        offer: data.offer
      });
      setCallRinging(true);
      
      for (let i = 0; i < 3; i++) {
        setTimeout(() => playRingtone(), i * 1000);
      }
      
      if (Notification.permission === 'granted') {
        new Notification(`Incoming ${data.callType} call`, {
          body: `${getPartnerName()} is calling...`,
          icon: '📞',
          requireInteraction: true
        });
      }
    });

    socketInstance.on('call-rejected', () => {
      console.log('❌ Call rejected');
      setCallRinging(false);
      setIncomingCallData(null);
      showErrorMsg('Call was rejected');
    });

    socketInstance.on('call-ended', () => {
      console.log('📞 Call ended');
      setCallRinging(false);
      setIncomingCallData(null);
      setIsInCall(false);
      setShowCallInterface(false);
    });

    socketInstance.on('receive-answer', (data) => {
      console.log('✅ Call answered:', data);
      setIsInCall(true);
      setCallRinging(false);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socketInstance.emit('leave-room', roomData.roomCode.toUpperCase());
      socketInstance.disconnect();
    };
  }, [roomValidated, roomData?.roomCode, userData?.id, userData?._id]);

  // ============ LOAD MESSAGES ============

  useEffect(() => {
    if (roomData?.roomCode && roomValidated) {
      loadMessages();
    }
  }, [roomData?.roomCode, roomValidated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const token = localStorage.getItem('authToken');
      const normalizedCode = roomData.roomCode.toUpperCase();
      
      const response = await fetch(`${API_BASE_URL}/messages/room/${normalizedCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.data?.messages || data.messages || []);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      showErrorMsg('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // ============ MESSAGE FUNCTIONS ============

  const sendMessage = async (e) => {
    e?.preventDefault();
    
    if (!newMessage.trim()) {
      showErrorMsg('Message cannot be empty');
      return;
    }

    if (!socket || !isConnected) {
      showErrorMsg('Not connected to server');
      return;
    }

    const myId = userData.id || userData._id;
    const messageData = {
      roomId: roomData.roomCode.toUpperCase(),
      roomCode: roomData.roomCode.toUpperCase(),
      message: newMessage.trim(),
      messageType: 'text',
      senderId: myId,
      timestamp: new Date().toISOString()
    };

    if (replyingTo) {
      messageData.replyTo = {
        messageId: replyingTo._id,
        message: replyingTo.message,
        senderId: replyingTo.senderId || replyingTo.sender?._id
      };
    }

    console.log('📤 Sending message:', messageData);
    socket.emit('send-message', messageData);
    
    setNewMessage('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    handleTypingStop();
    
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket && isConnected) {
      setIsTyping(true);
      socket.emit('typing', {
        roomCode: roomData.roomCode.toUpperCase(),
        userId: userData.id || userData._id,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(handleTypingStop, 2000);
  };

  const handleTypingStop = () => {
    if (isTyping && socket && isConnected) {
      setIsTyping(false);
      socket.emit('typing', {
        roomCode: roomData.roomCode.toUpperCase(),
        userId: userData.id || userData._id,
        isTyping: false
      });
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE_URL}/messages/mark-read/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (socket && isConnected) {
        socket.emit('message-read', {
          messageId,
          userId: userData.id || userData._id,
          roomCode: roomData.roomCode.toUpperCase()
        });
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteMessage = (messageId) => {
    if (!socket || !isConnected) {
      showErrorMsg('Not connected to server');
      return;
    }

    if (window.confirm('Delete this message? This cannot be undone.')) {
      console.log('🗑️ Deleting message:', messageId);
      socket.emit('delete-message', { 
        messageId,
        roomCode: roomData.roomCode.toUpperCase()
      });
      setMessageMenuId(null);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message._id);
    setEditText(message.message);
    setMessageMenuId(null);
  };

  const saveEditMessage = () => {
    if (!editText.trim()) {
      showErrorMsg('Message cannot be empty');
      return;
    }

    if (!socket || !isConnected) {
      showErrorMsg('Not connected to server');
      return;
    }

    console.log('✏️ Editing message:', editingMessage);
    socket.emit('edit-message', {
      messageId: editingMessage,
      newMessage: editText.trim(),
      roomCode: roomData.roomCode.toUpperCase()
    });
    
    setEditingMessage(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showSuccessMsg('Copied to clipboard', 2000);
        setMessageMenuId(null);
      })
      .catch(() => {
        showErrorMsg('Failed to copy');
      });
  };

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    setMessageMenuId(null);
    messageInputRef.current?.focus();
  };

  const toggleExpandMessage = (messageId) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    messageInputRef.current?.focus();
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      if (socket) {
        socket.emit('leave-room', roomData.roomCode.toUpperCase());
        socket.disconnect();
      }
      onLeaveChat();
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('activeRoomData');
      localStorage.removeItem('userData');
      if (socket) {
        socket.emit('leave-room', roomData.roomCode.toUpperCase());
        socket.disconnect();
      }
      setTimeout(() => onNavigateHome(), 500);
    }
  };

  const downloadChat = () => {
    const chatText = messages
      .filter(m => !m.deleted)
      .map(m => {
        const sender = isMyMessage(m) ? 'You' : getPartnerName();
        const time = formatTime(m.timestamp);
        return `[${time}] ${sender}: ${m.message}`;
      })
      .join('\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `love-chat-${roomData.roomCode}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessMsg('Chat downloaded!');
    setShowMenuOptions(false);
  };

  // ============ MESSAGE RENDER COMPONENT ============

  const MessageContent = ({ message }) => {
    const isExpanded = expandedMessages.has(message._id);
    const needsExpand = message.message && message.message.length > CHARACTER_LIMIT;
    const displayText = isExpanded ? message.message : message.message?.substring(0, CHARACTER_LIMIT);

    return (
      <div className="space-y-2">
        {message.deleted ? (
          <p className="text-gray-500 text-sm italic flex items-center gap-2">
            <Trash2 className="w-3 h-3" />
            This message was deleted
          </p>
        ) : (
          <>
            <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
              {displayText}
              {!isExpanded && needsExpand && '...'}
            </p>
            {needsExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandMessage(message._id);
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 mt-1"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // ============ MAIN RENDER ============

  if (isValidating) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-bold">Validating Room Access</p>
          <p className="text-gray-500 text-xs mt-2">Code: {roomData?.roomCode}</p>
        </div>
      </div>
    );
  }

  if (!roomValidated) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 flex items-center justify-center px-4">
        <div className="text-center bg-gray-800/50 border border-red-500/30 rounded-2xl p-8 max-w-md w-full backdrop-blur-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">ROOM ACCESS DENIED</h2>
          <p className="text-red-400 text-sm mb-6">{validationError}</p>
          <button
            onClick={onNavigateHome}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-700 hover:to-blue-700 transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-cyan-500/30 p-4 z-[80] shadow-lg shadow-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-pulse">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Love Room</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-cyan-300 font-mono bg-cyan-900/30 px-2 py-0.5 rounded">
                  {roomData.roomCode}
                </span>
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-xs text-red-400">Connecting...</span>
                  </>
                )}
                {partnerTyping && (
                  <span className="text-xs text-cyan-400 animate-pulse flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    {getPartnerName()} is typing...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-cyan-500/30 transition-colors"
              title="Search messages"
            >
              <Search className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              onClick={() => setShowCallInterface(true)}
              disabled={!isConnected}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm rounded-lg font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Phone className="w-4 h-4 inline mr-2" />
              Call
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenuOptions(!showMenuOptions)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-purple-500/30 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-purple-400" />
              </button>

              {showMenuOptions && (
                <div className="absolute right-0 top-12 bg-gray-800 rounded-lg shadow-2xl border border-purple-500/30 py-2 w-56 z-[90] animate-fadeIn">
                  <button
                    onClick={() => { setShowMenuOptions(false); onNavigateToGame(); }}
                    className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-gray-700 text-sm flex items-center gap-3 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-purple-400" />
                    Game Center
                  </button>
                  <button
                    onClick={downloadChat}
                    className="w-full px-4 py-2.5 text-left text-gray-300 hover:bg-gray-700 text-sm flex items-center gap-3 transition-colors"
                  >
                    <Download className="w-4 h-4 text-green-400" />
                    Download Chat
                  </button>
                  <div className="border-t border-gray-700 my-2"></div>
                  <button
                    onClick={handleLeaveRoom}
                    className="w-full px-4 py-2.5 text-left text-yellow-400 hover:bg-gray-700 text-sm flex items-center gap-3 transition-colors"
                  >
                    <UserX className="w-4 h-4" />
                    Leave Room
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-gray-700 text-sm flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3 animate-fadeIn">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-gray-800 text-white pl-10 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-cyan-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            {searchQuery && filteredMessages.length > 0 && (
              <div className="mt-2 bg-gray-800/90 rounded-lg p-2 max-h-40 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-2">{filteredMessages.length} results found</p>
                {filteredMessages.slice(0, 5).map(msg => (
                  <button
                    key={msg._id}
                    onClick={() => {
                      scrollToMessage(msg._id);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm text-gray-300 truncate"
                  >
                    <span className="font-bold text-cyan-400">
                      {isMyMessage(msg) ? 'You' : getPartnerName()}:
                    </span> {msg.message}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Incoming Call Notification */}
      {incomingCallData && callRinging && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-900 to-purple-900 border-b border-blue-500/50 p-4 z-[85] animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-400 animate-bounce" />
              <div>
                <p className="text-blue-300 font-bold text-lg">
                  Incoming {incomingCallData.callType === 'video' ? 'Video' : 'Voice'} Call
                </p>
                <p className="text-blue-200 text-sm">{getPartnerName()} is calling...</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCallRinging(false);
                  setIncomingCallData(null);
                  socket?.emit('reject-call', { 
                    roomCode: roomData.roomCode.toUpperCase(),
                    callType: incomingCallData.callType
                  });
                  showSuccessMsg('Call declined');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                Decline
              </button>
              <button
                onClick={() => {
                  setShowCallInterface(true);
                  setIsInCall(true);
                  setCallRinging(false);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all animate-pulse"
              >
                <Phone className="w-4 h-4" />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex-shrink-0 bg-red-900/60 border-b border-red-500/50 p-3 z-[75] animate-fadeIn">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')}>
              <X className="w-4 h-4 text-red-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex-shrink-0 bg-green-900/60 border-b border-green-500/50 p-3 z-[75] animate-fadeIn">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-300" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess('')}>
              <X className="w-4 h-4 text-green-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 custom-scrollbar">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Heart className="w-20 h-20 text-pink-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-400 text-xl font-bold mb-2">Your Love Story Begins Here 💖</p>
              <p className="text-gray-500 text-sm">Send your first message to start chatting</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDate = index === 0 || formatDate(messages[index - 1].timestamp) !== formatDate(message.timestamp);
            const isMine = isMyMessage(message);
            const hasReply = message.replyTo && message.replyTo.messageId;

            return (
              <div key={message._id} ref={el => messageRefs.current[message._id] = el}>
                {showDate && (
                  <div className="flex justify-center my-6">
                    <span className="bg-gray-800/80 text-gray-400 text-xs font-semibold px-4 py-1.5 rounded-full border border-gray-700/50">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                  <div 
                    className={`message-menu-container relative max-w-xs lg:max-w-md ${
                      isMine 
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-2xl rounded-br-none' 
                        : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-none'
                    } p-3 border ${
                      isMine ? 'border-cyan-400/20' : 'border-gray-600/30'
                    } shadow-xl hover:shadow-2xl transition-all cursor-pointer`}
                    onClick={() => setMessageMenuId(messageMenuId === message._id ? null : message._id)}
                  >
                    {/* Reply Context */}
                    {hasReply && (
                      <div 
                        className={`mb-2 pb-2 border-b ${
                          isMine ? 'border-white/30 bg-white/10' : 'border-gray-500/30 bg-gray-900/30'
                        } rounded-lg p-2 cursor-pointer hover:bg-opacity-20 transition-all`}
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(message.replyTo.messageId);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Reply className="w-3 h-3 opacity-80 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs opacity-90 font-bold mb-1">
                              {message.replyTo.senderId === (userData.id || userData._id) ? 'You' : getPartnerName()}
                            </p>
                            <p className="text-xs opacity-80 truncate italic bg-black/20 px-2 py-1 rounded">
                              "{message.replyTo.message}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    {editingMessage === message._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-black/30 text-white px-3 py-2 rounded text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[60px] resize-none"
                          autoFocus
                          maxLength={1000}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEditMessage();
                            }
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEditMessage();
                            }}
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                          >
                            <Check className="w-3 h-3 inline mr-1" />
                            Save
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEdit();
                            }}
                            className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                          >
                            <X className="w-3 h-3 inline mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MessageContent message={message} />
                    )}

                    {/* Message Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20 text-xs opacity-80">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(message.timestamp)}</span>
                        {message.edited && (
                          <span className="text-[10px] italic opacity-70">(edited)</span>
                        )}
                      </div>
                      {isMine && (
                        <div className="flex items-center gap-1">
                          {message.readBy && message.readBy.length > 1 ? (
                            <CheckCheck className="w-4 h-4 text-cyan-200" />
                          ) : (
                            <Check className="w-4 h-4 text-cyan-300" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Menu */}
                    {messageMenuId === message._id && !message.deleted && (
                      <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded-lg shadow-2xl border border-purple-500/30 py-1 z-[60] min-w-[160px] animate-fadeIn">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplyMessage(message);
                          }} 
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" /> Reply
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyMessage(message.message);
                          }} 
                          className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                        {isMine && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMessage(message);
                              }} 
                              className="w-full px-4 py-2 text-left text-blue-400 hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(message._id);
                              }} 
                              className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 text-sm flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Quick Actions (visible on hover) */}
                    <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800/90 rounded-lg px-2 py-1 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplyMessage(message);
                        }}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3 text-cyan-400" />
                      </button>
                      {isMine && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditMessage(message);
                          }}
                          className="p-1 hover:bg-gray-700 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-3 h-3 text-blue-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-t border-cyan-500/50 p-3 animate-fadeIn">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <Reply className="w-4 h-4 text-cyan-300 flex-shrink-0" />
            <div className="flex-1 bg-black/30 rounded-lg p-2.5 border border-cyan-500/30">
              <p className="text-xs text-cyan-300 font-bold mb-1">
                Replying to {replyingTo.senderId === (userData.id || userData._id) ? 'yourself' : getPartnerName()}
              </p>
              <p className="text-sm text-gray-200 truncate">{replyingTo.message}</p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)} 
              className="p-2 bg-blue-600/80 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
              title="Cancel reply"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="flex-shrink-0 bg-gray-800/95 backdrop-blur-sm border-t border-cyan-500/30 p-4 animate-fadeIn">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <Smile className="w-4 h-4 text-cyan-400" />
                Quick Emojis
              </h3>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickEmojis.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl hover:bg-gray-700 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Input Area */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-cyan-500/30 p-4 shadow-lg shadow-cyan-500/10">
        <div className="flex items-end gap-2 max-w-6xl mx-auto">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-lg ${showEmojiPicker ? 'bg-cyan-600' : 'bg-gray-800'} hover:bg-gray-700 border border-cyan-500/30 transition-all flex-shrink-0`}
            title="Emojis"
          >
            <Smile className={`w-5 h-5 ${showEmojiPicker ? 'text-white' : 'text-cyan-400'}`} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={replyingTo ? `Replying to ${replyingTo.senderId === (userData.id || userData._id) ? 'yourself' : getPartnerName()}...` : "Type your message..."}
              disabled={!isConnected || !roomValidated}
              maxLength={1000}
              rows={1}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/20 resize-none transition-all"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              {newMessage.length}/1000
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected || !roomValidated}
            className="p-3 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/40 transition-all active:scale-95 flex-shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Connection Status Footer */}
        {!isConnected && (
          <div className="text-center mt-2">
            <p className="text-xs text-yellow-400 flex items-center justify-center gap-2">
              <Loader className="w-3 h-3 animate-spin" />
              Reconnecting to server...
            </p>
          </div>
        )}
      </div>

      {/* Call Interface Modal */}
      {showCallInterface && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[90vh] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
            <CallInterface
              socket={socket}
              isConnected={isConnected}
              roomData={roomData}
              userData={userData}
              getPartnerName={getPartnerName}
              incomingCallData={incomingCallData}
              onClose={() => {
                setShowCallInterface(false);
                setIsInCall(false);
                setCallRinging(false);
                setIncomingCallData(null);
                if (socket && isConnected) {
                  socket.emit('end-call', { roomCode: roomData.roomCode.toUpperCase() });
                }
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes highlight {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(6, 182, 212, 0.2); }
        }
        
        .animate-fadeIn { 
          animation: fadeIn 0.3s ease-out; 
        }
        
        .highlight-message {
          animation: highlight 1s ease-in-out 2;
        }
        
        .custom-scrollbar::-webkit-scrollbar { 
          width: 8px; 
        }
        
        .custom-scrollbar::-webkit-scrollbar-track { 
          background: rgba(15, 23, 42, 0.5); 
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.6), rgba(59, 130, 246, 0.6));
          border-radius: 10px;
          border: 2px solid rgba(15, 23, 42, 0.5);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8));
        }

        textarea::-webkit-scrollbar {
          width: 6px;
        }

        textarea::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }

        textarea::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }

        textarea::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
};

export default LoveChat;