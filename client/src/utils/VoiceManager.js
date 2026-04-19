import Peer from 'simple-peer';

/**
 * VoiceManager handles WebRTC Peer connections for spatialized voice chat.
 */
class VoiceManager {
  constructor(socket, roomId) {
    this.socket = socket;
    this.roomId = roomId;
    this.peers = new Map(); // socketId -> Peer instance
    this.localStream = null;
    this.onStream = null; // callback(socketId, stream)
    this.onDisconnect = null; // callback(socketId)
    this.isMuted = true;
  }

  /**
   * Initialize local media stream
   */
  async initLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0,
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1 // Mono is better for low-latency voice
        },
        video: false
      });
      // Start muted by default
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      console.log('[VoiceManager] Optimized local stream acquired (starting muted)');
      return true;
    } catch (err) {
      console.error('[VoiceManager] Failed to get local stream:', err);
      return false;
    }
  }

  /**
   * Create a new peer connection (Usually as the initiator when joining)
   */
  createPeer(targetSocketId, isInitiator) {
    if (this.peers.has(targetSocketId)) {
      this.peers.get(targetSocketId).destroy();
    }

    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream: this.localStream
    });

    peer.on('signal', (data) => {
      this.socket.emit('voice-signal', {
        to: targetSocketId,
        signal: data
      });
    });

    peer.on('stream', (stream) => {
      console.log(`[VoiceManager] Received remote stream from ${targetSocketId}`);
      if (this.onStream) this.onStream(targetSocketId, stream);
    });

    peer.on('close', () => {
      console.log(`[VoiceManager] Peer connection closed for ${targetSocketId}`);
      if (this.onDisconnect) this.onDisconnect(targetSocketId);
    });

    peer.on('error', (err) => {
      console.error(`[VoiceManager] Peer error for ${targetSocketId}:`, err);
    });

    this.peers.set(targetSocketId, peer);
    return peer;
  }

  /**
   * Handle incoming signal from another peer
   */
  handleSignal(fromSocketId, signal) {
    let peer = this.peers.get(fromSocketId);
    if (!peer) {
      // If we haven't seen this peer yet, we are the receiver
      peer = this.createPeer(fromSocketId, false);
    }
    peer.signal(signal);
  }

  /**
   * Toggle local microphone
   */
  toggleMute() {
    if (this.localStream) {
      this.isMuted = !this.isMuted;
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
      // Broadcast status to others for UI icons
      this.socket.emit('voice-status-update', { isMuted: this.isMuted });
      return this.isMuted;
    }
    return true;
  }

  /**
   * Cleanup all connections
   */
  destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
    console.log('[VoiceManager] All connections destroyed');
  }
}

export default VoiceManager;
