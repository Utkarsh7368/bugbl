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
import './GameBoard.css';

function CanvasWaitingOverlay({ state }) {
  const { countdown } = state;
  const countdownActive = countdown !== null && countdown > 0;

  return (
    <div className="cwo-overlay animate-fade-in">
      <div className="cwo-content">
        {countdownActive ? (
          <>
            <div className="cwo-status">Game starting in</div>
            <div className="cwo-countdown animate-pulse">{countdown}</div>
          </>
        ) : (
          <div className="cwo-status">Waiting for players...</div>
        )}
      </div>
    </div>
  );
}

export default function GameBoard() {
  const { state, actions, socket } = useGame();
  const {
    gameState, players, isDrawing, currentWord,
    currentHint, revealedWord, timeLeft, drawTime,
    currentRound, maxRounds, room
  } = state;

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
        />
      </div>

      {/* Canvas + toolbar or Lobby */}
      <div className="gb-canvas-col">
        <div className="gb-canvas-wrap">
          {gameState === 'WAITING' && (
            <CanvasWaitingOverlay state={state} />
          )}
          <Canvas isDrawing={isDrawing} color={color} brushSize={brushSize} tool={tool} onStrokeDone={() => {}} disabled={gameState === 'WAITING'} />
        </div>
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

      {/* Chat */}
      <div className="gb-chat-col">
        <Chat hasGuessed={hasGuessed} isDrawing={isDrawing} />
        {/* Desktop Input */}
        <ChatInput hasGuessed={hasGuessed} isDrawing={isDrawing} className="gb-desktop-input" />
      </div>

      {/* Mobile Footer Input */}
      <ChatInput hasGuessed={hasGuessed} isDrawing={isDrawing} className="gb-mobile-input" />

      {/* Overlays */}
      {showPickWord && <WordSelector />}

      {showPickBanner && (
        <div className="gb-picking-banner">
          <div className="gb-picking-card">
            <span className="gb-picking-label">Choosing a word...</span>
            <span className="gb-picking-name">{drawer?.name}</span>
            <span style={{ fontSize: '2.5rem' }}>🤔</span>
          </div>
        </div>
      )}

      {(showTurnEnd || showRoundEnd) && (
        <Scoreboard players={players} revealedWord={revealedWord} state={gameState} />
      )}

      {showGameOver && <GameOver />}
    </div>
  );
}
