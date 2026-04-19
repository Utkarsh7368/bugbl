import { useState, useEffect } from 'react';
import socket from '../../utils/socket';
import './PlayerList.css';

export default function PlayerList({ players, currentDrawerId, mySocketId, isPrivate, hostId, onVoteKick, onLeaveRoom, mutedUsers = [], onToggleMute }) {
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
    setKickTarget({ 
      socketId: player.socketId, 
      name: player.name, 
      avatar: player.avatar 
    });
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
              isHost={p.socketId === hostId && isPrivate}
              isMuted={mutedUsers.includes(p.socketId)}
              canKick={!!onVoteKick && p.socketId !== mySocketId}
              onClick={() => handleRowClick(p)}
            />
          ))}
        </div>
      </div>

      {/* ── Player Actions popup ── */}
      {kickTarget && (
        <div className="pa-overlay" onClick={closePopup}>
          <div className="pa-popup" onClick={e => e.stopPropagation()}>
            <div className="pa-header">
              <h2 className="pa-name">{kickTarget.name}</h2>
              <button className="pa-close" onClick={closePopup}>✕</button>
            </div>

            <div className="pa-body">
              <div className="pa-left">
                <div className="pa-large-avatar" style={{ background: kickTarget.avatar }}>
                  {kickTarget.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="pa-right">
                <button 
                  className={`pa-btn pa-btn-vote ${voted ? 'pa-btn-disabled' : ''}`} 
                  onClick={confirmKick}
                  disabled={voted}
                >
                  {voted ? 'Voted to Kick' : 'Votekick'}
                </button>
                <button 
                  className={`pa-btn pa-btn-mute ${mutedUsers.includes(kickTarget.socketId) ? 'pa-btn-active' : ''}`}
                  onClick={() => onToggleMute(kickTarget.socketId)}
                >
                  {mutedUsers.includes(kickTarget.socketId) ? 'Unmute' : 'Mute'}
                </button>
                <button className="pa-btn pa-btn-report">Report</button>
              </div>
            </div>

            {/* Voting Progress (if in progress) */}
            {(voted || progress) && (
              <div className="pa-progress-section">
                <div className="pa-progress-bar">
                  <div 
                    className="pa-progress-fill" 
                    style={{ width: `${((progress?.votesCast || 1) / (progress?.votesNeeded || 2)) * 100}%` }}
                  />
                </div>
                <div className="pa-progress-text">
                  {progress?.votesCast || 1} / {progress?.votesNeeded || '?'} votes needed
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PlayerRow({ player, rank, isDrawing, isMe, isHost, isMuted, canKick, onClick }) {
  const rowClass = `
    player-row 
    ${isDrawing ? 'player-row-drawing' : ''} 
    ${isMe ? 'player-row-me' : ''} 
    ${!player.isConnected ? 'player-row-disconnected' : ''} 
    ${canKick ? 'player-row-kickable' : ''}
    ${isMuted ? 'player-row-muted' : ''}
  `;

  return (
    <div
      className={rowClass}
      onClick={canKick ? onClick : undefined}
      title={canKick ? `Click for actions on ${player.name}` : undefined}
    >
      <div className="player-rank">#{rank}</div>
      <div className="player-avatar" style={{ background: player.avatar }}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div className="player-info">
        <div className="player-name">
          {player.name}
          {isMe && <span className="player-me-tag">you</span>}
          {isHost && <span className="player-host-tag">host</span>}
        </div>
        <div className="player-score">{player.score} pts</div>
      </div>
      <div className="player-status">
        {isDrawing && <span className="player-drawing-icon" title="Drawing">✏️</span>}
        {isMuted && <span className="player-muted-icon" title="Muted">🔇</span>}
        {!player.isConnected && <span title="Disconnected">⚪</span>}
      </div>
    </div>
  );
}
