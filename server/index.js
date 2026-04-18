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

const app    = express();
const server = http.createServer(app);
// CORS configuration
const allowedOrigins = [
  'https://bugbl.vercel.app',
  'http://localhost:5173', 
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Log the incoming origin for debugging
    if (origin) console.log(`[CORS Request] Origin: ${origin}`);
    
    // Check if origin is allowed
    const isAllowed = !origin || 
                     allowedOrigins.includes(origin) || 
                     origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS Rejected] Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io initialization
const io = new Server(server, {
  cors: corsOptions,
  pingInterval: 30000,
  pingTimeout:  60000,
  maxHttpBufferSize: 1e6,
  transports: ['polling', 'websocket'] // Sync with frontend
});

// Game
const gameManager = new GameManager();
registerHandlers(io, gameManager);

// Health & stats
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/stats',  (_req, res) => res.json(gameManager.getStats()));

// Start
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bugbl] Server listening on port ${PORT} (${NODE_ENV})`);
  console.log(`[Bugbl] Allowed Client: ${CLIENT_URL}`);
});

// Graceful shutdown
const shutdown = () => { gameManager.destroy(); server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
