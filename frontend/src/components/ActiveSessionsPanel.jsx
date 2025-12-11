// ============ FRONTEND: ActiveSessionsPanel.jsx (Updated) ============
import React, { useState, useEffect } from 'react';
import { Play, Clock, X, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

export const ActiveSessionsPanel = ({ userData, onResumeSession, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);

  const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

  useEffect(() => {
    fetchActiveSessions();
  }, [userData]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/love-room/sessions/active/${userData.id || userData.email}`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.data?.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (code) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/love-room/sessions/resume/${code}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: userData.id || userData.email })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resume session');
      }

      if (data.success) {
        onResumeSession({
          roomCode: data.data.code,
          isCreator: data.data.creator.userId === (userData.id || userData.email),
          userId: userData.id || userData.email
        });
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to resume session');
      console.error('Error resuming session:', err);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }

    try {
      setDeletingCode(code);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/love-room/sessions/delete/${code}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: userData.id || userData.email })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete session');
      }

      // Remove from local state
      setSessions(sessions.filter(s => s.code !== code));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete session');
      console.error('Error deleting session:', err);
    } finally {
      setDeletingCode(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActiveSessions();
    setRefreshing(false);
  };

  const getPartnerInfo = (session) => {
    const isCreator = session.isCreator;
    if (isCreator) {
      return session.joiner;
    } else {
      return session.creator;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full border border-gray-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Active Sessions</h2>
              <p className="text-gray-400 text-xs">{sessions.length} active chat{sessions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-purple-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Loading sessions...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && sessions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400 text-lg mb-2">No Active Sessions</p>
              <p className="text-gray-500 text-sm">
                Create a new room or join your partner's room to start chatting
              </p>
            </div>
          )}

          {/* Sessions List */}
          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map(session => {
                const partner = getPartnerInfo(session);
                return (
                  <div
                    key={session.code}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-pink-500/50 transition-colors group"
                  >
                    {/* Session Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {/* Room Code */}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-white font-mono text-sm font-bold bg-black/50 px-3 py-1 rounded">
                            {session.code}
                          </code>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            session.status === 'connected' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {session.status}
                          </span>
                        </div>

                        {/* Partner Info */}
                        <div className="mb-2">
                          <p className="text-gray-400 text-xs mb-1">
                            Chatting with:
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {partner?.name?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{partner?.name || 'Partner'}</p>
                              <p className="text-gray-500 text-xs">{partner?.email}</p>
                            </div>
                          </div>
                        </div>

                        {/* Session Metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Started: {formatDate(session.createdAt)}</span>
                          {session.lastActiveAt && (
                            <span>•</span>
                          )}
                          {session.lastActiveAt && (
                            <span>Active: {formatDate(session.lastActiveAt)}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleResume(session.code)}
                          disabled={loading}
                          className="px-3 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
                          title="Resume this session"
                        >
                          <Play size={14} />
                          Resume
                        </button>

                        {session.isCreator && (
                          <button
                            onClick={() => handleDelete(session.code)}
                            disabled={deletingCode === session.code}
                            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Delete this session (only creator can delete)"
                          >
                            {deletingCode === session.code ? (
                              <>
                                <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} />
                                Delete
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && sessions.length > 0 && (
          <div className="p-4 border-t border-gray-700 bg-gray-900/50 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              💡 Tip: You can create unlimited rooms and join multiple sessions
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionsPanel;