/**
 * GameManager - manages all rooms, matchmaking, and room lifecycle
 * Designed for scalability with efficient room lookup and cleanup
 */
const { v4: uuidv4 } = require('uuid');
const Room = require('./Room');
const Player = require('./Player');

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomId → Room
    this.playerRooms = new Map(); // socketId → roomId (quick lookup)

    // Periodic cleanup every 30 seconds
    this._cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  /**
   * Create a new room
   * @returns {Room}
   */
  createRoom(hostSocketId, hostName, settings = {}) {
    const roomId = this._generateRoomCode();
    const room = new Room(roomId, hostSocketId, { ...settings, isPrivate: true });
    const player = new Player(hostSocketId, hostName);

    room.addPlayer(player);
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostSocketId, roomId);

    return room;
  }

  /**
   * Join an existing room
   * @returns {{ room: Room, player: Player } | null}
   */
  joinRoom(roomId, socketId, name) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.players.size >= room.maxPlayers) return null;
    if (room.state !== Room.STATES.WAITING) return null;

    const player = new Player(socketId, name);
    if (!room.addPlayer(player)) return null;

    this.playerRooms.set(socketId, roomId);
    return { room, player };
  }

  /**
   * Quick play - find an available public room or create one
   * @returns {{ room: Room, player: Player }}
   */
  quickPlay(socketId, name) {
    // Find a public room that's not full
    for (const [, room] of this.rooms) {
      if (
        !room.isPrivate &&
        room.players.size < room.maxPlayers
      ) {
        const player = new Player(socketId, name);
        if (room.addPlayer(player)) {
          this.playerRooms.set(socketId, room.id);
          return { room, player };
        }
      }
    }

    // No available room — create a new public one
    const roomId = this._generateRoomCode();
    const room = new Room(roomId, socketId, { isPrivate: false });
    const player = new Player(socketId, name);

    room.addPlayer(player);
    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);

    return { room, player };
  }

  /**
   * Handle player disconnect
   * @returns {{ room: Room, player: Player } | null}
   */
  handleDisconnect(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return null;
    }

    const player = room.removePlayer(socketId);
    this.playerRooms.delete(socketId);

    // Clean up empty rooms immediately
    if (room.isEmpty()) {
      room._clearTimers();
      this.rooms.delete(roomId);
    }

    return player ? { room, player } : null;
  }

  /**
   * Get the room a player is in
   */
  getPlayerRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Clean up empty and idle rooms
   */
  cleanup() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      if (room.isEmpty()) {
        room._clearTimers();
        this.rooms.delete(roomId);
        continue;
      }

      // Remove rooms idle for more than 5 minutes
      if (room.isIdle(300000)) {
        // Disconnect remaining players
        for (const [socketId] of room.players) {
          this.playerRooms.delete(socketId);
        }
        room._clearTimers();
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Generate a short, readable room code
   */
  _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) return this._generateRoomCode();
    return code;
  }

  /**
   * Get stats for monitoring
   */
  getStats() {
    let totalPlayers = 0;
    let activeGames = 0;

    for (const [, room] of this.rooms) {
      totalPlayers += room.players.size;
      if (room.state !== Room.STATES.WAITING && room.state !== Room.STATES.GAME_OVER) {
        activeGames++;
      }
    }

    return {
      totalRooms: this.rooms.size,
      totalPlayers,
      activeGames,
      timestamp: Date.now()
    };
  }

  /**
   * Destroy the manager (cleanup intervals)
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
    for (const [, room] of this.rooms) {
      room._clearTimers();
    }
    this.rooms.clear();
    this.playerRooms.clear();
  }
}

module.exports = GameManager;
