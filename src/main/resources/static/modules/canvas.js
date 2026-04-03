/**
 * canvas.js - Canvas rendering and view management
 * Handles zoom, pan, canvas resizing, and remote cursor rendering
 */

const Canvas = {
  /**
   * Resize canvas to match viewport
   */
  resizeCanvas() {
    const rect = AppState.mainCanvas.getBoundingClientRect();
    AppState.canvas.width = rect.width;
    AppState.canvas.height = rect.height;
  },

  /**
   * Zoom in
   */
  zoomIn() {
    AppState.zoomLevel = Math.min(AppState.zoomLevel * AppState.CONFIG.ZOOM_STEP, AppState.CONFIG.ZOOM_MAX);
    this.updateZoom();
  },

  /**
   * Zoom out
   */
  zoomOut() {
    AppState.zoomLevel = Math.max(AppState.zoomLevel / AppState.CONFIG.ZOOM_STEP, AppState.CONFIG.ZOOM_MIN);
    this.updateZoom();
  },

  /**
   * Fit to screen
   */
  fitToScreen() {
    AppState.zoomLevel = 1;
    AppState.panX = 0;
    AppState.panY = 0;
    this.updateZoom();
  },

  /**
   * Update zoom transform
   */
  updateZoom() {
    AppState.mainCanvas.style.transform = `scale(${AppState.zoomLevel}) translate(${AppState.panX}px, ${AppState.panY}px)`;
    const zoomEl = document.getElementById('zoomLevel');
    if (zoomEl) {
      zoomEl.textContent = Math.round(AppState.zoomLevel * 100) + '%';
    }
  },

  /**
   * Render remote user cursors
   */
  renderRemoteCursors() {
    const container = document.getElementById('userCursors');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(AppState.remoteCursors).forEach(key => {
      const c = AppState.remoteCursors[key];
      const el = document.createElement('div');
      el.className = 'user-cursor';
      el.style.position = 'absolute';
      el.style.left = `${Math.max(0, Math.floor(c.x))}px`;
      el.style.top = `${Math.max(0, Math.floor(c.y))}px`;
      el.style.pointerEvents = 'none';
      el.innerHTML = `
        <div class="cursor-pointer" style="width:8px;height:8px;border-radius:50%;background:${c.color};box-shadow:0 0 0 2px rgba(255,255,255,0.8)"></div>
        <div class="cursor-label" style="position:relative;left:10px;top:-6px;background:rgba(0,0,0,0.7);color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;">${c.name}</div>
      `;
      container.appendChild(el);
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Canvas;
}
