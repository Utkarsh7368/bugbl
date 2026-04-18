import { useState, useRef, useCallback } from 'react';
import { useGame } from '../../context/GameContext';

export default function ChatInput({ hasGuessed, isDrawing, className = '' }) {
  const { actions } = useGame();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

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
    <div className={`chat-input-row ${className}`}>
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
  );
}
