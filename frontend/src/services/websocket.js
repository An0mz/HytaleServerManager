class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isAuthenticated = false;
    this.authToken = null; // Store token in memory
  }

  // Call this from the Login component after successful login
  setAuthToken(token) {
    this.authToken = token;
    console.log('✅ Auth token set in WebSocketService');
    // If already connected, authenticate now
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.authenticate();
    }
  }

  getAuthToken() {
    return this.authToken;
  }

  getTokenFromCookie() {
    // Try to get from memory first
    if (this.authToken) {
      console.log('Token found in memory');
      return this.authToken;
    }
    
    // Try localStorage as fallback
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      console.log('Token found in localStorage');
      this.authToken = storedToken;
      return storedToken;
    }
    
    console.log('No token found');
    return null;
  }

  authenticate() {
    const token = this.getTokenFromCookie();
    if (token && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔑 Sending authentication token to WebSocket');
      this.send({
        type: 'authenticate',
        token: token
      });
    } else {
      if (!token) console.warn('No token available for authentication');
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) console.warn('WebSocket not ready for authentication');
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.ws;
    }

    let wsUrl = null;
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_URL) {
      wsUrl = process.env.REACT_APP_WS_URL;
    } else {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname || 'localhost';
        
        // In development (Vite), connect to backend on port 3000
        // In production, use the same port as the page
        const port = import.meta.env.DEV ? 3000 : (window.location.port || 3000);
        wsUrl = `${proto}://${host}:${port}`;
      } catch (e) {
        wsUrl = 'ws://localhost:3000';
      }
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('WebSocket constructor error for', wsUrl, err);
      this.attemptReconnect();
      return null;
    }

    this.ws.onopen = () => {
      if (import.meta.env.DEV) {
        console.info('WebSocket connected to', wsUrl);
      }
      this.reconnectAttempts = 0;

      // Attempt authentication
      this.authenticate();
      
      this.notifyListeners('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'authenticated') {
          this.isAuthenticated = true;
          console.info('WebSocket authenticated as:', data.user?.username);
        } else if (data.type === 'error' && data.message?.includes('Authentication')) {
          this.isAuthenticated = false;
          console.error('WebSocket authentication failed:', data.message);
        }
        
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_DEBUG === 'true') {
          console.log('WebSocket message:', data);
        }
        
        this.notifyListeners(data.type, data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.warn('WebSocket disconnected', event);
      this.isAuthenticated = false;
      this.notifyListeners('disconnected', event);
      this.attemptReconnect();
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error event:', event);
      try {
        if (this.ws) this.ws.close();
      } catch (e) {}
    };

    return this.ws;
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  subscribeToConsole(serverId) {
    this.send({
      type: 'subscribe_console',
      serverId
    });
  }

  sendCommand(serverId, command) {
    if (!command || typeof command !== 'string') {
      console.error('Invalid command format');
      return;
    }
    
    if (command.trim().length === 0) {
      console.error('Command cannot be empty');
      return;
    }
    
    if (command.length > 1000) {
      console.error('Command too long');
      return;
    }
    
    this.send({
      type: 'send_command',
      serverId,
      command: command.trim()
    });
  }

  requestStats(serverId) {
    this.send({
      type: 'get_stats',
      serverId
    });
  }

  startHytaleDownload() {
    this.send({
      type: 'start_hytale_download'
    });
  }

  cancelHytaleDownload() {
    this.send({
      type: 'cancel_hytale_download'
    });
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    return () => {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  notifyListeners(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isAuthenticated = false;
    }
  }

  getConnection() {
    return this.ws;
  }
  
  isConnectedAndAuthenticated() {
    return this.ws && 
           this.ws.readyState === WebSocket.OPEN && 
           this.isAuthenticated;
  }
}

export default new WebSocketService();