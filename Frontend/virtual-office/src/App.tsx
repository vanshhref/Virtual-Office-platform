// src/App.tsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import GameCanvas from './components/GameCanvas';
import ProximityVideoCall from './components/ProximityVideoCall';

import { authService, User } from './services/AuthService';

// Login/Room Selection Modal Component
function AuthModal({ onJoin }: { onJoin: (user: User, room: 'office' | 'conference') => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getUser());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await authService.login(username, password);
      } else {
        res = await authService.signup(username, email, password);
      }
      setCurrentUser(res.user);
      setShowAvatarSelector(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (currentUser) {
      setLoading(true);
      try {
        // Save selected avatar before joining
        await authService.updateAvatar(selectedSprite, selectedColor);
        const updatedUser = authService.getUser();
        onJoin(updatedUser!, room);
      } catch (err) {
        setError('Failed to save avatar');
      } finally {
        setLoading(false);
      }
    }
  };

  const [selectedSprite, setSelectedSprite] = useState(currentUser?.avatar_sprite || 'worker-yellow');
  const [selectedColor, setSelectedColor] = useState(currentUser?.avatar_color || '#ffffff');

  if (showAvatarSelector && currentUser) {
    return (
      <div className="modal-overlay">
        <div className="modal-content avatar-modal">
          <h2>Customize Your Avatar</h2>
          <AvatarSelector 
            initialSprite={selectedSprite} 
            initialColor={selectedColor}
            onSelect={(sprite, color) => {
              setSelectedSprite(sprite);
              setSelectedColor(color);
            }}
          />
          <div className="modal-footer">
            <button className="btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Saving...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isLogin ? 'Login to Virtual Office' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (Optional)"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="room">Select Room</label>
            <select
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value as 'office' | 'conference')}
            >
              <option value="office">Main Office</option>
              <option value="conference">Conference Room</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>

          <p className="auth-toggle">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

// Avatar Selector Component
function AvatarSelector({ initialSprite, initialColor, onSelect }: { 
  initialSprite: string, 
  initialColor: string,
  onSelect: (sprite: string, color: string) => void 
}) {
  const sprites = ['worker-yellow', 'worker-blue', 'worker-green', 'worker-red'];
  const colors = ['#ffffff', '#ffeb3b', '#4caf50', '#2196f3', '#f44336', '#9c27b0'];
  
  const [sprite, setSprite] = useState(initialSprite);
  const [color, setColor] = useState(initialColor);

  const handleSpriteChange = (s: string) => {
    setSprite(s);
    onSelect(s, color);
  };

  const handleColorChange = (c: string) => {
    setColor(c);
    onSelect(sprite, c);
  };

  return (
    <div className="avatar-selector">
      <div className="preview-container">
        <div className="avatar-preview" style={{ backgroundColor: color }}>
          <img src={`/assets/sprites/${sprite}.png`} alt="Avatar Preview" />
        </div>
      </div>

      <div className="selector-group">
        <h4>Select Sprite</h4>
        <div className="sprite-options">
          {sprites.map(s => (
            <div 
              key={s} 
              className={`sprite-option ${sprite === s ? 'selected' : ''}`}
              onClick={() => handleSpriteChange(s)}
            >
              <img src={`/assets/sprites/${s}.png`} alt={s} />
            </div>
          ))}
        </div>
      </div>

      <div className="selector-group">
        <h4>Select Color</h4>
        <div className="color-options">
          {colors.map(c => (
            <div 
              key={c} 
              className={`color-option ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => handleColorChange(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading Screen Component
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-brand-background text-white">
      <div className="mb-8 flex flex-col items-center">
        <div className="h-24 w-24 mb-4 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
          <span className="text-4xl font-bold">VO</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Virtual Office</h2>
        <p className="text-gray-400 mt-2">Loading workspace assets...</p>
      </div>
      
      <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-primary transition-all duration-300 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">{Math.round(progress * 100)}%</p>
    </div>
  );
}

// Notification System Component
function NotificationSystem({ notifications }: { notifications: string[] }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 pointer-events-none">
      {notifications.map((note, i) => (
        <div 
          key={i} 
          className="animate-bounce-in bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full border border-brand-primary/30 text-sm shadow-xl"
        >
          {note}
        </div>
      ))}
    </div>
  );
}

// Game UI Overlay Component
function GameUI({ 
  username, 
  room, 
  onLeave, 
  onChat, 
  chatMessages,
  mediaState,
  onToggleMedia
}: { 
  username: string; 
  room: string; 
  onLeave: () => void; 
  onChat: (msg: string) => void;
  chatMessages: { from: string; message: string; isSystem: boolean }[];
  mediaState: { micOn: boolean; cameraOn: boolean; screenShareOn: boolean };
  onToggleMedia: (type: 'mic' | 'camera' | 'screen') => void;
}) {
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onChat(chatInput.trim());
      setChatInput('');
    }
  };

  const toggleFullscreen = () => {
    const element = document.getElementById('game-container');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for escape key or other ways fullscreen might exit
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col p-4">
      {/* Top Left: Room Info */}
      <div className="flex flex-col gap-2 items-start pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-2 shadow-xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {room.toUpperCase()}
        </div>
      </div>

      {/* Right side: Chat Sidebar */}
      <div className="absolute right-4 top-4 bottom-24 flex flex-col pointer-events-none">
        <div className={`w-80 flex flex-col bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden pointer-events-auto transition-all duration-300 shadow-2xl h-full ${isChatOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+20px)] opacity-0'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-white font-bold tracking-wider">MESSAGES</span>
            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.isSystem ? 'items-center' : (msg.from === username ? 'items-end' : 'items-start')}`}>
                {!msg.isSystem && (
                  <span className="text-[10px] text-gray-400 mb-1 px-1">{msg.from}</span>
                )}
                <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words ${
                  msg.isSystem ? 'bg-transparent text-brand-secondary italic text-xs' : 
                  (msg.from === username ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/10 text-white')
                }`}>
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={handleChatSubmit} className="p-4 bg-black/20 border-t border-white/10">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-primary transition-all shadow-inner"
              maxLength={100}
            />
          </form>
        </div>
      </div>

      {/* Bottom Toolbar (WorkAdventure Style) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto bg-black/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 shadow-2xl">
        <button 
          className={`toolbar-btn group ${!mediaState.micOn ? 'bg-red-500/20 border-red-500/50' : ''}`}
          onClick={() => onToggleMedia('mic')}
        >
          <span className="text-xl">{mediaState.micOn ? '🎤' : '🔇'}</span>
          <span className="toolbar-tooltip">{mediaState.micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button 
          className={`toolbar-btn group ${!mediaState.cameraOn ? 'bg-red-500/20 border-red-500/50' : ''}`}
          onClick={() => onToggleMedia('camera')}
        >
          <span className="text-xl">{mediaState.cameraOn ? '📷' : '🚫'}</span>
          <span className="toolbar-tooltip">{mediaState.cameraOn ? 'Stop Camera' : 'Start Camera'}</span>
        </button>
        <button 
          className={`toolbar-btn group ${mediaState.screenShareOn ? 'bg-green-500/20 border-green-500/50' : ''}`}
          onClick={() => onToggleMedia('screen')}
        >
          <span className="text-xl">🖥️</span>
          <span className="toolbar-tooltip">{mediaState.screenShareOn ? 'Stop Sharing' : 'Share Screen'}</span>
        </button>
        <div className="w-[1px] h-8 bg-white/10 mx-1" />
        <button 
          className={`toolbar-btn group ${isChatOpen ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <span className="text-xl">💬</span>
          <span className="toolbar-tooltip">Chat</span>
        </button>
        <button 
          className={`toolbar-btn group ${isFullscreen ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : ''}`}
          onClick={toggleFullscreen}
        >
          <span className="text-xl">{isFullscreen ? '↙️' : '⛶'}</span>
          <span className="toolbar-tooltip">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
        <button className="toolbar-btn group">
          <span className="text-xl">⚙️</span>
          <span className="toolbar-tooltip">Settings</span>
        </button>
        <div className="w-[1px] h-8 bg-white/10 mx-1" />
        <button 
          className="bg-red-500/80 hover:bg-red-500 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg group"
          onClick={onLeave}
        >
          <span className="text-xl">🚪</span>
          <span className="toolbar-tooltip">Leave</span>
        </button>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [joined, setJoined] = useState(false);
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [room, setRoom] = useState<'office' | 'conference'>('office');
  const [chatMessages, setChatMessages] = useState<{ from: string; message: string; isSystem: boolean }[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Video call state
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [nearbyParticipants, setNearbyParticipants] = useState<{ id: string; username: string; distance: number }[]>([]);
  
  // Media State
  const [mediaState, setMediaState] = useState({
    micOn: false,
    cameraOn: true,
    screenShareOn: false
  });
  
  // Check if server is available
  const [serverAvailable, setServerAvailable] = useState(false);

  useEffect(() => {
    // Check if backend server is available
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/health`)
      .then(() => setServerAvailable(true))
      .catch(() => setServerAvailable(false));
  }, []);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 3000);
  };

  const handleJoin = (userData: User, selectedRoom: 'office' | 'conference') => {
    setUser(userData);
    setRoom(selectedRoom);
    setJoined(true);
    setIsLoading(true);
    setLoadingProgress(0);
    setChatMessages([
      { from: 'System', message: `Welcome to the ${selectedRoom}!`, isSystem: true }
    ]);
    addNotification(`Joining ${selectedRoom}...`);

    // Fallback: If loading takes too long, force clear it after 15 seconds
    setTimeout(() => {
      setIsLoading(prev => {
        if (prev) {
          console.warn('🕒 Loading took too long, forcing start...');
          return false;
        }
        return prev;
      });
    }, 15000);
  };

  const handleLeave = () => {
    setJoined(false);
    setVideoCallActive(false);
    setIsLoading(false);
    // Reset media state
    setMediaState({ micOn: false, cameraOn: true, screenShareOn: false });
  };

  const handleChat = (message: string) => {
    setChatMessages(prev => [...prev, { from: user?.username || 'Unknown', message, isSystem: false }]);
  };

  const handleToggleMedia = (type: 'mic' | 'camera' | 'screen') => {
    setMediaState(prev => {
      const newState = { ...prev };
      if (type === 'mic') newState.micOn = !prev.micOn;
      if (type === 'camera') newState.cameraOn = !prev.cameraOn;
      if (type === 'screen') newState.screenShareOn = !prev.screenShareOn;
      
      addNotification(`${type === 'mic' ? 'Microphone' : type === 'camera' ? 'Camera' : 'Screen Share'} ${newState[type === 'mic' ? 'micOn' : type === 'camera' ? 'cameraOn' : 'screenShareOn'] ? 'Enabled' : 'Disabled'}`);
      
      return newState;
    });
  };

  // Handle proximity video call events
  const handleProximityUpdate = (participants: { id: string; username: string; distance: number }[]) => {
    setNearbyParticipants(participants);
    if (participants.length > 0 && !videoCallActive) {
      setVideoCallActive(true);
    }
  };

  const handleLoadingProgress = (progress: number) => {
    setLoadingProgress(progress);
    if (progress >= 1) {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const closeVideoCall = () => {
    setVideoCallActive(false);
  };

  return (
    <div className="App">
      {isLoading && <LoadingScreen progress={loadingProgress} />}
      <NotificationSystem notifications={notifications} />

      <header className="app-header">
        <h1>Virtual Office</h1>
        <p>Sprint 6: Polish & Deployment</p>
        {!serverAvailable && (
          <div className="server-status warning">
            ⚠️ Backend server not running. Features unavailable.
          </div>
        )}
      </header>

      <main className="app-main">
        {!joined ? (
          <AuthModal onJoin={handleJoin} />
        ) : (
          <div className="game-wrapper">
            <div className="game-container-wrapper">
              <GameCanvas
                user={user!}
                room={room}
                onProximityUpdate={handleProximityUpdate}
                onLoadingProgress={handleLoadingProgress}
              />
            </div>
            <GameUI 
              username={user!.username} 
              room={room} 
              onLeave={handleLeave} 
              onChat={handleChat} 
              chatMessages={chatMessages}
              mediaState={mediaState}
              onToggleMedia={handleToggleMedia}
            />
            <ProximityVideoCall
              active={joined}
              participants={nearbyParticipants}
              onClose={closeVideoCall}
              micOn={mediaState.micOn}
              cameraOn={mediaState.cameraOn}
              screenShareOn={mediaState.screenShareOn}
              isNearOthers={videoCallActive}
            />
          </div>
        )}
      </main>

      <style>{`
        /* Original App Styles */
        .App {
          text-align: center;
          background-color: #1a1a1a;
          min-height: 100vh;
          color: white;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

        .app-header {
          padding: 40px 20px;
          background: linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .app-header h1 {
          margin: 0;
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .app-header p {
          color: #999;
          margin-top: 10px;
          font-size: 1.1rem;
        }

        .app-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          flex: 1;
          width: 100%;
        }

        /* Original Auth & Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          background: #2d2d2d;
          padding: 40px;
          border-radius: 24px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        }

        .modal-content h2 {
          margin-bottom: 30px;
          color: #fff;
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
        }

        .form-group {
          margin-bottom: 24px;
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 10px;
          font-weight: 600;
          color: #aaa;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #444;
          border-radius: 12px;
          background: #1a1a1a;
          color: #fff;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #667eea;
          background: #222;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .btn-primary {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.2);
          margin-top: 10px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
          filter: brightness(1.1);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #555;
        }

        .auth-toggle {
          margin-top: 24px;
          text-align: center;
          font-size: 1rem;
          color: #888;
        }

        .auth-toggle span {
          color: #667eea;
          cursor: pointer;
          font-weight: 700;
          margin-left: 5px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .error-message {
          color: #ff4d4d;
          background: rgba(255, 77, 77, 0.1);
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.95rem;
          border-left: 4px solid #ff4d4d;
        }

        /* Avatar Selector Styles */
        .avatar-modal {
          max-width: 600px;
        }
        .avatar-selector {
          display: flex;
          flex-direction: column;
          gap: 30px;
          align-items: center;
        }
        .preview-container {
          padding: 30px;
          background: #1a1a1a;
          border-radius: 20px;
          border: 1px solid #444;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        }
        .avatar-preview {
          width: 100px;
          height: 100px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.3s;
        }
        .avatar-preview img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .selector-group {
          width: 100%;
        }
        .selector-group h4 {
          margin-bottom: 16px;
          color: #888;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-align: left;
        }
        .sprite-options, .color-options {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .sprite-option {
          width: 56px;
          height: 56px;
          background: #333;
          border: 3px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          padding: 6px;
          transition: all 0.2s;
        }
        .sprite-option.selected {
          border-color: #667eea;
          background: #444;
          transform: scale(1.1);
        }
        .sprite-option img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        .color-option {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .color-option.selected {
          border-color: #fff;
          transform: scale(1.2) rotate(45deg);
          border-radius: 8px;
        }
        .modal-footer {
          margin-top: 30px;
          width: 100%;
        }

        /* Game styles */
        .game-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .game-container-wrapper {
          border: 4px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
          background: #000;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        /* Chat Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes bounce-in {
          0% { transform: translate(-50%, -20px) scale(0.9); opacity: 0; }
          70% { transform: translate(-50%, 5px) scale(1.05); }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* Toolbar Styles */
        .toolbar-btn {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          cursor: pointer;
        }

        .toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .toolbar-btn:active {
          transform: translateY(0) scale(0.95);
        }

        .toolbar-tooltip {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%) translateY(10px);
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .group:hover .toolbar-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .server-status {
          margin-top: 15px;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 0.9rem;
          text-align: center;
          display: inline-block;
        }

        .server-status.warning {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .video-call-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          border-radius: 16px;
          padding: 20px;
          z-index: 2000;
          border: 2px solid #667eea;
          backdrop-filter: blur(10px);
          min-width: 400px;
          max-width: 90%;
        }

        .video-call-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #444;
        }

        .video-call-header h3 {
          color: #10b981;
          font-size: 16px;
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
        }

        .video-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .video-participant {
          position: relative;
          width: 80px;
          height: 80px;
          background: #333;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .video-participant.local {
          border: 2px solid #667eea;
        }

        .video-participant.remote {
          border: 2px solid #333;
        }

        .participant-avatar {
          width: 40px;
          height: 40px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }

        .participant-name {
          font-size: 11px;
          margin-top: 4px;
          color: #ccc;
        }

        .video-status {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          color: #10b981;
        }

        .video-status.local-status {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          color: #ef4444;
        }

        .distance-badge {
          background: #10b981;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
        }

        .camera-preview {
          width: 100%;
          height: 100%;
          background: #333;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-preview.camera-off {
          background: #111;
        }

        .camera-off-icon {
          font-size: 30px;
          color: #555;
        }

        .preview-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .preview-avatar {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }

        .remote-camera {
          width: 100%;
          height: 100%;
          background: #444;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-controls {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #444;
          color: #fff;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover {
          background: #667eea;
        }

        .control-btn.active {
          background: #10b981;
        }

        .control-btn.mute:hover {
          background: #f59e0b;
        }

        .control-btn.camera:hover {
          background: #3b82f6;
        }

        .control-btn.screen:hover {
          background: #8b5cf6;
        }

        .control-btn.leave:hover {
          background: #ef4444;
        }

        @media (max-width: 768px) {
          .game-ui-overlay {
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .chat-sidebar {
            width: 200px;
            top: 60px;
            right: 10px;
          }

          .minimap {
            width: 100px;
            height: 100px;
          }

          .video-call-overlay {
            width: 90%;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
