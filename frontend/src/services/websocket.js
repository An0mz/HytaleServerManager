class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isAuthenticated = false;
  }

  getTokenFromCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return value;
      }
    }
    return null;
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
        const port = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_PORT) || 3000;
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
      console.info('WebSocket connected to', wsUrl);
      this.reconnectAttempts = 0;

      const token = this.getTokenFromCookie();
      if (token) {
        this.send({
          type: 'authenticate',
          token: token
        });
      } else {
        console.warn('No authentication token found');
      }
      
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