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

function WaitingLobby({ state, actions, socket }) {
  const { room, roomId, players, countdown } = state;
  const isHost = room?.hostId === socket.id;
  const isPrivate = room?.isPrivate;
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopy = () => {
    const inviteLink = `${window.location.protocol}//${window.location.host}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const countdownActive = countdown !== null && countdown > 0;

  return (
    <div className="gb-lobby-view animate-fade-in">
      <div className="gb-lobby-card">
        <div className="gb-lobby-header">
          <div className="gb-lobby-title">
            <h2>{isPrivate ? 'Private Room' : 'Public Lobby'}</h2>
            <span className="gb-lobby-status">
              {countdownActive ? `Starting in ${countdown}...` : 'Waiting for players...'}
            </span>
          </div>
          <div className="gb-invite-area">
            <button className={`btn ${copied ? 'btn-success' : 'btn-secondary'} btn-sm`} onClick={handleCopy}>
              {copied ? '✓ Link Copied' : '🔗 Copy Invite Link'}
            </button>
          </div>
        </div>

        <div className="gb-lobby-content">
          <div className="gb-lobby-main">
            <div className="gb-lobby-info">
              {players.length} / {room?.maxPlayers || 8} players connected
            </div>
            
            {!isPrivate && !countdownActive && (
              <div className="gb-pub-waiting">
                <div className="pub-dot-anim"><span/><span/><span/></div>
                <span>Need {2 - players.length} more to start</span>
              </div>
            )}

            {countdownActive && (
              <div className="gb-countdown-display animate-pulse">
                {countdown}
              </div>
            )}
          </div>

          {isPrivate && isHost && (
            <div className="gb-lobby-side">
              <button className="btn btn-outline btn-sm w-full" onClick={() => setShowSettings(!showSettings)}>
                ⚙️ {showSettings ? 'Hide Settings' : 'Game Settings'}
              </button>
              
              {showSettings && (
                <div className="gb-inline-settings animate-scale-in">
                  <div className="gs-item">
                    <label>Rounds</label>
                    <select value={room?.maxRounds} onChange={e => actions.updateSettings({ maxRounds: e.target.value })}>
                       {[2,3,4,5,6,8,10].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="gs-item">
                    <label>Draw Time</label>
                    <select value={room?.drawTime} onChange={e => actions.updateSettings({ drawTime: e.target.value })}>
                       {[30,60,80,100,120,150,180].map(v => <option key={v} value={v}>{v}s</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="gb-lobby-footer">
          {isPrivate ? (
            isHost ? (
              <button className="btn btn-primary btn-lg lobby-start-btn" onClick={actions.startGame} disabled={players.length < 2}>
                🚀 Start Match
              </button>
            ) : (
              <div className="lobby-wait-msg">Wait for the host to start...</div>
            )
          ) : (
            <div className="lobby-wait-msg">
              {countdownActive ? 'Get ready to draw!' : 'Match will start automatically...'}
            </div>
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

        <div className="gb-round-badge">
          {gameState !== 'WAITING' && (
            <>
              <span className="gb-round-text">Round</span>
              <span>{currentRound} / {maxRounds}</span>
            </>
          )}
        </div>

        {gameState !== 'WAITING' && (
          <>
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
          </>
        )}

        {drawer && gameState !== 'WAITING' && (
          <div className="gb-drawer-chip">
            ✏️ <span className="gb-drawer-name">{drawer.name}</span> is drawing
          </div>
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
        {gameState === 'WAITING' ? (
          <WaitingLobby state={state} actions={actions} socket={socket} />
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
