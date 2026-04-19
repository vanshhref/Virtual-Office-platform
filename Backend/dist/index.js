// Backend/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoomManager } from './services/RoomManager.js';
import { dbService } from './services/Database.js';
import authRoutes from './routes/auth.js';
// Load environment variables
dotenv.config();
const app = express();
const httpServer = createServer(app);
// Configure Middleware
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:3000',
    'http://localhost:3001',
].filter(Boolean);
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express.json());
// Initialize Database
dbService.init().then(() => {
    console.log('? Database initialized');
}).catch((err) => {
    console.error('? Database initialization failed:', err);
});
// Routes
app.use('/auth', authRoutes);
// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});
// Initialize Room Manager
const roomManager = new RoomManager();
// Health check endpoint
app.get('/health', (req, res) => {
    const stats = roomManager.getStats();
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        ...stats,
        timestamp: new Date().toISOString(),
    });
});
// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log(`\n?? New connection: ${socket.id}`);
    // EVENT: Player joins a room
    socket.on('join-room', (data) => {
        const { roomId, username, x, y, userId, avatarSprite, avatarColor, avatarProfile } = data;
        // Create player object
        const newPlayer = {
            id: socket.id,
            userId: userId || 'anonymous',
            username,
            x,
            y,
            direction: 'down',
            animation: 'idle-down',
            roomId,
            lastUpdate: Date.now(),
            avatarSprite,
            avatarColor,
            ...(avatarProfile ? { avatarProfile } : {}),
            status: 'online',
        };
        // Get existing players in room BEFORE adding new player
        const existingPlayers = roomManager.getPlayersInRoom(roomId);
        // Add player to room
        roomManager.addPlayerToRoom(roomId, newPlayer);
        // Join the Socket.IO room
        socket.join(roomId);
        // Send existing players to the new player
        socket.emit('existing-players', existingPlayers);
        // Notify other players in the room about the new player
        socket.to(roomId).emit('player-joined', newPlayer);
        // Send confirmation to the player
        socket.emit('join-room-success', {
            playerId: socket.id,
            roomId,
            playerCount: existingPlayers.length + 1,
        });
        // If someone is already broadcasting mic in this room, connect newcomer immediately.
        const activeSpeakerId = roomManager.getMicSpeaker(roomId);
        if (activeSpeakerId && activeSpeakerId !== socket.id) {
            const activeSpeaker = roomManager.getPlayer(activeSpeakerId);
            io.to(activeSpeakerId).emit('mic-broadcast-started', { listenerIds: [socket.id] });
            socket.emit('incoming-mic-broadcast', { speakerId: activeSpeakerId });
            socket.emit('mic-speaker-changed', {
                speakerId: activeSpeakerId,
                speakerUsername: activeSpeaker?.username || 'Unknown',
                isActive: true
            });
        }
    });
    // EVENT: Player movement
    socket.on('player-movement', (data) => {
        const { x, y, direction, animation, status } = data;
        // Update player position in room manager
        const updatedPlayer = roomManager.updatePlayerPosition(socket.id, x, y, direction, animation);
        if (updatedPlayer) {
            if (status)
                updatedPlayer.status = status;
            const roomId = roomManager.getPlayerRoom(socket.id);
            if (roomId) {
                // Broadcast to all OTHER players in the same room
                socket.to(roomId).emit('player-moved', {
                    id: socket.id,
                    x,
                    y,
                    direction,
                    animation,
                    status: updatedPlayer.status,
                });
            }
        }
    });
    // EVENT: Player disconnects
    socket.on('disconnect', () => {
        const player = roomManager.getPlayer(socket.id);
        const roomId = roomManager.removePlayer(socket.id);
        if (roomId && player) {
            socket.to(roomId).emit('player-left', {
                id: socket.id,
                username: player.username,
            });
            // Clear mic speaker if they disconnect
            if (roomManager.getMicSpeaker(roomId) === socket.id) {
                roomManager.setMicSpeaker(roomId, null);
                socket.to(roomId).emit('mic-broadcast-stopped', { speakerId: socket.id });
            }
        }
    });
    // --- WebRTC signaling for Mic Broadcast ---
    socket.on('mic-broadcast-start', () => {
        const roomId = roomManager.getPlayerRoom(socket.id);
        if (!roomId)
            return;
        roomManager.setMicSpeaker(roomId, socket.id);
        // Broadcast to everyone in the same room/session (guest or registered).
        const listeners = roomManager.getPlayersInRoom(roomId).filter((p) => p.id !== socket.id);
        // Notify speaker of all target listeners
        socket.emit('mic-broadcast-started', {
            listenerIds: listeners.map(p => p.id)
        });
        const speaker = roomManager.getPlayer(socket.id);
        io.to(roomId).emit('mic-speaker-changed', {
            speakerId: socket.id,
            speakerUsername: speaker?.username || 'Unknown',
            isActive: true
        });
        // Notify listeners that a broadcast is starting so they can prepare to receive
        listeners.forEach(listener => {
            if (listener.id !== socket.id) {
                io.to(listener.id).emit('incoming-mic-broadcast', { speakerId: socket.id });
            }
        });
    });
    socket.on('mic-broadcast-stop', () => {
        const roomId = roomManager.getPlayerRoom(socket.id);
        if (!roomId)
            return;
        if (roomManager.getMicSpeaker(roomId) === socket.id) {
            roomManager.setMicSpeaker(roomId, null);
            // Notify everyone in the room to stop listening
            socket.to(roomId).emit('mic-broadcast-stopped', { speakerId: socket.id });
            io.to(roomId).emit('mic-speaker-changed', {
                speakerId: socket.id,
                speakerUsername: null,
                isActive: false
            });
        }
    });
    // Relay WebRTC Offer
    socket.on('webrtc-offer', (data) => {
        io.to(data.targetId).emit('webrtc-offer', {
            senderId: socket.id,
            sdp: data.sdp
        });
    });
    // Relay WebRTC Answer
    socket.on('webrtc-answer', (data) => {
        io.to(data.targetId).emit('webrtc-answer', {
            senderId: socket.id,
            sdp: data.sdp
        });
    });
    // Relay ICE Candidate
    socket.on('webrtc-ice-candidate', (data) => {
        io.to(data.targetId).emit('webrtc-ice-candidate', {
            senderId: socket.id,
            candidate: data.candidate
        });
    });
    // --- Proximity Chat and Private Video Call ---
    const PROXIMITY_RADIUS = 200;
    socket.on('proximity-chat', (data) => {
        const roomId = roomManager.getPlayerRoom(socket.id);
        const player = roomManager.getPlayer(socket.id);
        if (!roomId || !player)
            return;
        // Get nearby players
        const nearbyPlayers = roomManager.getPlayersNear(roomId, player.x, player.y, PROXIMITY_RADIUS);
        // Broadcast message to all nearby players including sender
        nearbyPlayers.forEach(p => {
            io.to(p.id).emit('proximity-chat-receive', {
                senderId: player.id,
                senderUsername: player.username,
                message: data.message,
                timestamp: Date.now()
            });
        });
    });
    socket.on('video-call-request', (data) => {
        const player = roomManager.getPlayer(socket.id);
        if (!player)
            return;
        // Send request to target
        io.to(data.targetId).emit('incoming-video-call', {
            callerId: socket.id,
            callerUsername: player.username
        });
    });
    socket.on('video-call-accept', (data) => {
        const player = roomManager.getPlayer(socket.id);
        if (!player)
            return;
        // Generate pseudo-random room ID for daily.co private room fallback
        const privateRoomUrl = `https://your-domain.daily.co/proximity-${Math.random().toString(36).substring(7)}`;
        // Notify caller that call was accepted
        io.to(data.callerId).emit('call-accepted', {
            accepterId: socket.id,
            accepterUsername: player.username,
            roomUrl: privateRoomUrl
        });
        // Also send the room url back to the accepter
        socket.emit('call-accepted', {
            accepterId: socket.id,
            accepterUsername: player.username,
            roomUrl: privateRoomUrl
        });
    });
    socket.on('video-call-reject', (data) => {
        const player = roomManager.getPlayer(socket.id);
        if (!player)
            return;
        io.to(data.callerId).emit('call-rejected', {
            rejecterId: socket.id,
            rejecterUsername: player.username,
            reason: data.reason || 'declined'
        });
    });
    socket.on('update-avatar', (data) => {
        const roomId = roomManager.getPlayerRoom(socket.id);
        if (!roomId)
            return;
        const updated = roomManager.updatePlayerAvatar(socket.id, data.avatarSprite, data.avatarColor, data.avatarProfile);
        if (!updated)
            return;
        socket.to(roomId).emit('player-avatar-updated', {
            id: socket.id,
            avatarSprite: updated.avatarSprite,
            avatarColor: updated.avatarColor,
            avatarProfile: updated.avatarProfile
        });
    });
});
// Start server
const PORT = process.env.PORT || 4000;
httpServer.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Stop the other backend process or change PORT in .env.`);
        return;
    }
    console.error('❌ HTTP server error:', err);
});
httpServer.listen(PORT, () => {
    console.log(`\n?? Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map