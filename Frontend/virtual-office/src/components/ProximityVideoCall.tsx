// src/components/ProximityVideoCall.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyEventObjectNoPayload, DailyEventObjectParticipant, DailyParticipant } from '@daily-co/daily-js';

interface ProximityVideoCallProps {
  active: boolean;
  participants: { id: string; username: string; distance: number }[];
  onClose: () => void;
  micOn: boolean;
  cameraOn: boolean;
  screenShareOn: boolean;
  isNearOthers: boolean;
  roomUrl?: string; // Optional: Daily room URL
}

const ProximityVideoCall: React.FC<ProximityVideoCallProps> = ({
  active,
  participants,
  onClose,
  micOn,
  cameraOn,
  screenShareOn,
  isNearOthers,
  roomUrl = 'https://your-domain.daily.co/proximity-room', // Default placeholder
}) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [dailyParticipants, setDailyParticipants] = useState<{ [id: string]: DailyParticipant }>({});
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({});

  const handleJoinedMeeting = useCallback((event?: any) => {
    console.log('Joined meeting');
    const co = callRef.current;
    if (co) {
      setDailyParticipants(co.participants());
      // Sync initial state
      co.setLocalAudio(micOn);
      co.setLocalVideo(cameraOn);
    }
  }, [micOn, cameraOn]);

  const handleParticipantUpdated = useCallback((event?: any) => {
    const co = callRef.current;
    if (co) {
      setDailyParticipants(co.participants());
    }
  }, []);

  const handleAudioLevel = useCallback((event: any) => {
    setAudioLevel(event.level);
  }, []);

  const handleParticipantLeft = useCallback((event?: any) => {
    const co = callRef.current;
    if (co) {
      setDailyParticipants(co.participants());
    }
  }, []);

  const handleError = useCallback((event?: any) => {
    console.error('Daily error', event);
  }, []);

  // Initialize Call Object
  useEffect(() => {
    if (active && !callRef.current) {
      console.log('📞 Initializing Daily call...');
      try {
        const co = DailyIframe.createCallObject();
        callRef.current = co;
        setCallObject(co);

        co.on('joined-meeting', handleJoinedMeeting);
        co.on('participant-joined', handleParticipantUpdated);
        co.on('participant-updated', handleParticipantUpdated);
        co.on('participant-left', handleParticipantLeft);
        co.on('local-audio-level', handleAudioLevel);
        co.on('error', handleError);

        co.join({ url: roomUrl }).catch(err => {
          console.error('Failed to join Daily call:', err);
        });
      } catch (err) {
        console.error('Failed to initialize Daily call object:', err);
      }
    }

    return () => {
      if (callRef.current) {
        console.log('📞 Cleaning up Daily call...');
        const co = callRef.current;
        co.off('joined-meeting', handleJoinedMeeting);
        co.off('participant-joined', handleParticipantUpdated);
        co.off('participant-updated', handleParticipantUpdated);
        co.off('participant-left', handleParticipantLeft);
        co.off('local-audio-level', handleAudioLevel);
        co.off('error', handleError);
        
        // Use a safe leave/destroy
        try {
          co.leave();
          co.destroy();
        } catch (e) {
          console.warn('Error during Daily destruction:', e);
        }
        
        callRef.current = null;
        setCallObject(null);
      }
    };
  }, [active, roomUrl, handleJoinedMeeting, handleParticipantUpdated, handleParticipantLeft, handleAudioLevel, handleError]);

  // Handle Prop Updates for Media Controls
  useEffect(() => {
    const co = callRef.current;
    if (co) {
      // Audio
      try {
        const currentAudio = co.localAudio();
        if (currentAudio !== micOn) {
          co.setLocalAudio(micOn);
        }

        // Video
        const currentVideo = co.localVideo();
        if (currentVideo !== cameraOn) {
          co.setLocalVideo(cameraOn);
        }

        // Screen Share
        const localParticipant = co.participants().local;
        const isSharing = localParticipant?.screen;
        
        if (screenShareOn && !isSharing) {
          co.startScreenShare();
        } else if (!screenShareOn && isSharing) {
          co.stopScreenShare();
        }
      } catch (e: any) {
        console.warn("Error updating media state:", e);
      }
    }
  }, [micOn, cameraOn, screenShareOn]);

  useEffect(() => {
    // Update video tracks whenever participants or refs change
    Object.keys(dailyParticipants).forEach(id => {
      const p = dailyParticipants[id];
      const videoElement = videoRefs.current[id];
      if (videoElement && p.videoTrack) {
        videoElement.srcObject = new MediaStream([p.videoTrack]);
      }
    });
  }, [dailyParticipants]);

  if (!active) return null;

  const localParticipant = dailyParticipants['local'];
  const remoteParticipants = Object.values(dailyParticipants).filter(p => !p.local);

  // If no one is near, show a small self-preview bubble
  if (!isNearOthers) {
    if (!cameraOn && !micOn) return null; // Hide if all off

    return (
      <div className="self-preview-bubble">
        <div className="preview-container">
          <video
            autoPlay
            muted
            playsInline
            ref={el => { videoRefs.current['local'] = el; }}
            className={`camera-preview ${cameraOn ? '' : 'hidden'}`}
          />
          {!cameraOn && (
            <div className="camera-off-placeholder small">
              <div className="preview-avatar">You</div>
            </div>
          )}
          <div className="audio-meter">
            <div className="meter-fill" style={{ 
                height: `${Math.min(100, audioLevel * 200)}%`,
                opacity: micOn ? 1 : 0 
            }} />
          </div>
        </div>
        <div className="preview-label">Self Preview</div>
        <style>{`
          .self-preview-bubble {
            position: fixed;
            bottom: 100px;
            right: 24px;
            width: 160px;
            height: 120px;
            background: #000;
            border-radius: 12px;
            border: 2px solid #667eea;
            overflow: hidden;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .audio-meter {
            position: absolute;
            bottom: 10px;
            left: 10px;
            width: 4px;
            height: 30px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            overflow: hidden;
          }
          .meter-fill {
            position: absolute;
            bottom: 0;
            width: 100%;
            background: #10b981;
            transition: height 0.1s ease-out;
          }
          .preview-label {
            position: absolute;
            top: 4px;
            left: 8px;
            font-size: 10px;
            color: white;
            background: rgba(0,0,0,0.5);
            padding: 2px 6px;
            border-radius: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="video-call-overlay">
      <div className="video-call-header">
        <h3>Proximity Video Call</h3>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="video-grid">
        {/* Local Participant */}
        <div className="video-participant local">
          <video
            autoPlay
            muted
            playsInline
            ref={el => { videoRefs.current['local'] = el; }}
            className={`camera-preview ${cameraOn ? '' : 'hidden'}`}
          />
          {!cameraOn && (
            <div className="camera-off-placeholder">
              <div className="preview-avatar">You</div>
              <div className="camera-off-icon">○</div>
            </div>
          )}
          <div className="participant-name">You {micOn ? '' : '(Muted)'}</div>
          <div className="audio-meter full">
            <div className="meter-fill" style={{ 
                width: `${Math.min(100, audioLevel * 200)}%`,
                height: '100%',
                opacity: micOn ? 1 : 0 
            }} />
          </div>
          <div className="video-status local-status">
             {screenShareOn && <span className="distance-badge">Sharing Screen</span>}
          </div>
        </div>

        {/* Remote Participants */}
        {remoteParticipants.map((p) => (
          <div key={p.session_id} className="video-participant remote">
            {/* Prioritize Screen Share if active, else Camera */}
            {p.screen ? (
                 <video
                 autoPlay
                 playsInline
                 ref={el => { 
                     if (el && p.screenVideoTrack) el.srcObject = new MediaStream([p.screenVideoTrack]);
                 }}
                 className="remote-camera screen-share"
               />
            ) : (
                <video
                autoPlay
                playsInline
                ref={el => { videoRefs.current[p.session_id] = el; }}
                className={`remote-camera ${p.video ? '' : 'hidden'}`}
                />
            )}

            {!p.video && !p.screen && (
              <div className="participant-avatar-container">
                <div className="participant-avatar">
                  {p.user_name?.charAt(0).toUpperCase() || 'P'}
                </div>
              </div>
            )}
            <div className="participant-name">{p.user_name || 'Participant'} {!p.audio ? '(Muted)' : ''}</div>
          </div>
        ))}
        
        {/* If Daily participants haven't joined yet, show game participants as placeholders */}
        {remoteParticipants.length === 0 && participants.map((participant) => (
          <div key={participant.id} className="video-participant remote placeholder">
            <div className="participant-avatar-container">
              <div className="participant-avatar">
                {participant.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="participant-name">{participant.username}</div>
            <div className="video-status">
              <span className="distance-badge">{participant.distance}px</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center text-xs text-gray-500 mt-2">
        Controls available in main toolbar
      </div>

      <style>{`
        .hidden {
          display: none;
        }
        .camera-off-placeholder, .participant-avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #222;
        }
        .video-participant video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }
        .video-participant.placeholder {
          opacity: 0.6;
        }
        .screen-share {
            object-fit: contain !important;
            background: #000;
        }
        .audio-meter.full {
            position: absolute;
            bottom: 24px;
            left: 8px;
            right: 8px;
            height: 2px;
            background: rgba(255,255,255,0.1);
            border-radius: 1px;
        }
      `}</style>
    </div>
  );
};

export default ProximityVideoCall;
