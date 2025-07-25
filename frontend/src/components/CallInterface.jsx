import React, { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { useCallSystem } from '../hooks/useCallSystem';
=======
impo
>>>>>>> 38dbe8c (production backend build successfully)
import { 
  Phone, 
  Video, 
  PhoneOff, 
  MicOff,     
  VideoOff, 
  Volume2,
  User,
  X,
  Minimize2,
  Maximize2,
  Mic,
  Loader
} from 'lucide-react';

const CallInterface = ({ 
  socket, 
  isConnected, 
  roomData, 
  userData, 
  getPartnerName,
  onClose
}) => {
  const [showCallOptions, setShowCallOptions] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Use the custom hook for call management
  const {
    isInCall,
    callType,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callStatus,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    cleanupCall
  } = useCallSystem(socket, roomData, userData, isConnected);

  // Handle call initiation
  const handleStartCall = useCallback(async (type) => {
    console.log('Starting call with type:', type);
    setShowCallOptions(false);
    
    try {
      await startCall(type);
      console.log('Call started successfully');
    } catch (error) {
      console.error('Failed to start call:', error);
      // Only show call options again if the call completely failed
      if (!isInCall && callStatus === 'idle') {
        setShowCallOptions(true);
      }
    }
  }, [startCall, isInCall, callStatus]);

  // Handle call acceptance
  const handleAcceptCall = useCallback(async () => {
    console.log('Accepting call...');
    try {
      await acceptCall();
      console.log('Call accepted successfully');
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [acceptCall]);

  // Handle call rejection
  const handleRejectCall = useCallback(() => {
    console.log('Rejecting call...');
    rejectCall();
    setShowCallOptions(true);
  }, [rejectCall]);

  // Handle call end
  const handleEndCall = useCallback(() => {
    console.log('Ending call...');
    endCall();
    setShowCallOptions(true);
  }, [endCall]);

  // Handle close
  const handleClose = useCallback(() => {
    console.log('Closing call interface...');
    cleanupCall();
    onClose();
  }, [cleanupCall, onClose]);

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  // Update show call options based on call state
  useEffect(() => {
    console.log('Call state changed:', { 
      isInCall, 
      incomingCall: !!incomingCall, 
      callStatus,
      showCallOptions 
    });
    
    // Show call options only when idle and no incoming call
    if (!isInCall && !incomingCall && callStatus === 'idle') {
      setShowCallOptions(true);
    } else {
      setShowCallOptions(false);
    }
  }, [isInCall, incomingCall, callStatus]);

  // Debug logging
  useEffect(() => {
    console.log('CallInterface state:', {
      showCallOptions,
      isInCall,
      callType,
      callStatus,
      incomingCall: !!incomingCall,
      localStream: !!localStream,
      remoteStream: !!remoteStream,
      isMuted,
      isVideoOff,
      socketConnected: isConnected
    });
  }, [showCallOptions, isInCall, callType, callStatus, incomingCall, localStream, remoteStream, isMuted, isVideoOff, isConnected]);

  // Check WebRTC support
  useEffect(() => {
    if (!navigator.mediaDevices || !window.RTCPeerConnection) {
      console.error('WebRTC not supported');
      alert('Your browser does not support video/audio calls. Please use Chrome, Firefox, or Safari.');
    } else {
      console.log('WebRTC supported');
    }
  }, []);

  // If minimized and in call, show compact header only
  if (isMinimized && (isInCall || callStatus !== 'idle')) {
    return (
      <div className="fixed top-4 right-4 w-80 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 p-3 z-[200]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              {callType === 'video' ? (
                <Video className="w-4 h-4 text-white" />
              ) : (
                <Phone className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{getPartnerName()}</p>
              <p className="text-gray-400 text-xs">
                {callStatus === 'connecting' ? 'Connecting...' : 
                 callStatus === 'connected' ? `${callType === 'video' ? 'Video' : 'Voice'} call active` :
                 callStatus === 'calling' ? 'Calling...' : 'Call active'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-1.5 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm p-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-bold">Call Interface</h2>
            <p className="text-gray-400 text-sm">Room: {roomData?.roomCode}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {(isInCall || callStatus !== 'idle') && (
            <button
              onClick={toggleMinimize}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Minimize2 className="w-5 h-5 text-gray-400" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="h-96 flex flex-col">
        {/* Call Options - When no call is active */}
        {showCallOptions && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-white text-xl font-bold mb-2">Start a Call</h3>
                <p className="text-gray-400">Choose how you want to connect with {getPartnerName()}</p>
              </div>
              
              <div className="flex space-x-6 justify-center">
                <button
                  onClick={() => handleStartCall('audio')}
                  disabled={!isConnected || callStatus !== 'idle'}
                  className="flex flex-col items-center space-y-3 p-6 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white font-medium">Audio Call</span>
                </button>
                
                <button
                  onClick={() => handleStartCall('video')}
                  disabled={!isConnected || callStatus !== 'idle'}
                  className="flex flex-col items-center space-y-3 p-6 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white font-medium">Video Call</span>
                </button>
              </div>
              
              {!isConnected && (
                <p className="text-red-400 text-sm">Connection required to start calls</p>
              )}
              
              {callStatus !== 'idle' && (
                <p className="text-yellow-400 text-sm">Call in progress...</p>
              )}
            </div>
          </div>
        )}

        {/* Incoming Call */}
        {incomingCall && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 shadow-2xl max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  {incomingCall.callType === 'video' ? (
                    <Video className="w-10 h-10 text-white" />
                  ) : (
                    <Phone className="w-10 h-10 text-white" />
                  )}
                </div>
                
                <h3 className="text-white text-xl font-bold mb-3">
                  Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call
                </h3>
                
                <p className="text-gray-400 mb-6">
                  {incomingCall.callerName || getPartnerName()} wants to {incomingCall.callType === 'video' ? 'video' : 'voice'} chat with you
                </p>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleRejectCall}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>Decline</span>
                  </button>
                  
                  <button
                    onClick={handleAcceptCall}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Accept</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Call */}
        {isInCall && (
          <div className="flex-1 flex flex-col">
            {callType === 'video' ? (
              <div className="flex-1 relative bg-gray-900">
                {/* Remote Video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Local Video */}
                <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <VideoOff className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">Connecting to {getPartnerName()}...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Phone className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-white text-2xl font-bold mb-2">{getPartnerName()}</h3>
                  <p className="text-gray-400 text-lg">
                    {remoteStream ? 'Voice call in progress...' : 'Connecting...'}
                  </p>
                  {isMuted && (
                    <p className="text-red-400 text-sm mt-3">Microphone muted</p>
                  )}
                </div>
              </div>
            )}

            {/* Call Controls */}
            <div className="bg-gray-900/90 backdrop-blur-sm p-6 border-t border-gray-800">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white" />
                  ) : (
                    <Mic className="w-6 h-6 text-white" />
                  )}
                </button>

                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-6 h-6 text-white" />
                    ) : (
                      <Video className="w-6 h-6 text-white" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleEndCall}
                  className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
                  title="End call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>

                <button
                  className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                  title="Volume settings"
                >
                  <Volume2 className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>    
          </div>
        )}

        {/* Debug Info - Remove in production */}
        <div className="p-2 bg-gray-800 text-xs text-gray-400 border-t border-gray-700">
          Status: {isInCall ? 'In Call' : incomingCall ? 'Incoming Call' : 'Ready'} | 
          Socket: {isConnected ? 'Connected' : 'Disconnected'} | 
          Type: {callType || 'None'}
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
