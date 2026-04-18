/**
 * Room state machine for Bugbl.io
 * States: WAITING → PICKING_WORD → DRAWING → TURN_END → ROUND_END → GAME_OVER
 */
const { getRandomWords, checkGuess, isCloseGuess, generateHint } = require('../words/wordList');

const STATES = {
  WAITING: 'WAITING',
  PICKING_WORD: 'PICKING_WORD',
  DRAWING: 'DRAWING',
  TURN_END: 'TURN_END',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER'
};

const MIN_PLAYERS_TO_START = 2; // Minimum to START, not to be in room
const WORD_PICK_TIME = 15; // seconds to pick a word
const TURN_END_DELAY = 4000; // ms to show turn end screen
const ROUND_END_DELAY = 5000; // ms to show round end screen

class Room {
  constructor(id, hostId, settings = {}) {
    this.id = id;
    this.hostId = hostId;
    this.state = STATES.WAITING;

    // Settings
    this.maxRounds   = settings.maxRounds   || 3;
    this.drawTime    = settings.drawTime    || 80;
    this.maxPlayers  = settings.maxPlayers  || 8;
    this.customWords = settings.customWords || [];
    this.isPrivate   = settings.isPrivate   || false;
    this.difficulty  = settings.difficulty  || 'random';
    // Public rooms auto-start; private rooms need host to press Start
    this.autoStart   = !this.isPrivate;

    // Game state
    this.players = new Map(); // socketId → Player
    this.currentRound = 0;
    this.currentDrawerIndex = -1;
    this.currentWord = null;
    this.wordChoices = [];
    this.usedWords = [];
    this.timeLeft = 0;
    this.guessOrder = 0;
    this.drawingData = []; // accumulated strokes for late joiners

    // Timers
    this._timer        = null;
    this._hintTimer1   = null;
    this._hintTimer2   = null;
    this._hintTimer3   = null;
    this._turnEndTimer = null;
    this._countdownTimer = null; // auto-start countdown for public rooms
    this._countdownValue = 0;

    // Hints
    this.currentHint   = '';
    this.hintsRevealed = 0;

    // Callbacks (set by server handlers)
    this.onStateChange = null;
    this.onTimerTick   = null;
    this.onHintReveal  = null;
    this.onCountdown   = null; // (room, secondsLeft) → broadcast countdown

    this.createdAt    = Date.now();
    this.lastActivity = Date.now();

    // Vote-kick tracking: Map<targetSocketId, Set<voterSocketId>>
    this.kickVotes = new Map();
  }

  /**
   * Get ordered array of players (for turn rotation)
   */
  getPlayersArray() {
    return Array.from(this.players.values()).filter(p => p.isConnected);
  }

  /**
   * Get current drawer
   */
  getCurrentDrawer() {
    const players = this.getPlayersArray();
    if (this.currentDrawerIndex >= 0 && this.currentDrawerIndex < players.length) {
      return players[this.currentDrawerIndex];
    }
    return null;
  }

  /**
   * Update room settings (only in WAITING state)
   */
  updateSettings(settings = {}) {
    if (this.state !== STATES.WAITING) return false;

    if (settings.maxRounds) this.maxRounds = Math.min(20, Math.max(1, parseInt(settings.maxRounds)));
    if (settings.drawTime)  this.drawTime  = Math.min(300, Math.max(10, parseInt(settings.drawTime)));
    if (settings.maxPlayers) this.maxPlayers = Math.min(Room.MAX_PLAYERS, Math.max(2, parseInt(settings.maxPlayers)));
    if (settings.difficulty) this.difficulty = settings.difficulty;
    
    this._emitRoomUpdate();
    return true;
  }

  /**
   * Add a player to the room
   */
  addPlayer(player) {
    this.players.set(player.socketId, player);
    this.lastActivity = Date.now();

    // If joining a public room while game is running, set drawnThisCycle=true
    // so they wait until the NEXT full cycle to draw.
    if (!this.isPrivate && this.state !== STATES.WAITING) {
      player.drawnThisCycle = true;
    }

    return true;
  }

  /**
   * Remove a player from the room
   */
  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;

    this.players.delete(socketId);
    this.lastActivity = Date.now();

    // If the drawer left mid-turn, end the turn
    if (player.isDrawing && this.state === STATES.DRAWING) {
      this.endTurn(true);
    }

    // Update host if host left
    if (socketId === this.hostId) {
      const remaining = this.getPlayersArray();
      if (remaining.length > 0) {
        this.hostId = remaining[0].socketId;
      }
    }

    // If not enough players mid-game, go back to waiting
    if (this.getPlayersArray().length < MIN_PLAYERS_TO_START
        && this.state !== STATES.WAITING
        && this.state !== STATES.GAME_OVER) {
      this.resetGame();
      this.state = STATES.WAITING;
      this._emitStateChange();
    }

    // For public rooms: cancel countdown if we drop below 2
    if (this.autoStart && this.getPlayersArray().length < MIN_PLAYERS_TO_START) {
      this._cancelCountdown();
    }

    return player;
  }

  /**
   * Handle player disconnect (mark as disconnected but keep in game)
   */
  disconnectPlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;

    player.isConnected = false;
    this.lastActivity = Date.now();

    // If the drawer disconnected mid-turn, end the turn
    if (player.isDrawing && this.state === STATES.DRAWING) {
      this.endTurn(true);
    }

    // If not enough connected players mid-game, go back to waiting
    if (this.getPlayersArray().length < MIN_PLAYERS_TO_START && this.state !== STATES.WAITING && this.state !== STATES.GAME_OVER) {
      this.resetGame();
      this.state = STATES.WAITING;
      this._emitStateChange();
    }

    return player;
  }

  /**
   * Start the game
   */
  startGame() {
    if (this.getPlayersArray().length < MIN_PLAYERS_TO_START) return false;
    if (this.state !== STATES.WAITING) return false;

    // Reset all players
    this.players.forEach(p => p.resetGame());
    this.currentRound = 1;
    this.currentDrawerIndex = -1;
    this.usedWords = [];
    this.drawingData = [];

    this.nextTurn();
    return true;
  }

  /**
   * Move to the next turn
   */
  nextTurn() {
    this._clearTimers();

    const players = this.getPlayersArray();
    if (players.length < MIN_PLAYERS_TO_START) {
      this.resetGame();
      this.state = STATES.WAITING;
      this._emitStateChange();
      return;
    }

    // Reset round state for all players
    players.forEach(p => p.resetRound());

    // Advance drawer rotation based on drawnThisCycle flag
    const eligibleDrawers = players.filter(p => !p.drawnThisCycle);
    
    // If no one is left to draw in this cycle, start a new cycle
    if (eligibleDrawers.length === 0) {
      // For Public rooms: automatically start next cycle
      // For Private rooms: normally end game, but we'll follow logic:
      if (!this.isPrivate) {
        players.forEach(p => p.drawnThisCycle = false);
        this.currentRound++; 
        // Note: in infinite mode, we could reset currentRound to 1 every X rounds
        // but for now we'll just increment it.
        const nextCycleDrawers = players.filter(p => !p.drawnThisCycle);
        if (nextCycleDrawers.length > 0) {
          this.currentDrawerIndex = players.indexOf(nextCycleDrawers[0]);
          nextCycleDrawers[0].drawnThisCycle = true;
          this._startWordPick();
          return;
        }
      }

      // If private or no players, end game
      this.endGame();
      return;
    }

    // Pick the next drawer from eligible list
    const nextDrawer = eligibleDrawers[0];
    this.currentDrawerIndex = players.indexOf(nextDrawer);
    nextDrawer.drawnThisCycle = true;

    this._startWordPick();
  }

  /**
   * Start word picking phase
   */
  _startWordPick() {
    const players = this.getPlayersArray();
    const drawer = players[this.currentDrawerIndex];
    if (!drawer) {
      this.nextTurn();
      return;
    }

    drawer.isDrawing = true;
    this.currentWord = null;
    this.drawingData = [];
    this.guessOrder = 0;
    this.hintsRevealed = 0;

    // Generate 3 word choices
    this.wordChoices = getRandomWords(3, this.usedWords, this.difficulty);
    this.timeLeft = WORD_PICK_TIME;

    this.state = STATES.PICKING_WORD;
    this._emitStateChange();

    // Auto-pick if drawer doesn't choose in time
    this._timer = setInterval(() => {
      this.timeLeft--;
      if (this.onTimerTick) this.onTimerTick(this);

      if (this.timeLeft <= 0) {
        // Auto-pick the first word
        this.selectWord(this.wordChoices[0]);
      }
    }, 1000);
  }

  /**
   * Drawer selects a word
   */
  selectWord(word) {
    if (this.state !== STATES.PICKING_WORD) return false;

    this._clearTimers();

    this.currentWord = word;
    this.usedWords.push(word);
    this.currentHint = generateHint(word, 0);
    this.timeLeft = this.drawTime;

    this.state = STATES.DRAWING;
    this._emitStateChange();

    // Start drawing timer
    this._timer = setInterval(() => {
      this.timeLeft--;
      if (this.onTimerTick) this.onTimerTick(this);

      if (this.timeLeft <= 0) {
        this.endTurn(false);
      }
    }, 1000);

    // Schedule hint reveals (Gradual: 25%, 50%, 75% marks)
    const hintTime1 = Math.floor(this.drawTime * 0.75); // 25% elapsed
    const hintTime2 = Math.floor(this.drawTime * 0.50); // 50% elapsed
    const hintTime3 = Math.floor(this.drawTime * 0.25); // 75% elapsed

    this._hintTimer1 = setTimeout(() => {
      if (this.state === STATES.DRAWING) {
        this.currentHint = generateHint(this.currentWord, 0.15); // Tiny reveal
        this.hintsRevealed = 1;
        if (this.onHintReveal) this.onHintReveal(this);
      }
    }, (this.drawTime - hintTime1) * 1000);

    this._hintTimer2 = setTimeout(() => {
      if (this.state === STATES.DRAWING) {
        this.currentHint = generateHint(this.currentWord, 0.30); // Medium reveal
        this.hintsRevealed = 2;
        if (this.onHintReveal) this.onHintReveal(this);
      }
    }, (this.drawTime - hintTime2) * 1000);

    this._hintTimer3 = setTimeout(() => {
      if (this.state === STATES.DRAWING) {
        this.currentHint = generateHint(this.currentWord, 0.45); // Final reveal
        this.hintsRevealed = 3;
        if (this.onHintReveal) this.onHintReveal(this);
      }
    }, (this.drawTime - hintTime3) * 1000);

    return true;
  }

  /**
   * Process a player's guess
   * @returns {{ correct: boolean, close: boolean, alreadyGuessed: boolean }}
   */
  processGuess(socketId, guess) {
    const player = this.players.get(socketId);
    if (!player) return { correct: false, close: false, alreadyGuessed: false };

    // Can't guess if you're the drawer or already guessed
    if (player.isDrawing) return { correct: false, close: false, alreadyGuessed: false };
    if (player.hasGuessed) return { correct: false, close: false, alreadyGuessed: true };
    if (this.state !== STATES.DRAWING) return { correct: false, close: false, alreadyGuessed: false };

    if (checkGuess(guess, this.currentWord)) {
      player.hasGuessed = true;
      this.guessOrder++;

      // Calculate score based on time remaining and guess order
      const timeRatio = this.timeLeft / this.drawTime;
      const guesserPoints = Math.max(100, Math.floor(500 * timeRatio) - (this.guessOrder - 1) * 50);
      player.addScore(guesserPoints);

      // Give drawer points
      const drawer = this.getCurrentDrawer();
      if (drawer) {
        drawer.addScore(75);
      }

      this.lastActivity = Date.now();

      // Check if all players have guessed
      const allGuessed = this.getPlayersArray()
        .filter(p => !p.isDrawing)
        .every(p => p.hasGuessed);

      if (allGuessed) {
        // Short delay then end turn
        setTimeout(() => this.endTurn(false), 1500);
      }

      return { correct: true, close: false, alreadyGuessed: false, points: guesserPoints };
    }

    // Check for close guess (only if it's not actually correct)
    if (!checkGuess(guess, this.currentWord) && isCloseGuess(guess, this.currentWord)) {
      return { correct: false, close: true, alreadyGuessed: false };
    }

    return { correct: false, close: false, alreadyGuessed: false };
  }

  /**
   * Cast a vote to kick a player.
   * Returns { kicked, votesNeeded, votesCast, targetName }
   */
  voteKick(voterSocketId, targetSocketId) {
    if (voterSocketId === targetSocketId) return null;
    if (!this.players.has(targetSocketId)) return null;

    if (!this.kickVotes.has(targetSocketId)) {
      this.kickVotes.set(targetSocketId, new Set());
    }
    this.kickVotes.get(targetSocketId).add(voterSocketId);

    const players    = this.getPlayersArray();
    const votesNeeded = Math.ceil((players.length - 1) / 2); // majority of non-target players
    const votesCast  = this.kickVotes.get(targetSocketId).size;
    const target     = this.players.get(targetSocketId);
    const kicked     = votesCast >= votesNeeded;

    if (kicked) {
      this.kickVotes.delete(targetSocketId);
      // Mark as disconnected so game can continue
      this.removePlayer(targetSocketId);
    }

    return {
      kicked,
      votesNeeded,
      votesCast,
      targetId:   targetSocketId,
      targetName: target?.name || '?'
    };
  }

  /**
   * End the current turn
   */
  endTurn(skipped = false) {
    this._clearTimers();

    this.state = STATES.TURN_END;
    this._emitStateChange();

    // Move to next turn after delay
    this._turnEndTimer = setTimeout(() => {
      this.nextTurn();
    }, TURN_END_DELAY);
  }

  /**
   * End the game
   */
  endGame() {
    this._clearTimers();
    this.state = STATES.GAME_OVER;
    this._emitStateChange();
  }

  /**
   * Reset game to waiting state
   */
  resetGame() {
    this._clearTimers();
    this.currentRound = 0;
    this.currentDrawerIndex = -1;
    this.currentWord = null;
    this.wordChoices = [];
    this.usedWords = [];
    this.drawingData = [];
    this.guessOrder = 0;
    this.currentHint = '';
    this.hintsRevealed = 0;
    this.players.forEach(p => p.resetGame());
  }

  /**
   * Clear all timers
   */
  _clearTimers() {
    if (this._timer)        { clearInterval(this._timer);        this._timer        = null; }
    if (this._hintTimer1)   { clearTimeout(this._hintTimer1);   this._hintTimer1   = null; }
    if (this._hintTimer2)   { clearTimeout(this._hintTimer2);   this._hintTimer2   = null; }
    if (this._hintTimer3)   { clearTimeout(this._hintTimer3);   this._hintTimer3   = null; }
    if (this._turnEndTimer) { clearTimeout(this._turnEndTimer); this._turnEndTimer = null; }
    this._cancelCountdown();
  }

  /**
   * Start a 5-second auto-start countdown (public rooms only)
   */
  _startCountdown(secondsLeft = 5) {
    console.log(`[Countdown] called: state=${this.state}, timerRunning=${!!this._countdownTimer}, onCountdown=${!!this.onCountdown}, players=${this.getPlayersArray().length}`);
    if (this._countdownTimer) { console.log('[Countdown] SKIP: already running'); return; }
    if (this.state !== STATES.WAITING) { console.log(`[Countdown] SKIP: wrong state=${this.state}`); return; }
    if (!this.onCountdown) { console.log('[Countdown] SKIP: onCountdown not set!'); return; }

    this._countdownValue = secondsLeft;
    console.log(`[Countdown] Starting from ${secondsLeft}`);
    this.onCountdown(this, this._countdownValue);

    this._countdownTimer = setInterval(() => {
      this._countdownValue--;
      console.log(`[Countdown] Tick ${this._countdownValue}`);
      if (this.onCountdown) this.onCountdown(this, this._countdownValue);
      if (this._countdownValue <= 0) {
        this._cancelCountdown();
        console.log('[Countdown] Starting game!');
        this.startGame();
      }
    }, 1000);
  }

  /**
   * Cancel auto-start countdown and notify clients (seconds = -1 means cancelled)
   */
  _cancelCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    // Notify clients that countdown was cancelled
    if (this._countdownValue > 0 && this.onCountdown) {
      this.onCountdown(this, -1);
    }
    this._countdownValue = 0;
  }

  /**
   * Emit state change callback
   */
  _emitStateChange() {
    if (this.onStateChange) this.onStateChange(this);
  }

  /**
   * Check if room is empty or idle
   */
  isEmpty() {
    return this.players.size === 0;
  }

  isIdle(thresholdMs = 30000) {
    return Date.now() - this.lastActivity > thresholdMs;
  }

  /**
   * Serialize room state for client
   * @param {string} forSocketId - the requesting player's socket id (to hide word from guessers)
   */
  toJSON(forSocketId = null) {
    const drawer = this.getCurrentDrawer();
    const player = forSocketId ? this.players.get(forSocketId) : null;
    const isDrawer = player && player.isDrawing;

    return {
      id: this.id,
      hostId: this.hostId,
      state: this.state,
      maxRounds: this.maxRounds,
      drawTime: this.drawTime,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      autoStart: this.autoStart,
      difficulty: this.difficulty,
      countdown: this._countdownValue > 0 ? this._countdownValue : null,
      currentRound: this.currentRound,
      timeLeft: this.timeLeft,
      currentWord: isDrawer ? this.currentWord : null,
      currentHint: this.currentHint,
      wordChoices: isDrawer && this.state === STATES.PICKING_WORD ? this.wordChoices : [],
      wordLength: this.currentWord ? this.currentWord.length : 0,
      drawer: drawer ? drawer.toJSON() : null,
      players: this.getPlayersArray().map(p => p.toJSON()),
      guessOrder: this.guessOrder,
      drawingData: this.drawingData, // include for late joins
      isWaitingForPlayers: this.getPlayersArray().length < Room.MIN_PLAYERS_TO_START,
      // Only send the word after the turn ends
      revealedWord: (this.state === STATES.TURN_END || this.state === STATES.GAME_OVER) ? this.currentWord : null
    };
  }
}

Room.STATES = STATES;
Room.MIN_PLAYERS_TO_START = MIN_PLAYERS_TO_START;

module.exports = Room;
