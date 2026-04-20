require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For development
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Set socket.io on app locally so routes can access it
app.set('io', io);

app.use('/api', apiRoutes);

// Socket.io Real-time logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.warn('⚠️ MONGO_URI is not set in .env! Backend cannot persist data until configured.');
} else {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      server.listen(PORT, () => {
        console.log(`🚀 Issue Analysis Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Failed to connect to MongoDB', err);
    });
}
