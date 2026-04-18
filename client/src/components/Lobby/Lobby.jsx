import { useState, useCallback, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import './Lobby.css';

const AVATAR_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#6b46c1', '#d53f8c', '#2b6cb0',
  '#00b5d8', '#276749', '#744210', '#553c9a',
];

const AVATAR_FACES = [
  '😎', '🤩', '😜', '🥳',
  '🤓', '🧙', '🥸', '😤',
  '🤖', '👾', '🦊', '🐱',
];

const LOGO_COLORS = ['#e53e3e','#dd6b20','#d69e2e','#38a169','#3182ce','#6b46c1','#d53f8c','#e53e3e','#dd6b20'];
const LOGO_LETTERS = ['b','u','g','b','l','.','i','o'];
const LOGO_CLASSES = ['l1','l2','l3','l4','l5','dot','l6','l7'];

export default function Lobby() {
  const { state, actions } = useGame();
  const [name, setName]       = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);

  const trimmed  = name.trim();
  const canAct   = trimmed.length > 0 && !state.loading;

  const nextAvatar = () => setAvatarIndex(i => (i + 1) % AVATAR_COLORS.length);
  const prevAvatar = () => setAvatarIndex(i => (i - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom && !state.roomId) {
      setJoinCode(urlRoom.toUpperCase());
      setShowJoin(true);
    }
  }, [state.roomId]);

  return (
    <div className="lobby">
      <div className="lobby-logo-wrap" style={{ marginTop: '8vh' }}>
        <div className="lobby-logo">
          {LOGO_LETTERS.map((ch, i) => (
            <span key={i} className={LOGO_CLASSES[i]} style={{ color: LOGO_COLORS[i], WebkitTextStroke: '2px rgba(0,0,0,0.15)' }}>{ch}</span>
          ))}
          <span className="l8" style={{ color: LOGO_COLORS[8], WebkitTextStroke: '2px rgba(0,0,0,0.15)' }}>!</span>
        </div>
        <p className="lobby-tagline">draw · guess · debug — for developers</p>
      </div>

      <div className="lobby-card card">
        {state.loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:40 }}>
            <div className="spinner" style={{ borderTopColor: '#3182ce', borderColor: '#bee3f8' }} />
            <span style={{ color: '#718096', fontWeight:700 }}>Connecting...</span>
          </div>
        ) : (
          <>
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

            <div className="lobby-actions">
              <button id="btn-quick-play" className="btn btn-play" onClick={() => canAct && actions.quickPlay(trimmed)} disabled={!canAct}>
                ▶️ Play Public
              </button>
              <div className="lobby-or">or</div>
              <button id="btn-create-room" className="btn btn-create" onClick={() => canAct && actions.createRoom(trimmed)} disabled={!canAct}>
                🔐 Create Private Room
              </button>
              <div className="lobby-or">or join with code</div>
              {!showJoin ? (
                <button id="btn-show-join" className="btn w-full" style={{ background: '#edf2f7', color: '#3182ce', border: '2px solid #bee3f8', fontWeight: 800 }} onClick={() => setShowJoin(true)} disabled={!canAct}>
                  🔑 Join Lobby
                </button>
              ) : (
                <div className="join-row animate-fade-in">
                  <input id="inp-room-code" className="input input-mono" type="text" placeholder="ROOM CODE" value={joinCode} maxLength={6} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && canAct && joinCode.trim() && actions.joinRoom(trimmed, joinCode.trim())} autoFocus />
                  <button id="btn-join-room" className="btn btn-join" onClick={() => actions.joinRoom(trimmed, joinCode.trim())} disabled={!canAct || !joinCode.trim()}>Join →</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
