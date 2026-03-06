// server/index.ts
import express, {} from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
// Middleware
app.use(cors());
app.use(express.json());
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const rooms = new Map();
// Initialize default rooms
function initializeRooms() {
    const officeRoom = {
        id: 'office',
        players: new Map(),
        maxPlayers: 20,
    };
    const conferenceRoom = {
        id: 'conference',
        players: new Map(),
        maxPlayers: 8,
    };
    rooms.set('office', officeRoom);
    rooms.set('conference', conferenceRoom);
}
initializeRooms();
// Helper to broadcast player movement within a room
function broadcastPlayerMovement(room, excludedSocketId, data) {
    room.players.forEach((player, socketId) => {
        if (socketId !== excludedSocketId) {
            io.to(socketId).emit('player-moved', {
                id: data.id,
                x: data.x,
                y: data.y,
                direction: data.direction,
            });
        }
    });
}
// Helper to broadcast player list within a room
function broadcastPlayerList(room) {
    const players = Array.from(room.players.values()).map((p) => ({
        id: p.id,
        username: p.username,
        x: p.x,
        y: p.y,
        direction: p.direction,
    }));
    room.players.forEach((_, socketId) => {
        io.to(socketId).emit('current-players', players);
    });
}
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    // Handle joining a room
    socket.on('join-room', (data) => {
        const { username, room: roomName } = data;
        // Find the room
        const room = rooms.get(roomName);
        if (!room) {
            socket.emit('error', { message: `Room '${roomName}' does not exist` });
            return;
        }
        // Check if room is full
        if (room.players.size >= room.maxPlayers) {
            socket.emit('error', { message: `Room '${roomName}' is full` });
            return;
        }
        // Remove from any other room (cleanup)
        rooms.forEach((r, roomKey) => {
            if (r.players.has(socket.id)) {
                r.players.delete(socket.id);
                io.to(roomKey).emit('player-disconnected', { id: socket.id });
            }
        });
        // Add player to room
        const playerState = {
            id: socket.id,
            username: username || `Guest_${socket.id.substring(0, 8)}`,
            x: 400,
            y: 300,
            direction: 'down',
            room: roomName,
            lastActivity: Date.now(),
        };
        room.players.set(socket.id, playerState);
        // Emit confirmation to the joining player
        socket.emit('joined-room', {
            playerId: socket.id,
            username: playerState.username,
            room: roomName,
        });
        // Broadcast to existing players in the room
        room.players.forEach((_, socketId) => {
            if (socketId !== socket.id) {
                io.to(socketId).emit('player-joined', {
                    id: socket.id,
                    username: playerState.username,
                    x: playerState.x,
                    y: playerState.y,
                    direction: playerState.direction,
                });
            }
        });
        // Send current players list to the new player
        const existingPlayers = Array.from(room.players.values()).map((p) => ({
            id: p.id,
            username: p.username,
            x: p.x,
            y: p.y,
            direction: p.direction,
        }));
        socket.emit('current-players', existingPlayers);
        console.log(`${playerState.username} joined room: ${roomName}`);
    });
    // Handle player movement
    socket.on('player-movement', (data) => {
        const room = rooms.get(data.direction === 'up' || data.direction === 'down' ? 'office' : 'office');
        // Find room by player
        let playerRoom;
        let playerState;
        rooms.forEach((r) => {
            const p = r.players.get(socket.id);
            if (p) {
                playerRoom = r;
                playerState = p;
            }
        });
        if (!playerRoom || !playerState) {
            return;
        }
        // Update player position
        playerState.x = data.x;
        playerState.y = data.y;
        playerState.direction = data.direction;
        playerState.lastActivity = Date.now();
        // Broadcast to other players in the room
        broadcastPlayerMovement(playerRoom, socket.id, {
            id: socket.id,
            x: data.x,
            y: data.y,
            direction: data.direction,
        });
    });
    // Handle disconnection
    socket.on('disconnect', () => {
        rooms.forEach((room) => {
            if (room.players.has(socket.id)) {
                const player = room.players.get(socket.id);
                room.players.delete(socket.id);
                // Notify other players
                room.players.forEach((_, socketId) => {
                    io.to(socketId).emit('player-disconnected', { id: socket.id });
                });
                console.log(`${player.username} disconnected from room: ${room.id}`);
            }
        });
    });
    // Handle proximity chat detection
    socket.on('check-proximity', (data) => {
        let nearbyPlayers = [];
        rooms.forEach((room) => {
            room.players.forEach((player, socketId) => {
                if (socketId !== socket.id) {
                    const distance = Math.sqrt(Math.pow(player.x - data.x, 2) + Math.pow(player.y - data.y, 2));
                    if (distance < 200) { // 200 pixels = proximity threshold
                        nearbyPlayers.push({
                            id: socketId,
                            username: player.username,
                            x: player.x,
                            y: player.y,
                        });
                    }
                }
            });
        });
        socket.emit('proximity-update', { nearbyPlayers, distance: 200 });
    });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Available rooms: ${Array.from(rooms.keys()).join(', ')}`);
});
//# sourceMappingURL=index.js.map