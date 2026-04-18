/**
 * Bugbl.io Server Entry Point
 */
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const cors     = require('cors');

const GameManager           = require('./game/GameManager');
const { registerHandlers }  = require('./socket/handlers');

const PORT     = process.env.PORT     || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app    = express();
const server = http.createServer(app);

// CORS
const allowedOrigins = [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Socket.io  (in-memory only — no Redis)
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingInterval: 25000,
  pingTimeout:  60000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling']
});

// Game
const gameManager = new GameManager();
registerHandlers(io, gameManager);

// Serve built frontend in production
if (NODE_ENV === 'production') {
  const clientBuild = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

// Health & stats
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/stats',  (_req, res) => res.json(gameManager.getStats()));

// Start
server.listen(PORT, () => {
  console.log(`[Bugbl] Server listening on port ${PORT} (${NODE_ENV})`);
  console.log(`[Bugbl] Client URL: ${CLIENT_URL}`);
});

// Graceful shutdown
const shutdown = () => { gameManager.destroy(); server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
