import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  FolderOpenIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import FileViewer from './FileViewer';

export default function FileManager({ serverId }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await api.listFiles(serverId, currentPath);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    setCurrentPath(path);
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      await api.uploadFile(serverId, currentPath, formData);
      await loadFiles();
      e.target.value = '';
    } catch (error) {
      alert('Failed to upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filePath) => {
    try {
      const response = await api.downloadFile(serverId, filePath);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop();
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download: ' + error.message);
    }
  };

  const handleDelete = async (filePath) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.deleteFile(serverId, filePath);
      await loadFiles();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleView = (filePath) => {
    setSelectedFile(filePath);
  };

  const canView = (filename) => {
    return filename.endsWith('.json') || 
           filename.endsWith('.log') || 
           filename.endsWith('.txt') ||
           filename.endsWith('.yml') ||
           filename.endsWith('.yaml');
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith('.json')) {
      return '📄';
    } else if (filename.endsWith('.log') || filename.endsWith('.txt')) {
      return '📋';
    } else if (filename.endsWith('.jar')) {
      return '☕';
    } else if (filename.endsWith('.zip')) {
      return '🗜️';
    }
    return '📄';
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b border-gray-700/50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">File Manager</h3>
              
              {/* Breadcrumbs */}
              <div className="flex items-center space-x-2 text-sm">
                <button
                  onClick={() => setCurrentPath('')}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  Root
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className="text-gray-600">/</span>
                    <button
                      onClick={() => setCurrentPath(breadcrumbs.slice(0, index + 1).join('/'))}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      {crumb}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <label className="btn-primary cursor-pointer flex items-center space-x-2">
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* File List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpenIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No files in this directory</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/50 rounded-xl border border-gray-700/30 transition-all group"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {file.isDirectory ? (
                      <>
                        <FolderIcon className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                        <button
                          onClick={() => handleNavigate(file.path)}
                          className="text-white hover:text-cyan-400 transition-colors font-medium truncate"
                        >
                          {file.name}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl flex-shrink-0">{getFileIcon(file.name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {!file.isDirectory && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canView(file.name) && (
                        <button
                          onClick={() => handleView(file.path)}
                          className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all"
                          title="View/Edit"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(file.path)}
                        className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.path)}
                        className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <FileViewer
          serverId={serverId}
          filePath={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
}
