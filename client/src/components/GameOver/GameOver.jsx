import { useGame } from '../../context/GameContext';
import './GameOver.css';

const MEDALS = ['🥇', '🥈', '🥉'];
const CONFETTI_COLORS = ['#3182ce', '#48bb78', '#9f7aea', '#ed8936', '#e53e3e', '#ecc94b'];

function Confetti() {
  return (
    <div className="confetti-container" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${2.5 + Math.random() * 2}s`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }} />
      ))}
    </div>
  );
}

export default function GameOver() {
  const { state, actions } = useGame();
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isHost = state.room?.hostId === state.socket?.id;

  return (
    <div className="gameover-overlay">
      <Confetti />
      <div className="gameover-card">
        <div className="go-top">
          <span className="go-trophy">🏆</span>
          <h1 className="go-title">Game Over!</h1>
          {winner && (
            <p className="go-winner">
              <span className="go-winner-name">{winner.name}</span> wins with{' '}
              <span className="go-winner-score">{winner.score} pts</span>!
            </p>
          )}
        </div>

        <div className="go-body">
          <div className="go-podium">
            {sorted.slice(0, 3).map((p, i) => (
              <div key={p.socketId} className={`go-podium-slot go-rank-${i + 1}`}>
                <span className="go-medal">{MEDALS[i]}</span>
                <div className="go-p-avatar" style={{ background: p.avatar }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="go-p-name">{p.name}</div>
                <div className="go-p-score">{p.score}</div>
              </div>
            ))}
          </div>

          {sorted.length > 3 && (
            <div className="go-leaderboard">
              {sorted.slice(3).map((p, i) => (
                <div key={p.socketId} className="go-lb-row">
                  <span className="go-lb-rank">#{i + 4}</span>
                  <div className="go-lb-avatar" style={{ background: p.avatar }}>{p.name.charAt(0).toUpperCase()}</div>
                  <span className="go-lb-name">{p.name}</span>
                  <span className="go-lb-score">{p.score} pts</span>
                </div>
              ))}
            </div>
          )}

          <div className="go-actions">
            {isHost && (
              <button id="btn-play-again" className="btn btn-start btn-lg" onClick={actions.playAgain}>
                ↺ Play Again
              </button>
            )}
            <button id="btn-back-lobby" className="btn btn-create btn-lg" onClick={actions.leaveRoom}>
              ← Lobby
            </button>
          </div>

          {(state.countdown ?? state.room?.countdown) != null && (
            <div className="go-restart-banner">
              <div className="go-restart-text">
                New game starting in <span className="go-restart-timer">{state.countdown ?? state.room.countdown}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
