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

function LobbyView({ state, actions, socket }) {
  const { room, roomId, players } = state;
  const isHost = room?.hostId === socket.id;
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopy = () => {
    const inviteLink = `${window.location.protocol}//${window.location.host}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const updateSetting = (key, value) => {
    // We can emit a 'update-settings' event if we want real-time sync, 
    // but for now the host can just click Start with these.
    // Actually, let's just make it simple.
  };

  return (
    <div className="gb-lobby-view animate-fade-in">
      <div className="gb-lobby-card">
        <div className="gb-lobby-header">
          <div className="gb-lobby-title">
            <h2>Lobby</h2>
            <span className="gb-lobby-status">Waiting for players...</span>
          </div>
          <div className="gb-invite-area">
            <span className="gb-invite-label">Invite Code: <strong>{roomId}</strong></span>
            <button className={`btn ${copied ? 'btn-success' : 'btn-secondary'} btn-sm`} onClick={handleCopy}>
              {copied ? '✓ Link Copied' : '🔗 Copy Invite Link'}
            </button>
          </div>
        </div>

        <div className="gb-lobby-content">
          <div className="gb-lobby-main">
            <h3>Connected Players ({players.length}/{room?.maxPlayers || 8})</h3>
            <div className="gb-lobby-players">
              {players.map(p => (
                <div key={p.socketId} className="gb-lobby-player">
                  <div className="gb-lp-avatar" style={{ background: p.avatar }}>{p.name[0].toUpperCase()}</div>
                  <span className="gb-lp-name">{p.name}</span>
                  {p.socketId === room?.hostId && <span className="gb-lp-host">Host</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="gb-lobby-side">
              <button className="btn btn-outline btn-sm w-full" onClick={() => setShowSettings(!showSettings)}>
                ⚙️ {showSettings ? 'Hide Settings' : 'Game Settings'}
              </button>
              
              {showSettings && (
                <div className="gb-inline-settings animate-scale-in">
                  <div className="gs-item">
                    <label>Rounds</label>
                    <select 
                      value={room?.maxRounds} 
                      onChange={e => actions.updateSettings({ maxRounds: e.target.value })}
                    >
                       {[2,3,4,5,6,8,10].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="gs-item">
                    <label>Draw Time</label>
                    <select 
                      value={room?.drawTime} 
                      onChange={e => actions.updateSettings({ drawTime: e.target.value })}
                    >
                       {[30,60,80,100,120,150,180].map(v => <option key={v} value={v}>{v}s</option>)}
                    </select>
                  </div>
                  <div className="gs-item">
                    <label>Difficulty</label>
                    <select 
                      value={room?.difficulty || 'easy'} 
                      onChange={e => actions.updateSettings({ difficulty: e.target.value })}
                    >
                       <option value="easy">Easy</option>
                       <option value="medium">Medium</option>
                       <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="gb-lobby-footer">
          {isHost ? (
            <button 
              className="btn btn-primary btn-lg lobby-start-btn" 
              onClick={actions.startGame}
              disabled={players.length < 2}
            >
              🚀 Start Match
            </button>
          ) : (
            <div className="lobby-wait-msg">Wait for the host to start...</div>
          )}
        </div>
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
    const src = isDrawing ? currentWord : currentHint;
    if (!src) return <span className="gb-word-display">___</span>;

    if (isDrawing) {
      return (
        <span className="gb-word-display gb-word-drawer">
          {src.split('').map((ch, i) => (
            <span key={i} className={ch === ' ' ? 'gb-word-space' : ''}>
              {ch}
            </span>
          ))}
        </span>
      );
    }

    // Render hint chars as blanks or letters (src is now compact: e.g. "a_p_e")
    const chars = src.split('');
    return (
      <span className="gb-word-display">
        {chars.map((ch, i) => {
          if (ch === ' ') return <span key={i} className="gb-word-space" />;
          if (ch === '_') return <span key={i} className="gb-word-dash" />;
          return <span key={i} className="gb-word-char">{ch}</span>;
        })}
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

      {/* Canvas + toolbar or Lobby */}
      <div className="gb-canvas-col">
        {gameState === 'WAITING' ? (
          <LobbyView state={state} actions={actions} socket={socket} />
        ) : (
          <>
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
          </>
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
