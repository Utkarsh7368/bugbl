import './Scoreboard.css';

export default function Scoreboard({ players, revealedWord, state }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const isTurnEnd  = state === 'TURN_END';
  const isRoundEnd = state === 'ROUND_END';

  return (
    <div className="scoreboard-overlay animate-fade-in">
      <div className="scoreboard-content">
        {revealedWord && (
          <div className="sb-word-reveal">
            <span className="sb-word-label">The word was</span>
            <span className="sb-word">{revealedWord}</span>
          </div>
        )}

        <div className="sb-players-list">
          {sorted.map((p, i) => (
            <div key={p.socketId} className="sb-player-row" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="sb-player-name">{p.name}</div>
              <div className="sb-player-points">
                {p.roundScore > 0 ? `+${p.roundScore}` : ''}
              </div>
            </div>
          ))}
        </div>

        <p className="sb-status-hint">
          {isTurnEnd ? 'Next turn starting soon...' : 'Preparing next round...'}
        </p>
      </div>
    </div>
  );
}
