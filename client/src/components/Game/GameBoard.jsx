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
    const src = isDrawing ? currentWord : currentHint;
    if (!src) return <span className="gb-word-display">_ _ _</span>;

    if (isDrawing) {
      return <span className="gb-word-display gb-word-drawer">{currentWord}</span>;
    }

    // Render hint chars as blanks or letters
    const chars = src.split('');
    return (
      <span className="gb-word-display">
        {chars.map((ch, i) =>
          ch === '_'
            ? <span key={i} className="gb-word-dash" />
            : <span key={i}>{ch === ' ' ? '\u00A0\u00A0' : ch}</span>
        )}
      </span>
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

        <span className="gb-round-badge">
          <span className="gb-round-text">Round </span>{currentRound} / {maxRounds}
        </span>

        <div className="gb-word-area">
          <span className="gb-word-label-top">
            {isDrawing ? 'your word' : 'guess this'}
          </span>
          {renderWordDisplay()}
          {!isDrawing && room?.wordLength > 0 && (
            <span className="gb-word-len">{room.wordLength} letters</span>
          )}
        </div>

        {drawer && (
          <div className="gb-drawer-chip">
            ✏️ <span className="gb-drawer-name">{drawer.name}</span> is drawing
          </div>
        )}

        <Timer timeLeft={timeLeft} totalTime={drawTime} />

      </header>

      {/* Player list */}
      <div className="gb-players-col">
        <PlayerList
          players={players}
          currentDrawerId={drawerId}
          mySocketId={socket.id}
          onVoteKick={actions.voteKick}
          onLeaveRoom={actions.leaveRoom}
        />
      </div>

      {/* Canvas + toolbar */}
      <div className="gb-canvas-col">
        <div className="gb-canvas-wrap">
          <Canvas isDrawing={isDrawing} color={color} brushSize={brushSize} tool={tool} onStrokeDone={() => {}} />
        </div>
        <Toolbar
          isDrawing={isDrawing}
          onColorChange={setColor}
          onBrushChange={setBrush}
          onToolChange={setTool}
          onClear={() => {}}
          onUndo={() => {}}
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
