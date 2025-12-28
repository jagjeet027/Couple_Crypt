import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Heart, Smile, MoreVertical, Edit3, Trash2, Copy, Check, CheckCheck, 
  Shield, Wifi, WifiOff, User, Phone, LogOut, UserX, AlertCircle, Loader, X, Reply,
  ChevronDown, Bell, PhoneOff, Video, Mic, MicOff, VideoOff, PhoneCall, Search,
  Archive, Pin, Flag, Download, Share2, MoreHorizontal, Clock, Info, Paperclip,
  Image as ImageIcon, Music, FileText, Film
} from 'lucide-react';
import { io } from 'socket.io-client';
import CallInterface from './CallInterface';

const LoveChat = ({ roomData, userData, onLeaveChat, onNavigateHome, onNavigateToGame }) => {
  
  const [roomValidated, setRoomValidated] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
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
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const [callRinging, setCallRinging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const validationChecked = useRef(false);
  const messageRefs = useRef({});

  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;
  const quickEmojis = ['❤️', '💕', '😘', '🥰', '😍', '💖', '💋', '🌹', '💝', '✨', '🔥', '😊', '😂', '🤗', '😉', '💯', '👍', '🎉', '🌟', '💪'];
  const CHARACTER_LIMIT = 150;

  const ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
  };

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

  const getFileType = (mimeType) => {
    if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image';
    if (ALLOWED_FILE_TYPES.video.includes(mimeType)) return 'video';
    if (ALLOWED_FILE_TYPES.audio.includes(mimeType)) return 'audio';
    if (ALLOWED_FILE_TYPES.document.includes(mimeType)) return 'document';
    return 'file';
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <Film className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      default: return <Paperclip className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
        setValidationError(error.message);
        setRoomValidated(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateRoom();
  }, [roomData?.roomCode, userData?.id, userData?._id]);

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
      setIsConnected(true);
      setError('');
      socketInstance.emit('join-room', roomData.roomCode.toUpperCase());
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', () => {
      showErrorMsg('Connection failed. Retrying...');
    });

    socketInstance.on('new-message', (message) => {
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

    socketInstance.on('message-deleted', (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, deleted: true, message: 'This message was deleted' }
          : msg
      ));
      showSuccessMsg('Message deleted');
      setMessageMenuId(null);
    });

    socketInstance.on('message-edited', (data) => {
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

    socketInstance.on('receive-offer', (data) => {
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
      setCallRinging(false);
      setIncomingCallData(null);
      showErrorMsg('Call was rejected');
    });

    socketInstance.on('call-ended', () => {
      setCallRinging(false);
      setIncomingCallData(null);
      setIsInCall(false);
      setShowCallInterface(false);
    });

    socketInstance.on('receive-answer', () => {
      setIsInCall(true);
      setCallRinging(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leave-room', roomData.roomCode.toUpperCase());
      socketInstance.disconnect();
    };
  }, [roomValidated, roomData?.roomCode, userData?.id, userData?._id]);

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

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      if (data.success) {
        setMessages(data.data?.messages || data.messages || []);
      }
    } catch (error) {
      showErrorMsg('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file.type);
    if (!Object.values(ALLOWED_FILE_TYPES).flat().includes(file.type)) {
      showErrorMsg('File type not supported');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showErrorMsg('File size exceeds 50MB limit');
      return;
    }

    setSelectedFile(file);

    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    setShowFilePreview(true);
  };

  const sendFile = async () => {
    if (!selectedFile) {
      showErrorMsg('No file selected');
      return;
    }

    if (!socket || !isConnected) {
      showErrorMsg('Not connected to server');
      return;
    }

    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('roomId', roomData.roomCode.toUpperCase());
    formData.append('fileName', selectedFile.name);
    formData.append('messageType', getFileType(selectedFile.type));

    if (replyingTo) {
      formData.append('replyTo', JSON.stringify({
        messageId: replyingTo._id,
        message: replyingTo.message,
        senderId: replyingTo.senderId || replyingTo.sender?._id
      }));
    }

    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      roomId: roomData.roomCode.toUpperCase(),
      senderId: userData.id || userData._id,
      message: selectedFile.name,
      messageType: getFileType(selectedFile.type),
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type,
      fileUrl: filePreview || `/uploads/temp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isUploading: true,
      uploadProgress: 0,
      replyTo: replyingTo ? {
        messageId: replyingTo._id,
        message: replyingTo.message,
        senderId: replyingTo.senderId || replyingTo.sender?._id
      } : null
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setSelectedFile(null);
    setFilePreview(null);
    setShowFilePreview(false);
    setReplyingTo(null);
    setUploadingFile(true);
    setUploadProgress(0);
    setTimeout(() => scrollToBottom(), 100);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
          
          setMessages(prev => prev.map(msg => 
            msg._id === optimisticMessage._id 
              ? { ...msg, uploadProgress: Math.round(percentComplete) }
              : msg
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            setMessages(prev => prev.map(msg => 
              msg._id === optimisticMessage._id 
                ? { 
                    ...response.data, 
                    isUploading: false,
                    _id: response.data._id
                  }
                : msg
            ));

            socket.emit('send-message', {
              roomId: roomData.roomCode.toUpperCase(),
              roomCode: roomData.roomCode.toUpperCase(),
              message: response.data.message,
              messageType: response.data.messageType,
              fileUrl: response.data.fileUrl,
              fileName: response.data.fileName,
              fileSize: response.data.fileSize,
              mimeType: response.data.mimeType,
              senderId: userData.id || userData._id,
              _id: response.data._id,
              timestamp: response.data.timestamp,
              replyTo: response.data.replyTo
            });
            
            setUploadProgress(0);
          }
        }
      });

      xhr.addEventListener('error', () => {
        showErrorMsg('File upload failed');
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        setUploadingFile(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('abort', () => {
        showErrorMsg('File upload cancelled');
        setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
        setUploadingFile(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `${API_BASE_URL}/messages/send-file`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      showErrorMsg('Error uploading file');
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      setUploadingFile(false);
      setUploadProgress(0);
    }
  };

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
      // Silent
    }
  };

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
    } catch (error) {
      // Silent
    }
  };

  const deleteMessage = (messageId) => {
    if (!socket || !isConnected) {
      showErrorMsg('Not connected to server');
      return;
    }

    if (window.confirm('Delete this message? This cannot be undone.')) {
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

  const renderMessageContent = (message) => {
    if (!message) return null;
    
    if (message.messageType !== 'text' && message.mimeType) {
      return renderFileMessage(message);
    }

    if (message.messageType === 'text') {
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
    }

    return null;
  };

  const renderFileMessage = (message) => {
    if (!message || !message.mimeType) return null;
    
    const fileType = getFileType(message.mimeType);
    const isImage = fileType === 'image';
    const isVideo = fileType === 'video';
    const isAudio = fileType === 'audio';
    const isUploading = message.isUploading;

    if (isImage && !message.deleted) {
      return (
        <div className="space-y-2">
          <div className="bg-gray-700/30 p-2 rounded-lg max-w-xs">
            {isUploading ? (
              <div className="flex items-center justify-center h-32 bg-gray-800 rounded">
                <div className="text-center">
                  <Loader className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">{message.uploadProgress || 0}%</p>
                </div>
              </div>
            ) : (
              <img
                src={message.fileUrl}
                alt={message.fileName}
                className="max-w-full max-h-64 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(message.fileUrl, '_blank')}
              />
            )}
          </div>
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${message.uploadProgress || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">Uploading... {message.uploadProgress || 0}%</p>
            </div>
          )}
        </div>
      );
    }

    if (isVideo && !message.deleted) {
      return (
        <div className="space-y-2">
          <div className="bg-gray-700/30 p-2 rounded-lg max-w-xs">
            {isUploading ? (
              <div className="flex items-center justify-center h-32 bg-gray-800 rounded">
                <div className="text-center">
                  <Loader className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">{message.uploadProgress || 0}%</p>
                </div>
              </div>
            ) : (
              <video
                controls
                className="max-w-full max-h-64 object-contain rounded"
                src={message.fileUrl}
              />
            )}
          </div>
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${message.uploadProgress || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">Uploading... {message.uploadProgress || 0}%</p>
            </div>
          )}
        </div>
      );
    }

    if (isAudio && !message.deleted) {
      return (
        <div className="space-y-2">
          <div className="bg-gray-700/30 p-3 rounded-lg max-w-xs">
            {isUploading ? (
              <div className="text-center">
                <Loader className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">{message.uploadProgress || 0}%</p>
              </div>
            ) : (
              <audio
                controls
                className="w-full"
                src={message.fileUrl}
              />
            )}
          </div>
          {isUploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${message.uploadProgress || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">Uploading... {message.uploadProgress || 0}%</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="bg-gray-700/30 p-3 rounded-lg max-w-xs border border-gray-600/50 hover:bg-gray-700/40 transition-colors cursor-pointer">
        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-lg flex-shrink-0">
                {getFileIcon(fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{message.fileName}</p>
                <p className="text-xs text-gray-400">{formatFileSize(message.fileSize)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${message.uploadProgress || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">{message.uploadProgress || 0}%</p>
            </div>
          </div>
        ) : (
          <a
            href={message.fileUrl}
            download={message.fileName}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-gray-800 rounded-lg flex-shrink-0">
              {getFileIcon(fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{message.fileName}</p>
              <p className="text-xs text-gray-400">{formatFileSize(message.fileSize)}</p>
            </div>
            <Download className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          </a>
        )}
      </div>
    );
  };

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
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <header className="flex-shrink-0 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-cyan-500/30 p-3 md:p-4 z-[80] shadow-lg shadow-cyan-500/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-pulse flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-bold text-base md:text-lg truncate">Love Room</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-cyan-300 font-mono bg-cyan-900/30 px-2 py-0.5 rounded">
                  {roomData.roomCode}
                </span>
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-400">Connecting...</span>
                  </>
                )}
                {partnerTyping && (
                  <span className="text-xs text-cyan-400 animate-pulse flex items-center gap-1 flex-shrink-0">
                    <Edit3 className="w-3 h-3" />
                    typing...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCallInterface(true)}
              disabled={!isConnected}
              className="px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs md:text-sm rounded-lg font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Phone className="w-4 h-4 inline mr-1 md:mr-2" />
              <span className="hidden md:inline">Call</span>
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
      </header>

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

      {error && (
        <div className="flex-shrink-0 bg-red-900/60 border-b border-red-500/50 p-3 z-[75] animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')}>
              <X className="w-4 h-4 text-red-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="flex-shrink-0 bg-green-900/60 border-b border-green-500/50 p-3 z-[75] animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-300 flex-shrink-0" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
            <button onClick={() => setSuccess('')}>
              <X className="w-4 h-4 text-green-300 hover:text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 custom-scrollbar">
        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Heart className="w-20 h-20 text-pink-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-400 text-xl font-bold mb-2">Your Love Story Begins Here 💖</p>
              <p className="text-gray-500 text-sm">Send your first message to start chatting</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = isMyMessage(message);
            const hasReply = message.replyTo && message.replyTo.messageId;

            return (
              <div key={message._id} ref={el => messageRefs.current[message._id] = el} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                <div 
                  className={`message-menu-container relative max-w-xs sm:max-w-sm md:max-w-md ${
                    isMine 
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-2xl rounded-br-none' 
                      : 'bg-gray-800 text-gray-100 rounded-2xl rounded-bl-none'
                  } p-3 border ${
                    isMine ? 'border-cyan-400/20' : 'border-gray-600/30'
                  } shadow-xl hover:shadow-2xl transition-all cursor-pointer`}
                  onClick={() => setMessageMenuId(messageMenuId === message._id ? null : message._id)}
                >
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

                  {editingMessage === message._id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-black/30 text-white px-3 py-2 rounded text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[60px] resize-none"
                        autoFocus
                        maxLength={1000}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEditMessage();
                          }}
                          className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    renderMessageContent(message)
                  )}

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
                        <CheckCheck className="w-4 h-4 text-cyan-200" />
                      </div>
                    )}
                  </div>

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
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyingTo && (
        <div className="flex-shrink-0 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 border-t border-cyan-500/50 p-3 animate-fadeIn">
          <div className="flex items-center gap-3">
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
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {showFilePreview && selectedFile && (
        <div className="flex-shrink-0 bg-gray-800/95 backdrop-blur-sm border-t border-cyan-500/30 p-3 md:p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-cyan-400" />
              File Preview
            </h3>
            <button
              onClick={() => {
                setShowFilePreview(false);
                setSelectedFile(null);
                setFilePreview(null);
              }}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-3 border border-cyan-500/20 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-gray-800 rounded-lg flex-shrink-0">
                {getFileIcon(getFileType(selectedFile.type))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            {filePreview && (
              <div className="bg-gray-600/30 p-2 rounded-lg overflow-x-auto">
                <img src={filePreview} alt="Preview" className="max-h-32 max-w-full object-contain rounded" />
              </div>
            )}

            {uploadingFile && (
              <div className="space-y-2">
                <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">{uploadProgress}% uploaded</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={sendFile}
                disabled={uploadingFile}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploadingFile ? 'Uploading...' : 'Send File'}
              </button>
              <button
                onClick={() => {
                  setShowFilePreview(false);
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                disabled={uploadingFile}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div className="flex-shrink-0 bg-gray-800/95 backdrop-blur-sm border-t border-cyan-500/30 p-3 md:p-4 animate-fadeIn">
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
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 bg-gray-900 border-t border-cyan-500/30 p-3 md:p-4 shadow-lg shadow-cyan-500/10">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-lg ${showEmojiPicker ? 'bg-cyan-600' : 'bg-gray-800'} hover:bg-gray-700 border border-cyan-500/30 transition-all flex-shrink-0`}
          >
            <Smile className={`w-5 h-5 ${showEmojiPicker ? 'text-white' : 'text-cyan-400'}`} />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected || !roomValidated}
            className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-cyan-500/30 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-5 h-5 text-cyan-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
          />

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
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        {!isConnected && (
          <div className="text-center mt-2">
            <p className="text-xs text-yellow-400 flex items-center justify-center gap-2">
              <Loader className="w-3 h-3 animate-spin" />
              Reconnecting to server...
            </p>
          </div>
        )}
      </div>

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

        @media (max-width: 640px) {
          textarea {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoveChat;