import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import socket from '../utils/socket';
import {
  soundJoin, soundLeave, soundRoomCreated, soundGameStart,
  soundCorrect, soundClose, soundRoundEnd, soundGameOver,
  soundWordSelected, soundChat, soundTick, soundTickUrgent, soundTimeUp
} from '../utils/sounds';

const GameContext = createContext(null);

const initialState = {
  connected: false,
  playerName: '',
  roomId: null,
  room: null,
  gameState: 'IDLE',
  players: [],
  currentRound: 0,
  maxRounds: 3,
  timeLeft: 0,
  drawTime: 80,
  isDrawing: false,
  currentWord: null,
  currentHint: '',
  wordChoices: [],
  revealedWord: null,
  messages: [],
  error: null,
  loading: false,
  countdown: null,
  afkWarning: null,      // secondsLeft number or null
  afkDisconnected: false, // true = show AFK popup
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };
    case 'SET_ROOM':
      return {
        ...state,
        roomId: action.payload.roomId,
        room: action.payload.room,
        gameState: action.payload.room?.state || 'WAITING',
        players: action.payload.room?.players || [],
        maxRounds: action.payload.room?.maxRounds || 3,
        drawTime: action.payload.room?.drawTime || 80,
        loading: false,
        error: null
      };
    case 'UPDATE_ROOM':
      return {
        ...state,
        room: action.payload.room,
        gameState: action.payload.room?.state || state.gameState,
        players: action.payload.room?.players || state.players,
      };
    case 'GAME_STATE_UPDATE': {
      const gs = action.payload;
      return {
        ...state,
        gameState: gs.state,
        players: gs.players,
        currentRound: gs.currentRound,
        maxRounds: gs.maxRounds,
        timeLeft: gs.timeLeft,
        isDrawing: gs.drawer?.socketId === socket.id,
        currentWord: gs.currentWord,
        currentHint: gs.currentHint,
        wordChoices: gs.wordChoices || [],
        revealedWord: gs.revealedWord,
        room: { ...state.room, ...gs }
      };
    }
    case 'TIMER_UPDATE':
      return { ...state, timeLeft: action.payload.timeLeft };
    case 'HINT_UPDATE':
      return { ...state, currentHint: action.payload.hint };
    case 'CORRECT_GUESS':
      return { ...state, players: action.payload.players };
    case 'SET_COUNTDOWN':
      return {
        ...state,
        countdown: action.payload.secondsLeft,
        // Also keep players list up-to-date during countdown
        players: action.payload.players || state.players,
      };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload].slice(-100) };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LEAVE_ROOM':
      return { ...initialState, connected: state.connected, playerName: state.playerName };
    case 'SET_AFK_WARNING':
      return { ...state, afkWarning: action.payload };
    case 'SET_AFK_DISCONNECTED':
      return { ...initialState, connected: false, afkDisconnected: true, playerName: state.playerName };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef  = useRef(state);
  const prevState = useRef(null);
  stateRef.current = state;

  /* ── Sound for timer ticks ── */
  useEffect(() => {
    const t = state.timeLeft;
    const gs = state.gameState;
    if (gs !== 'DRAWING' && gs !== 'PICKING_WORD') return;

    if (t === 0 && prevState.current?.timeLeft > 0) {
      soundTimeUp();
    } else if (t > 0 && t <= 10) {
      soundTickUrgent();
    } else if (t > 0 && t % 5 === 0) {
      soundTick();
    }
  }, [state.timeLeft]);

  /* ── Sound for game state transitions ── */
  useEffect(() => {
    const prev = prevState.current?.gameState;
    const curr = state.gameState;
    if (!prev || prev === curr) return;

    if (curr === 'DRAWING')   soundWordSelected();
    if (curr === 'TURN_END')  soundRoundEnd();
    if (curr === 'GAME_OVER') soundGameOver();
    if (prev === 'WAITING' && curr === 'PICKING_WORD') soundGameStart();
  }, [state.gameState]);

  /* ── Track prev state ── */
  useEffect(() => {
    prevState.current = state;
  });

  /* ── Socket events ── */
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
    });

    socket.on('room-update', (data) => {
      const prevPlayers = stateRef.current.players;
      const nextPlayers = data.room?.players || [];

      // Detect join / leave for sounds
      if (prevPlayers.length > 0) {
        const prevIds = new Set(prevPlayers.map(p => p.socketId));
        const nextIds = new Set(nextPlayers.map(p => p.socketId));

        nextIds.forEach(id => { if (!prevIds.has(id)) soundJoin(); });
        prevIds.forEach(id => { if (!nextIds.has(id)) soundLeave(); });
      }

      dispatch({ type: 'UPDATE_ROOM', payload: data });
      if (data.message) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { type: 'system', message: data.message, timestamp: Date.now() }
        });
      }
    });

    socket.on('game-state', (data) => {
      dispatch({ type: 'GAME_STATE_UPDATE', payload: data });
    });

    socket.on('timer', (data) => {
      dispatch({ type: 'TIMER_UPDATE', payload: data });
    });

    socket.on('hint', (data) => {
      dispatch({ type: 'HINT_UPDATE', payload: data });
    });

    socket.on('correct-guess', (data) => {
      dispatch({ type: 'CORRECT_GUESS', payload: data });
      // Play sound only for the guesser
      if (data.guesser === socket.id) soundCorrect();
    });

    socket.on('chat-message', (data) => {
      dispatch({ type: 'ADD_MESSAGE', payload: { ...data, timestamp: Date.now() } });

      if (data.type === 'correct') {
        soundCorrect();
      } else if (data.type === 'close') {
        soundClose();
      } else if (data.type === 'player' && data.socketId !== socket.id) {
        soundChat();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection failed:', err.message, err);
      dispatch({ type: 'SET_ERROR', payload: `Connection failed: ${err.message}` });
    });

    socket.on('countdown', (data) => {
      console.log('[Countdown] received:', data);
      dispatch({ type: 'SET_COUNTDOWN', payload: data });
      if (data.secondsLeft > 0) soundTick();
    });

    // Kicked by vote
    socket.on('kicked', () => {
      dispatch({ type: 'LEAVE_ROOM' });
      dispatch({ type: 'ADD_MESSAGE', payload: { type: 'system', message: '🔨 You were voted out of the room.', timestamp: Date.now() } });
    });

    // AFK warning (2 min before disconnect)
    socket.on('afk-warning', ({ secondsLeft }) => {
      dispatch({ type: 'SET_AFK_WARNING', payload: secondsLeft });
    });

    // AFK disconnected
    socket.on('afk-disconnected', () => {
      dispatch({ type: 'SET_AFK_DISCONNECTED' });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  /* ── Actions ── */
  const createRoom = useCallback((name, settings = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_PLAYER_NAME', payload: name });
    socket.emit('create-room', { name, settings }, (response) => {
      if (response.error) {
        dispatch({ type: 'SET_ERROR', payload: response.error });
      } else {
        soundRoomCreated();
        dispatch({ type: 'SET_ROOM', payload: response });
        dispatch({ type: 'CLEAR_MESSAGES' });
      }
    });
  }, []);

  const joinRoom = useCallback((name, roomId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_PLAYER_NAME', payload: name });
    socket.emit('join-room', { name, roomId }, (response) => {
      if (response.error) {
        dispatch({ type: 'SET_ERROR', payload: response.error });
      } else {
        soundJoin();
        dispatch({ type: 'SET_ROOM', payload: response });
        dispatch({ type: 'CLEAR_MESSAGES' });
      }
    });
  }, []);

  const quickPlay = useCallback((name) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_PLAYER_NAME', payload: name });
    socket.emit('quick-play', { name }, (response) => {
      if (response.error) {
        dispatch({ type: 'SET_ERROR', payload: response.error });
      } else {
        soundJoin();
        dispatch({ type: 'SET_ROOM', payload: response });
        dispatch({ type: 'CLEAR_MESSAGES' });
      }
    });
  }, []);

  const startGame = useCallback(() => {
    socket.emit('start-game', (response) => {
      if (response?.error) dispatch({ type: 'SET_ERROR', payload: response.error });
    });
  }, []);

  const selectWord = useCallback((word) => {
    socket.emit('select-word', { word });
  }, []);

  const sendGuess = useCallback((message) => {
    socket.emit('guess', { message });
  }, []);

  const leaveRoom = useCallback(() => {
    socket.emit('leave-room', () => {
      soundLeave();
      dispatch({ type: 'LEAVE_ROOM' });
    });
  }, []);

  const voteKick = useCallback((targetSocketId) => {
    socket.emit('vote-kick', { targetSocketId });
  }, []);

  const playAgain = useCallback(() => {
    socket.emit('play-again', (response) => {
      if (response?.error) dispatch({ type: 'SET_ERROR', payload: response.error });
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const dismissAfkWarning = useCallback(() => {
    dispatch({ type: 'SET_AFK_WARNING', payload: null });
    // Sending any event resets server AFK timer
    socket.emit('heartbeat');
  }, []);

  const clearAfkDisconnected = useCallback(() => {
    socket.connect();
    dispatch({ type: 'SET_CONNECTED', payload: true });
    // afkDisconnected flag needs explicit clear
    dispatch({ type: 'SET_AFK_WARNING', payload: null });
    // Use initialState reset with connected=true
    dispatch({ type: 'LEAVE_ROOM' }); // LEAVE_ROOM resets to initial but keeps connected
  }, []);

  const value = {
    state,
    actions: { createRoom, joinRoom, quickPlay, startGame, selectWord, sendGuess, leaveRoom, voteKick, playAgain, clearError, dismissAfkWarning, clearAfkDisconnected },
    socket
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

export default GameContext;
