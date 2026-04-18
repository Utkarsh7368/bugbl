import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
console.log('[Socket] Initializing with SERVER_URL:', SERVER_URL);

const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['polling', 'websocket'], // Polling first for better compatibility
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

// Debug logging in development
if (import.meta.env.DEV) {
  socket.onAny((event, ...args) => {
    if (event !== 'timer' && event !== 'draw') {
      console.log(`[Socket] ${event}`, args);
    }
  });
}

export default socket;
