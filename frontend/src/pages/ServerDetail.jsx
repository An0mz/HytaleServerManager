import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  PlayIcon, 
  StopIcon, 
  ArrowPathIcon,
  XMarkIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import websocket from '../services/websocket';
import Console from '../components/Console';
import ConfigEditor from '../components/ConfigEditor';
import FileManager from '../components/FileManager';
import StatsPanel from '../components/StatsPanel';
import BackupManager from '../components/BackupManager';
import Header from './Header';

export default function ServerDetail() {
  const { id } = useParams();
  const [server, setServer] = useState(null);
  const [activeTab, setActiveTab] = useState('console');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [rememberAuth, setRememberAuth] = useState(true);
  
  useEffect(() => {
    const ws = websocket.connect();

    const handleMessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'console_output':
          if (message.serverId === parseInt(id)) {
            setConsoleOutput(prev => prev + message.data);
          }
          break;

        case 'server_status_changed':
          if (message.serverId === parseInt(id)) {
            loadServer();
          }
          break;

        case 'server_players_changed':
          if (message.serverId === parseInt(id)) {
            loadServer();
          }
          break;

        // NEW: Auth events
        case 'server_auth_url':
          if (message.serverId === parseInt(id)) {
            setAuthUrl(message.url);
            setAuthModal(true);
          }
          break;

        case 'server_auth_code':
          if (message.serverId === parseInt(id)) {
            setAuthCode(message.code);
          }
          break;

        case 'server_auth_success':
          if (message.serverId === parseInt(id)) {
            // If remember auth is checked, send persistence command
            if (rememberAuth) {
              setTimeout(() => {
                websocket.sendCommand(parseInt(id), '/auth persistence Encrypted');
              }, 1000);
            }
            
            // Close modal after brief delay
            setTimeout(() => {
              setAuthModal(false);
              setAuthUrl('');
              setAuthCode('');
            }, 2000);
          }
          break;
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      try {
        ws.removeEventListener('message', handleMessage);
      } catch (e) {}
    };
  }, [id, rememberAuth]);

  const loadServer = async () => {
    try {
      const response = await api.getServer(id);
      setServer(response.data);
    } catch (error) {
      console.error('Failed to load server:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadServer();
  }, [id]);

  const handleStart = async () => {
    try {
      await api.startServer(id);
      loadServer();
    } catch (error) {
      alert('Failed to start server: ' + error.message);
    }
  };

  const handleStop = async () => {
    try {
      await api.stopServer(id);
      loadServer();
    } catch (error) {
      alert('Failed to stop server: ' + error.message);
    }
  };

  const handleRestart = async () => {
    try {
      await api.restartServer(id);
      loadServer();
    } catch (error) {
      alert('Failed to restart server: ' + error.message);
    }
  };

  const tabs = [
    { id: 'console', name: 'Console' },
    { id: 'config', name: 'Configuration' },
    { id: 'files', name: 'File Manager' },
    { id: 'backups', name: 'Backups' },
    { id: 'stats', name: 'Statistics' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading server...</p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Server not found</p>
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'running': 'text-emerald-400',
      'starting': 'text-yellow-400',
      'stopping': 'text-orange-400',
      'stopped': 'text-gray-400'
    };
    return colors[status] || colors.stopped;
  };

  const getStatusLabel = (status) => {
    if (status === 'running') return 'Online';
    if (status === 'starting') return 'Starting';
    if (status === 'stopping') return 'Shutting down';
    return 'Stopped';
  };

  return (
      <>
    <Header />
      <div className="min-h-screen p-6">
        {/* Auth Modal */}
        {authModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-cyan-500/30 max-w-2xl w-full p-6 relative">
              <button
                onClick={() => setAuthModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                🔐 Server Authentication Required
              </h2>
              
              <div className="space-y-6">
                {/* URL */}
                {authUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Authorization URL:
                    </label>
                    <div className="flex gap-2">
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-cyan-400 hover:text-cyan-300 break-all"
                      >
                        {authUrl}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(authUrl);
                          alert('Copied!');
                        }}
                        className="btn-secondary"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Code */}
                {authCode && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Authorization Code:
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-6 py-4 bg-gray-800 rounded-lg text-3xl font-mono text-center text-cyan-400">
                        {authCode}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(authCode);
                          alert('Copied!');
                        }}
                        className="btn-secondary"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Remember Auth Checkbox */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberAuth}
                      onChange={(e) => setRememberAuth(e.target.checked)}
                      className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-gray-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-white">Remember Authentication</div>
                      <p className="text-sm text-gray-400 mt-1">
                        Automatically run <code className="text-cyan-400">/auth persistence Encrypted</code> to save authentication for future restarts. You won't need to authorize again.
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">📋 Instructions:</h3>
                  <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside">
                    <li>Click the URL above to open it in a new tab</li>
                    <li>Login with your Hytale account</li>
                    <li>Enter the authorization code: <span className="font-mono text-cyan-400">{authCode}</span></li>
                    <li>Authorize the server</li>
                    <li>This window will close automatically when complete</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="card mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  to="/" 
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">{server.name}</h1>
                  <p className="text-sm text-gray-400">
                    Port {server.port} • Status: <span className={`capitalize font-semibold ${getStatusColor(server.status)}`}>{getStatusLabel(server.status)}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {server.status === 'stopped' ? (
                  <button
                    onClick={handleStart}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span>Start</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleStop}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <StopIcon className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                    <button
                      onClick={handleRestart}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      <span>Restart</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-gray-700/50">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'console' && <Console serverId={id} serverStatus={server.status} output={consoleOutput} />}
          {activeTab === 'config' && (
            <ConfigEditor
              serverId={id}
              onSaved={(newConfig) => {
                if (newConfig && newConfig.ServerName) {
                  setServer(prev => ({ ...prev, name: newConfig.ServerName }));
                }
              }}
            />
          )}
          {activeTab === 'files' && <FileManager serverId={id} />}
          {activeTab === 'backups' && <BackupManager serverId={id} />}
          {activeTab === 'stats' && <StatsPanel serverId={id} serverStatus={server.status} />}
        </div>
      </div>
    </>
  );
}
