// hooks/UseCallSystem.js
import { useState, useRef, useEffect, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { 
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    }
  ]
};

export const useCallSystem = (socket, roomData, userData, isConnected) => {
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'connecting', 'connected'

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const cleanupInProgressRef = useRef(false);

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    try {
      console.log('Creating peer connection with ICE servers:', ICE_SERVERS);
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      
      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log('Received remote stream:', event.streams);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        console.log('ICE candidate:', event.candidate);
        if (event.candidate && socket && socket.connected) {
          console.log('Sending ICE candidate to room:', roomData?.roomCode);
          socket.emit('ice-candidate', {
            roomId: roomData.roomCode,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state changed:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
          // Clear timeout on successful connection
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
        } else if (peerConnection.connectionState === 'failed' || 
                   peerConnection.connectionState === 'disconnected') {
          console.log('Connection failed or disconnected');
          if (!cleanupInProgressRef.current) {
            cleanupCall();
          }
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  }, [socket, roomData?.roomCode]);

  // Get user media
  const getUserMedia = useCallback(async (video = false) => {
    try {
      console.log('Requesting media access:', { video, audio: true });
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: video ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media access granted:', stream);
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Start call
  const startCall = useCallback(async (type) => {
    if (!socket || !socket.connected) {
      console.error('Cannot start call: socket not connected');
      throw new Error('Socket not connected');
    }

    if (!roomData?.roomCode) {
      console.error('Cannot start call: no room code');
      throw new Error('No room code available');
    }

    if (cleanupInProgressRef.current) {
      console.error('Cannot start call: cleanup in progress');
      throw new Error('Cleanup in progress');
    }

    try {
      console.log('Starting call:', { type, roomCode: roomData.roomCode });
      setCallStatus('calling');
      setCallType(type);
      
      // Get media first
      const stream = await getUserMedia(type === 'video');
      console.log('Got local stream:', stream);
      
      // Create peer connection
      const peerConnection = createPeerConnection();
      if (!peerConnection) throw new Error('Failed to create peer connection');
      
      peerConnectionRef.current = peerConnection;
      callStartTimeRef.current = Date.now();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        peerConnection.addTrack(track, stream);
      });

      // Create and send offer
      console.log('Creating offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
      
      await peerConnection.setLocalDescription(offer);
      console.log('Local description set, sending call offer');

      // Double-check socket connection before emitting
      if (!socket || !socket.connected) {
        throw new Error('Socket disconnected during call setup');
      }

      // Send call offer via socket
      socket.emit('start-call', {
        roomId: roomData.roomCode,
        callType: type,
        offer: offer,
        callerName: userData?.name || 'Unknown'
      });

      setIsInCall(true);
      setCallStatus('connecting');
      
      // Set call timeout (30 seconds)
      callTimeoutRef.current = setTimeout(() => {
        console.log('Call timeout reached');
        if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== 'connected') {
          if (socket && socket.connected) {
            socket.emit('call-timeout', { roomId: roomData.roomCode });
          }
          cleanupCall();
          alert('Call timeout: No response from partner');
        }
      }, 30000);

      console.log('Call initiated successfully');

    } catch (error) {
      console.error('Error starting call:', error);
      
      // Don't reset state if the error is due to component unmounting or cleanup
      if (error.message !== 'Socket disconnected during call setup' && error.message !== 'Cleanup in progress') {
        setCallType(null);
        setIsInCall(false);
        setCallStatus('idle');
      }
      
      if (error.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera or microphone found. Please check your devices.');
      } else if (error.message !== 'Cleanup in progress') {
        alert(`Failed to start call: ${error.message}`);
      }
      throw error;
    }
  }, [socket, roomData?.roomCode, userData?.name, getUserMedia, createPeerConnection]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket || !socket.connected) {
      console.error('Cannot accept call: missing requirements');
      return;
    }

    if (cleanupInProgressRef.current) {
      console.error('Cannot accept call: cleanup in progress');
      return;
    }

    try {
      console.log('Accepting call:', incomingCall);
      setCallStatus('connecting');
      setCallType(incomingCall.callType);
      
      // Get media
      const stream = await getUserMedia(incomingCall.callType === 'video');
      console.log('Got local stream for answer:', stream);
      
      // Create peer connection
      const peerConnection = createPeerConnection();
      if (!peerConnection) throw new Error('Failed to create peer connection');
      
      peerConnectionRef.current = peerConnection;
      callStartTimeRef.current = Date.now();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection (answer):', track.kind);
        peerConnection.addTrack(track, stream);
      });

      // Set remote description (offer)
      console.log('Setting remote description from offer');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      // Create and send answer
      console.log('Creating answer...');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Check socket connection before emitting
      if (!socket || !socket.connected) {
        throw new Error('Socket disconnected during call accept');
      }

      console.log('Sending accept-call response');
      socket.emit('accept-call', {
        roomId: roomData.roomCode,
        answer: answer,
        callMessageId: incomingCall.callMessageId
      });

      setIsInCall(true);
      setIncomingCall(null);

      // Clear any existing timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      console.log('Call accepted successfully');

    } catch (error) {
      console.error('Error accepting call:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Camera/microphone access denied. Please allow permissions and try again.');
      } else if (error.message !== 'Socket disconnected during call accept') {
        alert(`Failed to accept call: ${error.message}`);
      }
      
      rejectCall();
    }
  }, [incomingCall, socket, roomData?.roomCode, getUserMedia, createPeerConnection]);

  // Reject call
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket || !socket.connected) return;

    console.log('Rejecting call:', incomingCall.callMessageId);
    socket.emit('reject-call', {
      roomId: roomData.roomCode,
      callMessageId: incomingCall.callMessageId
    });

    setIncomingCall(null);
    cleanupCall();
  }, [incomingCall, socket, roomData?.roomCode]);

  // End call
  const endCall = useCallback(() => {
    if (cleanupInProgressRef.current) {
      console.log('End call called but cleanup already in progress');
      return;
    }

    const duration = callStartTimeRef.current ? 
      Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;

    console.log('Ending call with duration:', duration);
    
    if (socket && socket.connected) {
      socket.emit('end-call', {
        roomId: roomData.roomCode,
        duration: duration,
        callMessageId: incomingCall?.callMessageId
      });
    }

    cleanupCall();
  }, [socket, roomData?.roomCode, incomingCall?.callMessageId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log('Audio track enabled:', audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream && callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log('Video track enabled:', videoTrack.enabled);
      }
    }
  }, [localStream, callType]);

  // Cleanup call
  const cleanupCall = useCallback(() => {
    if (cleanupInProgressRef.current) {
      console.log('Cleanup already in progress, skipping...');
      return;
    }

    cleanupInProgressRef.current = true;
    console.log('Cleaning up call...');

    // Clear timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      console.log('Stopping local stream tracks');
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      console.log('Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Reset state
    setIsInCall(false);
    setCallType(null);
    setIncomingCall(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStatus('idle');
    callStartTimeRef.current = null;
    
    // Reset cleanup flag after a short delay to prevent race conditions
    setTimeout(() => {
      cleanupInProgressRef.current = false;
    }, 100);
    
    console.log('Call cleanup completed');
  }, [localStream]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) {
      console.log('No socket available for event listeners');
      return;
    }

    // Check if socket is actually connected
    if (!socket.connected) {
      console.log('Socket not connected, cleaning up any active calls');
      if (isInCall || callStatus !== 'idle') {
        cleanupCall();
      }
      return;
    }

    console.log('Setting up socket event listeners');

    // Handle incoming call
    const handleIncomingCall = (data) => {
      console.log('Incoming call received:', data);
      setIncomingCall(data);
    };

    // Handle call accepted
    const handleCallAccepted = async (data) => {
      console.log('Call accepted:', data);
      if (peerConnectionRef.current && data.answer) {
        try {
          console.log('Setting remote description from answer');
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          
          // Clear timeout since call was accepted
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          
          setCallStatus('connected');
          console.log('Remote description set successfully');
        } catch (error) {
          console.error('Error setting remote description:', error);
          cleanupCall();
        }
      }
    };

    // Handle call rejected
    const handleCallRejected = () => {
      console.log('Call rejected by peer');
      alert('Call was rejected');
      cleanupCall();
    };

    // Handle call ended
    const handleCallEnded = () => {
      console.log('Call ended by peer');
      cleanupCall();
    };

    // Handle ICE candidates
    const handleIceCandidate = async (data) => {
      console.log('Received ICE candidate:', data);
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    // Handle call timeout
    const handleCallTimeout = () => {
      console.log('Call timeout received from server');
      alert('Call timeout: Partner did not respond');
      cleanupCall();
    };

    // Add event listeners
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-timeout', handleCallTimeout);

    return () => {
      console.log('Removing socket event listeners');
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-timeout', handleCallTimeout);
    };
  }, [socket, socket?.connected, isConnected, cleanupCall, isInCall, callStatus]);

  // Cleanup on unmount - only if there's actually something to clean up
  useEffect(() => {
    return () => {
      // Only cleanup if we're actually in a call or have active streams
      if (isInCall || localStream || peerConnectionRef.current || callStatus !== 'idle') {
        console.log('Component unmounting with active call, cleaning up');
        cleanupCall();
      } else {
        console.log('Component unmounting without active call, skipping cleanup');
      }
    };
  }, [isInCall, localStream, callStatus, cleanupCall]);

  // Debug logging
  useEffect(() => {
    console.log('Call system state update:', {
      isInCall,
      callStatus,
      callType,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      hasIncomingCall: !!incomingCall,
      socketConnected: socket?.connected,
      roomCode: roomData?.roomCode,
      cleanupInProgress: cleanupInProgressRef.current
    });
  }, [isInCall, callStatus, callType, localStream, remoteStream, incomingCall, socket?.connected, roomData?.roomCode]);

  return {
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
  };
};