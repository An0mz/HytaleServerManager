import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import ConfirmModal from './ConfirmModal';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function FileManager({ serverId, serverStatus }) {
  const { theme } = useTheme();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, filePath: '', fileName: '', isFolder: false });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Get current path from URL
  const currentPath = searchParams.get('path') || '';

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  // Add global drag end listener to catch cancelled drags
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDraggingOver(false);
    };

    const handleGlobalDrop = () => {
      setIsDraggingOver(false);
    };

    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await api.listFiles(serverId, currentPath);
      const rawFiles = response.data.files || [];
      
      const sortedFiles = rawFiles.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      
      setFiles(sortedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    // Update URL search params to track folder navigation
    if (path) {
      setSearchParams({ path });
    } else {
      setSearchParams({});
    }
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
      toast.success('Files uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload: ' + error.message);
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
      toast.error('Failed to download: ' + error.message);
    }
  };

  const handleDelete = async (filePath, fileName, isFolder) => {
    setDeleteModal({ isOpen: true, filePath, fileName, isFolder });
  };

  const confirmDelete = async () => {
    try {
      await api.deleteFile(serverId, deleteModal.filePath);
      await loadFiles();
      toast.success('File deleted successfully');
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const handleView = (filePath) => {
    setSelectedFile(filePath);
  };

  const handleDragStart = (e, file) => {
    setDraggedItem(file);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', file.path);
  };

  const handleDragEnd = (e) => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, file) => {
    e.preventDefault();
    
    // Only allow dropping on folders
    if (file.isDirectory && draggedItem && file.path !== draggedItem.path) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(file.path);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if we're actually leaving the element
    if (e.currentTarget === e.target) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDropTarget(null);
    
    if (!draggedItem || !targetFolder.isDirectory) {
      return;
    }

    // Prevent dropping a folder into itself
    if (draggedItem.path === targetFolder.path) {
      toast.error('Cannot move a folder into itself');
      return;
    }

    // Prevent dropping a parent folder into its child
    if (targetFolder.path.startsWith(draggedItem.path + '/')) {
      toast.error('Cannot move a folder into its own subfolder');
      return;
    }

    try {
      const sourcePath = draggedItem.path;
      const fileName = draggedItem.name;
      const destinationPath = targetFolder.path + '/' + fileName;

      await api.moveFile(serverId, sourcePath, destinationPath);
      await loadFiles();
      toast.success(`Moved ${fileName} to ${targetFolder.name}`);
    } catch (error) {
      toast.error('Failed to move: ' + (error.response?.data?.error || error.message));
    } finally {
      setDraggedItem(null);
    }
  };

  // Handle file drops from OS (external files)
  const handleFileDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOver(true);
    }
  };

  const handleFileDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're actually leaving the drop zone (not just entering a child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDraggingOver(false);
    }
  };

  const handleFilesDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles || droppedFiles.length === 0) return;

    try {
      setUploading(true);
      const formData = new FormData();
      droppedFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.uploadFile(serverId, currentPath, formData);
      await loadFiles();
      toast.success(`Uploaded ${droppedFiles.length} file(s) successfully`);
    } catch (error) {
      toast.error('Failed to upload: ' + error.message);
    } finally {
      setUploading(false);
    }
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
      <div className={`${theme.card} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 ${theme.bgSecondary} border-b ${theme.border}`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>File Manager</h3>
              
              {/* Breadcrumbs */}
              <div className="flex items-center space-x-2 text-sm">
                <button
                  onClick={() => handleNavigate('')}
                  className={`${theme.accentText} hover:text-cyan-300 transition-colors font-medium`}
                >
                  Root
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className={theme.textSecondary}>/</span>
                    <button
                      onClick={() => handleNavigate(breadcrumbs.slice(0, index + 1).join('/'))}
                      className={`${theme.accentText} hover:text-cyan-300 transition-colors font-medium`}
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
        <div 
          className="p-6 min-h-[400px] relative"
          onDragEnter={handleFileDragEnter}
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFilesDrop}
        >
          {/* Drag overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-50 bg-cyan-500/20 border-4 border-dashed border-cyan-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <ArrowUpTrayIcon className="h-16 w-16 text-cyan-400 mx-auto mb-4 animate-bounce" />
                <p className={`text-xl font-semibold ${theme.text}`}>Drop files here to upload</p>
                <p className={`text-sm ${theme.textSecondary} mt-2`}>Release to upload to current directory</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpenIcon className={`h-16 w-16 ${theme.textSecondary} mx-auto mb-4`} />
              <p className={theme.textSecondary}>No files in this directory</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => file.isDirectory && handleDragOver(e, file)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => file.isDirectory && handleDrop(e, file)}
                  onClick={() => file.isDirectory && handleNavigate(file.path)}
                  className={`flex items-center justify-between p-4 ${theme.bgSecondary} hover:${theme.bgTertiary} rounded-xl border ${theme.border} transition-all group ${
                    draggedItem?.path === file.path ? 'opacity-50 cursor-grabbing' : file.isDirectory ? 'cursor-pointer' : 'cursor-grab'
                  } ${dropTarget === file.path ? 'ring-2 ring-cyan-500 bg-cyan-500/10 scale-[1.02]' : ''}`}
                  title={file.isDirectory ? 'Click to open, drag to move' : 'Drag to move to a folder'}
                >
                  <div className={`flex items-center space-x-3 flex-1 min-w-0 ${file.isDirectory ? '' : 'pointer-events-none'}`}>
                    {file.isDirectory ? (
                      <>
                        <FolderIcon className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                        <span className={`${theme.text} font-medium truncate`}>
                          {file.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl flex-shrink-0">{getFileIcon(file.name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`${theme.text} font-medium truncate`}>{file.name}</p>
                          <p className={`text-xs ${theme.textSecondary}`}>
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pointer-events-auto">
                    {!file.isDirectory ? (
                      <>
                        {canView(file.name) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(file.path);
                            }}
                            className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all opacity-0 group-hover:opacity-100"
                            title="View/Edit"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.path);
                          }}
                          className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all opacity-0 group-hover:opacity-100"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.path, file.name, file.isDirectory);
                      }}
                      disabled={serverStatus === 'running'}
                      className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                        serverStatus === 'running'
                          ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                      }`}
                      title={serverStatus === 'running' ? 'Cannot delete while server is running' : file.isDirectory ? 'Delete Folder' : 'Delete'}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, filePath: '', fileName: '', isFolder: false })}
        onConfirm={confirmDelete}
        title={deleteModal.isFolder ? "Delete Folder" : "Delete File"}
        message={deleteModal.isFolder 
          ? `Are you sure you want to delete the folder "${deleteModal.fileName}" and all its contents? This action cannot be undone.`
          : `Are you sure you want to delete "${deleteModal.fileName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        warning={serverStatus === 'running' ? '⚠️ WARNING: The server is currently running! Deleting while the server is running may cause issues or require a restart.' : null}
      />
    </>
  );
}
