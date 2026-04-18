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

  // Flush batched stroke data
  const flushStroke = useCallback(() => {
    if (strokeBuffer.current.length === 0) return;
    const data = strokeBuffer.current.splice(0);
    socket.emit('draw', { points: data, color, brushSize, tool });
  }, [color, brushSize, tool]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top)  * (canvas.height / rect.height)
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
    ctx.arc(pos.x, pos.y, (brushSize / 2), 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#0a0e1a' : color;
    ctx.fill();

    strokeBuffer.current.push({ ...pos, type: 'start' });
  }, [isDrawing, color, brushSize, tool]);

  const draw = useCallback((e) => {
    if (!isDrawing || !drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const pos = getPos(e, canvas);

    renderLine(ctx, lastPos.current, pos, {
      color: tool === 'eraser' ? '#0a0e1a' : color,
      brushSize,
      tool
    });

    strokeBuffer.current.push({ ...pos, type: 'move' });
    lastPos.current = pos;

    // Batch flush
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushStroke, BATCH_INTERVAL);
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
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
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

  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.beginPath();
  ctx.strokeStyle = color || '#000';
  ctx.lineWidth  = brushSize || 4;
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function replayStrokes(ctx, strokes) {
  strokes.forEach(s => renderStroke(ctx, s));
}
