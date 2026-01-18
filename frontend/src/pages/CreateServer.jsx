import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {  ArrowLeftIcon, CloudArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon, 
  XMarkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import * as api from '../services/api';
import WebSocketService from '../services/websocket';

export default function CreateServer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    port: 5520,
    maxPlayers: 100,
    maxViewRadius: 12,
    jvmArgs: '-Xms2G -Xmx4G -XX:+UseG1GC'
  });
  const [files, setFiles] = useState({ jar: null, assets: null });
  const [useDownloader, setUseDownloader] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({ checking: true, ready: false });
  const [wsStatus, setWsStatus] = useState({ connected: false, authenticated: false });
  
  // OAuth Download State
  const [downloading, setDownloading] = useState(false);
  const [oauthModal, setOauthModal] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthCode, setOauthCode] = useState('');
  const [downloadProgress, setDownloadProgress] = useState([]);

  useEffect(() => {
    checkCacheStatus();
    
    // Set up WebSocket for OAuth download
    const ws = WebSocketService.connect();

    if (ws) {
      // Track connection/auth status
      const statusCheckInterval = setInterval(() => {
        setWsStatus({
          connected: ws.readyState === WebSocket.OPEN,
          authenticated: WebSocketService.isAuthenticated
        });
      }, 200);

      ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        
        // Update status when authenticated
        if (message.type === 'authenticated') {
          setWsStatus({ connected: true, authenticated: true });
        }
        
        switch (message.type) {
          case 'hytale_oauth_url':
            setOauthUrl(message.data);
            setOauthModal(true);
            break;
            
          case 'hytale_oauth_code':
            setOauthCode(message.data);
            break;
            
          case 'hytale_progress':
            setDownloadProgress(prev => [...prev, message.data]);
            break;
            
          case 'hytale_complete':
            setDownloading(false);
            setOauthModal(false);
                
            // Wait a bit for files to finish copying
            setTimeout(() => {
              checkCacheStatus();
            }, 1000);
            
            alert('✅ Download complete! Cache is ready.');
            break;
            
          case 'hytale_failed':
            setDownloading(false);
            setOauthModal(false);
            alert('❌ Download failed: ' + message.data);
            break;
        }
      });

      return () => {
        clearInterval(statusCheckInterval);
        try { ws.close(); } catch (e) {}
      };
    } else {
      console.warn('WebSocket not available for OAuth flow');
    }
  }, []);

  const checkCacheStatus = async () => {
    setCacheStatus(prev => ({ ...prev, checking: true }));
    try {
      const response = await api.checkHytaleCache();
      setCacheStatus({
        checking: false,
        ready: response.data.success,
        message: response.data.message,
        files: response.data.files
      });
    } catch (error) {
      setCacheStatus({
        checking: false,
        ready: false,
        message: 'Could not check cache status'
      });
    }
  };

  const handleStartDownload = () => {
    setDownloading(true);
    setDownloadProgress([]);
    setOauthUrl('');
    setOauthCode('');
    
    console.log('Download button clicked');
    console.log('WebSocket state:', {
      connected: WebSocketService.ws ? 'yes' : 'no',
      readyState: WebSocketService.ws?.readyState,
      isAuthenticated: WebSocketService.isAuthenticated,
      isConnectedAndAuthenticated: WebSocketService.isConnectedAndAuthenticated()
    });

    const attemptDownload = (retryCount = 0) => {
      if (WebSocketService.isConnectedAndAuthenticated()) {
        console.log('✅ WebSocket ready, sending download command');
        WebSocketService.send({ type: 'start_hytale_download' });
      } else if (retryCount < 5) {
        console.log(`⏳ Waiting for WebSocket auth (retry ${retryCount + 1}/5)...`);
        setTimeout(() => attemptDownload(retryCount + 1), 500);
      } else {
        console.error('❌ WebSocket failed to authenticate after 5 retries');
        setDownloading(false);
        alert('WebSocket connection not ready. Please refresh the page and try again.');
      }
    };

    attemptDownload();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, type) => {
    setFiles({ ...files, [type]: e.target.files[0] });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert('Server name is required');
      return false;
    }
    if (formData.port < 1024 || formData.port > 65535) {
      alert('Port must be between 1024 and 65535');
      return false;
    }
    if (useDownloader && !cacheStatus.ready) {
      alert('Please download Hytale files first or upload manually');
      return false;
    }
    if (!useDownloader && (!files.jar || !files.assets)) {
      alert('Please upload both HytaleServer.jar and Assets.zip');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setCreating(true);

    try {
      const jvmArgsArray = formData.jvmArgs.split(' ').filter(arg => arg.trim());
      const response = await api.createServer({
        name: formData.name,
        port: parseInt(formData.port),
        maxPlayers: parseInt(formData.maxPlayers),
        maxViewRadius: parseInt(formData.maxViewRadius),
        jvmArgs: jvmArgsArray,
        useDownloader
      });

      const serverId = response.data.id;

      if (!useDownloader && (files.jar || files.assets)) {
        const uploadFiles = [];
        if (files.jar) uploadFiles.push(files.jar);
        if (files.assets) uploadFiles.push(files.assets);
        await api.uploadFiles(serverId, uploadFiles);
      }

      setTimeout(() => navigate(`/server/${serverId}`), 500);
    } catch (error) {
      console.error('Create server failed', error);
      let serverMsg = error.message;
      if (error.response) {
        try {
          // Prefer `error` or `message` fields from backend JSON
          serverMsg = (error.response.data && (error.response.data.error || error.response.data.message)) || error.response.statusText || error.message;
        } catch (e) {
          serverMsg = error.message;
        }
      }
      alert('Create server failed: ' + serverMsg);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="card mb-6">
          <div className="px-6 py-4 flex items-center space-x-4">
            <Link to="/" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Create New Server</h1>
          </div>
        </div>

        {/* OAuth Modal */}
        {oauthModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-cyan-500/30 max-w-2xl w-full p-6 relative">
              <button
                onClick={() => setOauthModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                🔐 Hytale OAuth Authorization
              </h2>
              
              <div className="space-y-6">
                {/* URL */}
                {oauthUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Authorization URL:
                    </label>
                    <div className="flex gap-2">
                      <a
                        href={oauthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-cyan-400 hover:text-cyan-300 break-all"
                      >
                        {oauthUrl}
                      </a>
                      <button
                        onClick={() => copyToClipboard(oauthUrl)}
                        className="btn-secondary"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Code */}
                {oauthCode && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Authorization Code:
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-6 py-4 bg-gray-800 rounded-lg text-3xl font-mono text-center text-cyan-400">
                        {oauthCode}
                      </div>
                      <button
                        onClick={() => copyToClipboard(oauthCode)}
                        className="btn-secondary"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-400 mb-2">📋 Instructions:</h3>
                  <ol className="space-y-1 text-gray-300 text-sm list-decimal list-inside">
                    <li>Click the URL above to open it in a new tab</li>
                    <li>Login with your Hytale account</li>
                    <li>Enter the authorization code: <span className="font-mono text-cyan-400">{oauthCode}</span></li>
                    <li>Authorize the application</li>
                    <li>Wait for download to complete (this window will close automatically)</li>
                  </ol>
                </div>
                
                {/* Progress Log */}
                {downloadProgress.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <h4 className="font-semibold text-gray-300 mb-2">Download Progress:</h4>
                    <div className="font-mono text-xs text-gray-400 space-y-1">
                      {downloadProgress.slice(-10).map((msg, i) => (
                        <div key={i}>{msg}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cache Status Banner */}
        {!cacheStatus.checking && (
          <div className={`card mb-6 p-4 ${
            cacheStatus.ready 
              ? 'bg-emerald-900/20 border-emerald-500/30' 
              : 'bg-yellow-900/20 border-yellow-500/30'
          } border`}>
            <div className="flex items-start space-x-3">
              {cacheStatus.ready ? (
                <CheckCircleIcon className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${cacheStatus.ready ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {cacheStatus.ready ? '✅ Cache Ready!' : '⚠️ Cache Not Ready'}
                </p>
                <p className="text-sm text-gray-300 mt-1">{cacheStatus.message}</p>
                
                {cacheStatus.ready && cacheStatus.files && (
                  <div className="mt-2 text-xs text-gray-400">
                    <div>HytaleServer.jar: {cacheStatus.files.jar.sizeFormatted}</div>
                    <div>Assets.zip: {cacheStatus.files.assets.sizeFormatted}</div>
                  </div>
                )}
                
                {/* WebSocket Status Indicator */}
                <div className="mt-3 text-xs flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${wsStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-400">
                    {wsStatus.connected && wsStatus.authenticated ? '✅ Ready' : wsStatus.connected ? '🔄 Authenticating...' : '❌ Connecting...'}
                  </span>
                </div>
                
                <div className="mt-3 flex gap-2">
                  {!cacheStatus.ready && (
                    <button
                      onClick={handleStartDownload}
                      disabled={downloading}
                      className="btn-primary text-sm flex items-center space-x-2 disabled:opacity-50"
                    >
                      <CloudArrowDownIcon className="h-4 w-4" />
                      <span>{downloading ? 'Downloading...' : 'Start Download'}</span>
                    </button>
                  )}
                  <button
                    onClick={checkCacheStatus}
                    disabled={downloading}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Refresh Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Server Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Server Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="My Hytale Server"
                className="input-modern"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Server Port *
              </label>
              <input
                type="number"
                name="port"
                required
                min="1024"
                max="65535"
                value={formData.port}
                onChange={handleChange}
                className="input-modern"
              />
              <p className="text-xs text-gray-500 mt-1">UDP port (1024-65535)</p>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Max Players
              </label>
              <input
                type="number"
                name="maxPlayers"
                required
                min="1"
                max="1000"
                value={formData.maxPlayers}
                onChange={handleChange}
                className="input-modern"
              />
            </div>

            {/* View Radius */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Max View Radius (chunks)
              </label>
              <input
                type="number"
                name="maxViewRadius"
                required
                min="1"
                max="32"
                value={formData.maxViewRadius}
                onChange={handleChange}
                className="input-modern"
              />
            </div>

            {/* JVM Arguments */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                JVM Arguments
              </label>
              <input
                type="text"
                name="jvmArgs"
                required
                value={formData.jvmArgs}
                onChange={handleChange}
                className="input-modern font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: -Xms2G -Xmx4G -XX:+UseG1GC
              </p>
            </div>

            {/* Hytale Files */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Hytale Server Files</h3>
              
              {/* Auto Download Option */}
              <div className={`rounded-xl p-4 mb-4 border ${
                cacheStatus.ready 
                  ? 'bg-cyan-500/10 border-cyan-500/30' 
                  : 'bg-gray-700/20 border-gray-600/30'
              }`}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDownloader}
                    onChange={(e) => setUseDownloader(e.target.checked)}
                    disabled={!cacheStatus.ready}
                    className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-gray-600 rounded disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CloudArrowDownIcon className="h-5 w-5 text-cyan-400" />
                      <span className="font-semibold text-white">Use Cached Files</span>
                      {cacheStatus.ready && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                          ⚡ Instant
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {cacheStatus.ready 
                        ? 'Server files will be copied from cache (takes 2-5 seconds)'
                        : 'Cache not ready - click "Start Download" above or use manual upload below'
                      }
                    </p>
                  </div>
                </label>
              </div>

              {/* Manual Upload */}
              {!useDownloader && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      HytaleServer.jar *
                    </label>
                    <input
                      type="file"
                      accept=".jar"
                      onChange={(e) => handleFileChange(e, 'jar')}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Assets.zip *
                    </label>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => handleFileChange(e, 'assets')}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Link
                to="/"
                className="btn-secondary flex-1 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={creating || downloading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Server'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
