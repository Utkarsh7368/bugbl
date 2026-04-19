import { useGame } from '../../context/GameContext';
import './WordSelector.css';

export default function WordSelector() {
  const { state, actions } = useGame();

  if (state.gameState !== 'PICKING_WORD') return null;

  if (!state.isDrawing) {
    return (
      <div className="gb-picking-banner">
        <div className="gb-picking-card">
          <h3>{state.drawerName} is choosing a word...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="word-selector-overlay">
      <div className="word-selector">
        <h2 className="ws-title">Choose a word</h2>
        <div className="ws-choices">
          {state.wordChoices.map((word) => (
            <button
              key={word}
              className="ws-choice-btn"
              onClick={() => actions.selectWord(word)}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
