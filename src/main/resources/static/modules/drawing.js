/**
 * drawing.js - Drawing tools and canvas manipulation
 * Handles pen, highlighter, eraser, and stroke rendering
 */

const DrawingTools = {
  /**
   * Start drawing on canvas
   */
  startDrawing(e) {
    if (!['pen', 'highlighter', 'line', 'rectangle', 'circle'].includes(AppState.currentTool)) return;
    
    AppState.isDrawing = true;
    window._currentStroke = {
      points: [],
      color: AppState.currentColor,
      tool: AppState.currentTool,
      width: (AppState.currentTool === 'highlighter' ? 8 : 2),
      alpha: (AppState.currentTool === 'highlighter' ? 0.5 : 1)
    };
    
    const rect = AppState.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (window._currentStroke) window._currentStroke.points.push([x, y]);
    
    AppState.ctx.beginPath();
    AppState.ctx.moveTo(x, y);
    
    AppState.ctx.strokeStyle = AppState.currentColor;
    AppState.ctx.lineWidth = AppState.currentTool === 'highlighter' ? 8 : 2;
    AppState.ctx.lineCap = 'round';
    AppState.ctx.globalAlpha = AppState.currentTool === 'highlighter' ? 0.5 : 1;
  },

  /**
   * Continue drawing on canvas
   */
  draw(e) {
    if (!AppState.isDrawing) return;
    
    const rect = AppState.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (window._currentStroke) window._currentStroke.points.push([x, y]);
    
    // Progressive broadcast every 10 points
    if (window._currentStroke && window._currentStroke.points.length % 10 === 0) {
      try {
        if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
          const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
          CollaboSocket.publishElement(boardNumeric, {
            kind: 'stroke',
            payload: {
              points: window._currentStroke.points.slice(-10),
              color: window._currentStroke.color,
              width: window._currentStroke.width,
              alpha: window._currentStroke.alpha,
              tool: window._currentStroke.tool,
              partial: true,
              strokeId: window._currentStroke.id || (window._currentStroke.id = AppState.generateId())
            }
          });
        }
      } catch(err){ /* silent */ }
    }
    
    if (AppState.currentTool === 'pen' || AppState.currentTool === 'highlighter') {
      AppState.ctx.lineTo(x, y);
      AppState.ctx.stroke();
    }
  },

  /**
   * Stop drawing and save stroke
   */
  stopDrawing() {
    if (!AppState.isDrawing) return;
    
    AppState.isDrawing = false;
    AppState.ctx.closePath();
    
    const canvasImage = AppState.canvas.toDataURL('image/png');
    const canvasElement = {
      id: AppState.generateId(),
      type: 'drawing',
      timestamp: Date.now(),
      image: canvasImage,
      tool: AppState.currentTool,
      user: AppState.getCurrentUser().id
    };
    
    if (!Array.isArray(AppState.boardData.elementsMeta)) {
      AppState.boardData.elementsMeta = [];
    }
    AppState.boardData.elementsMeta.push(canvasElement);
    
    // Broadcast stroke
    try {
      if (window.CD && window.CD.boardId && window._currentStroke && typeof CollaboSocket !== 'undefined') {
        const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
        CollaboSocket.publishElement(boardNumeric, {
          kind: 'stroke',
          payload: {
            points: window._currentStroke.points,
            color: window._currentStroke.color,
            width: window._currentStroke.width,
            alpha: window._currentStroke.alpha,
            tool: window._currentStroke.tool,
            strokeId: window._currentStroke.id || (window._currentStroke.id = AppState.generateId())
          }
        });
      }
    } catch(e){ console.warn('Stroke broadcast failed', e); }
    
    window._currentStroke = null;
    
    // Save state
    History.saveState();
    try { Storage.saveBoardState(); } catch(_){ }
  },

  /**
   * Activate eraser tool
   */
  activateEraser() {
    UIControls.selectTool('eraser');
    const mainCanvas = document.getElementById('mainCanvas');
    mainCanvas.classList.add('eraser-mode');
    console.log('🧹 Eraser activated');
  },

  /**
   * Handle eraser click on canvas
   */
  handleEraserClick(e) {
    if (AppState.currentTool !== 'eraser') return;
    
    const rect = AppState.canvas.getBoundingClientRect();
    const eraserX = e.clientX - rect.left;
    const eraserY = e.clientY - rect.top;
    const eraserRadius = 20;
    
    AppState.ctx.clearRect(
      eraserX - eraserRadius,
      eraserY - eraserRadius,
      eraserRadius * 2,
      eraserRadius * 2
    );
    
    console.log('✅ Erased at:', eraserX, eraserY);
    
    History.saveState();
    
    try {
      if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
        const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
        CollaboSocket.publishElement(boardNumeric, {
          kind: 'erase',
          payload: { x: eraserX, y: eraserY, radius: eraserRadius }
        });
      }
    } catch(e){}
    
    try { Storage.saveBoardState(); } catch(_){ }
  },

  /**
   * Render remote strokes received from other users
   */
  renderRemoteStroke(payload) {
    if (!payload || !Array.isArray(payload.points)) return;
    
    const sid = payload.strokeId || 'unknown';
    window._remoteStrokePaths = window._remoteStrokePaths || {};
    const pts = payload.points;
    
    AppState.ctx.save();
    AppState.ctx.lineCap = 'round';
    AppState.ctx.strokeStyle = payload.color || '#000';
    AppState.ctx.globalAlpha = payload.alpha != null ? payload.alpha : 1;
    AppState.ctx.lineWidth = payload.width || 2;
    AppState.ctx.beginPath();
    
    const existing = window._remoteStrokePaths[sid];
    if (existing && existing.lastPoint) {
      AppState.ctx.moveTo(existing.lastPoint[0], existing.lastPoint[1]);
    } else if (pts.length) {
      AppState.ctx.moveTo(pts[0][0], pts[0][1]);
    }
    
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i];
      AppState.ctx.lineTo(px, py);
    }
    
    AppState.ctx.stroke();
    AppState.ctx.closePath();
    AppState.ctx.restore();
    
    if (pts.length) {
      window._remoteStrokePaths[sid] = { lastPoint: pts[pts.length - 1] };
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrawingTools;
}
