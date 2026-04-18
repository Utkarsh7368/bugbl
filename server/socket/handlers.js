/**
 * Socket.io event handlers for Bugbl.io
 * All game events are handled here with rate limiting
 */
const RateLimiter = require('./rateLimiter');

const rateLimiter = new RateLimiter();

// Cleanup rate limiter periodically
setInterval(() => rateLimiter.cleanup(), 60000);

function registerHandlers(io, gameManager) {
  // AFK config
  const AFK_WARN_MS       = 13 * 60 * 1000;  // 13 min → warning
  const AFK_KICK_MS       = 15 * 60 * 1000;  // 15 min → disconnect
  const afkTimers = new Map(); // socketId → { warnTimer, kickTimer }

  function resetAfkTimers(socketId) {
    const existing = afkTimers.get(socketId);
    if (existing) {
      clearTimeout(existing.warnTimer);
      clearTimeout(existing.kickTimer);
    }

    const sock = io.sockets.sockets.get(socketId);
    if (!sock) return;

    const warnTimer = setTimeout(() => {
      const s = io.sockets.sockets.get(socketId);
      if (s) s.emit('afk-warning', { secondsLeft: 120 });
    }, AFK_WARN_MS);

    const kickTimer = setTimeout(() => {
      const s = io.sockets.sockets.get(socketId);
      if (s) {
        s.emit('afk-disconnected', { reason: 'Disconnected due to inactivity (AFK).' });
        setTimeout(() => s.disconnect(true), 300);
      }
    }, AFK_KICK_MS);

    afkTimers.set(socketId, { warnTimer, kickTimer });
  }

  io.on('connection', (socket) => {
    console.log(`[Connect] ${socket.id}`);
    resetAfkTimers(socket.id);

    // Reset AFK on any activity
    socket.onAny((event) => {
      const passiveEvents = new Set(['disconnect', 'error']);
      if (!passiveEvents.has(event)) resetAfkTimers(socket.id);
    });

    /**
     * CREATE ROOM
     * payload: { name, settings: { maxRounds, drawTime, maxPlayers } }
     */
    socket.on('create-room', (payload, callback) => {
      try {
        const { name, settings } = payload;
        if (!name || name.trim().length === 0) {
          return callback({ error: 'Name is required' });
        }

        const room = gameManager.createRoom(socket.id, name.trim().slice(0, 20), settings);
        socket.join(room.id);

        callback({
          success: true,
          roomId: room.id,
          room: room.toJSON(socket.id)
        });

        console.log(`[Room Created] ${room.id} by ${name}`);
      } catch (err) {
        console.error('[create-room error]', err);
        callback({ error: 'Failed to create room' });
      }
    });

    /**
     * JOIN ROOM
     * payload: { name, roomId }
     */
    socket.on('join-room', (payload, callback) => {
      try {
        const { name, roomId } = payload;
        if (!name || !roomId) {
          return callback({ error: 'Name and room code are required' });
        }

        const result = gameManager.joinRoom(roomId.toUpperCase(), socket.id, name.trim().slice(0, 20));
        if (!result) {
          return callback({ error: 'Room not found, full, or already started' });
        }

        socket.join(result.room.id);

        // For public rooms wire callbacks if needed
        if (!result.room.isPrivate && !result.room.onStateChange) {
          setupRoomCallbacks(io, result.room);
        }

        // Notify everyone in the room
        io.to(result.room.id).emit('room-update', {
          room: result.room.toJSON(),
          message: `${name} joined the room!`,
          type: 'player-join'
        });

        callback({
          success: true,
          roomId: result.room.id,
          room: result.room.toJSON(socket.id)
        });

        console.log(`[Join Room] ${name} → ${roomId}`);
      } catch (err) {
        console.error('[join-room error]', err);
        callback({ error: 'Failed to join room' });
      }
    });

    /**
     * QUICK PLAY
     * payload: { name }
     */
    socket.on('quick-play', (payload, callback) => {
      try {
        const { name } = payload;
        if (!name || name.trim().length === 0) {
          return callback({ error: 'Name is required' });
        }

        const result = gameManager.quickPlay(socket.id, name.trim().slice(0, 20));
        socket.join(result.room.id);

        // Wire up callbacks for public rooms (private rooms wire on start-game)
        if (!result.room.isPrivate && !result.room.onStateChange) {
          setupRoomCallbacks(io, result.room);
        }

        // Notify everyone in the room
        io.to(result.room.id).emit('room-update', {
          room: result.room.toJSON(),
          message: `${name} joined the lobby!`,
          type: 'player-join'
        });

        callback({
          success: true,
          roomId: result.room.id,
          room: result.room.toJSON(socket.id)
        });

        // --- Auto-start logic ---
        const playerCount = result.room.getPlayersArray().length;
        if (result.room.autoStart && playerCount >= 2) {
          result.room._startCountdown(5);
        }

        console.log(`[Quick Play] ${name} → ${result.room.id} (${playerCount} players)`);
      } catch (err) {
        console.error('[quick-play error]', err);
        callback({ error: 'Failed to find a game' });
      }
    });

    /**
     * START GAME
     */
    socket.on('start-game', (callback) => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return callback?.({ error: 'Not in a room' });
        if (room.hostId !== socket.id) return callback?.({ error: 'Only the host can start' });

        // Set up room callbacks
        setupRoomCallbacks(io, room);

        const started = room.startGame();
        if (!started) {
          return callback?.({ error: 'Need at least 2 players to start' });
        }

        callback?.({ success: true });
        console.log(`[Game Started] Room ${room.id}`);
      } catch (err) {
        console.error('[start-game error]', err);
        callback?.({ error: 'Failed to start game' });
      }
    });

    /**
     * SELECT WORD (drawer only)
     * payload: { word }
     */
    socket.on('select-word', (payload) => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return;

        const drawer = room.getCurrentDrawer();
        if (!drawer || drawer.socketId !== socket.id) return;

        room.selectWord(payload.word);
      } catch (err) {
        console.error('[select-word error]', err);
      }
    });

    /**
     * DRAW (drawing data from canvas)
     * payload: stroke data
     */
    socket.on('draw', (data) => {
      if (!rateLimiter.allow(socket.id, 'draw')) return;

      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return;

        const drawer = room.getCurrentDrawer();
        if (!drawer || drawer.socketId !== socket.id) return;

        // Store drawing data for late spectators
        room.drawingData.push(data);
        room.lastActivity = Date.now();

        // Broadcast to all others in the room
        socket.to(room.id).emit('draw', data);
      } catch (err) {
        // Silent fail for performance
      }
    });

    /**
     * CLEAR CANVAS
     */
    socket.on('clear-canvas', () => {
      if (!rateLimiter.allow(socket.id, 'clear-canvas')) return;

      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return;

        const drawer = room.getCurrentDrawer();
        if (!drawer || drawer.socketId !== socket.id) return;

        room.drawingData = [];
        room.lastActivity = Date.now();

        socket.to(room.id).emit('clear-canvas');
      } catch (err) {
        // Silent fail
      }
    });

    /**
     * UNDO STROKE
     */
    socket.on('undo', () => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return;

        const drawer = room.getCurrentDrawer();
        if (!drawer || drawer.socketId !== socket.id) return;

        if (room.drawingData.length > 0) {
          room.drawingData.pop();
          room.lastActivity = Date.now();

          // Tell everyone to redraw
          io.to(room.id).emit('full-drawing', room.drawingData);
        }
      } catch (err) {
        // Silent fail
      }
    });

    /**
     * GUESS (chat message / guess attempt)
     * payload: { message }
     */
    socket.on('guess', (payload) => {
      if (!rateLimiter.allow(socket.id, 'guess')) return;

      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        const message = (payload.message || '').trim().slice(0, 200);
        if (!message) return;

        room.lastActivity = Date.now();

        // If game is in drawing state, check for correct guess
        if (room.state === 'DRAWING' && !player.isDrawing) {
          const result = room.processGuess(socket.id, message);

          if (result.correct) {
            // Tell everyone this player guessed correctly
            io.to(room.id).emit('correct-guess', {
              playerName: player.name,
              socketId: socket.id,
              points: result.points,
              players: room.getPlayersArray().map(p => p.toJSON())
            });

            // Send system message
            io.to(room.id).emit('chat-message', {
              type: 'system-correct',
              message: `🎉 ${player.name} guessed the word!`,
              playerName: player.name
            });
            return;
          }

          if (result.close) {
            // Only tell the guesser they're close
            socket.emit('chat-message', {
              type: 'close-guess',
              message: `"${message}" is close!`,
              playerName: 'System'
            });

            // Don't broadcast the close guess to others (it would reveal the word)
            // But broadcast a hidden version
            socket.to(room.id).emit('chat-message', {
              type: 'player',
              message: message,
              playerName: player.name,
              avatar: player.avatar
            });
            return;
          }

          if (result.alreadyGuessed) {
            // Player already guessed - don't show their messages
            return;
          }
        }

        // Regular chat message (or non-drawing phase)
        io.to(room.id).emit('chat-message', {
          type: player.isDrawing ? 'drawer' : 'player',
          message: player.isDrawing ? '🎨 (drawing...)' : message,
          playerName: player.name,
          avatar: player.avatar
        });
      } catch (err) {
        console.error('[guess error]', err);
      }
    });

    /**
     * PLAY AGAIN (after game over)
     */
    socket.on('play-again', (callback) => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return callback?.({ error: 'Not in a room' });

        room.resetGame();
        room.state = 'WAITING';

        io.to(room.id).emit('room-update', {
          room: room.toJSON(),
          message: 'Game reset! Waiting for host to start...',
          type: 'game-reset'
        });

        callback?.({ success: true });
      } catch (err) {
        console.error('[play-again error]', err);
        callback?.({ error: 'Failed to reset game' });
      }
    });

    /**
     * LEAVE ROOM
     */
    socket.on('leave-room', (callback) => {
      try {
        const result = gameManager.handleDisconnect(socket.id);
        if (result) {
          socket.leave(result.room.id);

          if (!result.room.isEmpty()) {
            io.to(result.room.id).emit('room-update', {
              room: result.room.toJSON(),
              message: `${result.player.name} left the room`,
              type: 'player-leave'
            });
          }
        }

        rateLimiter.removeSocket(socket.id);
        callback?.({ success: true });
      } catch (err) {
        console.error('[leave-room error]', err);
        callback?.({ error: 'Failed to leave room' });
      }
    });

    /**
     * VOTE KICK
     * payload: { targetSocketId }
     */
    socket.on('vote-kick', (payload, callback) => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return callback?.({ error: 'Not in a room' });

        const { targetSocketId } = payload;
        const result = room.voteKick(socket.id, targetSocketId);
        if (!result) return callback?.({ error: 'Invalid target' });

        if (result.kicked) {
          // Force-remove the kicked player from Socket.io room
          const targetSock = io.sockets.sockets.get(targetSocketId);
          if (targetSock) {
            targetSock.leave(room.id);
            targetSock.emit('kicked', { reason: 'You were voted out by other players' });
          }
          gameManager.playerRooms.delete(targetSocketId);

          io.to(room.id).emit('room-update', {
            room: room.toJSON(),
            message: `🔨 ${result.targetName} was voted out`,
            type: 'player-kick'
          });
          io.to(room.id).emit('chat-message', {
            type: 'system',
            message: `🔨 ${result.targetName} was removed by vote.`
          });
        } else {
          // Announce vote in progress
          io.to(room.id).emit('chat-message', {
            type: 'system',
            message: `🗳️ Vote to kick ${result.targetName}: ${result.votesCast}/${result.votesNeeded} votes`
          });
          // Structured event so the voter's UI can show progress
          io.to(room.id).emit('vote-kick-progress', {
            targetSocketId,
            targetName: result.targetName,
            votesCast:  result.votesCast,
            votesNeeded: result.votesNeeded,
          });
        }

        callback?.({ success: true, ...result });
      } catch (err) {
        console.error('[vote-kick error]', err);
        callback?.({ error: 'Vote kick failed' });
      }
    });

    /**
     * DISCONNECT
     */
    socket.on('disconnect', () => {
      try {
        const result = gameManager.handleDisconnect(socket.id);
        if (result && !result.room.isEmpty()) {
          io.to(result.room.id).emit('room-update', {
            room: result.room.toJSON(),
            message: `${result.player.name} disconnected`,
            type: 'player-leave'
          });
        }

        rateLimiter.removeSocket(socket.id);

        // Clear AFK timers
        const timers = afkTimers.get(socket.id);
        if (timers) {
          clearTimeout(timers.warnTimer);
          clearTimeout(timers.kickTimer);
          afkTimers.delete(socket.id);
        }

        console.log(`[Disconnect] ${socket.id}`);
      } catch (err) {
        console.error('[disconnect error]', err);
      }
    });

    /**
     * GET DRAWING (for syncing canvas when joining mid-game)
     */
    socket.on('get-drawing', (callback) => {
      try {
        const room = gameManager.getPlayerRoom(socket.id);
        if (!room) return callback?.({ error: 'Not in a room' });
        callback?.({ drawingData: room.drawingData });
      } catch (err) {
        callback?.({ error: 'Failed to get drawing' });
      }
    });
  });
}

/**
 * Set up room state-change callbacks to broadcast to all clients
 */
function setupRoomCallbacks(io, room) {
  room.onStateChange = (r) => {
    // Clear canvas for everyone when a new turn starts
    if (r.state === 'PICKING_WORD') {
      r.drawingData = [];
      io.to(r.id).emit('clear-canvas');
    }
    // Send personalized state to each player
    for (const [socketId] of r.players) {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) sock.emit('game-state', r.toJSON(socketId));
    }
  };

  room.onTimerTick = (r) => {
    io.to(r.id).emit('timer', { timeLeft: r.timeLeft });
  };

  room.onHintReveal = (r) => {
    io.to(r.id).emit('hint', {
      hint: r.currentHint,
      hintsRevealed: r.hintsRevealed
    });
  };

  // Public room auto-start countdown
  room.onCountdown = (r, secondsLeft) => {
    io.to(r.id).emit('countdown', {
      secondsLeft,               // -1 means cancelled
      players: r.getPlayersArray().map(p => p.toJSON())
    });
  };
}

module.exports = { registerHandlers };
