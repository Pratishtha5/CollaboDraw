/**
 * CollaboDraw Whiteboard Application - COMPLETE FIXED VERSION
 * Main JavaScript functionality for the collaborative whiteboard
 */

// Global state
let currentTool = 'select';
let currentColor = '#000000';
let isDrawing = false;
let elements = [];
let undoStack = [];
let redoStack = [];
let zoomLevel = 1;
let timerSeconds = 0;
let timerInterval = null;
let timerRunning = false;
let traybarVisible = true;

// Canvas variables
let canvas, ctx;
let currentPathPoints = []; // Track pen stroke points

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing CollaboDraw...');
    initializeApp();
});

function initializeApp() {
    console.log('Starting CollaboDraw initialization...');
    
    try {
        // Get canvas element (matches your HTML id="drawingCanvas")
        canvas = document.getElementById('drawingCanvas');
        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        ctx = canvas.getContext('2d');
        console.log('Canvas found and context created');
        
        // Setup canvas
        setupCanvas();
        
        // Setup all event listeners
        setupEventListeners();
        
        // Initialize UI components
        initializeUI();
        
        // Remove loading screen if it exists
        hideLoadingScreen();
        
        console.log('CollaboDraw initialized successfully!');
        
    } catch (error) {
        console.error('Error initializing CollaboDraw:', error);
    }
}

function setupCanvas() {
    // Ensure canvas is properly sized
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 2000;
        canvas.height = 1500;
    }
    
    // Set canvas styles
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'block';
    
    console.log('Canvas setup complete:', canvas.width, 'x', canvas.height);
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Tool buttons - using data-tool attribute from your HTML
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectTool(this.dataset.tool);
        });
    });
    
    // Color options - using data-color attribute from your HTML
    document.querySelectorAll('[data-color]').forEach(option => {
        option.addEventListener('click', function() {
            selectColor(this.dataset.color);
        });
    });
    
    // Canvas drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Fix all onclick handlers in your HTML
    fixInlineHandlers();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Board name input
    const boardNameInput = document.getElementById('boardName');
    if (boardNameInput) {
        boardNameInput.addEventListener('blur', saveBoard);
    }
    
    console.log('Event listeners setup complete');
}

function fixInlineHandlers() {
    console.log('Fixing inline onclick handlers...');
    
    // Find all elements with onclick and replace them
    const elementsWithOnClick = document.querySelectorAll('[onclick]');
    
    elementsWithOnClick.forEach(element => {
        const onclickValue = element.getAttribute('onclick');
        element.removeAttribute('onclick'); // Remove inline onclick
        
        // Add proper event listener based on the function name
        if (onclickValue.includes('undo()')) {
            element.addEventListener('click', undo);
        } else if (onclickValue.includes('redo()')) {
            element.addEventListener('click', redo);
        } else if (onclickValue.includes('zoomIn()')) {
            element.addEventListener('click', zoomIn);
        } else if (onclickValue.includes('zoomOut()')) {
            element.addEventListener('click', zoomOut);
        } else if (onclickValue.includes('shareBoard()')) {
            element.addEventListener('click', shareBoard);
        } else if (onclickValue.includes('exportBoard()')) {
            element.addEventListener('click', exportBoard);
        } else if (onclickValue.includes('showHelp()')) {
            element.addEventListener('click', showHelp);
        } else if (onclickValue.includes('toggleTimer()')) {
            element.addEventListener('click', toggleTimer);
        } else if (onclickValue.includes('toggleTraybar()')) {
            element.addEventListener('click', toggleTraybar);
        } else if (onclickValue.includes('goHome()')) {
            element.addEventListener('click', goHome);
        }
    });
    
    console.log('Inline handlers fixed for', elementsWithOnClick.length, 'elements');
}

// Tool selection
function selectTool(tool) {
    currentTool = tool;
    
    // Update active states
    document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Update main canvas class for cursor
    const mainCanvas = document.getElementById('mainCanvas');
    if (mainCanvas) {
        mainCanvas.className = `main-canvas traybar-visible ${tool}-mode`;
    }
    
    console.log('Selected tool:', tool);
}

// Color selection
function selectColor(color) {
    currentColor = color;
    
    // Update selected states
    document.querySelectorAll('[data-color]').forEach(option => {
        option.classList.remove('selected');
    });
    
    const activeColor = document.querySelector(`[data-color="${color}"]`);
    if (activeColor) {
        activeColor.classList.add('selected');
    }
    
    console.log('Selected color:', color);
}

// Drawing functions - FIXED VERSION
let startX, startY;

function startDrawing(e) {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    isDrawing = true;
    
    if (currentTool === 'pen') {
        // Initialize path for pen tool - FIXED
        currentPathPoints = [{x: startX, y: startY}];
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    } else if (currentTool === 'highlighter') {
        // Initialize path for highlighter tool
        currentPathPoints = [{x: startX, y: startY}];
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.4;
    } else if (currentTool === 'text') {
        addText(startX, startY);
    }
    
    console.log('Started drawing with', currentTool, 'at', startX, startY);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
        // Add point to current path and draw - FIXED
        currentPathPoints.push({x: x, y: y});
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'highlighter') {
        // Add point to current path and draw
        currentPathPoints.push({x: x, y: y});
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (currentTool === 'rectangle') {
        redrawCanvas();
        drawRectangle(startX, startY, x, y);
    } else if (currentTool === 'circle') {
        redrawCanvas();
        drawCircle(startX, startY, x, y);
    } else if (currentTool === 'line') {
        redrawCanvas();
        drawLine(startX, startY, x, y);
    } else if (currentTool === 'arrow') {
        redrawCanvas();
        drawArrow(startX, startY, x, y);
    }
}

function stopDrawing(e) {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    // Reset global alpha
    ctx.globalAlpha = 1.0;
    
    // Save the drawn element - FIXED TO INCLUDE PEN STROKES
    if (currentTool === 'pen' && currentPathPoints.length > 1) {
        elements.push({
            type: 'path',
            points: [...currentPathPoints], // Save the pen stroke path
            color: currentColor,
            lineWidth: 2,
            tool: 'pen'
        });
        currentPathPoints = []; // Clear current path
    } else if (currentTool === 'highlighter' && currentPathPoints.length > 1) {
        elements.push({
            type: 'path',
            points: [...currentPathPoints], // Save the highlighter stroke path
            color: currentColor,
            lineWidth: 8,
            tool: 'highlighter',
            alpha: 0.4
        });
        currentPathPoints = []; // Clear current path
    } else if (currentTool === 'rectangle') {
        elements.push({
            type: 'rectangle',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: currentColor
        });
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
        elements.push({
            type: 'circle',
            centerX: (startX + endX) / 2,
            centerY: (startY + endY) / 2,
            radius: radius,
            color: currentColor
        });
    } else if (currentTool === 'line') {
        elements.push({
            type: 'line',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: currentColor
        });
    } else if (currentTool === 'arrow') {
        elements.push({
            type: 'arrow',
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            color: currentColor
        });
    }
    
    saveToHistory();
    console.log('Finished drawing, total elements:', elements.length);
}

function addText(x, y) {
    const text = prompt('Enter text:');
    if (text) {
        elements.push({
            type: 'text',
            x: x,
            y: y,
            text: text,
            color: currentColor,
            fontSize: 16
        });
        redrawCanvas();
        saveToHistory();
    }
}

function drawRectangle(x1, y1, x2, y2) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawCircle(x1, y1, x2, y2) {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawArrow(x1, y1, x2, y2) {
    const headlen = 15; // length of head in pixels
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

// Update redrawCanvas to handle pen strokes - FIXED VERSION
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elements.forEach(element => {
        ctx.strokeStyle = element.color;
        ctx.fillStyle = element.color;
        
        switch(element.type) {
            case 'path': // FIXED: Added path rendering for pen and highlighter
                if (element.points && element.points.length > 1) {
                    ctx.globalAlpha = element.alpha || 1.0;
                    ctx.beginPath();
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                    ctx.lineWidth = element.lineWidth || 2;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                    ctx.globalAlpha = 1.0; // Reset alpha
                }
                break;
            case 'rectangle':
                ctx.lineWidth = 2;
                ctx.strokeRect(element.startX, element.startY, 
                              element.endX - element.startX, 
                              element.endY - element.startY);
                break;
            case 'circle':
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(element.centerX, element.centerY, element.radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case 'line':
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(element.startX, element.startY);
                ctx.lineTo(element.endX, element.endY);
                ctx.stroke();
                break;
            case 'arrow':
                const headlen = 15;
                const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(element.startX, element.startY);
                ctx.lineTo(element.endX, element.endY);
                ctx.lineTo(element.endX - headlen * Math.cos(angle - Math.PI / 6), 
                          element.endY - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(element.endX, element.endY);
                ctx.lineTo(element.endX - headlen * Math.cos(angle + Math.PI / 6), 
                          element.endY - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
                break;
            case 'text':
                ctx.font = `${element.fontSize}px Inter`;
                ctx.fillText(element.text, element.x, element.y);
                break;
        }
    });
}

// UI Functions that match your HTML onclick handlers
function undo() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        elements = JSON.parse(undoStack[undoStack.length - 1] || '[]');
        redrawCanvas();
        console.log('Undo performed');
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(redoStack.pop());
        elements = JSON.parse(undoStack[undoStack.length - 1]);
        redrawCanvas();
        console.log('Redo performed');
    }
}

function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.2, 3);
    applyZoom();
    updateZoomDisplay();
    console.log('Zoomed in to', Math.round(zoomLevel * 100) + '%');
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.2, 0.1);
    applyZoom();
    updateZoomDisplay();
    console.log('Zoomed out to', Math.round(zoomLevel * 100) + '%');
}

function applyZoom() {
    if (canvas) {
        canvas.style.transform = `scale(${zoomLevel})`;
        canvas.style.transformOrigin = '0 0';
    }
}

function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(zoomLevel * 100) + '%';
    }
}

function shareBoard() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'CollaboDraw Board',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Board link copied to clipboard!');
        }).catch(() => {
            console.log('Share URL:', url);
        });
    }
    console.log('Share board clicked');
}

function exportBoard() {
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
    showNotification('Board exported as PNG!');
    console.log('Board exported');
}

function showHelp() {
    const helpModal = document.getElementById('shortcutsHelp');
    if (helpModal) {
        helpModal.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            helpModal.classList.remove('show');
        }, 5000);
        
        // Hide on click
        helpModal.addEventListener('click', () => {
            helpModal.classList.remove('show');
        });
    }
    console.log('Help modal shown');
}

function toggleTimer() {
    if (timerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    timerRunning = true;
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    console.log('Timer started');
}

function stopTimer() {
    timerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    console.log('Timer stopped');
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = display;
    }
}

function toggleTraybar() {
    traybarVisible = !traybarVisible;
    
    const traybar = document.getElementById('traybar');
    const mainCanvas = document.querySelector('.main-canvas');
    
    if (traybar) {
        traybar.classList.toggle('hidden', !traybarVisible);
    }
    
    if (mainCanvas) {
        mainCanvas.classList.toggle('traybar-visible', traybarVisible);
    }
    
    console.log('Traybar toggled:', traybarVisible ? 'visible' : 'hidden');
}

function goHome() {
    window.location.href = '/home';
}

// Utility functions
function saveToHistory() {
    const state = JSON.stringify(elements);
    undoStack.push(state);
    if (undoStack.length > 50) {
        undoStack.shift();
    }
    redoStack = [];
}

function saveBoard() {
    const boardName = document.getElementById('boardName')?.value || 'Untitled Board';
    const boardData = {
        name: boardName,
        elements: elements,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('collabodraw-board', JSON.stringify(boardData));
    updateSaveStatus();
    console.log('Board saved:', boardName);
}

function loadBoard() {
    const saved = localStorage.getItem('collabodraw-board');
    if (saved) {
        try {
            const boardData = JSON.parse(saved);
            elements = boardData.elements || [];
            const boardNameInput = document.getElementById('boardName');
            if (boardNameInput) {
                boardNameInput.value = boardData.name || 'Untitled Board';
            }
            redrawCanvas();
            console.log('Board loaded:', boardData.name);
        } catch (e) {
            console.error('Error loading board:', e);
        }
    }
    saveToHistory();
}

function updateSaveStatus() {
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) {
        saveStatus.textContent = 'Saved';
        setTimeout(() => {
            saveStatus.textContent = 'Auto-saved';
        }, 2000);
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    } else {
        console.log('Notification:', message);
    }
}

function hideLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('show');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 300);
    }
}

function initializeUI() {
    // Set initial tool as active
    const selectToolBtn = document.querySelector('[data-tool="select"]');
    if (selectToolBtn) {
        selectToolBtn.classList.add('active');
    }
    
    // Set initial color as selected
    const blackColor = document.querySelector('[data-color="#000000"]');
    if (blackColor) {
        blackColor.classList.add('selected');
    }
    
    // Initialize zoom display
    updateZoomDisplay();
    
    // Load existing board
    loadBoard();
    
    // Setup auto-save
    setInterval(saveBoard, 30000);
    
    console.log('UI initialized');
}

// Keyboard shortcuts
function handleKeyboard(e) {
    // Prevent shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 's':
                e.preventDefault();
                saveBoard();
                break;
        }
    } else {
        // Tool shortcuts
        const toolMap = {
            'v': 'select',
            'p': 'pen',
            'h': 'highlighter',
            'r': 'rectangle',
            'o': 'circle',
            'a': 'arrow',
            'l': 'line',
            't': 'text',
            's': 'sticky'
        };
        
        if (toolMap[e.key.toLowerCase()]) {
            selectTool(toolMap[e.key.toLowerCase()]);
        }
        
        // Other shortcuts
        if (e.key === 'Delete' || e.key === 'Backspace') {
            clearCanvas();
        } else if (e.key === '+' || e.key === '=') {
            zoomIn();
        } else if (e.key === '-') {
            zoomOut();
        } else if (e.key === '0') {
            resetZoom();
        }
    }
}

function clearCanvas() {
    elements = [];
    redrawCanvas();
    saveToHistory();
    console.log('Canvas cleared');
}

function resetZoom() {
    zoomLevel = 1;
    applyZoom();
    updateZoomDisplay();
    console.log('Zoom reset to 100%');
}

console.log('CollaboDraw whiteboard.js loaded successfully');
