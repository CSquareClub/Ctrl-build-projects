require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize HTTP server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow frontend to connect during hackathon
        methods: ["GET", "POST"]
    }
});

// --- REST API ENDPOINTS ---
app.get('/', (req, res) => {
    res.send({ status: "FocusRoom Node Backend is LIVE!" });
});

app.post('/api/create-room', (req, res) => {
    // TODO Phase 2: Save room data to DB
    res.status(200).json({ message: "Room creation endpoint ready" });
});

// --- WEBSOCKETS (Live Timers & AI Alerts) ---
io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`👤 User ${socket.id} joined room: ${roomId}`);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('camera-alert', (data) => {
        const { roomId, userId, reason } = data;
        console.log(`⚠️ DISTRACTION: User ${userId} in Room ${roomId} due to ${reason}`);
        io.to(roomId).emit('pause-timer', {
            guiltyUser: userId,
            message: `Timer paused! ${userId} is distracted!`
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔴 User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Node Server running on http://localhost:${PORT}`);
});