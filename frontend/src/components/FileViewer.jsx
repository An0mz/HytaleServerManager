import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  DocumentTextIcon, 
  CodeBracketIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import * as api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function FileViewer({ serverId, filePath, onClose }) {
  const { theme } = useTheme();
  const toast = useToast();
  const [content, setContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isJson = filePath.endsWith('.json');
  const isLog = filePath.endsWith('.log') || filePath.endsWith('.txt');

  useEffect(() => {
    loadFile();
  }, [filePath]);

  const loadFile = async () => {
    try {
      setLoading(true);
      const response = await api.downloadFile(serverId, filePath);
      const text = await response.data.text();
      setContent(text);
      setEditedContent(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (isJson) {
        JSON.parse(editedContent);
      }

      const blob = new Blob([editedContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, filePath.split('/').pop());
      
      await api.uploadFile(serverId, filePath.split('/').slice(0, -1).join('/'), formData);
      
      setContent(editedContent);
      setIsEditing(false);
      toast.success('File saved successfully!');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(editedContent);
      setEditedContent(JSON.stringify(parsed, null, 2));
      toast.success('JSON is valid!');
    } catch (err) {
      toast.error('Invalid JSON: ' + err.message);
    }
  };

  const modalContent = loading ? (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${theme.card} rounded-2xl p-8 max-w-4xl w-full mx-4 border ${theme.border} shadow-2xl`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border ${theme.border} shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.border} ${theme.bgSecondary}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isJson ? (
                <CodeBracketIcon className="h-6 w-6 text-cyan-400" />
              ) : (
                <DocumentTextIcon className="h-6 w-6 text-blue-400" />
              )}
              <div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>{filePath.split('/').pop()}</h3>
                <p className={`text-sm ${theme.textSecondary}`}>{filePath}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  {isJson && (
                    <button
                      onClick={formatJson}
                      className="px-3 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-all text-sm font-medium"
                    >
                      Format JSON
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditedContent(content);
                      setIsEditing(false);
                    }}
                    className={`px-3 py-2 rounded-lg ${theme.bgSecondary} ${theme.textSecondary} hover:${theme.bgTertiary} transition-all flex items-center space-x-2`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDownload}
                    className={`px-3 py-2 rounded-lg ${theme.bgSecondary} ${theme.textSecondary} hover:${theme.bgTertiary} transition-all flex items-center space-x-2`}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`px-3 py-2 rounded-lg ${theme.bgSecondary} ${theme.textSecondary} hover:${theme.bgTertiary} transition-all flex items-center space-x-2`}
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400">
              Error: {error}
            </div>
          ) : isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className={`w-full h-full min-h-[600px] ${theme.bgSecondary} ${theme.text} font-mono text-sm p-4 rounded-lg border ${theme.border} focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none`}
              spellCheck="false"
            />
          ) : (
            <pre className={`${theme.bgTertiary} ${theme.text} font-mono text-sm p-4 rounded-lg overflow-auto border ${theme.border} max-h-[600px]`}>
              {isJson ? (
                <code className="language-json">{JSON.stringify(JSON.parse(content), null, 2)}</code>
              ) : (
                <code>{content}</code>
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}