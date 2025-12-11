import React, { useState, useEffect } from 'react';
import { X, Clock, Heart, ArrowRight, AlertCircle, Loader } from 'lucide-react';

const ActiveSessionsPopup = ({ userData, onResumeSession, onClose, onSkip }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [resuming, setResuming] = useState(false);

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
      console.log('📊 Active sessions found:', data.data?.sessions?.length || 0);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (session) => {
    try {
      setResuming(true);
      setSelectedSession(session.code);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/love-room/sessions/resume/${session.code}`,
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
        console.log('✅ Session resumed:', session.code);
        onResumeSession({
          roomCode: data.data.code,
          isCreator: data.data.creator.userId === (userData.id || userData.email),
          userId: userData.id || userData.email
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to resume session');
      console.error('Error resuming session:', err);
    } finally {
      setResuming(false);
      setSelectedSession(null);
    }
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
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // If no sessions found
  if (!loading && sessions.length === 0) {
    return null; // Don't show popup if no sessions
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 border-2 border-pink-500/50 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Welcome Back! 💖</h2>
              <p className="text-pink-100 text-sm">You have {sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-purple-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Loading your sessions...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Sessions List */}
          {!loading && sessions.length > 0 && (
            <div className="space-y-3 mb-6">
              {sessions.map((session, index) => {
                const partner = getPartnerInfo(session);
                const isResuming = resuming && selectedSession === session.code;

                return (
                  <button
                    key={session.code}
                    onClick={() => !isResuming && handleResume(session)}
                    disabled={isResuming || resuming}
                    className="w-full text-left group hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="bg-gray-800/50 border border-gray-700 group-hover:border-pink-500/50 rounded-lg p-4 transition-all">
                      {/* Session Number and Code */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{index + 1}</span>
                          </div>
                          <code className="font-mono font-bold text-pink-400 text-lg">
                            {session.code}
                          </code>
                          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-mono">
                            Connected
                          </span>
                        </div>
                        {isResuming ? (
                          <div className="flex items-center gap-2 text-purple-400">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-mono">Resuming...</span>
                          </div>
                        ) : (
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-pink-400 transition-colors" />
                        )}
                      </div>

                      {/* Partner Info */}
                      <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {partner?.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{partner?.name || 'Partner'}</p>
                          <p className="text-gray-400 text-xs truncate">{partner?.email}</p>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span>Started: {formatDate(session.createdAt)}</span>
                        <span>•</span>
                        <span>Active: {formatDate(session.lastActiveAt)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onSkip}
              disabled={resuming}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              Create New Room
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center mt-4 font-mono">
            💡 Click any session to resume chatting where you left off
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessionsPopup;