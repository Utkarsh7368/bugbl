import { useState, useCallback } from 'react';
import socket from '../../utils/socket';
import './Toolbar.css';

const COLORS = [
  '#000000', '#3d3d3d', '#ffffff',
  '#ff4757', '#ffa502', '#eccc68',
  '#2ed573', '#1e90ff', '#00d4ff',
  '#a855f7', '#ff6f91', '#ff9f43',
];

const BRUSH_SIZES = [
  { size: 3,  label: 'XS' },
  { size: 6,  label: 'S' },
  { size: 12, label: 'M' },
  { size: 24, label: 'L' },
  { size: 40, label: 'XL' },
];

export default function Toolbar({ isDrawing, onColorChange, onBrushChange, onToolChange, onClear, onUndo }) {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedSize, setSelectedSize]   = useState(6);
  const [activeTool, setActiveTool]       = useState('pencil');

  const handleColor = useCallback((c) => {
    setSelectedColor(c);
    setActiveTool('pencil');
    onColorChange(c);
    onToolChange('pencil');
  }, [onColorChange, onToolChange]);

  const handleBrush = useCallback((s) => {
    setSelectedSize(s);
    onBrushChange(s);
  }, [onBrushChange]);

  const handleTool = useCallback((t) => {
    setActiveTool(t);
    onToolChange(t);
  }, [onToolChange]);

  const handleClear = useCallback(() => {
    onClear();
    socket.emit('clear-canvas');
  }, [onClear]);

  const handleUndo = useCallback(() => {
    onUndo();
    socket.emit('undo');
  }, [onUndo]);

  if (!isDrawing) return null;

  return (
    <div className="toolbar">

      {/* ── Color strip ── */}
      <div className="toolbar-colors">
        {COLORS.map(c => (
          <button
            key={c}
            className={`color-dot ${selectedColor === c && activeTool !== 'eraser' ? 'color-dot-active' : ''}`}
            style={{ background: c }}
            onClick={() => handleColor(c)}
            title={c}
          />
        ))}
        {/* Custom colour picker — small eyedropper icon */}
        <label className="color-dot color-dot-custom" title="Custom color" style={{ background: selectedColor }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 22l4-4M14 3l7 7-9 9-4-1-1-4 7-11z"/>
          </svg>
          <input
            type="color"
            value={selectedColor}
            onChange={e => handleColor(e.target.value)}
            style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
          />
        </label>
      </div>

      <div className="toolbar-divider" />

      {/* ── Brush sizes ── */}
      <div className="brush-sizes">
        {BRUSH_SIZES.map(({ size, label }) => (
          <button
            key={size}
            id={`brush-${label.toLowerCase()}`}
            className={`brush-btn ${selectedSize === size ? 'brush-btn-active' : ''}`}
            onClick={() => handleBrush(size)}
            title={`${size}px`}
          >
            <div
              className="brush-preview"
              style={{
                width:  Math.min(size, 20) + 'px',
                height: Math.min(size, 20) + 'px',
                background: activeTool === 'eraser' ? 'rgba(255,255,255,0.3)' : selectedColor,
                borderRadius: '50%',
                minWidth: '4px', minHeight: '4px'
              }}
            />
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* ── Tools ── */}
      <div className="tool-btns">
        <button
          id="tool-pencil"
          className={`tool-btn ${activeTool === 'pencil' ? 'tool-btn-active' : ''}`}
          onClick={() => handleTool('pencil')}
          title="Pencil"
        >✏️</button>
        <button
          id="tool-eraser"
          className={`tool-btn ${activeTool === 'eraser' ? 'tool-btn-active' : ''}`}
          onClick={() => handleTool('eraser')}
          title="Eraser"
        >🧹</button>
        <button
          id="tool-undo"
          className="tool-btn"
          onClick={handleUndo}
          title="Undo"
        >↩</button>
        <button
          id="tool-clear"
          className="tool-btn tool-btn-danger"
          onClick={handleClear}
          title="Clear canvas"
        >🗑</button>
      </div>
    </div>
  );
}
