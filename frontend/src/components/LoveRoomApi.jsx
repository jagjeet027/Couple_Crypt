const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
const WS_BASE_URL = `${import.meta.env.VITE_BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws`;

class LoveRoomAPI {
  // Check if server is available
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

  // Generic API call helper with improved error handling
  static async apiCall(endpoint, options = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

        // Specific error handling
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
        console.error('API call timed out:', endpoint);
        throw new Error('Request timed out');
      }
      
      console.error(`API call failed [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Generate love room code with retry logic
  static async generateCode(userId, retries = 2) {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`Generating code for user: ${userId} (attempt ${attempt})`);
        
        const response = await this.apiCall('/love-room/generate', {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        
        console.log('Code generation successful:', response);
        return response;
      } catch (error) {
        console.warn(`Code generation attempt ${attempt} failed:`, error.message);
        
        if (attempt <= retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  // Join love room with validation
  static async joinRoom(code, userId) {
    if (!code || !userId) {
      throw new Error('Room code and user ID are required');
    }

    try {
      console.log(`Joining room: ${code} with user: ${userId}`);
      
      const response = await this.apiCall('/love-room/join', {
        method: 'POST',
        body: JSON.stringify({ code: code.toUpperCase(), userId }),
      });
      
      console.log('Room join successful:', response);
      return response;
    } catch (error) {
      console.warn('Room join failed:', error.message);
      throw error;
    }
  }

  // Reset love room code
  static async resetCode(code) {
    if (!code) {
      throw new Error('Room code is required');
    }

    try {
      console.log(`Resetting room: ${code}`);
      
      const response = await this.apiCall(`/love-room/reset/${code.toUpperCase()}`, {
        method: 'DELETE',
      });
      
      console.log('Room reset successful:', response);
      return response;
    } catch (error) {
      console.warn('Room reset failed:', error.message);
      throw error;
    }
  }

  // Get room status with caching
  static async getRoomStatus(roomCode) {
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    try {
      const response = await this.apiCall(`/love-room/status/${roomCode.toUpperCase()}`);
      return response;
    } catch (error) {
      // Don't log 404 errors as warnings since they're expected for non-existent rooms
      if (error.message !== 'Room not found') {
        console.warn('Room status check failed:', error.message);
      }
      throw error;
    }
  }

  // Enhanced WebSocket connection with reconnection logic
  static createWebSocket(roomCode, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      onConnect = () => {},
      onDisconnect = () => {},
      onError = () => {},
      onMessage = () => {}
    } = options;

    let retryCount = 0;
    let ws = null;

    const connect = () => {
      const wsUrl = `${WS_BASE_URL}/love-room/${roomCode.toUpperCase()}`;
      console.log(`Attempting WebSocket connection to: ${wsUrl}`);
      
      ws = new WebSocket(wsUrl);

      ws.onopen = (event) => {
        console.log('WebSocket connected successfully');
        retryCount = 0; // Reset retry count on successful connection
        onConnect(event);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        onDisconnect(event);

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && retryCount < maxRetries) {
          retryCount++;
          console.log(`Reconnecting in ${retryDelay}ms... (attempt ${retryCount}/${maxRetries})`);
          setTimeout(connect, retryDelay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError(error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (parseError) {
          console.warn('Failed to parse WebSocket message:', event.data);
          onMessage(event.data);
        }
      };
    };

    connect();

    // Return object with connection control methods
    return {
      get socket() { return ws; },
      get readyState() { return ws ? ws.readyState : WebSocket.CLOSED; },
      send: (data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
          console.warn('WebSocket is not connected, cannot send data');
        }
      },
      close: () => {
        if (ws) {
          ws.close(1000, 'Manual close');
        }
      },
      reconnect: () => {
        if (ws) {
          ws.close();
        }
        retryCount = 0;
        connect();
      }
    };
  }

  // Utility method to test all endpoints
  static async testConnection() {
    const results = {
      serverHealth: false,
      endpoints: {}
    };

    // Test server health
    results.serverHealth = await this.checkServerHealth();

    if (!results.serverHealth) {
      console.warn('Server is not responding to health checks');
      return results;
    }

    // Test individual endpoints
    const testEndpoints = [
      { name: 'generateCode', method: () => this.generateCode('test-user') },
      { name: 'getRoomStatus', method: () => this.getRoomStatus('TEST-ROOM') },
    ];

    for (const test of testEndpoints) {
      try {
        await test.method();
        results.endpoints[test.name] = 'success';
      } catch (error) {
        results.endpoints[test.name] = error.message;
      }
    }

    return results;
  }
}

export default LoveRoomAPI;