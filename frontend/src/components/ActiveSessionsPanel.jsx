import React, { useState, useEffect } from 'react';
import { Play, Clock, X } from 'lucide-react';

export const ActiveSessionsPanel = ({ userData, onResumeSession, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveSessions();
  }, [userData]);

  const fetchActiveSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/love-room/sessions/active/${userData.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json();
      setSessions(data.data?.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (code) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/love-room/sessions/resume/${code}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: userData.id })
        }
      );

      const data = await response.json();
      if (data.success) {
        onResumeSession({
          roomCode: data.data.code,
          isCreator: data.data.creator.userId === userData.id,
          userId: userData.id
        });
        onClose();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Clock size={20} />
            Active Sessions
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && <p className="text-gray-400">Loading sessions...</p>}
          
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {!loading && sessions.length === 0 && (
            <p className="text-gray-400 text-center py-4">No active sessions</p>
          )}

          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map(session => (
                <div
                  key={session.code}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-pink-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-mono text-sm">
                        {session.code}
                      </p>
                      <p className="text-xs text-gray-400">
                        {session.creator.email === userData.email ? 
                          `With: ${session.joiner?.email}` : 
                          `With: ${session.creator.email}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResume(session.code)}
                      className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <Play size={14} />
                      Resume
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Last active: {new Date(session.lastActiveAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

