import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import websocket from '../services/websocket';

export default function Console({ serverId, serverStatus }) {
  const [output, setOutput] = useState([]);
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);

  useEffect(() => {
    setOutput([]);
    
    // Subscribe with retry logic
    const subscribeAttempts = [0];
    const attemptSubscribe = () => {
      if (websocket.isConnectedAndAuthenticated && websocket.isConnectedAndAuthenticated()) {
        console.log(`📡 Subscribing to console for server ${serverId}`);
        websocket.subscribeToConsole(parseInt(serverId));
      } else if (subscribeAttempts[0] < 10) {
        subscribeAttempts[0]++;
        console.log(`⏳ WebSocket not ready yet (attempt ${subscribeAttempts[0]}/10), retrying...`);
        setTimeout(attemptSubscribe, 300);
      } else {
        console.error('❌ Failed to subscribe to console after 10 attempts');
      }
    };
    
    attemptSubscribe();

    const unsubscribeHistory = websocket.on('console_history', (data) => {
      if (data.serverId === parseInt(serverId)) {
        setOutput([data.data]);
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }, 10);
      }
    });

    const unsubscribe = websocket.on('console_output', (data) => {
      if (data.serverId === parseInt(serverId)) {
        setOutput((prev) => [...prev, data.data]);
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }, 10);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeHistory();
    };
  }, [serverId]);

  const handleSendCommand = () => {
    if (!command.trim()) return;
    
    console.log(`📤 Sending command: ${command}`);
    console.log(`WebSocket state:`, {
      connected: websocket.ws ? 'yes' : 'no',
      readyState: websocket.ws?.readyState,
      authenticated: websocket.isAuthenticated
    });
    
    websocket.sendCommand(parseInt(serverId), command);
    setOutput((prev) => [...prev, `> ${command}\n`]);
    setCommandHistory((prev) => [command, ...prev]);
    setCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700/50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Server Console</span>
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (outputRef.current) {
                  outputRef.current.scrollTop = outputRef.current.scrollHeight;
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all text-sm flex items-center space-x-1.5"
              title="Scroll to bottom"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Scroll</span>
            </button>
            <button
              onClick={() => setOutput([])}
              className="px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all text-sm flex items-center space-x-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Console Output */}
      <div className="p-6 bg-gray-900/50">
        <div
          ref={outputRef}
          className="console-output p-4 h-[600px] overflow-y-auto"
        >
          {output.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-flex p-4 bg-gray-800 rounded-2xl mb-4">
                  <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">
                  {serverStatus === 'running' 
                    ? 'Waiting for console output...' 
                    : 'Start the server to see console output'}
                </p>
              </div>
            </div>
          ) : (
            output.map((line, index) => (
              <div key={index} className="leading-relaxed">{line}</div>
            ))
          )}
        </div>

        {/* Command Input */}
        <div className="mt-4 flex space-x-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={serverStatus !== 'running'}
              placeholder={serverStatus === 'running' ? 'Type a command... (↑↓ for history)' : 'Server must be running'}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/80 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSendCommand}
            disabled={serverStatus !== 'running' || !command.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-cyan-500/25"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            <span>Send</span>
          </button>
        </div>

        {/* Command History Indicator */}
        {commandHistory.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {commandHistory.length} command{commandHistory.length !== 1 ? 's' : ''} in history • Use ↑↓ to navigate
          </p>
        )}
      </div>
    </div>
  );
}
