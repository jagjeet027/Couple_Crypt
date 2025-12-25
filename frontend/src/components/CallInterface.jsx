import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, Video, PhoneOff, MicOff, VideoOff, Volume2, User, X, 
  Minimize2, Maximize2, Mic, Loader, UserCircle, Signal, Wifi
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
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callTimerRef = useRef(null);
  const iceCandidatesQueue = useRef([]);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) return;
    
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('ice-candidate', {
          roomCode: roomData.roomCode,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteStreamRef.current = event.streams[0];
        setCallStatus('connected');
        startCallTimer();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setConnectionQuality('good');
      } else if (pc.iceConnectionState === 'checking') {
        setConnectionQuality('checking');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionQuality('poor');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };

    return pc;
  }, [socket, roomData.roomCode]);

  const getMediaStream = useCallback(async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      throw new Error(`Failed to access media devices: ${error.message}`);
    }
  }, []);

  const handleStartCall = useCallback(async (type) => {
    if (!socket || !isConnected) {
      alert('Not connected to server');
      return;
    }

    try {
      setCallStatus('initiating');
      setCallType(type);
      setShowCallOptions(false);

      const stream = await getMediaStream(type);
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('offer', {
        roomCode: roomData.roomCode,
        offer: offer,
        callType: type
      });

      setCallStatus('calling');
      setIsInCall(true);
    } catch (error) {
      alert(`Failed to start call: ${error.message}`);
      cleanupCall();
      setShowCallOptions(true);
    }
  }, [socket, isConnected, roomData.roomCode, getMediaStream, createPeerConnection]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !socket) return;

    try {
      setCallStatus('accepting');
      const stream = await getMediaStream(incomingCall.callType);
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      while (iceCandidatesQueue.current.length > 0) {
        const candidate = iceCandidatesQueue.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        roomCode: roomData.roomCode,
        answer: answer
      });

      setIsInCall(true);
      setCallType(incomingCall.callType);
      setIncomingCall(null);
      setCallStatus('connected');
    } catch (error) {
      alert(`Failed to accept call: ${error.message}`);
      handleRejectCall();
    }
  }, [incomingCall, socket, roomData.roomCode, getMediaStream, createPeerConnection]);

  const handleRejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit('reject-call', {
      roomCode: roomData.roomCode
    });

    setIncomingCall(null);
    setShowCallOptions(true);
  }, [socket, roomData.roomCode, incomingCall]);

  const handleEndCall = useCallback(() => {
    if (!socket) return;

    socket.emit('call-end', {
      roomCode: roomData.roomCode,
      duration: callDuration
    });

    cleanupCall();
  }, [socket, roomData.roomCode, callDuration]);

  const cleanupCall = useCallback(() => {
    stopCallTimer();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsInCall(false);
    setCallType(null);
    setCallStatus('idle');
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setShowCallOptions(true);
    iceCandidatesQueue.current = [];
  }, [stopCallTimer]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current && callType === 'video') {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [callType]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive-offer', async (data) => {
      setIncomingCall({
        callerId: data.senderId,
        callType: data.callType,
        offer: data.offer
      });
      setShowCallOptions(false);
    });

    socket.on('receive-answer', async (data) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          setCallStatus('connected');
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    socket.on('receive-ice-candidate', async (data) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });

    socket.on('call-rejected', () => {
      alert('Call was rejected');
      cleanupCall();
    });

    socket.on('call-ended', () => {
      cleanupCall();
    });

    return () => {
      socket.off('receive-offer');
      socket.off('receive-answer');
      socket.off('receive-ice-candidate');
      socket.off('call-rejected');
      socket.off('call-ended');
    };
  }, [socket, cleanupCall]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2">
      {connectionQuality === 'good' && <Signal className="w-4 h-4 text-green-400" />}
      {connectionQuality === 'checking' && <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />}
      {connectionQuality === 'poor' && <Signal className="w-4 h-4 text-red-400" />}
      <span className="text-xs text-gray-400">
        {connectionQuality === 'good' ? 'Good' : connectionQuality === 'checking' ? 'Connecting...' : 'Poor'}
      </span>
    </div>
  );

  if (isMinimized && (isInCall || callStatus !== 'idle')) {
    return (
      <div className="fixed top-4 right-4 w-80 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 p-4 z-[200] backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
              {callType === 'video' ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-white font-semibold">{getPartnerName()}</p>
              <div className="flex items-center gap-2">
                <p className="text-gray-400 text-xs">{formatCallDuration(callDuration)}</p>
                <ConnectionIndicator />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">{isInCall ? getPartnerName() : 'Call Interface'}</h3>
              {isInCall && (
                <div className="flex items-center gap-3">
                  <p className="text-gray-400 text-sm">{formatCallDuration(callDuration)}</p>
                  <ConnectionIndicator />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isInCall && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {showCallOptions && !incomingCall && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-8 max-w-md">
              <div>
                <h3 className="text-white text-2xl font-bold mb-3">Start a Call</h3>
                <p className="text-gray-400">Connect with {getPartnerName()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => handleStartCall('audio')}
                  disabled={!isConnected}
                  className="group flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Phone className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">Audio Call</span>
                </button>
                
                <button
                  onClick={() => handleStartCall('video')}
                  disabled={!isConnected}
                  className="group flex flex-col items-center gap-4 p-8 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">Video Call</span>
                </button>
              </div>
              
              {!isConnected && (
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <Loader className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Waiting for connection...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {incomingCall && (
          <div className="h-full flex items-center justify-center p-8">
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-10 border border-gray-700 shadow-2xl max-w-md w-full">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg shadow-pink-500/50">
                  {incomingCall.callType === 'video' ? (
                    <Video className="w-12 h-12 text-white" />
                  ) : (
                    <Phone className="w-12 h-12 text-white" />
                  )}
                </div>
                
                <div>
                  <h3 className="text-white text-2xl font-bold mb-2">
                    Incoming {incomingCall.callType === 'video' ? 'Video' : 'Audio'} Call
                  </h3>
                  <p className="text-gray-400">
                    {getPartnerName()} wants to connect
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleRejectCall}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>Decline</span>
                  </button>
                  
                  <button
                    onClick={handleAcceptCall}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Phone className="w-5 h-5" />
                    <span>Accept</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isInCall && (
          <div className="h-full flex flex-col">
            {callType === 'video' ? (
              <div className="flex-1 relative bg-black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {!remoteStreamRef.current && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-400 text-lg">Connecting to {getPartnerName()}...</p>
                      <Loader className="w-6 h-6 text-pink-400 animate-spin mx-auto mt-4" />
                    </div>
                  </div>
                )}
                
                <div className="absolute top-4 right-4 w-40 h-32 bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                  <p className="text-white font-mono text-sm">{formatCallDuration(callDuration)}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
                <div className="text-center space-y-6">
                  <div className="w-32 h-32 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-pink-500/50 animate-pulse">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-3xl font-bold mb-2">{getPartnerName()}</h3>
                    <p className="text-gray-400 text-lg">
                      {remoteStreamRef.current ? 'Call in progress' : 'Connecting...'}
                    </p>
                    <p className="text-pink-400 text-xl font-mono mt-4">{formatCallDuration(callDuration)}</p>
                  </div>
                  {isMuted && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg px-4 py-2 inline-block">
                      <p className="text-red-400 text-sm font-semibold">Microphone Muted</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm p-6 border-t border-gray-800">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50' 
                      : 'bg-gray-700 hover:bg-gray-600 shadow-gray-700/50'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                </button>

                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${
                      isVideoOff 
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-500/50' 
                        : 'bg-gray-700 hover:bg-gray-600 shadow-gray-700/50'
                    }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                  </button>
                )}

                <button
                  onClick={handleEndCall}
                  className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-xl shadow-red-500/50"
                  title="End call"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>

                <button
                  className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg shadow-gray-700/50"
                  title="Volume"
                >
                  <Volume2 className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallInterface;     