import { useState, useEffect } from 'react';
import socket from '../../utils/socket';
import './PlayerList.css';

export default function PlayerList({ players, currentDrawerId, mySocketId, onVoteKick, onLeaveRoom }) {
  const [kickTarget, setKickTarget] = useState(null); // { socketId, name }
  const [voted, setVoted]           = useState(false);
  const [progress, setProgress]     = useState(null); // { votesCast, votesNeeded }

  // Listen for vote-kick-progress events from server
  useEffect(() => {
    const onProgress = (data) => {
      if (kickTarget && data.targetSocketId === kickTarget.socketId) {
        setProgress({ votesCast: data.votesCast, votesNeeded: data.votesNeeded });
      }
    };
    socket.on('vote-kick-progress', onProgress);
    return () => socket.off('vote-kick-progress', onProgress);
  }, [kickTarget]);

  const sorted = [...players].sort((a, b) => b.score - a.score);

  const handleRowClick = (player) => {
    if (player.socketId === mySocketId) return;
    if (!onVoteKick) return;
    setKickTarget({ socketId: player.socketId, name: player.name });
    setVoted(false);
    setProgress(null);
  };

  const confirmKick = () => {
    if (!kickTarget || voted) return;
    onVoteKick(kickTarget.socketId);
    setVoted(true);
  };

  const closePopup = () => {
    setKickTarget(null);
    setVoted(false);
    setProgress(null);
  };

  return (
    <>
      <div className="player-list">
        <div className="player-list-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="player-list-title">// players</span>
            <span className="player-count">{players.length}</span>
          </div>
          {onLeaveRoom && (
            <button className="player-leave-btn" onClick={onLeaveRoom}>
              ✕ <span className="player-leave-text">Leave</span>
            </button>
          )}
        </div>
        <div className="player-list-items">
          {sorted.map((p, i) => (
            <PlayerRow
              key={p.socketId}
              player={p}
              rank={i + 1}
              isDrawing={p.socketId === currentDrawerId}
              isMe={p.socketId === mySocketId}
              canKick={!!onVoteKick && p.socketId !== mySocketId}
              onClick={() => handleRowClick(p)}
            />
          ))}
        </div>
      </div>

      {/* ── Vote-kick popup ── */}
      {kickTarget && (
        <div className="kick-overlay" onClick={closePopup}>
          <div className="kick-popup" onClick={e => e.stopPropagation()}>
            <div className="kick-popup-icon">🔨</div>
            <div className="kick-popup-title">Vote to kick</div>
            <div className="kick-popup-name">{kickTarget.name}</div>

            {!voted ? (
              <>
                <p className="kick-popup-desc">
                  If the majority of players agree,&nbsp;
                  <strong>{kickTarget.name}</strong> will be removed from the room.
                </p>
                <div className="kick-popup-actions">
                  <button className="kick-btn-confirm" onClick={confirmKick}>
                    👍 Vote Kick
                  </button>
                  <button className="kick-btn-cancel" onClick={closePopup}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="kick-popup-desc kick-voted-msg">
                  ✅ Your vote has been cast!
                </p>

                {/* Live progress */}
                {progress ? (
                  <div className="kick-progress-wrap">
                    <div className="kick-progress-label">
                      <span>{progress.votesCast} voted</span>
                      <span className="kick-progress-needed">
                        {progress.votesNeeded} needed
                      </span>
                    </div>
                    <div className="kick-progress-bar">
                      <div
                        className="kick-progress-fill"
                        style={{ width: `${(progress.votesCast / progress.votesNeeded) * 100}%` }}
                      />
                    </div>
                    <div className="kick-progress-fraction">
                      {progress.votesCast} / {progress.votesNeeded} votes
                    </div>
                  </div>
                ) : (
                  <div className="kick-progress-wrap">
                    <div className="kick-progress-label">
                      <span>Waiting for votes…</span>
                    </div>
                    <div className="kick-progress-bar">
                      <div className="kick-progress-fill kick-progress-pulse" style={{ width: '15%' }} />
                    </div>
                  </div>
                )}

                <button className="kick-btn-cancel" style={{ marginTop: 8, width: '100%' }} onClick={closePopup}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PlayerRow({ player, rank, isDrawing, isMe, canKick, onClick }) {
  return (
    <div
      className={`player-row ${isDrawing ? 'player-row-drawing' : ''} ${isMe ? 'player-row-me' : ''} ${!player.isConnected ? 'player-row-disconnected' : ''} ${canKick ? 'player-row-kickable' : ''}`}
      onClick={canKick ? onClick : undefined}
      title={canKick ? `Click to vote-kick ${player.name}` : undefined}
    >
      <div className="player-rank">#{rank}</div>
      <div className="player-avatar" style={{ background: player.avatar }}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="player-info">
        <div className="player-name">
          {player.name}
          {isMe && <span className="player-me-tag">you</span>}
        </div>
        <div className="player-score">{player.score} pts</div>
      </div>
      <div className="player-status">
        {isDrawing && <span className="player-drawing-icon" title="Drawing">✏️</span>}
        {player.hasGuessed && !isDrawing && <span title="Guessed!">✅</span>}
        {!player.isConnected && <span title="Disconnected">⚪</span>}
        {canKick && <span className="player-kick-hint">🔨</span>}
      </div>
    </div>
  );
}
