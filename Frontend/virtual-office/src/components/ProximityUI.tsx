import React, { useState, useEffect, useRef } from 'react';
import { SocketService } from '../game/services/SocketService';

interface ProximityUIProps {
  participants: { id: string; username: string; distance: number }[];
  onStartVideoCall: (url: string) => void;
  currentUsername: string;
}

interface Message {
  senderId: string;
  senderUsername: string;
  message: string;
  timestamp: number;
}

export const ProximityUI: React.FC<ProximityUIProps> = ({ participants, onStartVideoCall, currentUsername }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [incomingCall, setIncomingCall] = useState<{ callerId: string, callerUsername: string } | null>(null);
  const [callToasts, setCallToasts] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const incomingCallTimeoutRef = useRef<number | null>(null);
  const socket = SocketService.getInstance().getSocket();

  const pushToast = (message: string) => {
    setCallToasts(prev => [...prev, message]);
    window.setTimeout(() => {
      setCallToasts(prev => prev.filter(t => t !== message));
    }, 3000);
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleProximityChatReceive = (data: Message) => {
      setMessages(prev => [...prev, data]);
    };

    const handleIncomingVideoCall = (data: { callerId: string, callerUsername: string }) => {
      setIncomingCall(data);
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
      }
      incomingCallTimeoutRef.current = window.setTimeout(() => {
        setIncomingCall((current) => {
          if (!current || current.callerId !== data.callerId) return current;
          socket.emit('video-call-reject', { callerId: data.callerId, reason: 'missed' });
          pushToast(`Missed call from ${data.callerUsername}`);
          return null;
        });
      }, 20000);
    };

    const handleCallAccepted = (data: { accepterId: string, accepterUsername: string, roomUrl: string }) => {
      onStartVideoCall(data.roomUrl);
    };

    const handleCallRejected = (data: { rejecterId: string, rejecterUsername: string, reason?: string }) => {
      if (data.reason === 'missed') {
        pushToast(`${data.rejecterUsername} missed your video call.`);
        return;
      }
      pushToast(`${data.rejecterUsername} declined your video call request.`);
    };

    socket.on('proximity-chat-receive', handleProximityChatReceive);
    socket.on('incoming-video-call', handleIncomingVideoCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);

    return () => {
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      socket.off('proximity-chat-receive', handleProximityChatReceive);
      socket.off('incoming-video-call', handleIncomingVideoCall);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
    };
  }, [socket, onStartVideoCall]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && socket) {
      socket.emit('proximity-chat', { message: inputText.trim() });
      setInputText('');
    }
  };

  const handleCallRequest = (targetId: string) => {
    if (socket) {
      socket.emit('video-call-request', { targetId });
    }
  };

  const acceptCall = () => {
    if (socket && incomingCall) {
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      socket.emit('video-call-accept', { callerId: incomingCall.callerId });
      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    if (socket && incomingCall) {
      if (incomingCallTimeoutRef.current) {
        window.clearTimeout(incomingCallTimeoutRef.current);
        incomingCallTimeoutRef.current = null;
      }
      socket.emit('video-call-reject', { callerId: incomingCall.callerId, reason: 'declined' });
      setIncomingCall(null);
    }
  };

  // Only render if there are participants in proximity, OR an incoming call
  if (participants.length === 0 && !incomingCall) {
    return null;
  }

  return (
    <div className="proximity-ui-container">
      {incomingCall && (
        <div className="incoming-call-dialog pointer-events-auto animate-pulse shadow-lg bg-indigo-600/90 border border-indigo-400 p-4 rounded-xl mb-4 backdrop-blur text-white">
          <h3 className="font-bold text-lg mb-2">Incoming Video Call!</h3>
          <p className="text-sm mb-4"><strong>{incomingCall.callerUsername}</strong> is calling you...</p>
          <div className="flex gap-2">
            <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold transition-all shadow-md" onClick={acceptCall}>Accept</button>
            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-bold transition-all shadow-md" onClick={rejectCall}>Decline</button>
          </div>
        </div>
      )}
      <div className="proximity-toast-stack pointer-events-none">
        {callToasts.map((toast, idx) => (
          <div key={`${toast}-${idx}`} className="proximity-toast">
            {toast}
          </div>
        ))}
      </div>

      <div className="proximity-chat-box bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
        <div className="header bg-gradient-to-r from-slate-800 to-slate-900 p-3 border-b border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Proximity Chat
          </h3>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300 font-medium">
            {participants.length} nearby
          </span>
        </div>
        
        <div className="participants-list p-2 border-b border-slate-800 bg-slate-800/30 flex gap-2 overflow-x-auto custom-scrollbar">
          {participants.map(p => (
            <div key={p.id} className="participant-chip bg-slate-700/50 rounded-lg p-2 flex items-center gap-2 border border-slate-600/50 shadow-sm shrink-0 hover:bg-slate-700 transition cursor-default">
              <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {p.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-200">{p.username}</span>
              <button 
                onClick={() => handleCallRequest(p.id)}
                className="ml-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white rounded p-1 transition"
                title="Start Video Call"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="messages flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm mt-4 italic font-medium">Say hi to players nearby!</div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderUsername === currentUsername;
              return (
                <div key={i} className={`message flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] text-slate-400 font-medium mb-1 ml-1">{msg.senderUsername}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm ${
                    isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-slate-800/80 border-t border-slate-700 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type nearby..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
          />
          <button type="submit" disabled={!inputText.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium transition shadow-md flex items-center justify-center">
            <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
      </div>

      <style>{`
        .proximity-ui-container {
          position: absolute;
          left: 20px;
          top: 20px;
          bottom: 120px;
          width: 320px;
          z-index: 60;
          display: flex;
          flex-direction: column;
          pointer-events: none; /* Let clicks pass through container */
        }
        .proximity-chat-box {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .incoming-call-dialog {
          pointer-events: auto;
        }
        .proximity-toast-stack {
          position: absolute;
          top: 0;
          right: -8px;
          transform: translateX(100%);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .proximity-toast {
          background: rgba(15, 23, 42, 0.9);
          color: #e2e8f0;
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          max-width: 220px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};
