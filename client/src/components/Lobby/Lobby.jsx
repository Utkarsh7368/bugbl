import { useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import './Lobby.css';

const AVATAR_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#6b46c1', '#d53f8c', '#2b6cb0',
  '#00b5d8', '#276749', '#744210', '#553c9a',
];

// Matching face emojis for each colour
const AVATAR_FACES = [
  '😎', '🤩', '😜', '🥳',
  '🤓', '🧙', '🥸', '😤',
  '🤖', '👾', '🦊', '🐱',
];

// Rainbow colours for each logo letter
const LOGO_COLORS = ['#e53e3e','#dd6b20','#d69e2e','#38a169','#3182ce','#6b46c1','#d53f8c','#e53e3e','#dd6b20'];

const LOGO_LETTERS = ['b','u','g','b','l','.','i','o'];
const LOGO_CLASSES = ['l1','l2','l3','l4','l5','dot','l6','l7'];

function WaitingRoom({ room, roomId, isHost, onStart, onLeave }) {
  const { state } = useGame();
  const [copied, setCopied] = useState(false);
  const isPrivate = room?.isPrivate;
  const players   = room?.players || [];
  const countdown = state.countdown; // null | number | -1

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  const countdownActive = countdown !== null && countdown > 0;

  return (
    <div className="waiting-overlay">
      <div className="waiting-card card animate-scale-in">

        {/* ── Header ── */}
        <div className="waiting-top">
          {isPrivate ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="waiting-title">🔐 Private Room</span>
                {room?.difficulty && room.difficulty !== 'random' && (
                  <span className={`diff-pill diff-pill-${room.difficulty}`}>
                    {{ easy:'🟢 Easy', medium:'🟡 Medium', hard:'🔴 Hard' }[room.difficulty]}
                  </span>
                )}
              </div>
              <div className="room-code-box" onClick={handleCopy} title="Click to copy">
                <span className="room-code-value">{roomId}</span>
                {copied
                  ? <span className="copied-label">✓ Copied!</span>
                  : <span className="room-code-hint">click to copy &amp; share</span>
                }
              </div>
            </>
          ) : (
            <>
              <span className="waiting-title">🌐 Public Lobby</span>
              <span className="waiting-player-count">{players.length} / {room?.maxPlayers || 8}</span>
            </>
          )}
        </div>

        {/* ── Body ── */}
        <div className="waiting-body">

          {/* Players */}
          <div className="waiting-players-list">
            {players.map((p, i) => (
              <div key={p.socketId} className="waiting-player-row" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="wp-avatar" style={{ background: p.avatar }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="wp-name">{p.name}</span>
                {isPrivate && p.socketId === room.hostId && (
                  <span className="wp-host-badge">host</span>
                )}
              </div>
            ))}
          </div>

          {/* ── Public lobby: countdown or waiting prompt ── */}
          {!isPrivate && (
            <>
              {countdownActive ? (
                <div className="pub-countdown-wrap">
                  <div className="pub-countdown-label">Game starting in</div>
                  <div className="pub-countdown-number">{countdown}</div>
                  <div className="pub-countdown-bar">
                    <div
                      className="pub-countdown-fill"
                      style={{ width: `${(countdown / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="waiting-hint">
                  ⏳ Waiting for players... ({players.length}/8)
                  {players.length < 2 && ' — need at least 2 to start'}
                </p>
              )}
            </>
          )}

          {/* ── Private lobby: hint when not enough players ── */}
          {isPrivate && players.length < 2 && (
            <p className="waiting-hint">
              📋 Share the code above — need at least 2 players to start
            </p>
          )}

          {/* ── Footer ── */}
          <div className="waiting-footer">
            {isPrivate ? (
              isHost ? (
                <button
                  id="btn-start-game"
                  className="btn btn-start btn-lg w-full"
                  onClick={onStart}
                  disabled={players.length < 2}
                >
                  ▶ Start Game ({players.length} / {room?.maxPlayers})
                </button>
              ) : (
                <div className="btn w-full" style={{ background:'#e2e8f0', color:'#718096', cursor:'default', fontSize:'1rem', fontWeight:700 }}>
                  ⏳ Waiting for host to start...
                </div>
              )
            ) : (
              /* Public room: no start button, just show info */
              <div className="pub-waiting-bar">
                <span className="pub-dot-anim">
                  <span/><span/><span/>
                </span>
                <span>
                  {countdownActive
                    ? `Game starting in ${countdown}...`
                    : 'Waiting for more players...'}
                </span>
              </div>
            )}
            <button id="btn-leave" className="btn btn-danger btn-sm" onClick={onLeave} title="Leave">✕</button>
          </div>

        </div>
      </div>
    </div>
  );
}


export default function Lobby() {
  const { state, actions, socket } = useGame();
  const [name, setName]       = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [settings, setSettings] = useState({ maxRounds: 3, drawTime: 80, maxPlayers: 8, difficulty: 'medium' });

  const trimmed  = name.trim();
  const canAct   = trimmed.length > 0 && !state.loading;
  const isInRoom = !!state.roomId;
  const isHost   = state.room?.hostId === socket?.id;

  const nextAvatar = () => setAvatarIndex(i => (i + 1) % AVATAR_COLORS.length);
  const prevAvatar = () => setAvatarIndex(i => (i - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length);

  return (
    <div className="lobby">
      {/* Logo */}
      <div className="lobby-logo-wrap">
        <div className="lobby-logo">
          {LOGO_LETTERS.map((ch, i) => (
            <span key={i} className={LOGO_CLASSES[i]} style={{ color: LOGO_COLORS[i], WebkitTextStroke: '2px rgba(0,0,0,0.15)' }}>{ch}</span>
          ))}
          <span className="l8" style={{ color: LOGO_COLORS[8], WebkitTextStroke: '2px rgba(0,0,0,0.15)' }}>!</span>
        </div>
        <p className="lobby-tagline">draw · guess · debug — for developers</p>
      </div>

      {/* Card */}
      <div className="lobby-card card">
        {state.loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:40 }}>
            <div className="spinner" style={{ borderTopColor: '#3182ce', borderColor: '#bee3f8' }} />
            <span style={{ color: '#718096', fontWeight:700 }}>Connecting...</span>
          </div>
        ) : (
          <>
            {/* Name input */}
            <div className="lobby-name-row">
              <label className="section-label" htmlFor="inp-name">Your name</label>
              <input
                id="inp-name"
                className="input"
                type="text"
                placeholder="e.g. 0xJohnDoe"
                value={name}
                maxLength={20}
                autoFocus
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAct && actions.quickPlay(trimmed)}
              />
            </div>

            {/* Avatar selector */}
            <div className="avatar-row">
              <button className="avatar-arrow" onClick={prevAvatar} aria-label="Previous avatar">
                <svg width="18" height="22" viewBox="0 0 18 22"><polygon points="15,2 3,11 15,20" fill="white"/></svg>
              </button>
              <div className="avatar-circle-big" style={{ background: AVATAR_COLORS[avatarIndex] }}>
                <span className="avatar-face">{AVATAR_FACES[avatarIndex]}</span>
                {trimmed && <span className="avatar-name-tag">{trimmed.slice(0,10)}</span>}
              </div>
              <button className="avatar-arrow" onClick={nextAvatar} aria-label="Next avatar">
                <svg width="18" height="22" viewBox="0 0 18 22"><polygon points="3,2 15,11 3,20" fill="white"/></svg>
              </button>
            </div>

            {/* Actions */}
            <div className="lobby-actions">
              <button id="btn-quick-play" className="btn btn-play" onClick={() => canAct && actions.quickPlay(trimmed)} disabled={!canAct}>
                ▶️  Play!
              </button>

              <div className="lobby-or">or</div>

              <button id="btn-create-room" className="btn btn-create" onClick={() => setShowSettings(s => !s)} disabled={!canAct}>
                🔧 Create Private Room
              </button>

              {showSettings && (
                <div className="lobby-settings animate-fade-in">

                  {/* Difficulty picker */}
                  <div className="diff-row">
                    <span className="section-label" style={{ marginBottom: 0 }}>Difficulty</span>
                    <div className="diff-btns">
                      {[
                        { val: 'easy',   label: '🟢 Easy',   desc: 'Simple objects' },
                        { val: 'medium', label: '🟡 Medium', desc: 'Two-word things' },
                        { val: 'hard',   label: '🔴 Hard',   desc: 'Complex logos' },
                      ].map(({ val, label, desc }) => (
                        <button
                          key={val}
                          type="button"
                          className={`diff-btn ${settings.difficulty === val ? 'diff-btn-active diff-active-' + val : ''}`}
                          onClick={() => setSettings(s => ({ ...s, difficulty: val }))}
                          title={desc}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-grid">
                    <div className="setting-item">
                      <label>Rounds</label>
                      <select value={settings.maxRounds} onChange={e => setSettings(s => ({ ...s, maxRounds: +e.target.value }))}>
                        {[2,3,4,5,6,8].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="setting-item">
                      <label>Draw Time</label>
                      <select value={settings.drawTime} onChange={e => setSettings(s => ({ ...s, drawTime: +e.target.value }))}>
                        {[30,60,80,100,120].map(v => <option key={v} value={v}>{v}s</option>)}
                      </select>
                    </div>
                    <div className="setting-item">
                      <label>Max Players</label>
                      <select value={settings.maxPlayers} onChange={e => setSettings(s => ({ ...s, maxPlayers: +e.target.value }))}>
                        {[2,4,6,8].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <button id="btn-confirm-create" className="btn btn-create w-full" onClick={() => { actions.createRoom(trimmed, { ...settings, isPrivate: true }); setShowSettings(false); }} disabled={!canAct}>
                    Create Room →
                  </button>
                </div>
              )}

              <div className="lobby-or">or</div>

              {!showJoin ? (
                <button
                  id="btn-show-join"
                  className="btn w-full"
                  style={{ background: '#edf2f7', color: '#3182ce', border: '2px solid #bee3f8', fontWeight: 800 }}
                  onClick={() => setShowJoin(true)}
                  disabled={!canAct}
                >
                  🔑 Join with Code
                </button>
              ) : (
                <div className="join-row animate-fade-in">
                  <input id="inp-room-code" className="input input-mono" type="text" placeholder="ROOM CODE"
                    value={joinCode} maxLength={6}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && canAct && joinCode.trim() && actions.joinRoom(trimmed, joinCode.trim())}
                    autoFocus />
                  <button id="btn-join-room" className="btn btn-join" onClick={() => actions.joinRoom(trimmed, joinCode.trim())} disabled={!canAct || !joinCode.trim()}>
                    Join →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Waiting room */}
      {isInRoom && (
        <WaitingRoom
          room={state.room}
          roomId={state.roomId}
          isHost={isHost}
          onStart={actions.startGame}
          onLeave={actions.leaveRoom}
        />
      )}
    </div>
  );
}
