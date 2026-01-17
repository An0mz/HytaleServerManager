class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect() {
    // Avoid creating multiple simultaneous connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.ws;
    }

    // Determine WebSocket URL: prefer env var, then same-host with port, then localhost fallback
    let wsUrl = null;
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_URL) {
      wsUrl = process.env.REACT_APP_WS_URL;
    } else {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname || 'localhost';
        const port = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_PORT)
          || 3000;
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
      this.notifyListeners('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Avoid noisy logging in production; enable with VITE_WS_DEBUG=true
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
      this.notifyListeners('disconnected', event);
      this.attemptReconnect();
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error event:', event);
      // Close socket to trigger reconnect flow
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
    this.send({
      type: 'send_command',
      serverId,
      command
    });
  }

  requestStats(serverId) {
    this.send({
      type: 'get_stats',
      serverId
    });
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Return unsubscribe function
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
    }
  }

  getConnection() {
    return this.ws;
  }
}

export default new WebSocketService();
