
import React, { useState, useEffect, useRef } from 'react';

// Since we can't import from files, I'll include a simplified version of the API class
const API_BASE_URL = 'http://localhost:2004/api';
const WS_BASE_URL = 'ws://localhost:2004';

class LoveRoomAPI {
  static async checkServerHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.warn('Server health check failed:', error.message);
      return false;
    }
  }

  static async checkWebSocketHealth() {
    return new Promise((resolve) => {
      try {
        const testWs = new WebSocket(`${WS_BASE_URL}/health`);
        const timeout = setTimeout(() => {
          testWs.close();
          resolve(false);
        }, 3000);
        
        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve(true);
        };
        
        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }

  static async apiCall(endpoint, options = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }

        switch (response.status) {
          case 404:
            throw new Error('Room not found');
          case 500:
            throw new Error('Internal server error');
          case 503:
            throw new Error('Service unavailable');
          default:
            throw new Error(errorMessage);
        }
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  static async generateCode(userId) {
    try {
      const response = await this.apiCall('/love-room/generate', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  static async joinRoom(code, userId) {
    if (!code || !userId) {
      throw new Error('Room code and user ID are required');
    }

    try {
      const response = await this.apiCall('/love-room/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.toUpperCase(), userId }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

 static async resetCode(code, userId) {
    if (!code || !userId) {
      throw new Error('Room code and user ID are required');
    }

    try {
      const response = await this.apiCall(`/love-room/reset/${code.toUpperCase()}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // This method now correctly calls the new getRoomStatus endpoint
  static async getRoomStatus(roomCode) {
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    try {
      const response = await this.apiCall(`/love-room/status/${roomCode.toUpperCase()}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  static createWebSocket(roomCode, options = {}) {
    const {
      maxRetries = 2,
      retryDelay = 2000,
      onConnect = () => {},
      onDisconnect = () => {},
      onError = () => {},
      onMessage = () => {},
      onFallback = () => {}
    } = options;

    let retryCount = 0;
    let ws = null;
    let isIntentionallyClosed = false;

    const connect = async () => {
      const wsHealthy = await this.checkWebSocketHealth();
      
      if (!wsHealthy) {
        console.log('WebSocket server not available, triggering fallback immediately');
        onFallback('WebSocket server unavailable');
        return;
      }

      const wsUrl = `${WS_BASE_URL}/love-room/${roomCode.toUpperCase()}`;
      console.log(`Attempting WebSocket connection to: ${wsUrl}`);
      
      try {
        ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            handleConnectionFailure('Connection timeout');
          }
        }, 5000);

        ws.onopen = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          retryCount = 0;
          onConnect(event);
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket disconnected:', event.code, event.reason);
          onDisconnect(event);

          if (!isIntentionallyClosed && event.code !== 1000 && retryCount < maxRetries) {
            retryCount++;
            setTimeout(connect, retryDelay);
          } else if (!isIntentionallyClosed && retryCount >= maxRetries) {
            onFallback('Max retry attempts reached');
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          onError(error);
          handleConnectionFailure('WebSocket error occurred');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (parseError) {
            onMessage(event.data);
          }
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        handleConnectionFailure('Failed to create WebSocket');
      }
    };

    const handleConnectionFailure = (reason) => {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, retryDelay);
      } else {
        onFallback(reason);
      }
    };

    connect();

    return {
      get socket() { return ws; },
      get readyState() { return ws ? ws.readyState : WebSocket.CLOSED; },
      send: (data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(typeof data === 'string' ? data : JSON.stringify(data));
          return true;
        }
        return false;
      },
      close: () => {
        isIntentionallyClosed = true;
        if (ws) {
          ws.close(1000, 'Manual close');
        }
      },
      reconnect: () => {
        isIntentionallyClosed = false;
        if (ws) {
          ws.close();
        }
        retryCount = 0;
        connect();
      },
      isConnected: () => {
        return ws && ws.readyState === WebSocket.OPEN;
      }
    };
  }

  static generateLocalCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
      if (i === 3 || i === 7) code += '-';
    }
    return code;
  }
}

const SecureRoomPortal = ({ onNavigateHome, onJoinChat, userEmail }) => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [isGlitching, setIsGlitching] = useState(false);
  const [userSessionId, setUserSessionId] = useState('');
  const [codeCreatorId, setCodeCreatorId] = useState('');
  const [isCodeActive, setIsCodeActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [roomData, setRoomData] = useState(null);
  
  // New states for real-time communication
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionMethod, setConnectionMethod] = useState('none');
  const wsRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const connectionAttempts = useRef(0);
  const maxConnectionAttempts = 3;

  // In-memory room storage for local functionality
  const [localRooms, setLocalRooms] = useState({});
  const [serverAvailable, setServerAvailable] = useState(true);

  // Enhanced session ID generation
  useEffect(() => {
    const userIdentifier = userEmail || 'anonymous';
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 11);
    const browserFingerprint = navigator.userAgent.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
    
    const sessionId = `${userIdentifier.replace(/[^a-zA-Z0-9]/g, '')}_${browserFingerprint}_${randomPart}_${timestamp}`;
    setUserSessionId(sessionId);
    
    console.log('Generated Session ID:', sessionId);
  }, [userEmail]);

  // Enhanced WebSocket Connection Management with better fallback
  const initializeWebSocket = (roomCode, role) => {
    if (wsRef.current && wsRef.current.isConnected()) {
      return;
    }

    console.log(`Initializing WebSocket for room: ${roomCode}, role: ${role}`);

    wsRef.current = LoveRoomAPI.createWebSocket(roomCode, {
      maxRetries: 2,
      retryDelay: 2000,
      onConnect: (event) => {
        console.log('WebSocket connected successfully');
        setConnectionStatus('connected');
        setConnectionMethod('websocket');
        connectionAttempts.current = 0;
        
        if (wsRef.current) {
          wsRef.current.send({
            type: 'join_room',
            roomCode,
            userId: userSessionId,
            role,
            timestamp: Date.now()
          });
        }
        
        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current && wsRef.current.isConnected()) {
            wsRef.current.send({ type: 'heartbeat' });
          }
        }, 30000);
      },
      onDisconnect: (event) => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        showNotification('🔌 Connection issue detected');
      },
      onMessage: (message) => {
        handleWebSocketMessage(message);
      },
      onFallback: (reason) => {
        console.log('WebSocket fallback triggered:', reason);
        showNotification('🔌 Using backup connection • Room still works!');
        setConnectionMethod('polling');
        initializePolling(roomCode, role);
      }
    });
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (message) => {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'user_joined':
        if (message.userId !== userSessionId) {
          handlePartnerJoined(message);
        }
        break;
      
      case 'room_ready':
        handleRoomReady(message);
        break;
      
      case 'partner_connected':
        handlePartnerConnected(message);
        break;
      
      case 'error':
        showNotification(`❌ ${message.message}`);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  };

 const initializePolling = (roomCode, role) => {
  console.log('Initializing polling for room:', roomCode, 'Role:', role);
  setConnectionStatus('connected');
  setConnectionMethod('polling');
  
  // Initialize or update local room data
  setLocalRooms(prev => {
    const currentRoom = prev[roomCode];
    const newUsers = currentRoom ? 
      [...currentRoom.users, userSessionId].filter((v, i, a) => a.indexOf(v) === i) : 
      [userSessionId];
    
    return {
      ...prev,
      [roomCode]: {
        code: roomCode,
        creator: role === 'creator' ? userSessionId : (currentRoom?.creator || 'unknown'),
        users: newUsers,
        createdAt: currentRoom?.createdAt || Date.now(),
        lastActivity: Date.now(),
        expiresAt: currentRoom?.expiresAt || (Date.now() + 600000)
      }
    };
  });

  
    const pollForUpdates = async () => {
    try {
      // Check local room first
      const currentRoom = localRooms[roomCode];
      
      if (currentRoom) {
        // If we have 2 users and we're waiting for partner
        if (currentRoom.users.length >= 2 && isWaitingForPartner) {
          const partnerId = currentRoom.users.find(id => id !== userSessionId);
          if (partnerId) {
            console.log('Partner found in local room:', partnerId);
            handlePartnerJoined({
              roomCode,
              userId: partnerId,
              partnerInfo: { name: 'Your Love', id: partnerId }
            });
            return; // Stop polling once partner is found
          }
        }
      }
      
      // If server is available, also try API
      if (serverAvailable) {
        try {
          const response = await LoveRoomAPI.getRoomStatus(roomCode);
          
          if (response.success && response.data.userCount >= 2 && isWaitingForPartner) {
            handlePartnerJoined({
              roomCode,
              partnerInfo: response.data.partner || { name: 'Your Love', id: 'partner' },
              roomData: response.data
            });
          }
        } catch (apiError) {
          console.log('API polling failed, using local only:', apiError.message);
          setServerAvailable(false);
        }
      }
    } catch (error) {
      console.log('Polling error:', error.message);
    }
  };
  
  // Start polling
  if (pollIntervalRef.current) {
    clearInterval(pollIntervalRef.current);
  }
  pollIntervalRef.current = setInterval(pollForUpdates, 1500); // Poll every 1.5 seconds
  
  // Initial poll
  setTimeout(pollForUpdates, 500);
};

  // Handle when partner joins the room
  const handlePartnerJoined = (data) => {
    console.log('Partner joined:', data);
    setIsWaitingForPartner(false);
    
    showNotification('💞 Your love has arrived • Connecting hearts...');
    
    const creatorRoomData = {
      userRole: 'creator',
      roomCode: generatedCode || data.roomCode,
      partnerName: data.partnerInfo?.name || 'Your Love',
      creatorId: userSessionId,
      joinerId: data.userId || data.partnerInfo?.id,
      roomId: generatedCode || data.roomCode,
      timestamp: Date.now(),
      partnerInfo: data.partnerInfo,
      connectionMethod: connectionMethod
    };
    
    setTimeout(() => {
      showNotification('💖 Opening love chat • Your hearts are now connected');
      setTimeout(() => {
        transitionToChat(creatorRoomData);
      }, 1500);
    }, 2000);
  };

  // Handle when room is ready for both users
  const handleRoomReady = (data) => {
    console.log('Room ready:', data);
    
    const roomDataForUser = {
      userRole: data.userRole || (codeCreatorId === userSessionId ? 'creator' : 'joiner'),
      roomCode: data.roomCode,
      partnerName: data.partnerName || 'Your Love',
      creatorId: data.creatorId,
      joinerId: data.joinerId,
      roomId: data.roomId || data.roomCode,
      timestamp: Date.now(),
      partnerInfo: data.partnerInfo,
      connectionMethod: connectionMethod
    };
    
    transitionToChat(roomDataForUser);
  };

  // Handle partner connection confirmation
  const handlePartnerConnected = (data) => {
    console.log('Partner connected:', data);
    showNotification('💕 Love connection established • Both hearts online');
  };

  // Cleanup connections
  const cleanupConnections = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setConnectionMethod('none');
    setIsWaitingForPartner(false);
    connectionAttempts.current = 0;
  };

  // Helper function to reset code data
  const resetCodeData = () => {
    setIsCodeActive(false);
    setGeneratedCode('');
    setCodeCreatorId('');
    setRoomCreated(false);
    setCodeExpiry(null);
    setRoomData(null);
    setIsWaitingForPartner(false);
    cleanupConnections();
  };

  // Function to transition both users to chat
  const transitionToChat = (chatRoomData) => {
    console.log('Transitioning to chat with data:', chatRoomData);
    
    if (!onJoinChat) {
      console.error('onJoinChat prop is not provided');
      showNotification('❌ Error: Chat function not available. Please check parent component.');
      return;
    }
    
    if (typeof onJoinChat !== 'function') {
      console.error('onJoinChat is not a function, received:', typeof onJoinChat, onJoinChat);
      showNotification('❌ Error: Invalid chat function. Please refresh and try again.');
      return;
    }

    try {
      setRoomData(chatRoomData);
      cleanupConnections();
      resetCodeData();
      onJoinChat(chatRoomData);
      console.log('Successfully called onJoinChat');
    } catch (error) {
      console.error('Error calling onJoinChat:', error);
      showNotification('❌ Error: Unable to join chat. Please refresh and try again.');
    }
  };

  const generateCode = async () => {
  if (isCodeActive && codeCreatorId === userSessionId) {
    showNotification('💫 You already have an active code • Wait for your love to join');
    return;
  }

  setIsLoading(true);
  
  try {
    // Try API first
    const apiResponse = await LoveRoomAPI.generateCode(userSessionId);
    
    if (apiResponse.success) {
      const newCode = apiResponse.data.code;
      const expiryTime = Date.now() + 600000;
      
      setGeneratedCode(newCode);
      setCodeCreatorId(userSessionId);
      setIsCodeActive(true);
      setRoomCreated(true);
      setCodeExpiry(expiryTime);
      setIsGlitching(true);
      setIsWaitingForPartner(true);
      
      setTimeout(() => setIsGlitching(false), 1000);
      
      showNotification('💕 Love code created • Share with your special someone');
      
      // Initialize connection
      initializePolling(newCode, 'creator');
      
      // Set expiry timeout
      setTimeout(() => {
        if (isCodeActive) {
          resetCodeData();
          showNotification('⏰ Code expired • Generate new one for security');
        }
      }, 600000);

    } else {
      throw new Error(apiResponse.message || 'Failed to generate code');
    }
  } catch (error) {
    console.log('API failed, using local generation:', error.message);
    setServerAvailable(false);
    
    // Local code generation
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
      if (i === 3 || i === 7) code += '-';
    }
    
    const expiryTime = Date.now() + 600000;
    
    setGeneratedCode(code);
    setCodeCreatorId(userSessionId);
    setIsCodeActive(true);
    setRoomCreated(true);
    setCodeExpiry(expiryTime);
    setIsGlitching(true);
    setIsWaitingForPartner(true);
    
    // Create local room immediately
    setLocalRooms(prev => ({
      ...prev,
      [code]: {
        code: code,
        creator: userSessionId,
        users: [userSessionId],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: expiryTime
      }
    }));
    
    setTimeout(() => setIsGlitching(false), 1000);
    
    showNotification('💕 Love code created • Share with your special someone');
    
    // Initialize polling
    initializePolling(code, 'creator');
    
    // Set expiry timeout
    setTimeout(() => {
      if (isCodeActive) {
        resetCodeData();
        setLocalRooms(prev => {
          const newRooms = { ...prev };
          delete newRooms[code];
          return newRooms;
        });
        showNotification('⏰ Code expired • Generate new one for security');
      }
    }, 600000);
  } finally {
    setIsLoading(false);
  }
};

 const joinRoom = async () => {
  if (joinCode.length < 14) {
    showNotification('💔 Invalid code format • Please enter complete code');
    return;
  }

  setIsLoading(true);

  try {
    // Try API first
    const joinResponse = await LoveRoomAPI.joinRoom(joinCode, userSessionId);
    
    if (joinResponse.success) {
      showNotification('💖 Love code accepted • Connecting hearts...');
      
      // Initialize polling for API-based room
      initializePolling(joinCode, 'joiner');
      
      const newRoomData = {
        userRole: 'joiner',
        roomCode: joinCode,
        partnerName: 'Your Love',
        creatorId: joinResponse.data.creatorId || 'unknown',
        joinerId: userSessionId,
        roomId: joinResponse.data.roomId || joinCode,
        timestamp: Date.now(),
        connectionMethod: 'polling'
      };
      
      setTimeout(() => {
        transitionToChat(newRoomData);
      }, 2000);
    } else {
      throw new Error(joinResponse.message || 'Failed to join room');
    }
  } catch (error) {
    console.log('API join failed, using local validation:', error.message);
    setServerAvailable(false);
    
    // Local validation and joining
    const currentRoom = localRooms[joinCode];
    
    // Check if room exists locally or if it's the generated code
    if (!currentRoom && joinCode !== generatedCode) {
      showNotification('💔 Invalid love code • Room not found');
      setIsLoading(false);
      return;
    }

    // Check if trying to join own room
    if (codeCreatorId === userSessionId) {
      showNotification('🚫 Cannot join your own room • Share code with your love');
      setIsLoading(false);
      return;
    }

    // Check expiry
    if (codeExpiry && Date.now() >= codeExpiry) {
      showNotification('⏰ Code expired • Ask for new code');
      setIsLoading(false);
      return;
    }

    if (currentRoom && currentRoom.expiresAt && Date.now() >= currentRoom.expiresAt) {
      showNotification('⏰ Code expired • Ask for new code');
      setIsLoading(false);
      return;
    }

    showNotification('💖 Love code accepted • Connecting hearts...');
    
    // Add user to local room
    setLocalRooms(prev => {
      const room = prev[joinCode] || {
        code: joinCode,
        creator: codeCreatorId || 'unknown',
        users: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 600000
      };
      
      return {
        ...prev,
        [joinCode]: {
          ...room,
          users: [...room.users, userSessionId].filter((v, i, a) => a.indexOf(v) === i),
          lastActivity: Date.now()
        }
      };
    });
    
    // Initialize polling for local room
    initializePolling(joinCode, 'joiner');
    
    // If the creator is waiting, notify them
    if (isWaitingForPartner && codeCreatorId !== userSessionId) {
      // Simulate partner joining for the creator
      setTimeout(() => {
        const newRoomData = {
          userRole: 'joiner',
          roomCode: joinCode,
          partnerName: 'Your Love',
          creatorId: codeCreatorId,
          joinerId: userSessionId,
          roomId: joinCode,
          timestamp: Date.now(),
          connectionMethod: 'polling'
        };
        
        transitionToChat(newRoomData);
      }, 2000);
    }
  } finally {
    setIsLoading(false);
  }
};
const broadcastRoomUpdate = (roomCode, updateData) => {
  // Use localStorage events to sync across tabs
  const broadcastData = {
    type: 'room_update',
    roomCode,
    timestamp: Date.now(),
    data: updateData
  };
  
  localStorage.setItem('loveroom_broadcast', JSON.stringify(broadcastData));
  setTimeout(() => {
    localStorage.removeItem('loveroom_broadcast');
  }, 1000);
};
// Add this useEffect to listen for broadcasts from other tabs
useEffect(() => {
  const handleStorageChange = (e) => {
    if (e.key === 'loveroom_broadcast' && e.newValue) {
      try {
        const broadcastData = JSON.parse(e.newValue);
        if (broadcastData.type === 'room_update') {
          // Update local room data
          setLocalRooms(prev => ({
            ...prev,
            [broadcastData.roomCode]: {
              ...prev[broadcastData.roomCode],
              ...broadcastData.data,
              lastActivity: Date.now()
            }
          }));
        }
      } catch (error) {
        console.log('Broadcast parse error:', error);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, []);

  const handleJoinCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    let formatted = '';
    for (let i = 0; i < value.length && i < 12; i++) {
      if (i === 4 || i === 8) {
        formatted += '-';
      }
      formatted += value[i];
    }
    
    setJoinCode(formatted);
  };

  const showNotification = (message) => {       
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

const resetCode = async () => {
  if (generatedCode) {
    setIsLoading(true);
    
    try {
      // FIXED: Pass userSessionId as the second parameter
      await LoveRoomAPI.resetCode(generatedCode, userSessionId);
      showNotification('🔄 Code reset • Create new love connection');
    } catch (error) {
      console.log('API reset failed:', error.message);
      showNotification('🔄 Code reset • Create new love connection');
    } finally {
      setIsLoading(false);
    }
    
    setLocalRooms(prev => {
      const newRooms = { ...prev };
      delete newRooms[generatedCode];
      return newRooms;
    });
  }
  
  resetCodeData();
};

  useEffect(() => {
    return () => {
      cleanupConnections();
    };
  }, []);

  // Security event handlers
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && e.shiftKey && e.key === 'S') ||
          (e.metaKey && e.shiftKey && e.key === '3') ||
          (e.metaKey && e.shiftKey && e.key === '4')) {
        e.preventDefault();
        showNotification('💕 Our moments are precious • Love protected');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Connection status display helper
  const getConnectionStatusDisplay = () => {
    if (connectionMethod === 'websocket') {
      return connectionStatus === 'connected' ? '🟢 WebSocket' : '🟡 Connecting...';
    } else if (connectionMethod === 'polling') {
      return connectionStatus === 'connected' ? '🟢 Polling' : '🟡 Connecting...';
    }
    return '🔴 Disconnected';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-950 text-pink-400 font-mono relative overflow-hidden">
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern animate-matrix-move"></div>
      </div>
      
      {onNavigateHome && (
        <button
          onClick={onNavigateHome}
          className="fixed top-4 left-4 z-50 px-3 py-2 md:px-4 md:py-2 bg-gray-800/80 border border-pink-400 rounded-lg text-pink-400 hover:bg-pink-400/10 transition-all duration-300 text-sm md:text-base"
        >
          ← Back
        </button>
      )}
      
      {/* Connection Status Indicator - Mobile Optimized */}
      {isWaitingForPartner && (
        <div className="fixed top-4 right-4 z-50 bg-pink-900/20 border-2 border-pink-400 rounded-lg px-3 py-2 md:px-4 md:py-3 text-pink-400 text-xs md:text-sm max-w-[200px] md:max-w-none">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse w-2 h-2 bg-pink-400 rounded-full"></div>
            <span className="truncate">Waiting for love...</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {getConnectionStatusDisplay()}
          </div>
        </div>
      )}
      
      {/* Notifications - Mobile Optimized */}
      <div className="fixed top-4 right-4 z-50 space-y-2" style={{ marginTop: isWaitingForPartner ? '80px' : '0' }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="bg-pink-900/20 border-2 border-pink-400 rounded-lg px-3 py-2 md:px-4 md:py-3 text-pink-400 text-xs md:text-sm animate-slide-in max-w-[280px] md:max-w-sm"
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 relative z-10">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-pink-400 mb-4 tracking-wider animate-glow-pulse">
            LOVEVAULT
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8">Private • Romantic • Auto-Connect</p>
        </header>
        
        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-1 lg:grid-cols-2 md:gap-8 mt-8 md:mt-12">
          {/* Create Love Room - Mobile First Design */}
          <div className="group bg-gradient-to-br from-pink-900/20 to-pink-800/10 border-2 border-pink-400 rounded-2xl p-6 md:p-8 text-center relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <div className="text-5xl md:text-6xl mb-4 md:mb-6 animate-float">💝</div>
              <h3 className="text-xl md:text-2xl font-bold text-pink-400 mb-3 md:mb-4 uppercase tracking-wider">
                Create Love Room
              </h3>
              <p className="text-gray-300 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                Generate a secure code. When your love joins, you'll both auto-redirect to chat!
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={generateCode}
                  disabled={isLoading}
                  className={`w-full bg-gradient-to-r from-pink-400 to-rose-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg uppercase tracking-wider transition-all duration-300 ${
                    isLoading 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:from-pink-300 hover:to-rose-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-400/50'
                  }`}
                >
                  {isLoading ? 'Creating...' : 'Create Love Code'}
                </button>
                
                {generatedCode && isCodeActive && (
                  <button
                    onClick={resetCode}
                    disabled={isLoading} 

                    className={`w-full bg-gray-600 text-white px-6 py-3 md:px-6 md:py-4 rounded-lg font-bold text-sm md:text-sm uppercase tracking-wider transition-all duration-300 ${
                      isLoading 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-gray-500'
                    }`}
                  >
                    {isLoading ? 'Resetting...' : 'Reset Love Code'}
                  </button>
                )}
              </div>
              
              {generatedCode && isCodeActive && (
                <div className={`mt-6 bg-black/80 border-2 border-pink-400 rounded-lg p-4 md:p-6 text-xl md:text-2xl text-pink-400 tracking-[0.3em] font-bold break-all ${isGlitching ? 'animate-glitch' : ''}`}>
                  {generatedCode}
                  <div className="text-xs md:text-sm text-gray-400 mt-3 normal-case tracking-normal space-y-1">
                    <div>🔒 Share this code privately with your love</div>
                    <div>⚠️ You cannot join your own room</div>
                    <div>⏰ Code expires in 10 minutes</div>
                    {isWaitingForPartner && (
                      <div className="text-pink-300 animate-pulse">
                        💕 Auto-redirect when love joins...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Join Love Room - Mobile First Design */}
          <div className="group bg-gradient-to-br from-pink-900/20 to-pink-800/10 border-2 border-pink-400 rounded-2xl p-6 md:p-8 text-center relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="relative z-10">
              <div className="text-5xl md:text-6xl mb-4 md:mb-6 animate-float">💕</div>
              <h3 className="text-xl md:text-2xl font-bold text-pink-400 mb-3 md:mb-4 uppercase tracking-wider">
                Join Love Room
              </h3>
              <p className="text-gray-300 mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                Enter love code to instantly connect. Both of you will auto-redirect to chat!
              </p>
              
              <div className="space-y-6">
                <input
                  type="text"
                  value={joinCode}
                  onChange={handleJoinCodeChange}
                  placeholder="XXXX-XXXX-XXXX"
                  disabled={isLoading}
                  className={`w-full bg-black/70 border-2 border-pink-400 rounded-lg p-3 md:p-4 text-pink-400 text-lg md:text-xl text-center font-mono tracking-widest focus:outline-none focus:border-pink-300 focus:shadow-lg focus:shadow-pink-400/30 transition-all duration-300 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  maxLength="14"
                />
                
                <button
                  onClick={joinRoom}
                  disabled={joinCode.length < 14 || isLoading}
                  className={`w-full px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-base md:text-lg uppercase tracking-wider transition-all duration-300 ${
                    joinCode.length < 14 || isLoading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-400 to-rose-500 text-white hover:from-pink-300 hover:to-rose-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-400/50'
                  }`}
                >
                  {isLoading ? 'Connecting...' : 'Connect Hearts'}
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mt-4">
                🔒 Secure connection • Auto-redirect enabled
              </div>
            </div>
          </div>
        </div>
        <footer className="text-center mt-16 text-gray-500 text-sm">
          <p>💖 Auto-connect • Real-time love • Hearts synchronized forever 💖</p>
        </footer>
      </div>
    </div>
  );
};

export default SecureRoomPortal;