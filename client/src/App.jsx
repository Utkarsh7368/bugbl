import { useState, useEffect } from 'react';
import { useGame } from './context/GameContext';
import Lobby from './components/Lobby/Lobby';
import GameBoard from './components/Game/GameBoard';
import './afk.css';

export default function App() {
  const { state, actions } = useGame();
  const [afkCountdown, setAfkCountdown] = useState(null);

  // Count down the AFK warning locally
  useEffect(() => {
    if (state.afkWarning === null) {
      setAfkCountdown(null);
      return;
    }
    setAfkCountdown(state.afkWarning);
    const interval = setInterval(() => {
      setAfkCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.afkWarning]);

  return (
    <>
      {/* Connection bar */}
      <div className={`connection-bar ${state.connected ? '' : 'disconnected'}`} />

      {/* Error toast */}
      {state.error && (
        <div className="error-toast" onClick={actions.clearError}>
          ⚠ {state.error} <span style={{ marginLeft: 8, opacity: 0.6 }}>✕</span>
        </div>
      )}

      {/* AFK warning toast */}
      {afkCountdown !== null && (
        <div className="afk-warning-toast">
          <span className="afk-warning-icon">⏰</span>
          <div className="afk-warning-text">
            <strong>Still there?</strong>
            <span>You'll be disconnected in <strong>{afkCountdown}s</strong> due to inactivity.</span>
          </div>
          <button className="afk-warning-btn" onClick={actions.dismissAfkWarning}>
            I'm here!
          </button>
        </div>
      )}

      {/* AFK disconnected modal */}
      {state.afkDisconnected && (
        <div className="afk-overlay">
          <div className="afk-modal">
            <div className="afk-modal-icon">😴</div>
            <h2 className="afk-modal-title">You were disconnected</h2>
            <p className="afk-modal-desc">
              You were away for too long and got disconnected from the server to save resources.
            </p>
            <div className="afk-modal-reason">
              💤 Inactive for 15 minutes
            </div>
            <button className="afk-modal-btn" onClick={actions.clearAfkDisconnected}>
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Route by room state */}
      {(!state.roomId || state.gameState === 'WAITING') ? (
        <Lobby />
      ) : (
        <GameBoard />
      )}
    </>
  );
}
