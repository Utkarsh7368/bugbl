import { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import './CanvasToasts.css';

/**
 * CanvasToasts - Displays rapid, disappearing notifications in the canvas corner.
 * Toasts fade out after 1.5 seconds.
 */
export default function CanvasToasts() {
  const { state } = useGame();
  const [activeToasts, setActiveToasts] = useState([]);
  const lastMsgCount = useRef(0);

  useEffect(() => {
    // Detect new messages
    if (state.messages.length > lastMsgCount.current) {
      const newMessages = state.messages.slice(lastMsgCount.current);
      lastMsgCount.current = state.messages.length;

      const newToasts = newMessages.map(msg => ({
        ...msg,
        id: Math.random().toString(36).substr(2, 9)
      }));

      setActiveToasts(prev => [...prev, ...newToasts].slice(-3));

      // Auto-remove each new toast after 3 seconds
      newToasts.forEach(toast => {
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 3000);
      });
    } else if (state.messages.length < lastMsgCount.current) {
      // Room changed or messages cleared
      lastMsgCount.current = state.messages.length;
      setActiveToasts([]);
    }
  }, [state.messages]);

  if (activeToasts.length === 0) return null;

  return (
    <div className="canvas-toasts-container">
      {activeToasts.map((toast) => (
        <div key={toast.id} className={`canvas-toast-bubble type-${toast.type}`}>
          {toast.type === 'player' || toast.type === 'drawer' ? (
            <div className="toast-player-content">
              <span className="toast-name">{toast.playerName}:</span>
              <span className="toast-msg">{toast.message}</span>
            </div>
          ) : (
            <div className="toast-system-content">
              {toast.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
