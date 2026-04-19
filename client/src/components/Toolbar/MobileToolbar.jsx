import { useState, useCallback, useRef, useEffect } from 'react';
import socket from '../../utils/socket';
import './MobileToolbar.css';

const COLORS = [
  '#000000', '#3d3d3d', '#ffffff', '#c0c0c0',
  '#ff4757', '#ff6b81', '#ffa502', '#ff9f43',
  '#eccc68', '#ffd700', '#2ed573', '#7bed9f',
  '#1e90ff', '#00d4ff', '#a855f7', '#ff6f91',
];

const BRUSH_SIZES = [
  { size: 3,  r: 4  },
  { size: 7,  r: 7  },
  { size: 14, r: 11 },
  { size: 24, r: 15 },
  { size: 40, r: 19 },
];

export default function MobileToolbar({ isDrawing, onColorChange, onBrushChange, onToolChange, onClear, onUndo }) {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedSize,  setSelectedSize]  = useState(7);
  const [activeTool,    setActiveTool]    = useState('pencil');
  const [popup, setPopup] = useState(null); // 'color' | 'brush' | null

  const popupRef = useRef(null);

  // Close popup on click-outside
  useEffect(() => {
    if (!popup) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPopup(null);
      }
    };
    // Delay so the same tap that opened the popup does NOT immediately close it
    const tid = setTimeout(() => {
      document.addEventListener('click', handler);
      document.addEventListener('touchend', handler, { passive: true });
    }, 50);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('click', handler);
      document.removeEventListener('touchend', handler);
    };
  }, [popup]);

  const handleColor = useCallback((c) => {
    setSelectedColor(c);
    if (activeTool === 'eraser') {
      setActiveTool('pencil');
      onToolChange('pencil');
    }
    onColorChange(c);
    setPopup(null);
  }, [onColorChange, onToolChange, activeTool]);

  const handleSize = useCallback((s) => {
    setSelectedSize(s);
    onBrushChange(s);
    setPopup(null);
  }, [onBrushChange]);

  const handleTool = useCallback((t) => {
    setActiveTool(t);
    onToolChange(t);
  }, [onToolChange]);

  const handleClear = useCallback(() => {
    onClear?.();
    socket.emit('clear-canvas');
  }, [onClear]);

  const handleUndo = useCallback(() => {
    onUndo?.();
    socket.emit('undo');
  }, [onUndo]);

  if (!isDrawing) return null;

  const isEraser = activeTool === 'eraser';
  const isFill   = activeTool === 'fill';
  const dotColor = isEraser ? '#aaa' : selectedColor;

  return (
    <div className="mtb">
      {/* ── Popup ── */}
      {popup && (
        <div className="mtb-popup" ref={popupRef}>
          {popup === 'color' && (
            <>
              <div className="mtb-popup-title">Pick a color</div>
              <div className="mtb-color-grid">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`mtb-color-swatch ${selectedColor === c && !isEraser ? 'mtb-swatch-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => handleColor(c)}
                  />
                ))}
              </div>
              <label className="mtb-custom-color">
                <span>Custom</span>
                <div className="mtb-custom-preview" style={{ background: selectedColor }}>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={e => handleColor(e.target.value)}
                    style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                  />
                </div>
              </label>
            </>
          )}

          {popup === 'brush' && (
            <>
              <div className="mtb-popup-title">Brush size</div>
              <div className="mtb-brush-row">
                {BRUSH_SIZES.map(({ size, r }) => (
                  <button
                    key={size}
                    className={`mtb-brush-btn ${selectedSize === size ? 'mtb-brush-active' : ''}`}
                    onClick={() => handleSize(size)}
                  >
                    <div
                      className="mtb-brush-dot"
                      style={{ width: r * 2, height: r * 2, background: dotColor }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Bar ── */}
      <div className="mtb-bar">

        {/* Left: color + size */}
        <div className="mtb-section">
          <button
            className={`mtb-btn ${popup === 'color' ? 'mtb-btn-active' : ''}`}
            onClick={() => setPopup(p => p === 'color' ? null : 'color')}
            title="Color"
          >
            <span className="mtb-color-preview" style={{ background: selectedColor }} />
          </button>

          <button
            className={`mtb-btn ${popup === 'brush' ? 'mtb-btn-active' : ''}`}
            onClick={() => setPopup(p => p === 'brush' ? null : 'brush')}
            title="Brush Size"
          >
            <div
              className="mtb-brush-dot"
              style={{ width: Math.min(selectedSize, 16), height: Math.min(selectedSize, 16), background: dotColor, borderRadius: '50%' }}
            />
          </button>
        </div>

        <div className="mtb-divider" />

        {/* Center: pencil + filler */}
        <div className="mtb-section mtb-section-center">
          <button
            className={`mtb-btn ${activeTool === 'pencil' ? 'mtb-btn-active' : ''}`}
            onClick={() => handleTool('pencil')}
            title="Pencil"
          >
            <PencilIcon />
          </button>
          <button
            className={`mtb-btn ${isFill ? 'mtb-btn-active' : ''}`}
            onClick={() => handleTool('fill')}
            title="Fill Area"
          >
            <PaintBucketIcon />
          </button>
        </div>

        <div className="mtb-divider" />

        {/* Right: undo + clear */}
        <div className="mtb-section">
          <button className="mtb-btn" onClick={handleUndo} title="Undo">
            <UndoIcon />
          </button>
          <button className="mtb-btn mtb-btn-danger" onClick={handleClear} title="Clear">
            <TrashIcon />
          </button>
        </div>

      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function PaintBucketIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/>
      <path d="m5 7 5 5"/>
      <path d="M7 21h10"/>
    </svg>
  );
}

// Rewriting icons to use the actual requested ones
function UndoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}
