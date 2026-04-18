import './Scoreboard.css';

export default function Scoreboard({ players, revealedWord, state }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const isTurnEnd  = state === 'TURN_END';
  const isRoundEnd = state === 'ROUND_END';

  return (
    <div className="scoreboard-overlay animate-fade-in">
      <div className="scoreboard animate-scale-in">
        <div className="sb-top">
          <h2 className="sb-title">
            {isTurnEnd  && '⌛ Turn Over'}
            {isRoundEnd && '🔄 Round Complete'}
          </h2>
        </div>

        {revealedWord && (
          <div className="sb-word-reveal">
            <span className="sb-word-label">The word was</span>
            <span className="sb-word">{revealedWord}</span>
          </div>
        )}

        <div className="sb-players">
          {sorted.map((p, i) => (
            <div key={p.socketId} className="sb-player" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="sb-rank">#{i + 1}</div>
              <div className="sb-avatar" style={{ background: p.avatar }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="sb-name">{p.name}</div>
              {p.roundScore > 0 && <span className="sb-round-score">+{p.roundScore}</span>}
              <span className="sb-total-score">{p.score}</span>
            </div>
          ))}
        </div>

        <p className="sb-next-hint">Next turn starting soon...</p>
      </div>
    </div>
  );
}
