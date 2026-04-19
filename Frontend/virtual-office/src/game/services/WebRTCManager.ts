// src/game/services/WebRTCManager.ts

import { Socket } from 'socket.io-client';

export class WebRTCManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  // peerId -> RTCPeerConnection
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  // peerId -> HTMLAudioElement
  private remoteAudios: Map<string, HTMLAudioElement> = new Map();
  
  private isBroadcasting: boolean = false;

  private readonly iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Fallback STUN/TURN servers can be added here
    ],
  };

  constructor(socket: Socket) {
    this.socket = socket;
    this.registerSocketEvents();
  }

  private registerSocketEvents() {
    // 1. You are the speaker and you started broadcasting. The server tells you who to connect to.
    this.socket.on('mic-broadcast-started', async ({ listenerIds }: { listenerIds: string[] }) => {
      console.log('🎙️ Mic broadcast started. Preparing to send to listeners:', listenerIds);
      this.isBroadcasting = true;

      for (const listenerId of listenerIds) {
        await this.createOffer(listenerId);
      }
    });

    // 2. You are a listener and someone just started broadcasting.
    this.socket.on('incoming-mic-broadcast', ({ speakerId }: { speakerId: string }) => {
      console.log(`🎧 Incoming broadcast from ${speakerId}`);
      // As a listener, we just ensure we are ready to receive an offer from the speaker
    });

    // 3. The speaker stopped broadcasting
    this.socket.on('mic-broadcast-stopped', ({ speakerId }: { speakerId: string }) => {
      console.log(`🔇 Broadcast stopped by ${speakerId}`);
      this.cleanupPeer(speakerId);
    });

    // 4. Handle incoming WEBRTC Offer (Listener receives this from Speaker)
    this.socket.on('webrtc-offer', async ({ senderId, sdp }) => {
      console.log(`📥 Received WebRTC Offer from ${senderId}`);
      await this.handleReceiveOffer(senderId, sdp);
    });

    // 5. Handle incoming WEBRTC Answer (Speaker receives this from Listener)
    this.socket.on('webrtc-answer', async ({ senderId, sdp }) => {
      console.log(`📥 Received WebRTC Answer from ${senderId}`);
      await this.handleReceiveAnswer(senderId, sdp);
    });

    // 6. Handle incoming ICE Candidate (Both sides)
    this.socket.on('webrtc-ice-candidate', async ({ senderId, candidate }) => {
      try {
        const pc = this.peerConnections.get(senderId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });
  }

  // ============== SPEAKER SPECIFIC METHODS ==============

  public async startBroadcasting(): Promise<boolean> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.socket.emit('mic-broadcast-start');
      return true;
    } catch (err) {
      console.error('Failed to get microphone access:', err);
      return false;
    }
  }

  public stopBroadcasting(): void {
    this.socket.emit('mic-broadcast-stop');
    this.isBroadcasting = false;
    
    // Stop local mic tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all outbound connections
    this.cleanupAllPeers();
  }

  private async createOffer(targetListenerId: string) {
    const pc = this.createPeerConnection(targetListenerId);
    
    // Add local stream tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.socket.emit('webrtc-offer', {
        targetId: targetListenerId,
        sdp: pc.localDescription
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }

  private async handleReceiveAnswer(speakerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(speakerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote description from answer:', err);
      }
    }
  }

  // ============== LISTENER SPECIFIC METHODS ==============

  private async handleReceiveOffer(speakerId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(speakerId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        targetId: speakerId,
        sdp: pc.localDescription
      });
    } catch (err) {
      console.error('Error handling WebRTC offer:', err);
    }
  }

  // ============== SHARED HELPER METHODS ==============

  private createPeerConnection(peerId: string): RTCPeerConnection {
    // Clean up any existing connection for this peer
    if (this.peerConnections.has(peerId)) {
      this.cleanupPeer(peerId);
    }

    const pc = new RTCPeerConnection(this.iceServers);

    // Send any ice candidates to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Fired when the LISTENER receives the track from the SPEAKER
    pc.ontrack = (event) => {
      console.log('🎵 Received audio track from remote peer');
      this.playRemoteAudio(peerId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(peerId);
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private playRemoteAudio(peerId: string, stream: MediaStream) {
    // Remove old audio if it exists
    if (this.remoteAudios.has(peerId)) {
      const oldAudio = this.remoteAudios.get(peerId)!;
      oldAudio.pause();
      oldAudio.remove();
    }

    const audioEl = document.createElement('audio');
    audioEl.srcObject = stream;
    audioEl.autoplay = true;
    audioEl.id = `remote-audio-${peerId}`;
    
    // Sometimes autoplay is blocked unless user interacted, so we try to play it
    audioEl.play().catch(e => console.warn('Autoplay blocked for remote audio:', e));

    document.body.appendChild(audioEl);
    this.remoteAudios.set(peerId, audioEl);
  }

  private cleanupPeer(peerId: string) {
    // Close RTCPeerConnection
    if (this.peerConnections.has(peerId)) {
      const pc = this.peerConnections.get(peerId)!;
      pc.close();
      this.peerConnections.delete(peerId);
    }

    // Remove HTMLAudioElement
    if (this.remoteAudios.has(peerId)) {
      const audioEl = this.remoteAudios.get(peerId)!;
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      this.remoteAudios.delete(peerId);
    }
  }

  public cleanupAllPeers() {
    const peers = Array.from(this.peerConnections.keys());
    peers.forEach(peerId => this.cleanupPeer(peerId));
  }

  public destroy() {
    this.stopBroadcasting();
    this.cleanupAllPeers();
  }
}
