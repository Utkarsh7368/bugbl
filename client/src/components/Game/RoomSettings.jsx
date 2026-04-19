import { useState } from 'react';
import './RoomSettings.css';

const ROUND_OPTIONS = [1, 2, 3, 5, 8, 10];
const TIME_OPTIONS  = [30, 60, 80, 100, 120, 180];
const DIFF_OPTIONS  = ['easy', 'normal', 'hard', 'random'];

export default function RoomSettings({ currentSettings, onClose, onSave }) {
  const [rounds, setRounds]           = useState(currentSettings.maxRounds || 3);
  const [drawTime, setDrawTime]       = useState(currentSettings.drawTime  || 80);
  const [maxPlayers, setMaxPlayers]   = useState(currentSettings.maxPlayers || 8);
  const [difficulty, setDifficulty]   = useState(currentSettings.difficulty || 'normal');

  const handleSave = () => {
    onSave({
      maxRounds: rounds,
      drawTime,
      maxPlayers,
      difficulty
    });
    onClose();
  };

  return (
    <div className="settings-overlay animate-fade-in">
      <div className="settings-card card animate-scale-in">
        <div className="settings-header">
          <h3>⚙️ Room Settings</h3>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          {/* Rounds */}
          <div className="setting-group">
            <label className="section-label">Rounds</label>
            <div className="setting-options">
              {ROUND_OPTIONS.map(opt => (
                <button 
                  key={opt}
                  className={`setting-opt ${rounds === opt ? 'active' : ''}`}
                  onClick={() => setRounds(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Draw Time */}
          <div className="setting-group">
            <label className="section-label">Draw Time (seconds)</label>
            <div className="setting-options">
              {TIME_OPTIONS.map(opt => (
                <button 
                  key={opt}
                  className={`setting-opt ${drawTime === opt ? 'active' : ''}`}
                  onClick={() => setDrawTime(opt)}
                >
                  {opt}s
                </button>
              ))}
            </div>
          </div>

          {/* Max Players */}
          <div className="setting-group">
            <label className="section-label">Max Players: {maxPlayers}</label>
            <input 
              type="range" 
              className="settings-slider"
              min="2" max="12" step="1"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            />
          </div>

          {/* Difficulty */}
          <div className="setting-group">
            <label className="section-label">Word Difficulty</label>
            <div className="setting-options">
              {DIFF_OPTIONS.map(opt => (
                <button 
                  key={opt}
                  className={`setting-opt ${difficulty === opt ? 'active' : ''}`}
                  onClick={() => setDifficulty(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-start" style={{ width: 'auto', padding: '10px 30px' }} onClick={handleSave}>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
