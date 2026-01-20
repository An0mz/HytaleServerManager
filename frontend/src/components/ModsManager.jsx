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

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.jar') && !file.name.endsWith('.zip')) {
      toast.error('Only .jar and .zip files are allowed');
      return;
    }

    // Validate file size (200MB max)
    if (file.size > 200 * 1024 * 1024) {
      toast.error('File size must be less than 200MB');
      return;
    }

    try {
      setUploading(true);
      await api.uploadMod(serverId, file);
      toast.success(`Mod "${file.name}" uploaded successfully`);
      loadMods();
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Failed to upload mod:', error);
      toast.error(error.response?.data?.error || 'Failed to upload mod');
    } finally {
      setUploading(false);
    }
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
            <div>
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
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-9 px-3 cursor-pointer ${(uploading || serverStatus === 'running') ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Mod'}
              </label>
            </div>
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-12">
            <File className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 mb-4">No mods installed</p>
            <p className="text-sm text-gray-400">
              Upload .jar or .zip mod files to get started
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

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> Server must be restarted for mod changes to take effect.
            Maximum file size: 200MB. Supported formats: .jar, .zip
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
