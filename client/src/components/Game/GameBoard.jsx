import { useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import Canvas from '../Canvas/Canvas';
import Toolbar from '../Toolbar/Toolbar';
import Chat from '../Chat/Chat';
import ChatInput from '../Chat/ChatInput';
import PlayerList from '../PlayerList/PlayerList';
import Timer from '../Timer/Timer';
import WordSelector from '../WordSelector/WordSelector';
import Scoreboard from '../Scoreboard/Scoreboard';
import GameOver from '../GameOver/GameOver';
import MobileToolbar from '../Toolbar/MobileToolbar';
import CanvasToasts from '../CanvasToasts/CanvasToasts';
import RoomSettings from './RoomSettings';
import './GameBoard.css';

function CanvasWaitingOverlay({ state, onStart, onOpenSettings, socketId }) {
  const { countdown, room, players } = state;
  const countdownActive = countdown !== null && countdown > 0;
  const isPrivate = room?.isPrivate;
  const isHost = socketId === room?.hostId;
  const canStart = players.length >= 2;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="cwo-overlay animate-fade-in">
      <div className="cwo-content">
        {countdownActive ? (
          <>
            <div className="cwo-status">Game starting in</div>
            <div className="cwo-countdown animate-pulse">{countdown}</div>
          </>
        ) : (
          <>
            <div className="cwo-status">Waiting for players...</div>
            
            {isPrivate && (
              <div className="cwo-invite-section animate-scale-in">
                <div className="cwo-invite-label">Invite your friends!</div>
                <div className="cwo-room-badge">
                  <span className="cwo-code-label">CODE:</span>
                  <span className="cwo-code-value">{room.id}</span>
                </div>
                <div className="cwo-invite-actions">
                  <button 
                    className={`btn cwo-invite-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopyLink}
                  >
                    {copied ? '✅ Link Copied!' : '🔗 Copy Link'}
                  </button>
                  
                  {isHost && (
                    <button className="btn cwo-settings-btn" onClick={onOpenSettings}>
                      ⚙️ Settings
                    </button>
                  )}
                </div>

                {isHost && (
                  <button 
                    className="btn btn-play cwo-start-btn" 
                    onClick={onStart}
                    disabled={!canStart}
                    style={{ marginTop: 10 }}
                  >
                    {canStart ? '▶️ START GAME' : '🕒 Need 2 Players'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoundStartOverlay({ round }) {
  return (
    <div className="rso-overlay animate-fade-in">
      <div className="rso-content animate-pop-in">
        <div className="rso-label">ROUND</div>
        <div className="rso-round-number">{round}</div>
      </div>
    </div>
  );
}

export default function GameBoard() {
  const { state, actions, socket } = useGame();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const {
    gameState, players, isDrawing, currentWord,
    currentHint, revealedWord, timeLeft, drawTime,
    currentRound, maxRounds, room
  } = state;

  const handleStartGame = () => actions.startGame();
  const handleUpdateSettings = (s) => actions.updateSettings(s);

  const isHost = socket.id === state.room?.hostId;

  const [color, setColor]   = useState('#000000');
  const [brushSize, setBrush] = useState(5);
  const [tool, setTool]     = useState('pencil');

  const myPlayer   = players.find(p => p.socketId === socket.id);
  const drawer     = players.find(p => p.isDrawing);
  const hasGuessed = myPlayer?.hasGuessed || false;
  const drawerId   = drawer?.socketId;

  // Word display: underscores for guessers
  function renderWordDisplay() {
    let src = isDrawing ? currentWord : currentHint;
    
    // Fallback for late joiners: if hint is missing but we know word length
    if (!src && !isDrawing && room?.wordLength > 0) {
      src = '_'.repeat(room.wordLength);
    }
    
    if (!src) return null;

    const chars = src.split('');
    return (
      <div className={`gb-word-display ${isDrawing ? 'gb-word-drawer' : ''}`}>
        {chars.map((ch, i) => {
          if (ch === ' ') return <div key={i} className="gb-word-space" />;
          return (
            <div key={i} className={`gb-word-slot ${ch === '_' ? 'gb-word-underscore' : ''}`}>
              {ch !== '_' ? ch : null}
            </div>
          );
        })}
      </div>
    );
  }

  const showTurnEnd    = gameState === 'TURN_END';
  const showRoundEnd   = gameState === 'ROUND_END';
  const showGameOver   = gameState === 'GAME_OVER';
  const showPickWord   = gameState === 'PICKING_WORD' && isDrawing;
  const showPickBanner = gameState === 'PICKING_WORD' && !isDrawing;
  const showRoundStart = gameState === 'ROUND_START';

  return (
    <div className="gameboard">
      {/* Header */}
      <header className="gb-header">
        <span className="gb-logo">bugbl.io!</span>

        {gameState === 'WAITING' ? (
          <div style={{ flex: 1, textAlign: 'center', color: 'var(--accent-yellow)', fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.1em' }}>
            {room?.isPrivate ? 'PRIVATE LOBBY' : 'PUBLIC LOBBY'}
          </div>
        ) : (
          <>
            <div className="gb-round-badge">
              <span className="gb-round-text">Round </span>
              <span>{currentRound} / {maxRounds}</span>
            </div>

            <div className="gb-word-area">
              <div className="gb-word-label-top">
                {isDrawing ? 'YOU ARE DRAWING' : (gameState === 'PICKING_WORD' ? 'CHOOSING WORD...' : 'GUESS THIS')}
              </div>
              {renderWordDisplay()}
              {!isDrawing && !revealedWord && (
                <div className="gb-word-len">{room?.wordLength || 0} letters</div>
              )}
            </div>

            <Timer timeLeft={timeLeft} totalTime={drawTime} />

            {drawer && (
              <div className="gb-drawer-chip">
                ✏️ <span className="gb-drawer-name">{drawer.name}</span> is drawing
              </div>
            )}
          </>
        )}
      </header>

      {/* Player list */}
      <div className="gb-players-col">
        <PlayerList
          players={players}
          currentDrawerId={drawerId}
          mySocketId={socket.id}
          isPrivate={room?.isPrivate}
          hostId={room?.hostId}
          onVoteKick={actions.voteKick}
          onLeaveRoom={actions.leaveRoom}
          mutedUsers={state.mutedUsers}
          onToggleMute={actions.toggleMute}
        />
      </div>

      {/* Canvas + toolbar or Lobby */}
      <div className="gb-canvas-col">
        <div className="gb-canvas-wrap">
          {/* Canvas View Layers */}
          {gameState === 'WAITING' && (
            <CanvasWaitingOverlay 
              state={state} 
              onStart={handleStartGame}
              onOpenSettings={() => setIsSettingsOpen(true)}
              socketId={socket.id}
            />
          )}

          {isSettingsOpen && (
            <RoomSettings 
              currentSettings={state.room} 
              onClose={() => setIsSettingsOpen(false)}
              onSave={handleUpdateSettings}
            />
          )}
          <Canvas isDrawing={isDrawing} color={color} brushSize={brushSize} tool={tool} onStrokeDone={() => {}} disabled={gameState === 'WAITING'} />

          {/* Word Selection Overlays — now contained within canvas */}
          {showPickWord && <WordSelector />}

          {showPickBanner && (
            <div className="gb-picking-banner">
              <div className="gb-picking-content">
                <span className="gb-picking-name">{drawer?.name}</span>
                <span className="gb-picking-label">is choosing a word...</span>
              </div>
            </div>
          )}

          {/* Reaction Buttons (Like/Dislike) */}
          {!isDrawing && gameState === 'DRAWING' && !state.hasReacted && (
            <div className="gb-reactions">
              <button 
                className="gb-reaction-btn" 
                onClick={() => actions.sendReaction('like')}
                title="Like drawing"
              >
                👍
              </button>
              <button 
                className="gb-reaction-btn" 
                onClick={() => actions.sendReaction('dislike')}
                title="Dislike drawing"
              >
                👎
              </button>
            </div>
          )}

          {showRoundStart && <RoundStartOverlay round={currentRound} />}

          {/* Round End Scoreboard — now contained within canvas */}
          {(showTurnEnd || showRoundEnd) && (
            <Scoreboard players={players} revealedWord={revealedWord} state={gameState} />
          )}

          {/* Canvas Notification Toasts */}
          <CanvasToasts />
        </div>
        {/* Desktop toolbar — hidden on mobile AND during overlays */}
        {! (showTurnEnd || showRoundEnd || showGameOver) && (
          <div className="gb-toolbar-desktop">
            <Toolbar
              isDrawing={isDrawing}
              onColorChange={setColor}
              onBrushChange={setBrush}
              onToolChange={setTool}
              onClear={() => {}}
              onUndo={() => {}}
              disabled={gameState === 'WAITING'}
            />
          </div>
        )}
        {/* Mobile Toolbar — only shown when drawing AND not during overlays */}
        {isDrawing && ! (showTurnEnd || showRoundEnd || showGameOver) && (
          <div className="gb-toolbar-mobile">
            <MobileToolbar
              isDrawing={isDrawing}
              onColorChange={setColor}
              onBrushChange={setBrush}
              onToolChange={setTool}
              onClear={() => {}}
              onUndo={() => {}}
            />
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="gb-chat-col">
        <Chat hasGuessed={hasGuessed} isDrawing={isDrawing} />
        {/* Desktop Input */}
        <ChatInput hasGuessed={hasGuessed} isDrawing={isDrawing} className="gb-desktop-input" />
      </div>

      {/* Mobile Footer Input */}
      <ChatInput hasGuessed={hasGuessed} isDrawing={isDrawing} className="gb-mobile-input" />

      {/* Overlays */}

      {showGameOver && <GameOver />}
    </div>
  );
}
