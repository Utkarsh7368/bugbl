import { useState, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import './Chat.css';

function ChatMessage({ msg }) {
  const typeClass = {
    'system':         'msg-system',
    'system-correct': 'msg-correct',
    'close-guess':    'msg-close',
    'drawer':         'msg-drawer',
    'player':         'msg-player',
  }[msg.type] || 'msg-player';

  return (
    <div className={`chat-msg ${typeClass} animate-slide-in`}>
      {msg.type === 'player' || msg.type === 'drawer' ? (
        <>
          <span className="msg-avatar" style={{ background: msg.avatar }}>
            {msg.playerName?.charAt(0)?.toUpperCase()}
          </span>
          <div className="msg-body">
            <span className="msg-name">{msg.playerName}</span>
            <span className="msg-text">{msg.message}</span>
          </div>
        </>
      ) : (
        <div className="msg-system-text">{msg.message}</div>
      )}
    </div>
  );
}

export default function Chat({ hasGuessed, isDrawing }) {
  const { state, actions } = useGame();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg) return;
    actions.sendGuess(msg);
    setInput('');
    inputRef.current?.focus();
  }, [input, actions]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const disabled = isDrawing || hasGuessed;
  let placeholder = 'Type your guess...';
  if (isDrawing)    placeholder = '🎨 You are drawing...';
  if (hasGuessed)   placeholder = '✅ You already guessed!';

  return (
    <div className="chat">
      <div className="chat-header">
        <span className="chat-title">// chat &amp; guesses</span>
        <span className="chat-count">{state.messages.length} msgs</span>
      </div>

      <div className="chat-messages">
        {state.messages.length === 0 && (
          <div className="chat-empty">
            <span>💬</span>
            <span>Start guessing!</span>
          </div>
        )}
        {state.messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          ref={inputRef}
          id="chat-input"
          className={`input chat-input ${disabled ? 'chat-input-disabled' : ''}`}
          type="text"
          placeholder={placeholder}
          value={input}
          maxLength={200}
          disabled={disabled}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button
          id="btn-send-guess"
          className="btn btn-primary chat-send-btn"
          onClick={handleSend}
          disabled={disabled || !input.trim()}
        >
          ↵
        </button>
      </div>
    </div>
  );
}
