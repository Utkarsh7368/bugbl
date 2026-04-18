import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import './WordSelector.css';

// Languages that are guessed by drawing their logo
const LOGO_WORDS = new Set([
  'JavaScript','Python','Java','TypeScript','Ruby','Rust','Go','Swift','Kotlin',
  'Dart','PHP','C++','C#','HTML','CSS','React','Vue','Angular','Svelte','Next.js',
  'Node.js','Django','Flask','Laravel','Spring','Rails','Flutter','Elixir','Haskell',
  'Scala','R','MATLAB','Julia','Lua','Perl','Clojure','Erlang','F#','Zig','Nim',
  'Crystal','Hack','Groovy','Cobol','Assembly','Bash','PowerShell','Solidity',
  'WebAssembly','GraphQL','Terraform','Docker','Kubernetes','Redis','MongoDB',
  'PostgreSQL','MySQL','SQLite','Git','GitHub','Linux','Android','Apple','Windows',
  'Ubuntu','Vim','Emacs'
]);

export default function WordSelector() {
  const { state, actions } = useGame();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    setCountdown(15);
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (state.gameState !== 'PICKING_WORD' || !state.isDrawing) return null;

  return (
    <div className="word-selector-overlay">
      <div className="word-selector glass-card animate-scale-in">
        <div className="ws-header">
          <h2 className="ws-title">Choose a word to draw</h2>
          <div className="ws-countdown">
            <span>{countdown}s</span>
          </div>
        </div>
        <p className="ws-subtitle">// pick wisely — your teammates need to guess it</p>
        <div className="ws-choices">
          {state.wordChoices.map((word, i) => {
            const isLogo = LOGO_WORDS.has(word);
            return (
              <button
                key={word}
                id={`word-choice-${i}`}
                className="ws-choice-btn"
                onClick={() => actions.selectWord(word)}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="ws-choice-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="ws-choice-word">{word}</span>
                <span className="ws-choice-meta">
                  {isLogo && (
                    <span className="ws-logo-badge" title="Draw the logo!">🎨 logo</span>
                  )}
                  <span className="ws-choice-len">{word.replace(/ /g,'').length} letters</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
