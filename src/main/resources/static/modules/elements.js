/**
 * elements.js - Canvas element management
 * Handles creation, selection, manipulation of DOM elements
 */

const ElementManager = {
  lastZIndex: 10,
  
  getNextZIndex() {
    this.lastZIndex++;
    return this.lastZIndex;
  },

  /**
   * Setup interaction handlers for canvas elements
   */
  setupElementInteraction(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    element.addEventListener('mousedown', (e) => {
      if (AppState.currentTool !== 'select') return;
      
      e.stopPropagation();
      // Bring to front on interaction
      element.style.zIndex = this.getNextZIndex();

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        this.toggleElementSelection(element);
        return;
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = element.getBoundingClientRect();
      const canvasRect = AppState.mainCanvas.getBoundingClientRect();
      startLeft = rect.left - canvasRect.left;
      startTop = rect.top - canvasRect.top;
      
      this.selectElement(element);
      element.classList.add('dragging');
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = (startLeft + deltaX) + 'px';
      element.style.top = (startTop + deltaY) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      
      isDragging = false;
      element.classList.remove('dragging');
      
      History.saveState();
      
      try {
        if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
          const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
          CollaboSocket.publishElement(boardNumeric, {
            kind: 'move',
            payload: {
              id: element.dataset.id,
              x: parseInt(element.style.left, 10) || 0,
              y: parseInt(element.style.top, 10) || 0,
              zIndex: element.style.zIndex // Ensure zIndex is synced
            }
          });
        }
      } catch(_){ }
    });
    
    element.addEventListener('dblclick', () => {
      this.editElement(element);
    });
  },

  /**
   * Create a sticky note element
   */
  createStickyNote(x, y) {
    const stickyId = AppState.generateId();
    const sticky = document.createElement('div');
    sticky.className = 'canvas-element sticky-note';
    sticky.style.left = x + 'px';
    sticky.style.top = y + 'px';
    sticky.style.zIndex = this.getNextZIndex();
    sticky.dataset.id = stickyId;
    
    sticky.innerHTML = `
      <input type="text" class="sticky-title" value="New Note" placeholder="Note title">
      <textarea class="sticky-content" placeholder="Add your thoughts..."></textarea>
      <div class="sticky-dots"><div class="dot"></div></div>
      <div class="resize-handle nw"></div>
      <div class="resize-handle ne"></div>
      <div class="resize-handle sw"></div>
      <div class="resize-handle se"></div>
    `;
    
    document.getElementById('canvasElements').appendChild(sticky);
    this.setupElementInteraction(sticky);
    this.selectElement(sticky);
    History.saveState();
    
    // Broadcast
    try {
      if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
        const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
        CollaboSocket.publishElement(boardNumeric, {
          kind: 'sticky',
          payload: { id: stickyId, x, y, title: 'New Note', content: '', zIndex: sticky.style.zIndex }
        });
      }
    } catch(e){}
    
    // Debounced updates
    const titleInput = sticky.querySelector('.sticky-title');
    const contentArea = sticky.querySelector('.sticky-content');
    let _stickyTimer;
    
    const queueUpdate = () => {
      clearTimeout(_stickyTimer);
      _stickyTimer = setTimeout(() => {
        try {
          if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
            const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
            CollaboSocket.publishElement(boardNumeric, {
              kind: 'sticky-update',
              payload: { id: stickyId, title: titleInput.value, content: contentArea.value }
            });
          }
        } catch(e){}
      }, 300);
    };
    
    if (titleInput) titleInput.addEventListener('input', queueUpdate);
    if (contentArea) contentArea.addEventListener('input', queueUpdate);
    
    return sticky;
  },

  /**
   * Create a text element
   */
  createTextElement(x, y) {
    const textId = AppState.generateId();
    const textEl = document.createElement('div');
    textEl.className = 'canvas-element';
    textEl.style.left = x + 'px';
    textEl.style.top = y + 'px';
    textEl.style.zIndex = this.getNextZIndex();
    textEl.dataset.id = textId;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'Text';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.outline = 'none';
    input.style.fontSize = '16px';
    input.style.color = AppState.currentColor;
    
    textEl.appendChild(input);
    document.getElementById('canvasElements').appendChild(textEl);
    
    input.focus();
    input.select();
    
    this.setupElementInteraction(textEl);
    History.saveState();
    
    // Broadcast
    try {
      if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
        const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
        CollaboSocket.publishElement(boardNumeric, {
          kind: 'text',
          payload: { id: textId, x, y, value: 'Text', zIndex: textEl.style.zIndex }
        });
      }
      
      let _textTimer;
      input.addEventListener('input', () => {
        clearTimeout(_textTimer);
        _textTimer = setTimeout(() => {
          try {
            if (window.CD && window.CD.boardId && typeof CollaboSocket !== 'undefined') {
              const boardNumeric = String(window.CD.boardId).replace(/^board-/, '');
              CollaboSocket.publishElement(boardNumeric, {
                kind: 'text-update',
                payload: { id: textId, value: input.value }
              });
            }
          } catch(e){}
        }, 250);
      });
    } catch(e){}
    
    return textEl;
  },

  /**
   * Select a canvas element
   */
  selectElement(element) {
    AppState.selectedElements.forEach(el => el.classList.remove('selected'));
    AppState.selectedElements = [];
    
    element.classList.add('selected');
    AppState.selectedElements.push(element);
    
    UIControls.updatePropertiesPanel(element);
  },

  /**
   * Toggle element selection
   */
  toggleElementSelection(element) {
    if (!element) return;
    const index = AppState.selectedElements.indexOf(element);
    if (index >= 0) {
      element.classList.remove('selected');
      AppState.selectedElements.splice(index, 1);
    } else {
      element.classList.add('selected');
      AppState.selectedElements.push(element);
    }
    if (AppState.selectedElements.length > 0) {
      UIControls.updatePropertiesPanel(AppState.selectedElements[AppState.selectedElements.length - 1]);
    }
  },

  /**
   * Clear all selections
   */
  clearSelection() {
    AppState.selectedElements.forEach(el => el.classList.remove('selected'));
    AppState.selectedElements = [];
  },

  /**
   * Edit a canvas element
   */
  editElement(element) {
    const inputs = element.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.removeAttribute('readonly');
      input.focus();
      if (input.select) input.select();
      
      input.addEventListener('blur', function() {
        input.setAttribute('readonly', 'true');
        History.saveState();
      });
      
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          input.blur();
        }
      });
    });
  },

  /**
   * Duplicate selected elements
   */
  duplicateSelected() {
    AppState.selectedElements.forEach(element => {
      const clone = element.cloneNode(true);
      clone.dataset.id = AppState.generateId();
      
      const left = parseInt(element.style.left) + 20;
      const top = parseInt(element.style.top) + 20;
      clone.style.left = left + 'px';
      clone.style.top = top + 'px';
      
      document.getElementById('canvasElements').appendChild(clone);
      this.setupElementInteraction(clone);
    });
    
    History.saveState();
    UIControls.showNotification('Elements duplicated');
  },

  /**
   * Delete selected elements
   */
  deleteSelected() {
    AppState.selectedElements.forEach(element => {
      element.remove();
    });
    AppState.selectedElements = [];
    History.saveState();
    UIControls.showNotification('Elements deleted');
  },

  /**
   * Copy selected elements
   */
  copySelected() {
    AppState.clipboard = AppState.selectedElements.map(el => ({
      html: el.outerHTML,
      id: el.dataset.id
    }));
    UIControls.showNotification('Copied to clipboard');
  },

  /**
   * Paste from clipboard
   */
  pasteFromClipboard() {
    if (AppState.clipboard.length === 0) {
      UIControls.showNotification('Nothing to paste');
      return;
    }
    
    const container = document.getElementById('canvasElements');
    AppState.clipboard.forEach(item => {
      const temp = document.createElement('div');
      temp.innerHTML = item.html;
      const element = temp.firstChild;
      element.dataset.id = AppState.generateId();
      
      const left = parseInt(element.style.left) + 30;
      const top = parseInt(element.style.top) + 30;
      element.style.left = left + 'px';
      element.style.top = top + 'px';
      
      container.appendChild(element);
      this.setupElementInteraction(element);
    });
    
    History.saveState();
    UIControls.showNotification('Pasted from clipboard');
  },

  /**
   * Bring selected elements to front
   */
  bringToFront() {
    AppState.selectedElements.forEach(element => {
      element.style.zIndex = '1000';
    });
    History.saveState();
  },

  /**
   * Send selected elements to back
   */
  sendToBack() {
    AppState.selectedElements.forEach(element => {
      element.style.zIndex = '1';
    });
    History.saveState();
  },

  /**
   * Group selected elements
   */
  groupSelected() {
    if (AppState.selectedElements.length < 2) {
      UIControls.showNotification('Select at least two elements to group');
      return;
    }

    const groupId = AppState.generateId();
    AppState.selectedElements.forEach((element) => {
      element.dataset.groupId = groupId;
      element.classList.add('grouped');
    });
    History.saveState();
    UIControls.showNotification('Elements grouped');
  },

  /**
   * Ungroup selected elements
   */
  ungroupSelected() {
    if (AppState.selectedElements.length === 0) {
      UIControls.showNotification('Select grouped elements to ungroup');
      return;
    }

    AppState.selectedElements.forEach((element) => {
      delete element.dataset.groupId;
      element.classList.remove('grouped');
    });
    History.saveState();
    UIControls.showNotification('Elements ungrouped');
  },

  /**
   * Restore element interactions after undo/redo
   */
  restoreElementInteractions() {
    const container = document.getElementById('canvasElements');
    if (!container) return;
    
    container.querySelectorAll('.canvas-element').forEach((element) => {
      this.setupElementInteraction(element);
    });
    
    console.log('🔗 Element interactions restored');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElementManager;
}
