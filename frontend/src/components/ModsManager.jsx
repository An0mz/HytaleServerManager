import React, { useState, useEffect } from 'react';
import { Upload, Trash2, File, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import * as api from '../services/api';
import { toast } from 'sonner';

export default function ModsManager({ serverId, serverName, serverStatus }) {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (serverId) {
      loadMods();
    }
  }, [serverId]);

  const loadMods = async () => {
    try {
      setLoading(true);
      const response = await api.getMods(serverId);
      setMods(response.data);
    } catch (error) {
      console.error('Failed to load mods:', error);
      toast.error('Failed to load mods');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.jar') && !fileName.endsWith('.zip')) {
      toast.error('Only .jar and .zip files are allowed');
      return false;
    }

    // Validate file size (200MB max)
    if (file.size > 200 * 1024 * 1024) {
      toast.error('File size must be less than 200MB');
      return false;
    }

    return true;
  };

  const uploadFile = async (file) => {
    if (!validateFile(file)) return;

    try {
      setUploading(true);
      await api.uploadMod(serverId, file);
      toast.success(`Mod "${file.name}" uploaded successfully`);
      loadMods();
    } catch (error) {
      console.error('Failed to upload mod:', error);
      toast.error(error.response?.data?.error || 'Failed to upload mod');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await uploadFile(file);
    event.target.value = ''; // Reset file input
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (serverStatus === 'running' || uploading) {
      toast.error('Stop the server before uploading mods');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;

    if (files.length > 1) {
      toast.error('Please upload one file at a time');
      return;
    }

    const file = files[0];
    await uploadFile(file);
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await api.deleteMod(serverId, filename);
      toast.success(`Mod "${filename}" deleted successfully`);
      loadMods();
    } catch (error) {
      console.error('Failed to delete mod:', error);
      toast.error('Failed to delete mod');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Server Mods</CardTitle>
            <CardDescription>
              Manage .jar and .zip mod files for {serverName}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMods}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {serverStatus === 'running' && (
          <Alert className="mb-4">
            <AlertDescription>
              Stop the server before uploading or deleting mods.
            </AlertDescription>
          </Alert>
        )}

        {/* Drag and drop overlay */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative"
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-lg backdrop-blur-sm">
              <div className="text-center">
                <Upload className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  Drop mod file here
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  .jar or .zip files only
                </p>
              </div>
            </div>
          )}

          {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-8">
            <File className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-2">No mods installed</p>
            <p className="text-sm text-gray-400">
              Drag & drop or upload .jar or .zip mod files
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {mods.map((mod) => (
                <div
                  key={mod.name}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <File className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mod.name}</p>
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span>{formatFileSize(mod.size)}</span>
                        <span>•</span>
                        <span>{formatDate(mod.modified)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge variant={mod.name.endsWith('.jar') ? 'default' : 'secondary'}>
                      {mod.name.endsWith('.jar') ? 'JAR' : 'ZIP'}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(mod.name)}
                      disabled={serverStatus === 'running'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Server must be restarted for mod changes to take effect.
              Drag & drop or click to upload • Max: 200MB • Formats: .jar, .zip
            </p>
          </div>
          <div className="ml-4">
            <input
              type="file"
              id="mod-upload"
              accept=".jar,.zip"
              onChange={handleUpload}
              disabled={uploading || serverStatus === 'running'}
              className="hidden"
            />
            <label 
              htmlFor="mod-upload" 
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 cursor-pointer ${(uploading || serverStatus === 'running') ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Mod'}
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
