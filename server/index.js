/**
 * Bugbl.io Server Entry Point
 * 
 * Features:
 * - Express + Socket.io with CORS
 * - Redis adapter for horizontal scaling (graceful fallback)
 * - Node.js cluster mode for multi-core utilization
 * - Health/stats endpoint
 */
const cluster = require('node:cluster');
const os = require('node:os');
const path = require('node:path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER === 'true';
const NUM_WORKERS = parseInt(process.env.NUM_WORKERS) || os.cpus().length;

/**
 * Cluster Mode (production)
 * Primary process forks workers; each worker runs the server
 */
if (ENABLE_CLUSTER && cluster.isPrimary) {
  console.log(`[Primary] PID: ${process.pid}`);
  console.log(`[Primary] Forking ${NUM_WORKERS} workers...`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    console.log(`[Primary] Worker ${worker.process.pid} exited (code ${code}). Restarting...`);
    cluster.fork();
  });
} else {
  startServer();
}

async function startServer() {
  const express = require('express');
  const http = require('http');
  const { Server } = require('socket.io');
  const cors = require('cors');

  const GameManager = require('./game/GameManager');
  const { registerHandlers } = require('./socket/handlers');

  const app = express();
  const server = http.createServer(app);

  // CORS configuration
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  }));
  app.use(express.json());

  // Socket.io setup with compression
  const io = new Server(server, {
    cors: {
      origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Performance optimizations
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6, // 1MB max payload
    perMessageDeflate: {
      threshold: 2048 // Only compress messages > 2KB
    },
    transports: ['websocket', 'polling']
  });

  // Try to set up Redis adapter for horizontal scaling
  try {
    const REDIS_URL = process.env.REDIS_URL;
    if (REDIS_URL) {
      const { createClient } = require('redis');
      const { createAdapter } = require('@socket.io/redis-adapter');

      const pubClient = createClient({ url: REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));

      console.log(`[Server] Redis adapter connected ✓`);

      // Handle Redis errors gracefully
      pubClient.on('error', (err) => console.error('[Redis Pub] Error:', err.message));
      subClient.on('error', (err) => console.error('[Redis Sub] Error:', err.message));
    } else {
      console.log(`[Server] Running without Redis (single-instance mode)`);
    }
  } catch (err) {
    console.warn(`[Server] Redis unavailable, falling back to in-memory: ${err.message}`);
  }

  // Initialize game manager
  const gameManager = new GameManager();

  // Register socket handlers
  registerHandlers(io, gameManager);

  // Serve static files in production
  if (NODE_ENV === 'production') {
    const clientBuild = path.resolve(__dirname, '../client/dist');
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Stats endpoint (for monitoring)
  app.get('/api/stats', (req, res) => {
    const stats = gameManager.getStats();
    res.json(stats);
  });

  // Start server
  server.listen(PORT, () => {
    const workerId = cluster.worker ? cluster.worker.id : 'single';
    console.log(`[Server] Worker ${workerId} listening on port ${PORT}`);
    console.log(`[Server] Environment: ${NODE_ENV}`);
    console.log(`[Server] Client URL: ${CLIENT_URL}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down...');
    gameManager.destroy();
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, shutting down...');
    gameManager.destroy();
    server.close(() => process.exit(0));
  });
}
