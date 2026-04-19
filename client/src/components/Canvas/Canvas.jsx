import { useEffect, useRef, useCallback, useState } from 'react';
import socket from '../../utils/socket';
import './Canvas.css';

const BATCH_INTERVAL = 16; // ~60fps

export default function Canvas({ isDrawing, color, brushSize, tool, onStrokeDone }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const strokeBuffer = useRef([]);
  const flushTimer = useRef(null);

  // Initialise canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    // Fetch existing drawing for late joiners
    socket.emit('get-drawing', (res) => {
      if (res?.drawingData?.length) {
        replayStrokes(ctx, res.drawingData);
      }
    });

    const handleResize = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.putImageData(imageData, 0, 0);
      ctx.lineCap  = 'round';
      ctx.lineJoin = 'round';
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Remote draw events + canvas clear on new turn
  useEffect(() => {
    const onDraw = (data) => {
      if (!ctxRef.current) return;
      renderStroke(ctxRef.current, data);
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctxRef.current) return;
      ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    };

    const onClear = clearCanvas;

    const onGameState = (data) => {
      // Clear canvas whenever a new picking/drawing turn begins
      if (data.state === 'PICKING_WORD') {
        clearCanvas();
      }
    };

    const onFullDrawing = (data) => {
      clearCanvas();
      replayStrokes(ctxRef.current, data);
    };

    socket.on('draw', onDraw);
    socket.on('clear-canvas', onClear);
    socket.on('game-state', onGameState);
    socket.on('full-drawing', onFullDrawing);
    return () => {
      socket.off('draw', onDraw);
      socket.off('clear-canvas', onClear);
      socket.off('game-state', onGameState);
      socket.off('full-drawing', onFullDrawing);
    };
  }, []);

  const flushStroke = useCallback(() => {
    if (strokeBuffer.current.length === 0) return;
    const data = strokeBuffer.current.splice(0);
    socket.emit('draw', { points: data, color, brushSize, tool });
    
    // Hold over the last point so the next chunk connects seamlessly without gaps!
    if (data.length > 0) {
      strokeBuffer.current.push({ ...data[data.length - 1], type: 'move' });
    }
  }, [color, brushSize, tool]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    // Return completely normalized percentages [0.0 to 1.0] 
    return {
      x: (src.clientX - rect.left) / rect.width,
      y: (src.clientY - rect.top)  / rect.height
    };
  };

  const startDraw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const pos = getPos(e, canvas);
    drawing.current = true;
    lastPos.current = pos;

    // Draw a dot immediately
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.arc(pos.x * canvas.width, pos.y * canvas.height, (brushSize / 2), 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#0a0e1a' : color;
    ctx.fill();

    strokeBuffer.current.push({ ...pos, type: 'start' });
  }, [isDrawing, color, brushSize, tool]);

  const draw = useCallback((e) => {
    if (!isDrawing || !drawing.current) return;
    
    // Prevent default to disable scrolling/zooming while drawing
    if (e.cancelable) e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const pos = getPos(e, canvas);

    // Only process if moved far enough (performance/smoothing based on normalized distance approx)
    const dist = lastPos.current ? Math.hypot((pos.x - lastPos.current.x) * canvas.width, (pos.y - lastPos.current.y) * canvas.height) : 0;
    if (dist < 2 && lastPos.current && pos.type !== 'start') return;

    renderLine(ctx, lastPos.current, pos, {
      color: tool === 'eraser' ? '#ffffff' : color, // Use white for eraser on client
      brushSize,
      tool
    });

    strokeBuffer.current.push({ ...pos, type: 'move' });
    lastPos.current = pos;

    // Batch flush is handled by endDraw or when buffer is large enough
    if (strokeBuffer.current.length >= 4) {
      flushStroke();
    }
  }, [isDrawing, color, brushSize, tool, flushStroke]);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    flushStroke();
    strokeBuffer.current = [];
    onStrokeDone?.();
  }, [flushStroke, onStrokeDone]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className={`game-canvas ${isDrawing ? 'canvas-active' : 'canvas-readonly'}`}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{ touchAction: 'none' }}
      />
      {!isDrawing && (
        <div className="canvas-overlay-text" aria-hidden>
          👀 watching...
        </div>
      )}
    </div>
  );
}

function renderLine(ctx, from, to, { color, brushSize, tool }) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.moveTo(from.x * cw, from.y * ch);
  ctx.lineTo(to.x * cw, to.y * ch);
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function renderStroke(ctx, data) {
  if (!data.points || data.points.length < 2) return;
  const { color, brushSize, tool, points } = data;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.strokeStyle = color || '#000';
  ctx.lineWidth  = brushSize || 4;
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';

  ctx.moveTo(points[0].x * cw, points[0].y * ch);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x * cw, points[i].y * ch);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function replayStrokes(ctx, strokes) {
  strokes.forEach(s => renderStroke(ctx, s));
}
