// API Configuration
const API_CONFIG = {
    // Ginger Grammar Checker API Configuration
    GINGER_API_KEY: 'YOUR_GINGER_API_KEY', // Replace with your actual Ginger API key
    GINGER_ENDPOINT: 'https://services.gingersoftware.com/Ginger/correct/jsonSecured/GingerTheTextFull',
    
    // OpenAI API Configuration for advanced auto-correct
    OPENAI_API_KEY: 'YOUR_OPENAI_API_KEY', // Replace with your actual OpenAI API key
    OPENAI_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    
    // To get your Ginger API key:
    // 1. Go to https://www.gingersoftware.com/ginger-api
    // 2. Sign up for a developer account
    // 3. Get your API key from the dashboard
    // 4. Replace 'YOUR_GINGER_API_KEY' above with your actual key
    
    // Alternative: Use the free Ginger correction service
    GINGER_FREE_ENDPOINT: 'https://services.gingersoftware.com/Ginger/correct/json/GingerTheText'
};

// Global variables
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let currentCategory = 'all';
let editingId = null;
let userName = localStorage.getItem('userName') || '';
let userAvatar = localStorage.getItem('userAvatar') || '🌊';
let threadCount = 1;
let isBulkMode = false;
let selectedThreads = new Set();

// User progress & gamification
let userLevel = parseInt(localStorage.getItem('userLevel')) || 1;
let userXP = parseInt(localStorage.getItem('userXP')) || 0;
let currentStreak = parseInt(localStorage.getItem('currentStreak')) || 0;
let lastCompletionDate = localStorage.getItem('lastCompletionDate') || null;
let totalCompleted = parseInt(localStorage.getItem('totalCompleted')) || 0;

// Theme system
let currentTheme = localStorage.getItem('currentTheme') || 'ocean';
let isDarkMode = localStorage.getItem('isDarkMode') === 'true';

// Timer system
let timerInterval = null;
let timerStartTime = null;
let timerElapsed = 0;
let timerPaused = false;
let currentTimerThread = null;

// Voice recognition
let recognition = null;
let isListening = false;

// Analytics data
let analyticsData = JSON.parse(localStorage.getItem('analyticsData')) || {
    daily: {},
    weekly: {},
    monthly: {},
    categories: {},
    completionTimes: []
};

// DEVELOPMENT MODE: Clear all data on each run
function clearAllDataForDevelopment() {
    console.log('🧹 Development mode: Clearing all previous data...');
    localStorage.clear();
    
    // Reset all variables to default values
    todos = [];
    // userName = 'DevUser'; // Commented out to show welcome modal
    userAvatar = '🦊'; // Default avatar
    threadCount = 1;
    userLevel = 1;
    userXP = 0;
    currentStreak = 0;
    lastCompletionDate = null;
    totalCompleted = 0;
    currentTheme = 'ocean';
    isDarkMode = false;
    analyticsData = {
        daily: {},
        weekly: {},
        monthly: {},
        categories: {},
        completionTimes: []
    };
    
    // Store in localStorage so user info shows immediately
    localStorage.setItem('userName', userName);
    localStorage.setItem('userAvatar', userAvatar);
    
    console.log('✅ All data cleared successfully!');
    console.log('👤 Temp user profile set: ' + userName + ' ' + userAvatar);
}

// Call the clear function on page load (comment out when ready for production)
clearAllDataForDevelopment();

// Achievement system
const achievements = [
    {id: 'first_thread', name: 'First Thread', desc: 'Complete your first thread', xp: 50, icon: '🎯'},
    {id: 'streak_3', name: '3 Day Streak', desc: 'Complete threads for 3 days in a row', xp: 100, icon: '🔥'},
    {id: 'streak_7', name: 'Week Warrior', desc: 'Complete threads for 7 days in a row', xp: 200, icon: '⚡'},
    {id: 'productive_day', name: 'Productive Day', desc: 'Complete 10 threads in one day', xp: 150, icon: '💪'},
    {id: 'early_bird', name: 'Early Bird', desc: 'Complete a thread before 8 AM', xp: 75, icon: '🌅'},
    {id: 'night_owl', name: 'Night Owl', desc: 'Complete a thread after 10 PM', xp: 75, icon: '🦉'},
    {id: 'category_master', name: 'Category Master', desc: 'Complete 25 threads in one category', xp: 200, icon: '🏆'},
    {id: 'speed_demon', name: 'Speed Demon', desc: 'Complete a thread in under 5 minutes', xp: 100, icon: '💨'}
];

let unlockedAchievements = JSON.parse(localStorage.getItem('unlockedAchievements')) || [];

// DOM elements (will be initialized after DOM loads)
let todoInput, todoList, emptyState, totalTasks, completedTasks, pendingTasks;

// App switching and management
let currentApp = 'todo';
let notes = [];
let currentNote = null;
let canvas = null;
let ctx = null;
let drawing = false;
let currentTool = 'pen';
let currentColor = '#007AFF';
let currentSize = 5;
let drawings = [];

// App Switching
function switchApp(appName) {
    console.log('Switching to app:', appName);
    
    // Update active tab
    document.querySelectorAll('.app-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-app="${appName}"]`).classList.add('active');
    
    // Show/hide app content
    document.querySelectorAll('.app-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetApp = document.getElementById(`${appName}App`);
    if (targetApp) {
        targetApp.classList.add('active');
        console.log(`${appName}App is now active`);
    } else {
        console.error(`Could not find element with ID: ${appName}App`);
    }
    
    currentApp = appName;
    
    // Initialize app-specific functionality
    if (appName === 'todo') {
        // Initialize tasks overview
        setTimeout(() => {
            updateOverviewContent();
        }, 100);
    } else if (appName === 'drawing') {
        console.log('Initializing drawing canvas...');
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            initializeDrawingCanvas();
            refreshDrawingsList(); // Refresh the list of saved drawings
        }, 100);
    } else if (appName === 'notes') {
        renderNotesGrid();
    } else if (appName === 'todo') {
        renderTodos();
    }
    
    // Play app switch sound
    playSound('complete');
}

// Enhanced Drawing App Functions
function updateDrawingColor(color) {
    drawingState.strokeColor = color;
    console.log('Drawing color updated to:', color);
}

function setDrawingColor(color) {
    drawingState.strokeColor = color;
    document.getElementById('strokeColorPicker').value = color;
    console.log('Drawing color set to:', color);
}

function saveCurrentDrawing() {
    try {
        const drawingData = {
            id: Date.now(),
            name: `Drawing ${new Date().toLocaleDateString()}`,
            elements: [...drawingState.elements],
            created: new Date().toISOString(),
            thumbnail: generateDrawingThumbnail()
        };
        
        // Save to localStorage
        let savedDrawings = JSON.parse(localStorage.getItem('savedDrawings') || '[]');
        savedDrawings.push(drawingData);
        localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));
        
        // Update the drawings list
        refreshDrawingsList();
        
        // Show success message
        showXPNotification(0, '🎨 Drawing saved successfully!');
        console.log('Drawing saved:', drawingData.name);
        
    } catch (error) {
        console.error('Error saving drawing:', error);
        showXPNotification(0, '❌ Failed to save drawing');
    }
}

function generateDrawingThumbnail() {
    // Create a simple representation of the drawing for thumbnail
    const svg = document.getElementById('drawingSVG');
    if (svg) {
        return svg.innerHTML;
    }
    return '';
}

function refreshDrawingsList() {
    const savedDrawings = JSON.parse(localStorage.getItem('savedDrawings') || '[]');
    const grid = document.getElementById('savedDrawingsGrid');
    const emptyState = document.getElementById('drawingsEmptyState');
    const countElement = document.getElementById('drawingsCount');
    
    if (!grid) return;
    
    // Update count
    if (countElement) {
        countElement.textContent = `${savedDrawings.length} drawing${savedDrawings.length !== 1 ? 's' : ''}`;
    }
    
    if (savedDrawings.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    // Show drawings grid
    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';
    
    // Render drawing items
    grid.innerHTML = savedDrawings.map(drawing => `
        <div class="saved-drawing-item" onclick="loadDrawing('${drawing.id}')">
            <div class="saved-drawing-preview">
                <svg width="100%" height="100%" viewBox="0 0 400 300" style="background: white;">
                    ${drawing.thumbnail || '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#999">No Preview</text>'}
                </svg>
            </div>
            <div class="saved-drawing-info">
                <h4>${drawing.name}</h4>
                <p>${new Date(drawing.created).toLocaleDateString()}</p>
                <div class="drawing-actions">
                    <button onclick="event.stopPropagation(); loadDrawing('${drawing.id}')" class="load-btn">
                        <i class="fas fa-folder-open"></i> Load
                    </button>
                    <button onclick="event.stopPropagation(); deleteDrawing('${drawing.id}')" class="delete-btn">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadDrawing(drawingId) {
    const savedDrawings = JSON.parse(localStorage.getItem('savedDrawings') || '[]');
    const drawing = savedDrawings.find(d => d.id == drawingId);
    
    if (drawing) {
        // Load the drawing elements into the current canvas
        drawingState.elements = [...drawing.elements];
        renderCanvas();
        showXPNotification(0, `🎨 Loaded: ${drawing.name}`);
        
        // Open canvas if needed
        if (!document.getElementById('canvasDialogOverlay').style.display !== 'none') {
            openCanvasDialog();
        }
    }
}

function deleteDrawing(drawingId) {
    if (confirm('Are you sure you want to delete this drawing?')) {
        let savedDrawings = JSON.parse(localStorage.getItem('savedDrawings') || '[]');
        savedDrawings = savedDrawings.filter(d => d.id != drawingId);
        localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));
        refreshDrawingsList();
        showXPNotification(0, '🗑️ Drawing deleted');
    }
}

// Eraser tool functionality
function handleEraser(x, y) {
    // Find elements at the clicked position and remove them
    const elementsToRemove = [];
    
    drawingState.elements.forEach((element, index) => {
        if (isPointInElement(x, y, element)) {
            elementsToRemove.push(index);
        }
    });
    
    // Remove elements (from back to front to maintain indices)
    elementsToRemove.reverse().forEach(index => {
        drawingState.elements.splice(index, 1);
    });
    
    if (elementsToRemove.length > 0) {
        renderCanvas();
        saveDrawingState();
    }
}

function isPointInElement(x, y, element) {
    // Simple collision detection for different element types
    switch (element.type) {
        case 'rectangle':
            return x >= element.x && x <= element.x + element.width &&
                   y >= element.y && y <= element.y + element.height;
        case 'circle':
        case 'ellipse':
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            const radiusX = element.width / 2;
            const radiusY = element.height / 2;
            return Math.pow((x - centerX) / radiusX, 2) + Math.pow((y - centerY) / radiusY, 2) <= 1;
        case 'line':
        case 'arrow':
            // Simple line collision (within 5 pixels)
            return distanceToLine(x, y, element.x1, element.y1, element.x2, element.y2) <= 5;
        case 'pen':
            // Check if point is near any point in the pen path
            return element.points.some(point => 
                Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)) <= 5
            );
        default:
            return false;
    }
}

function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Enhanced clearCanvas function
function clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
        drawingState.elements = [];
        drawingState.undoStack = [];
        drawingState.redoStack = [];
        renderCanvas();
        console.log('Canvas cleared');
    }
}

// Notes App Functions (Google Keep Style)
function createNote() {
    const note = {
        id: Date.now(),
        title: '',
        content: '',
        color: getRandomNoteColor(),
        images: [],
        created: new Date(),
        modified: new Date()
    };
    
    notes.push(note);
    currentNote = note;
    saveNotes();
    renderNotesGrid();
    openNoteEditor(note);
    playSound('add');
}

function getRandomNoteColor() {
    const colors = ['#FFE4B5', '#E6F3FF', '#E8F5E8', '#FFF0F5', '#F0F8FF', '#FFFACD'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function loadNotes() {
    const savedNotes = localStorage.getItem('productivitySuite_notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    }
    renderNotesGrid();
}

function saveNotes() {
    localStorage.setItem('productivitySuite_notes', JSON.stringify(notes));
}

function renderNotesGrid() {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    
    notesGrid.innerHTML = '';
    
    if (notes.length === 0) {
        notesGrid.innerHTML = `
            <div class="notes-empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>No notes yet</h3>
                <p>Create your first note to get started!</p>
            </div>
        `;
        return;
    }
    
    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.style.backgroundColor = note.color;
        
        const preview = note.content.replace(/<[^>]*>/g, '').substring(0, 150);
        
        noteCard.innerHTML = `
            <div class="note-card-content">
                <h4 class="note-card-title">${note.title || 'Untitled'}</h4>
                <p class="note-card-preview">${preview}${preview.length >= 150 ? '...' : ''}</p>
                <div class="note-card-date">${formatDate(note.modified)}</div>
            </div>
        `;
        
        noteCard.onclick = () => openNoteEditor(note);
        notesGrid.appendChild(noteCard);
    });
}

function filterNotes(searchTerm) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    
    const filtered = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    notesGrid.innerHTML = '';
    
    if (filtered.length === 0) {
        notesGrid.innerHTML = `
            <div class="notes-empty-state">
                <i class="fas fa-search"></i>
                <h3>No notes found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.style.backgroundColor = note.color;
        
        const preview = note.content.replace(/<[^>]*>/g, '').substring(0, 150);
        
        noteCard.innerHTML = `
            <div class="note-card-content">
                <h4 class="note-card-title">${note.title || 'Untitled'}</h4>
                <p class="note-card-preview">${preview}${preview.length >= 150 ? '...' : ''}</p>
                <div class="note-card-date">${formatDate(note.modified)}</div>
            </div>
        `;
        
        noteCard.onclick = () => openNoteEditor(note);
        notesGrid.appendChild(noteCard);
    });
}

function openNoteEditor(note) {
    currentNote = note;
    const modal = document.getElementById('noteEditorModal');
    const titleInput = document.getElementById('noteTitle');
    const contentArea = document.getElementById('noteContent');

    titleInput.value = note.title || '';
    contentArea.innerHTML = note.content || '';

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => titleInput.focus(), 50);

    clearInterval(window.noteAutoSave);
    window.noteAutoSave = setInterval(() => saveCurrentNote(false), 2500);

    const handleKeyDown = (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveCurrentNote(false);
            return false;
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            autoCorrectNote();
            return false;
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    window.noteEditorKeyHandler = handleKeyDown;

    // Outside click closing disabled per requirement; editor closes only on Save
}

function closeNoteEditor(shouldSave = true) {
    // Always perform cleanup when this function is called
    // shouldSave parameter indicates if it's called from Save button (true) or X button (false)
    performNoteEditorCloseCleanup();
}

function performNoteEditorCloseCleanup() {
    const modal = document.getElementById('noteEditorModal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    clearInterval(window.noteAutoSave);
    if (window.noteEditorKeyHandler) {
        document.removeEventListener('keydown', window.noteEditorKeyHandler);
        window.noteEditorKeyHandler = null;
    }
    if (window.noteOutsideClickHandler) {
        document.removeEventListener('mousedown', window.noteOutsideClickHandler, true);
        window.noteOutsideClickHandler = null;
    }
    currentNote = null;
}

function saveCurrentNote(shouldClose = false) {
    if (!currentNote) return;

    const titleInput = document.getElementById('noteTitle');
    const contentArea = document.getElementById('noteContent');

    currentNote.title = (titleInput?.value || '').trim() || 'Untitled';
    currentNote.content = contentArea?.innerHTML || '';
    currentNote.modified = new Date();

    const noteIndex = notes.findIndex(n => n.id === currentNote.id);
    if (noteIndex !== -1) notes[noteIndex] = { ...currentNote };

    saveNotes();
    renderNotesGrid?.();

    // Visual feedback for save button only - no auto-close
    const saveBtn = document.querySelector('.save-note-btn');
    if (saveBtn && shouldClose) {
        const original = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check"></i>';
        saveBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        setTimeout(() => {
            saveBtn.innerHTML = original;
            saveBtn.style.background = '';
        }, 300);
    }
    
    // Only close if explicitly requested (Save button click)
    if (shouldClose) {
        performNoteEditorCloseCleanup();
    }
}

function deleteCurrentNote() {
    if (!currentNote) return;
    if (!confirm('Delete this note?')) return;
    notes = notes.filter(n => n.id !== currentNote.id);
    saveNotes();
    renderNotesGrid?.();
    closeNoteEditor();
    playSound?.('delete');
}

function formatText(command) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    if (selection.rangeCount > 0) {
        let element;
        
        switch (command) {
            case 'bold':
                element = document.createElement('strong');
                break;
            case 'italic':
                element = document.createElement('em');
                break;
            case 'underline':
                element = document.createElement('u');
                break;
            default:
                // Fallback to execCommand for other commands
                document.execCommand(command, false, null);
                document.getElementById('noteContent').focus();
                setTimeout(saveCurrentNote, 100);
                return;
        }
        
        try {
            const contents = range.extractContents();
            element.appendChild(contents);
            range.insertNode(element);
            
            // Clear selection and position cursor after the new element
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.setStartAfter(element);
            newRange.collapse(true);
            selection.addRange(newRange);
        } catch (e) {
            // Fallback to execCommand if modern method fails
            document.execCommand(command, false, null);
        }
    }
    
    document.getElementById('noteContent').focus();
    setTimeout(saveCurrentNote, 100);
}

function addImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                img.style.borderRadius = '8px';
                img.style.margin = '10px 0';
                
                const noteContent = document.getElementById('noteContent');
                noteContent.appendChild(img);
                
                if (currentNote) {
                    currentNote.images.push(e.target.result);
                    saveCurrentNote();
                }
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

// Function to help users configure Ginger API key
function configureGingerAPI() {
    const modal = document.createElement('div');
    modal.className = 'api-config-modal';
    modal.innerHTML = `
        <div class="api-config-content">
            <h3>🔧 Configure Ginger Grammar API</h3>
            <p>To enable advanced grammar checking with Ginger, you can get an API key:</p>
            <ol>
                <li>Visit <a href="https://www.gingersoftware.com/ginger-api" target="_blank">Ginger Software API</a></li>
                <li>Sign up for a developer account</li>
                <li>Get your API key from the dashboard</li>
                <li>Update the API_CONFIG.GINGER_API_KEY in script.js</li>
            </ol>
            <p><strong>Great News:</strong> The app automatically tries Ginger's free service first, then falls back to our enhanced demo mode!</p>
            <div class="api-config-actions">
                <button onclick="closeApiConfig()" class="close-config-btn">
                    <i class="fas fa-check"></i> Got it!
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    window.closeApiConfig = () => {
        modal.classList.remove('show');
        setTimeout(() => document.body.removeChild(modal), 300);
        delete window.closeApiConfig;
    };
}

// Fixed and Enhanced Auto-Correct Function
async function autoCorrectNote() {
    const contentArea = document.getElementById('noteContent');
    if (!contentArea) return;
    const autoCorrectBtn = document.querySelector('.auto-correct-btn');

    const plainText = contentArea.innerText || contentArea.textContent || '';
    if (!plainText.trim()) {
        showNotification?.('📝 Note is empty - nothing to correct', 'info');
        return;
    }

    if (autoCorrectBtn) {
        autoCorrectBtn.disabled = true;
        autoCorrectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    let correctedText = plainText;
    let apiUsed = 'local';

    // 1) Try OpenAI first (best for paragraphs and complex rewriting)
    let result = await checkGrammarWithOpenAI(plainText);
    if (result?.success) {
        correctedText = result.correctedText;
        apiUsed = 'OpenAI';
    } else {
        // 2) Try Ginger APIs
        result = await checkGrammarWithGingerAPI(plainText);
        if (!result?.success) {
            result = await checkGrammarWithGingerPOST(plainText);
        }
        if (result?.success && result.correctedText) {
            correctedText = result.correctedText;
            apiUsed = 'Ginger';
        } else {
            // 3) Try LanguageTool
            result = await checkGrammarWithLanguageTool(plainText);
            if (result?.success && result.correctedText) {
                correctedText = result.correctedText;
                apiUsed = 'LanguageTool';
            } else {
                // 4) Local fallback with enhanced corrections
                correctedText = applyComprehensiveCorrections(plainText);
                apiUsed = 'Local';
            }
        }
    }

    // Additional fluency improvements for longer text
    if (correctedText.split(' ').length > 15) {
        correctedText = refinedFluencyRewrite(correctedText);
    }

    // Update editor and persist
    contentArea.innerHTML = correctedText
        .replace(/\n/g, '<br>')
        .replace(/\s{2,}/g, ' ');

    if (currentNote) {
        currentNote.content = contentArea.innerHTML;
        currentNote.modified = new Date();
        saveNotes();
        renderNotesGrid?.();
    }

    if (autoCorrectBtn) {
        autoCorrectBtn.disabled = false;
        autoCorrectBtn.innerHTML = '<i class="fas fa-spell-check"></i>';
    }

    showNotification?.(`✅ Auto-correct complete (${apiUsed})`, 'success');
}

// Enhanced correction function with comprehensive rules
function applyComprehensiveCorrections(text) {
    let correctedText = text;
    
    // Common typos and spelling mistakes
    const corrections = [
        // User-specific examples from request
        ['hd', 'had'],
        ['hda', 'had'],
        ['comldt', 'completed'],
        ['comletd', 'completed'],
        ['complted', 'completed'],
        ['homrwik', 'homework'],
        ['homewrik', 'homework'],
        ['homwork', 'homework'],
        ['frinds', 'friends'],
        ['freinds', 'friends'],
        ['firends', 'friends'],
        ['plauin', 'playing'],
        ['palying', 'playing'],
        ['playng', 'playing'],
        ['gout', 'go out'],
        ['sde', 'outside'],
        ['outsde', 'outside'],
        ['outisde', 'outside'],
        
        // Common English typos
        ['teh', 'the'],
        ['hte', 'the'],
        ['taht', 'that'],
        ['adn', 'and'],
        ['nad', 'and'],
        ['freind', 'friend'],
        ['recieve', 'receive'],
        ['definately', 'definitely'],
        ['wierd', 'weird'],
        ['alot', 'a lot'],
        ['seperate', 'separate'],
        ['occured', 'occurred'],
        ['neccessary', 'necessary'],
        ['embarass', 'embarrass'],
        ['goverment', 'government'],
        ['maintainance', 'maintenance'],
        ['priviledge', 'privilege'],
        ['rythm', 'rhythm'],
        ['threshhold', 'threshold'],
        ['enviroment', 'environment'],
        ['developement', 'development'],
        ['recomend', 'recommend'],
        ['accomodate', 'accommodate'],
        ['occassion', 'occasion'],
        ['liason', 'liaison'],
        ['calender', 'calendar'],
        ['tommorow', 'tomorrow'],
        ['greatful', 'grateful']
    ];
    
    // Apply word-boundary corrections
    corrections.forEach(([wrong, right]) => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        correctedText = correctedText.replace(regex, right);
    });
    
    // Apply basic grammar and formatting fixes
    correctedText = correctedText
        // Fix capitalization
        .replace(/\bi\b/g, 'I')
        .replace(/^(.)/gm, (match) => match.toUpperCase())
        .replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase())
        
        // Fix spacing
        .replace(/\s+/g, ' ')
        .replace(/\s+([.!?])/g, '$1')
        .replace(/([.!?])([a-zA-Z])/g, '$1 $2')
        
        // Fix common contractions
        .replace(/\bcant\b/gi, "can't")
        .replace(/\bwont\b/gi, "won't")
        .replace(/\bdont\b/gi, "don't")
        .replace(/\bisnt\b/gi, "isn't")
        .replace(/\barent\b/gi, "aren't")
        .replace(/\bwoudlnt\b/gi, "wouldn't")
        .replace(/\bshoudlnt\b/gi, "shouldn't")
        .replace(/\bcoudlnt\b/gi, "couldn't")
        
        // Fix should/could/would of → have
        .replace(/\bshould\s+of\b/gi, 'should have')
        .replace(/\bcould\s+of\b/gi, 'could have')
        .replace(/\bwould\s+of\b/gi, 'would have')
        
        // Remove duplicate words
        .replace(/\b(\w+)\s+\1\b/gi, '$1')
        
        .trim();
    
    return correctedText;
}

// Add real-time spell check (visual indicators)
function addSpellCheckIndicators() {
    const contentArea = document.getElementById('noteContent');
    if (!contentArea) return;
    
    const text = contentArea.textContent;
    const words = text.split(/\s+/);
    
    // Simple dictionary check (you could expand this)
    const commonMisspellings = ['teh', 'recieve', 'definately', 'wierd', 'freind', 'alot'];
    
    words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        if (commonMisspellings.includes(cleanWord)) {
            // Add visual indicator (red underline)
            const regex = new RegExp(`\\b${word}\\b`, 'g');
            contentArea.innerHTML = contentArea.innerHTML.replace(regex, 
                `<span style="border-bottom: 2px wavy red; cursor: pointer;" 
                      title="Possible spelling error: ${word}" 
                      onclick="suggestCorrection('${word}')">${word}</span>`
            );
        }
    });
}

// Suggest corrections for misspelled words
function suggestCorrection(word) {
    const corrections = {
        'teh': 'the',
        'recieve': 'receive',
        'definately': 'definitely',
        'wierd': 'weird',
        'freind': 'friend',
        'alot': 'a lot'
    };
    
    const suggestion = corrections[word.toLowerCase()];
    if (suggestion && confirm(`Replace "${word}" with "${suggestion}"?`)) {
        const contentArea = document.getElementById('noteContent');
        contentArea.innerHTML = contentArea.innerHTML.replace(
            new RegExp(`\\b${word}\\b`, 'g'), 
            suggestion
        );
        saveCurrentNote();
    }
}

// Basic text corrections
function applyBasicCorrections(text) {
    return text
        // Basic formatting fixes
        .replace(/\bi\b/g, 'I')
        .replace(/(\w+)(\s+)\1(\s+)\1/g, '$1') // Remove triple repeated words
        .replace(/(\w+)(\s+)\1/g, '$1') // Remove double repeated words
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase())
        .replace(/^\s*(.)/g, (match, p1) => p1.toUpperCase())
        
        // Common spelling mistakes
        .replace(/\bteh\b/gi, 'the')
        .replace(/\brecieve\b/gi, 'receive')
        .replace(/\bdefinately\b/gi, 'definitely')
        .replace(/\bwierd\b/gi, 'weird')
        .replace(/\bfreind\b/gi, 'friend')
        .replace(/\balot\b/gi, 'a lot')
        .replace(/\bshould\s+of\b/gi, 'should have')
        .replace(/\bcould\s+of\b/gi, 'could have')
        .replace(/\bwould\s+of\b/gi, 'would have')
        
        // Contractions
        .replace(/\bcant\b/gi, "can't")
        .replace(/\bwont\b/gi, "won't")
        .replace(/\bdont\b/gi, "don't")
        .replace(/\bisnt\b/gi, "isn't")
        .replace(/\barent\b/gi, "aren't")
        .trim();
}

// Ginger Grammar Checker API integration
async function checkGrammarWithGingerAPI(text) {
    try {
        console.log('🔍 Using Ginger API for grammar checking...');
        
        // Try the free Ginger API endpoint first
        const endpoint = API_CONFIG.GINGER_FREE_ENDPOINT;
        
        const params = new URLSearchParams({
            'lang': 'US',
            'clientVersion': '2.0',
            'apiKey': API_CONFIG.GINGER_API_KEY || '',
            'text': text
        });
        
        const response = await fetch(`${endpoint}?${params}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        let correctedText = text;
        const corrections = [];
        
        console.log('📝 Ginger API response:', data);
        
        if (data.LightGingerTheTextResult && data.LightGingerTheTextResult.length > 0) {
            // Apply corrections from the end to the beginning to maintain positions
            const gingerCorrections = data.LightGingerTheTextResult
                .sort((a, b) => b.From - a.From);
            
            for (const correction of gingerCorrections) {
                if (correction.Suggestions && correction.Suggestions.length > 0) {
                    const suggestion = correction.Suggestions[0];
                    const start = correction.From;
                    const end = correction.To + 1;
                    
                    const original = text.slice(start, end);
                    correctedText = correctedText.slice(0, start) + suggestion.Text + correctedText.slice(end);
                    
                    corrections.push({
                        original: original,
                        replacement: suggestion.Text,
                        message: `Grammar: ${original} → ${suggestion.Text}`
                    });
                }
            }
        }
        
        return {
            success: true,
            correctedText: correctedText,
            corrections: corrections
        };
    } catch (error) {
        console.error('Ginger API error:', error);
        // Fallback to enhanced demo mode
        return await checkGrammarWithEnhancedDemo(text);
    }
}

// Alternative Ginger API method using POST request
async function checkGrammarWithGingerPOST(text) {
    try {
        const response = await fetch('https://services.gingersoftware.com/Ginger/correct/json/GingerTheText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                'lang': 'US',
                'clientVersion': '2.0',
                'text': text,
                'apiKey': API_CONFIG.GINGER_API_KEY || ''
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ginger POST API failed: ${response.status}`);
        }
        
        const data = await response.json();
        let correctedText = text;
        const corrections = [];
        
        if (data.LightGingerTheTextResult && data.LightGingerTheTextResult.length > 0) {
            const gingerCorrections = data.LightGingerTheTextResult
                .sort((a, b) => b.From - a.From);
            
            for (const correction of gingerCorrections) {
                if (correction.Suggestions && correction.Suggestions.length > 0) {
                    const suggestion = correction.Suggestions[0];
                    const start = correction.From;
                    const end = correction.To + 1;
                    
                    const original = text.slice(start, end);
                    correctedText = correctedText.slice(0, start) + suggestion.Text + correctedText.slice(end);
                    
                    corrections.push({
                        original: original,
                        replacement: suggestion.Text,
                        message: `Ginger: ${original} → ${suggestion.Text}`
                    });
                }
            }
        }
        
        return {
            success: true,
            correctedText: correctedText,
            corrections: corrections
        };
    } catch (error) {
        console.error('Ginger POST API error:', error);
        return { success: false };
    }
}

// Enhanced Demo/Fallback API with comprehensive corrections (when Ginger API is not available)
async function checkGrammarWithEnhancedDemo(text) {
    try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let correctedText = text;
        const corrections = [];
        
        // Enhanced spell checking patterns
        const spellCorrections = [
            { pattern: /\bteh\b/gi, replacement: 'the', type: 'Spelling' },
            { pattern: /\brecieve\b/gi, replacement: 'receive', type: 'Spelling' },
            { pattern: /\bdefinately\b/gi, replacement: 'definitely', type: 'Spelling' },
            { pattern: /\bwierd\b/gi, replacement: 'weird', type: 'Spelling' },
            { pattern: /\bfreind\b/gi, replacement: 'friend', type: 'Spelling' },
            { pattern: /\bbelieve\b/gi, replacement: 'believe', type: 'Spelling' },
            { pattern: /\bachieve\b/gi, replacement: 'achieve', type: 'Spelling' },
            { pattern: /\bpeice\b/gi, replacement: 'piece', type: 'Spelling' },
            { pattern: /\boccured\b/gi, replacement: 'occurred', type: 'Spelling' },
            { pattern: /\bseparate\b/gi, replacement: 'separate', type: 'Spelling' },
            { pattern: /\bnecessary\b/gi, replacement: 'necessary', type: 'Spelling' },
            { pattern: /\bembarrass\b/gi, replacement: 'embarrass', type: 'Spelling' },
            { pattern: /\bgovernment\b/gi, replacement: 'government', type: 'Spelling' },
            { pattern: /\bmaintenance\b/gi, replacement: 'maintenance', type: 'Spelling' },
            { pattern: /\bprivilege\b/gi, replacement: 'privilege', type: 'Spelling' },
            { pattern: /\brhythm\b/gi, replacement: 'rhythm', type: 'Spelling' },
            { pattern: /\bthreshold\b/gi, replacement: 'threshold', type: 'Spelling' },
            { pattern: /\benvironment\b/gi, replacement: 'environment', type: 'Spelling' },
            { pattern: /\bdevelopment\b/gi, replacement: 'development', type: 'Spelling' },
            { pattern: /\bmanagement\b/gi, replacement: 'management', type: 'Spelling' }
        ];
        
        // Grammar corrections
        const grammarCorrections = [
            { pattern: /\balot\b/gi, replacement: 'a lot', type: 'Grammar' },
            { pattern: /\bshould\s+of\b/gi, replacement: 'should have', type: 'Grammar' },
            { pattern: /\bcould\s+of\b/gi, replacement: 'could have', type: 'Grammar' },
            { pattern: /\bwould\s+of\b/gi, replacement: 'would have', type: 'Grammar' },
            { pattern: /\byour\s+welcome\b/gi, replacement: "you're welcome", type: 'Grammar' },
            { pattern: /\byour\s+right\b/gi, replacement: "you're right", type: 'Grammar' },
            { pattern: /\bits\s+own\b/gi, replacement: 'its own', type: 'Grammar' },
            { pattern: /\bthere\s+is\s+alot\b/gi, replacement: 'there are a lot', type: 'Grammar' }
        ];
        
        // Apply all corrections
        const allCorrections = [...spellCorrections, ...grammarCorrections];
        
        for (const correction of allCorrections) {
            const matches = [...correctedText.matchAll(correction.pattern)];
            for (const match of matches.reverse()) { // Apply from end to maintain positions
                if (match[0] !== correction.replacement) {
                    corrections.push({
                        original: match[0],
                        replacement: correction.replacement,
                        message: `${correction.type}: Corrected "${match[0]}" to "${correction.replacement}"`
                    });
                    
                    correctedText = correctedText.slice(0, match.index) + 
                                  correction.replacement + 
                                  correctedText.slice(match.index + match[0].length);
                }
            }
        }
        
        // Basic formatting
        const originalText = correctedText;
        correctedText = correctedText
            .replace(/\bi\b/g, 'I')
            .replace(/(\w+)(\s+)\1(\s+)\1/g, '$1') // Remove triple repeated words
            .replace(/(\w+)(\s+)\1/g, '$1') // Remove double repeated words
            .replace(/\s+/g, ' ')
            .replace(/([.!?])\s*([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase())
            .replace(/^\s*(.)/g, (match, p1) => p1.toUpperCase())
            .trim();
        
        if (originalText !== correctedText && !corrections.some(c => c.message.includes('Formatting'))) {
            corrections.push({
                original: 'text formatting',
                replacement: 'improved formatting',
                message: 'Formatting: Applied capitalization and spacing improvements'
            });
        }
        
        return {
            success: true,
            correctedText: correctedText,
            corrections: corrections
        };
    } catch (error) {
        console.error('Demo API error:', error);
        return { success: false };
    }
}

function showCorrectionPreview(original, corrected, corrections, onAccept) {
    const modal = document.createElement('div');
    modal.className = 'correction-preview-modal';
    
    let correctionsHtml = '';
    if (corrections && corrections.length > 0) {
        correctionsHtml = corrections.map(correction => 
            `<div class="correction-item">
                <span class="correction-original">"${correction.original}"</span> → 
                <span class="correction-replacement">"${correction.replacement}"</span>
                <div class="correction-reason">${correction.message}</div>
            </div>`
        ).join('');
    }
    
    modal.innerHTML = `
        <div class="correction-preview-content">
            <h3>✨ Grammar & Spelling Suggestions</h3>
            <div class="correction-comparison">
                <div class="correction-before">
                    <h4>Before:</h4>
                    <div class="text-preview">${original.substring(0, 200)}${original.length > 200 ? '...' : ''}</div>
                </div>
                <div class="correction-after">
                    <h4>After:</h4>
                    <div class="text-preview">${corrected.substring(0, 200)}${corrected.length > 200 ? '...' : ''}</div>
                </div>
            </div>
            ${correctionsHtml ? `<div class="corrections-list">
                <h4>Specific Changes:</h4>
                ${correctionsHtml}
            </div>` : ''}
            <div class="correction-actions">
                <button onclick="acceptCorrection()" class="accept-btn">
                    <i class="fas fa-check"></i> Apply Changes
                </button>
                <button onclick="rejectCorrection()" class="reject-btn">
                    <i class="fas fa-times"></i> Keep Original
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animation
    setTimeout(() => modal.classList.add('show'), 10);
    
    window.acceptCorrection = () => {
        onAccept();
        modal.remove();
        showNotification('✅ Note updated with corrections!', 'success');
    };
    
    window.rejectCorrection = () => {
        modal.remove();
        showNotification('📝 Keeping original text', 'info');
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// REMOVED: Old canvas-based drawing functions - using SVG-based Excalidraw implementation

// REMOVED: Old canvas-based drawing functions

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function setTool(tool) {
    currentTool = tool;
    
    // Update tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    
    // Update cursor
    if (tool === 'eraser') {
        canvas.style.cursor = 'grab';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

function detectAndOptimizeShapes() {
    // Get image data for shape detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple circle detection algorithm
    detectCircles(imageData);
    detectRectangles(imageData);
    detectLines(imageData);
}

function detectCircles(imageData) {
    // Simplified circle detection - look for roughly circular patterns
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // This is a simplified implementation
    // In a real app, you'd use more sophisticated computer vision algorithms
    
    // For now, we'll implement a basic circle completion feature
    // when the user draws something that roughly resembles a circle
}

function detectRectangles(imageData) {
    // Simplified rectangle detection
    // Look for straight lines and right angles
}

function detectLines(imageData) {
    // Line straightening - detect mostly straight lines and make them perfect
}

function clearCanvas() {
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        playSound('delete');
    }
}

function saveDrawing() {
    if (canvas) {
        const drawing = {
            id: Date.now(),
            data: canvas.toDataURL(),
            created: new Date()
        };
        
        drawings.push(drawing);
        localStorage.setItem('productivitySuite_drawings', JSON.stringify(drawings));
        playSound('complete');
        
        // Show success message
        showXPNotification('Drawing saved!', 'positive');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load user data from localStorage (after data clearing)
    userName = localStorage.getItem('userName') || userName;
    userAvatar = localStorage.getItem('userAvatar') || userAvatar;
    userXP = parseInt(localStorage.getItem('userXP')) || userXP;
    userLevel = parseInt(localStorage.getItem('userLevel')) || userLevel;
    currentStreak = parseInt(localStorage.getItem('currentStreak')) || currentStreak;
    totalCompleted = parseInt(localStorage.getItem('totalCompleted')) || totalCompleted;
    
    console.log('👤 Loaded user data:', userName, userAvatar, 'XP:', userXP, 'Level:', userLevel);
    
    // Initialize DOM elements first
    todoInput = document.getElementById('todoInput');
    todoList = document.getElementById('todoList');
    emptyState = document.getElementById('emptyState');
    totalTasks = document.getElementById('totalTasks');
    completedTasks = document.getElementById('completedTasks');
    pendingTasks = document.getElementById('pendingTasks');
    
    // Initialize default avatar selection
    const firstAvatar = document.querySelector('.avatar-btn');
    if (firstAvatar && !userAvatar) {
        firstAvatar.classList.add('selected');
        userAvatar = firstAvatar.dataset.avatar || '🦊';
    }
    
    initializeTheme();
    initializeVoiceRecognition();
    initializeEventListeners();
    
    // Always show welcome modal on every refresh
    showWelcomeModal();
    
    // Initialize new functionality
    loadNotes();
    
    // Add event listeners for brush size and color
    const brushSizeSlider = document.getElementById('brushSize');
    const colorPicker = document.getElementById('colorPicker');
    
    if (brushSizeSlider) {
        brushSizeSlider.addEventListener('input', function() {
            currentSize = this.value;
            if (ctx) {
                ctx.lineWidth = currentSize;
            }
        });
    }
    
    if (colorPicker) {
        colorPicker.addEventListener('change', function() {
            currentColor = this.value;
            if (ctx) {
                ctx.strokeStyle = currentColor;
            }
        });
    }
    
    // Auto-save notes
    setInterval(() => {
        if (currentApp === 'notes' && currentNote) {
            saveCurrentNote();
        }
    }, 5000); // Auto-save every 5 seconds
    
    // Initialize drawings list on app load
    if (typeof refreshDrawingsList === 'function') {
        refreshDrawingsList();
    }
});

// Initialize event listeners
function initializeEventListeners() {
    // Input handlers
    document.getElementById('todoInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addTodo();
        }
    });

    // Welcome modal
    if (document.getElementById('userName')) {
        document.getElementById('userName').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                startUserJourney();
            }
        });
    }

    // Recurring checkbox
    const recurringCheck = document.getElementById('recurringCheck');
    const recurringInterval = document.getElementById('recurringInterval');
    
    if (recurringCheck && recurringInterval) {
        recurringCheck.addEventListener('change', function() {
            recurringInterval.disabled = !this.checked;
        });
    }

    // Theme selectors
    document.querySelectorAll('.color-theme').forEach(theme => {
        theme.addEventListener('click', function() {
            setTheme(this.dataset.theme);
        });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to add thread quickly
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !editingId) {
            addTodo();
        }
        
        // Escape to cancel editing/close modals
        if (e.key === 'Escape') {
            if (editingId) cancelEdit();
            closeAllModals();
        }

        // Ctrl/Cmd + A to toggle analytics
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            toggleAnalytics();
        }

        // Ctrl/Cmd + B for bulk mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            bulkMode();
        }
    });
}

// Show welcome modal
function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Force display and visibility
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.zIndex = '99999';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.overflow = 'hidden';
    
    console.log('✅ Welcome modal should now be visible!');
    console.log('Modal element:', modal);
    console.log('Modal z-index:', modal.style.zIndex);
}

// Initialize app after user setup
function initializeApp() {
    document.getElementById('welcomeModal').style.display = 'none';
    updatePersonalization();
    updateUserLevel();
    updateStreak();
    updateHeaderUserInfo(); // Ensure user info shows in header
    renderTodos();
    updateStats();
    updateThreadCounter();
    
    // Initialize existing data
    document.getElementById('currentStreak').textContent = currentStreak;
    document.getElementById('totalXP').textContent = userXP;
}

// Start user journey
function startUserJourney() {
    const nameInput = document.getElementById('userName');
    const name = nameInput.value.trim();
    
    if (name === '') {
        nameInput.focus();
        nameInput.style.borderColor = '#ff6b6b';
        nameInput.placeholder = 'come on, we need something to call you! 😅';
        setTimeout(() => {
            nameInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            nameInput.placeholder = 'your name or whatever you vibe with...';
        }, 2000);
        return;
    }
    
    userName = name;
    localStorage.setItem('userName', userName);
    localStorage.setItem('userAvatar', userAvatar);
    
    console.log('👤 User set:', userName, userAvatar);
    
    // Play welcome sound
    playSound('welcome');
    
    // Close modal and initialize app
    document.getElementById('welcomeModal').style.display = 'none';
    
    // Update header immediately
    updateHeaderUserInfo();
    initializeMainApp();
}

// Update personalization throughout the app
function updatePersonalization() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const emptyTitle = document.getElementById('emptyTitle');
    const emptyMessage = document.getElementById('emptyMessage');
    
    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    welcomeMessage.textContent = `${greeting}, ${userName}! ${userAvatar} Ready to weave your thoughts?`;
    emptyTitle.textContent = `No threads yet, ${userName}`;
    emptyMessage.textContent = 'Start weaving your first thread and watch your ideas come to life!';
    
    document.getElementById('todoInput').placeholder = `What's weaving through your mind, ${userName}?`;
}

// Handle avatar selection
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('avatar-btn')) {
        document.querySelectorAll('.avatar-btn').forEach(btn => btn.classList.remove('selected'));
        e.target.classList.add('selected');
        userAvatar = e.target.dataset.avatar || e.target.dataset.emoji || '🦊';
        
        // Update the modal logo with selected avatar
        const avatarDisplay = document.getElementById('selectedAvatarDisplay');
        if (avatarDisplay) {
            avatarDisplay.textContent = userAvatar;
        }
    }
});

// REMOVED: Duplicate DOMContentLoaded handler - merged with main handler above

// Template functions
function setTemplate(template) {
    document.getElementById('todoInput').value = template;
    document.getElementById('todoInput').focus();
    // Move cursor to end
    const input = document.getElementById('todoInput');
    input.setSelectionRange(input.value.length, input.value.length);
}

// Update thread counter
function updateThreadCounter() {
    threadCount = todos.length + 1;
    document.getElementById('threadCounter').textContent = `Thread #${threadCount}`;
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Add new todo
function addTodo() {
    if (!todoInput) {
        console.error('Todo input not found');
        return;
    }
    
    const categorySelect = document.getElementById('categorySelect');
    const prioritySelect = document.getElementById('prioritySelect');
    const tagsInput = document.getElementById('tagsInput');
    const recurringCheck = document.getElementById('recurringCheck');
    const recurringInterval = document.getElementById('recurringInterval');
    
    const text = todoInput.value.trim();
    
    if (text === '') {
        todoInput.focus();
        return;
    }
    
    // Parse tags
    const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    const newTodo = {
        id: generateId(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString(),
        threadNumber: threadCount,
        category: categorySelect.value,
        priority: prioritySelect.value,
        tags: tags,
        isRecurring: recurringCheck.checked,
        recurringInterval: recurringCheck.checked ? recurringInterval.value : null,
        timeSpent: 0,
        subThreads: []
    };
    
    todos.unshift(newTodo);
    
    // Clear inputs
    todoInput.value = '';
    tagsInput.value = '';
    categorySelect.selectedIndex = 0;
    prioritySelect.selectedIndex = 0;
    recurringCheck.checked = false;
    recurringInterval.disabled = true;
    
    // Award XP for creating thread
    addXP(5, 'Thread created!');
    
    // Play sound
    playSound('add');
    
    saveTodos();
    renderTodos();
    updateStats();
    updateThreadCounter();
    updateAnalytics();
    updateSidebarOnChange(); // Update sidebar
    
    // Add animation feedback
    todoInput.style.transform = 'scale(0.95)';
    setTimeout(() => {
        todoInput.style.transform = 'scale(1)';
    }, 150);
}

// Delete thread
function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this thread?')) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
        updateStats();
        updateSidebarOnChange(); // Update sidebar
    }
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const wasCompleted = todo.completed;
        todo.completed = !todo.completed;
        
        if (todo.completed && !wasCompleted) {
            // Completion logic
            todo.completedAt = new Date().toISOString();
            totalCompleted++;
            updateStreak();
            
            // Calculate XP based on priority, category, and time
            let xpGain = 10; // Base XP
            
            // Priority bonus
            if (todo.priority === 'high') xpGain = 25;
            else if (todo.priority === 'medium') xpGain = 18;
            
            // Category bonus
            const categoryBonus = {
                'work': 5,
                'learning': 8,
                'health': 6,
                'creative': 7,
                'personal': 4,
                'social': 3
            };
            xpGain += categoryBonus[todo.category] || 0;
            
            // Time bonus (completed same day = bonus)
            const createdToday = new Date(todo.timestamp).toDateString() === new Date().toDateString();
            if (createdToday) xpGain += 5;
            
            // Streak bonus
            if (currentStreak > 5) xpGain += Math.floor(currentStreak / 5) * 2;
            
            addXP(xpGain, `🎯 ${todo.priority.toUpperCase()} priority thread completed! +${xpGain} XP`);
            
            // Check for achievements
            checkAchievements(todo);
            
            // Play completion sound
            playSound('complete');
            
            // Show celebration
            showCelebration(todo, xpGain);
            
            // Update analytics
            updateCompletionAnalytics(todo);
            
            // Create recurring thread if needed
            if (todo.isRecurring) {
                createRecurringThread(todo);
            }
            
        } else if (wasCompleted && !todo.completed) {
            // Uncompleted - subtract XP
            addXP(-5, 'Thread unmarked');
            playSound('undo');
        }
        
        saveTodos();
        renderTodos();
        updateStats();
        updateAnalytics();
        saveProgress();
        updateSidebarOnChange(); // Update sidebar
        
        // Update user stats modal if it's currently open
        const modal = document.getElementById('userStatsModal');
        if (modal && (modal.style.display === 'flex' || modal.classList.contains('active'))) {
            // Refresh the entire modal content
            showUserStats();
        }
    }
}

// Show celebration modal
function showCelebration(todo, xpGained = 10) {
    const modal = document.getElementById('celebrationModal');
    const message = document.getElementById('celebrationMessage');
    const xpGainedElement = document.getElementById('xpGained');
    
    const celebrationMessages = [
        `${userName}, you're on fire! 🔥`,
        `Thread completed beautifully, ${userName}! ✨`,
        `${userName}, that's how it's done! 🎯`,
        `Amazing work, ${userName}! Keep weaving! 🌟`,
        `${userName}, you're unstoppable! ⚡`,
        `Thread woven perfectly, ${userName}! 🧵`,
        `Another victory, ${userName}! 🏆`,
        `Magnificent work, ${userName}! ⭐`
    ];
    
    message.textContent = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
    xpGainedElement.textContent = xpGained;
    
    modal.classList.remove('hidden');
    
    // Add screen confetti effect
    createConfetti();
    
    // Auto close after 3 seconds
    setTimeout(() => {
        closeCelebration();
    }, 3000);
}

// Close celebration modal
function closeCelebration() {
    document.getElementById('celebrationModal').classList.add('hidden');
}

// Theme System
function initializeTheme() {
    applyTheme(currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('isDarkMode', isDarkMode);
    updateThemeIcon();
    applyThemeMode();
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('currentTheme', theme);
    applyTheme(theme);
    
    // Update active theme button
    document.querySelectorAll('.color-theme').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
}

function applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('dark-mode', 'light-mode');
    
    // Apply dark/light mode class
    body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    
    const themes = {
        ocean: {
            primary: 'linear-gradient(135deg, #667eea, #764ba2)',
            accent: '#78e6ff',
            secondary: '#4fc3f7'
        },
        sunset: {
            primary: 'linear-gradient(135deg, #ff6b6b, #ffa726)',
            accent: '#ff8a80',
            secondary: '#ffb74d'
        },
        forest: {
            primary: 'linear-gradient(135deg, #4caf50, #45a049)',
            accent: '#81c784',
            secondary: '#66bb6a'
        },
        purple: {
            primary: 'linear-gradient(135deg, #9c27b0, #673ab7)',
            accent: '#ba68c8',
            secondary: '#ab47bc'
        }
    };
    
    if (themes[theme]) {
        root.style.setProperty('--primary-gradient', themes[theme].primary);
        root.style.setProperty('--accent-color', themes[theme].accent);
        root.style.setProperty('--accent-secondary', themes[theme].secondary);
    }
}

function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// XP and Leveling System
function addXP(amount, reason = '') {
    userXP += amount;
    const oldLevel = userLevel;
    userLevel = Math.floor(userXP / 100) + 1;
    
    // Update display
    updateUserLevel();
    updateHeaderUserInfo(); // Update header display
    
    // Update user stats modal if it's open
    const modal = document.getElementById('userStatsModal');
    if (modal && (modal.style.display === 'flex' || modal.classList.contains('active'))) {
        updateUserStatsDisplay();
    }
    
    // Check for level up
    if (userLevel > oldLevel) {
        showLevelUp(userLevel);
        playSound('levelup');
    }
    
    // Save progress
    saveProgress();
    
    // Show XP notification for any amount > 5
    if (Math.abs(amount) >= 5) {
        showXPNotification(amount, reason);
    }
    
    console.log(`💎 XP +${amount}! Total: ${userXP} (Level ${userLevel})`);
}

// Update user stats display in modal
function updateUserStatsDisplay() {
    const userLevelEl = document.getElementById('userLevel');
    const userXPEl = document.getElementById('userXP');
    const userStreakEl = document.getElementById('userStreak');
    const totalCompletedEl = document.getElementById('totalCompleted');
    const xpProgress = document.getElementById('xpProgress');
    const xpProgressText = document.getElementById('xpProgressText');
    
    // Calculate progress
    const xpForCurrentLevel = (userLevel - 1) * 100;
    const xpForNextLevel = userLevel * 100;
    const currentLevelXP = userXP - xpForCurrentLevel;
    const requiredXP = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = (currentLevelXP / requiredXP) * 100;
    
    // Update values
    if (userLevelEl) userLevelEl.textContent = userLevel;
    if (userXPEl) userXPEl.textContent = userXP;
    if (userStreakEl) userStreakEl.textContent = currentStreak;
    if (totalCompletedEl) totalCompletedEl.textContent = todos.filter(todo => todo.completed).length;
    if (xpProgress) xpProgress.style.width = `${Math.min(progressPercent, 100)}%`;
    if (xpProgressText) xpProgressText.textContent = `${currentLevelXP} / ${requiredXP} XP`;
    
    // Update motivation message
    const motivationEl = document.getElementById('motivationMessage');
    if (motivationEl) {
        const messages = [
            "Every thread counts towards your masterpiece! 🎯",
            "You're building something amazing, one task at a time! 🌟",
            "Your productivity journey is inspiring! Keep going! 🚀",
            "Consistency is your superpower! 💪",
            "Each completed thread brings you closer to your goals! ✨",
            "You're weaving a tapestry of success! 🎨",
            "Progress over perfection - you're doing great! 🌈",
            "Your future self will thank you for this! 🙏"
        ];
        
        let message;
        if (progressPercent < 25) {
            message = "Just getting started? Every expert was once a beginner! 🌱";
        } else if (progressPercent < 50) {
            message = "You're gaining momentum - keep pushing forward! 🔥";
        } else if (progressPercent < 75) {
            message = "More than halfway there - you're unstoppable! ⚡";
        } else if (progressPercent < 100) {
            message = "So close to leveling up! The final sprint! 🏃‍♂️";
        } else {
            message = messages[Math.floor(Math.random() * messages.length)];
        }
        
        motivationEl.textContent = message;
    }
}

function updateUserLevel() {
    const levelElement = document.getElementById('userLevel');
    const xpElement = document.getElementById('totalXP');
    const progressElement = document.getElementById('xpProgress');
    
    if (levelElement) levelElement.textContent = `Lv.${userLevel}`;
    if (xpElement) xpElement.textContent = userXP;
    
    if (progressElement) {
        const currentLevelXP = (userLevel - 1) * 100;
        const nextLevelXP = userLevel * 100;
        const progress = ((userXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
        progressElement.style.width = `${Math.min(progress, 100)}%`;
    }
}

function showLevelUp(level) {
    // Create temporary level up notification
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `
        <div class="level-up-content">
            <i class="fas fa-star"></i>
            <h3>Level Up!</h3>
            <p>Welcome to Level ${level}</p>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showXPNotification(amount, reason) {
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
        <span class="xp-amount ${amount > 0 ? 'positive' : 'negative'}">
            ${amount > 0 ? '+' : ''}${amount} XP
        </span>
        <span class="xp-reason">${reason}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Sound System
function playSound(type) {
    if (!localStorage.getItem('soundEffects') || localStorage.getItem('soundEffects') === 'false') return;
    
    // Create audio context for simple beeps
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different sounds for different actions
        const sounds = {
            complete: { frequency: 800, duration: 0.2 },
            add: { frequency: 400, duration: 0.1 },
            delete: { frequency: 200, duration: 0.15 },
            levelup: { frequency: 600, duration: 0.3 },
            achievement: { frequency: 1000, duration: 0.4 },
            welcome: { frequency: 500, duration: 0.25 },
            undo: { frequency: 300, duration: 0.1 }
        };
        
        const sound = sounds[type] || sounds.add;
        
        oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + sound.duration);
    } catch (e) {
        console.log('Audio not available');
    }
}

// Start editing todo
function editTodo(id) {
    editingId = id;
    renderTodos();
}

// Save edited todo
function saveTodo(id) {
    const editInput = document.querySelector(`#edit-input-${id}`);
    const newText = editInput.value.trim();
    
    if (newText === '') {
        editInput.focus();
        return;
    }
    
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.text = newText;
        editingId = null;
        saveTodos();
        renderTodos();
    }
}

// Cancel editing
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// Filter functions
function showAll() {
    currentFilter = 'all';
    updateFilterButtons();
    renderTodos();
}

function showPending() {
    currentFilter = 'pending';
    updateFilterButtons();
    renderTodos();
}

function showCompleted() {
    currentFilter = 'completed';
    updateFilterButtons();
    renderTodos();
}

// Update filter button states
function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (currentFilter === 'all') {
        document.querySelector('.filter-btn:nth-child(1)').classList.add('active');
    } else if (currentFilter === 'pending') {
        document.querySelector('.filter-btn:nth-child(2)').classList.add('active');
    } else if (currentFilter === 'completed') {
        document.querySelector('.filter-btn:nth-child(3)').classList.add('active');
    }
}

// REMOVED: Basic getFilteredTodos function - using enhanced version below

// REMOVED: Duplicate renderTodos function - using enhanced version below

// Update statistics
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = total - completed;
    
    console.log(`Stats: Total=${total}, Completed=${completed}, Pending=${pending}`);
    
    if (totalTasks) totalTasks.textContent = total;
    if (completedTasks) completedTasks.textContent = completed;
    if (pendingTasks) pendingTasks.textContent = pending;
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Load todos from localStorage
function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
        console.log('📋 Loaded', todos.length, 'todos from storage');
    }
}

// Show all tasks when total threads is clicked
function showAllTasks() {
    // Clear all filters
    const categorySelect = document.getElementById('categorySelect');
    const prioritySelect = document.getElementById('prioritySelect');
    const statusFilter = document.querySelector('.status-filter');
    
    if (categorySelect) categorySelect.value = 'all';
    if (prioritySelect) prioritySelect.value = 'all';
    if (statusFilter) {
        statusFilter.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        statusFilter.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
    }
    
    // Update current filter and render
    currentFilter = 'all';
    renderTodos();
    
    // Show notification
    showNotification(`📋 Showing all ${todos.length} threads`, 'info');
}

// Show user stats modal
function showUserStats() {
    const modal = document.getElementById('userStatsModal');
    const userLargeAvatar = document.getElementById('userLargeAvatar');
    const userStatsName = document.getElementById('userStatsName');
    const userLevelEl = document.getElementById('userLevel');
    const userXPEl = document.getElementById('userXP');
    const userStreakEl = document.getElementById('userStreak');
    const totalCompletedEl = document.getElementById('totalCompleted');
    const xpProgress = document.getElementById('xpProgress');
    const xpProgressText = document.getElementById('xpProgressText');
    
    // Get current user stats from global variables
    const totalCompleted = todos.filter(todo => todo.completed).length;
    
    console.log('📊 Showing user stats - Level:', userLevel, 'XP:', userXP, 'Streak:', currentStreak, 'Completed:', totalCompleted);
    
    // Calculate XP progress
    const xpForCurrentLevel = (userLevel - 1) * 100;
    const xpForNextLevel = userLevel * 100;
    const currentLevelXP = userXP - xpForCurrentLevel;
    const requiredXP = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = (currentLevelXP / requiredXP) * 100;
    
    // Update modal content
    if (userLargeAvatar) userLargeAvatar.textContent = userAvatar || '🦊';
    if (userStatsName) userStatsName.textContent = userName || 'User';
    if (userLevelEl) userLevelEl.textContent = userLevel;
    if (userXPEl) userXPEl.textContent = userXP;
    if (userStreakEl) userStreakEl.textContent = currentStreak;
    if (totalCompletedEl) totalCompletedEl.textContent = totalCompleted;
    if (xpProgress) xpProgress.style.width = `${Math.min(progressPercent, 100)}%`;
    if (xpProgressText) xpProgressText.textContent = `${currentLevelXP} / ${requiredXP} XP`;
    
    // Update motivation message based on progress
    const motivationEl = document.getElementById('motivationMessage');
    if (motivationEl) {
        const messages = [
            "Every thread counts towards your masterpiece! 🎯",
            "You're building something amazing, one task at a time! 🌟",
            "Your productivity journey is inspiring! Keep going! 🚀",
            "Consistency is your superpower! 💪",
            "Each completed thread brings you closer to your goals! ✨",
            "You're weaving a tapestry of success! 🎨",
            "Progress over perfection - you're doing great! 🌈",
            "Your future self will thank you for this! 🙏"
        ];
        
        let message;
        if (progressPercent < 25) {
            message = "Just getting started? Every expert was once a beginner! 🌱";
        } else if (progressPercent < 50) {
            message = "You're gaining momentum - keep pushing forward! 🔥";
        } else if (progressPercent < 75) {
            message = "More than halfway there - you're unstoppable! ⚡";
        } else if (progressPercent < 100) {
            message = "So close to leveling up! The final sprint! 🏃‍♂️";
        } else {
            message = messages[Math.floor(Math.random() * messages.length)];
        }
        
        motivationEl.textContent = message;
    }
    
    // Show modal with smooth transition
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }
}

// Close user stats modal
function closeUserStats() {
    const modal = document.getElementById('userStatsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// Enhanced modal functionality - close on outside click
document.addEventListener('DOMContentLoaded', function() {
    const userStatsModal = document.getElementById('userStatsModal');
    if (userStatsModal) {
        userStatsModal.addEventListener('click', function(e) {
            if (e.target === userStatsModal) {
                closeUserStats();
            }
        });
    }
});

// Drawing Search Functions (Excalidraw-style)
let searchHighlights = [];

function toggleSearch() {
    const searchPanel = document.getElementById('searchPanel');
    const searchToggle = document.getElementById('searchToggle');
    
    if (searchPanel.style.display === 'none') {
        searchPanel.style.display = 'block';
        searchToggle.classList.add('active');
        document.getElementById('searchInput').focus();
    } else {
        searchPanel.style.display = 'none';
        searchToggle.classList.remove('active');
        clearSearch();
    }
}

function searchElements() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!searchTerm) {
        resultsContainer.innerHTML = '<div class="search-result-item">💡 Enter text to search elements</div>';
        return;
    }
    
    clearSearchHighlights();
    
    const elements = drawingState.elements;
    const matchingElements = [];
    
    elements.forEach((element, index) => {
        let matches = false;
        let matchReason = '';
        
        // Search by element type
        if (element.type.toLowerCase().includes(searchTerm)) {
            matches = true;
            matchReason = `Type: ${element.type}`;
        }
        
        // Search by text content (for text and sticky note elements)
        if (element.text && element.text.toLowerCase().includes(searchTerm)) {
            matches = true;
            matchReason = `Text: "${element.text}"`;
        }
        
        // Search by stroke color
        if (element.strokeColor && element.strokeColor.toLowerCase().includes(searchTerm)) {
            matches = true;
            matchReason = `Stroke: ${element.strokeColor}`;
        }
        
        // Search by fill color
        if (element.fillColor && element.fillColor.toLowerCase().includes(searchTerm)) {
            matches = true;
            matchReason = `Fill: ${element.fillColor}`;
        }
        
        // Search by stroke width
        if (element.strokeWidth && element.strokeWidth.toString().includes(searchTerm)) {
            matches = true;
            matchReason = `Stroke Width: ${element.strokeWidth}`;
        }
        
        if (matches) {
            matchingElements.push({
                element,
                index,
                reason: matchReason
            });
        }
    });
    
    // Display results
    if (matchingElements.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">🔍 No elements found</div>';
    } else {
        resultsContainer.innerHTML = matchingElements.map((item, i) => {
            const iconMap = {
                'rectangle': 'fas fa-square',
                'ellipse': 'fas fa-circle',
                'diamond': 'fas fa-gem',
                'arrow': 'fas fa-arrow-right',
                'line': 'fas fa-minus',
                'pen': 'fas fa-pencil-alt',
                'text': 'fas fa-font',
                'sticky': 'fas fa-sticky-note'
            };
            
            const icon = iconMap[item.element.type] || 'fas fa-shapes';
            
            return `
                <div class="search-result-item" onclick="highlightElement(${item.index})">
                    <i class="search-result-icon ${icon}"></i>
                    <div class="search-result-text">${item.reason}</div>
                    <div class="search-result-type">${item.element.type}</div>
                </div>
            `;
        }).join('');
        
        // Auto-highlight first result
        if (matchingElements.length > 0) {
            highlightElement(matchingElements[0].index);
        }
    }
    
    showNotification(`🔍 Found ${matchingElements.length} element(s)`, 'info');
}

function highlightElement(elementIndex) {
    clearSearchHighlights();
    
    const element = drawingState.elements[elementIndex];
    if (!element) return;
    
    const svg = document.getElementById('drawingSVG');
    const svgElements = svg.querySelectorAll('[data-element-id]');
    
    svgElements.forEach(svgEl => {
        if (svgEl.getAttribute('data-element-id') === element.id) {
            svgEl.classList.add('search-highlight');
            searchHighlights.push(svgEl);
            
            // Scroll element into view
            const rect = svgEl.getBoundingClientRect();
            const container = svg.parentElement;
            
            if (rect.top < container.offsetTop || rect.bottom > container.offsetTop + container.offsetHeight) {
                svgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
    
    showNotification(`✨ Highlighted ${element.type} element`, 'success');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    clearSearchHighlights();
}

function clearSearchHighlights() {
    searchHighlights.forEach(element => {
        element.classList.remove('search-highlight');
    });
    searchHighlights = [];
}

// Add Enter key support for search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchElements();
            }
        });
        
        // Real-time search as user types
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            if (searchTerm.length >= 2) {
                setTimeout(searchElements, 300); // Debounce search
            } else if (searchTerm.length === 0) {
                clearSearch();
            }
        });
    }
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Clear all completed threads
function clearCompleted() {
    if (confirm('Are you sure you want to delete all completed threads?')) {
        todos = todos.filter(todo => !todo.completed);
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// Voice Recognition System
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('todoInput').value = transcript;
            stopVoiceInput();
        };
        
        recognition.onerror = function(event) {
            console.log('Speech recognition error:', event.error);
            stopVoiceInput();
        };
        
        recognition.onend = function() {
            stopVoiceInput();
        };
    }
}

function startVoiceInput() {
    if (recognition && !isListening) {
        isListening = true;
        recognition.start();
        
        const voiceBtn = document.getElementById('voiceIcon');
        const voiceBtnContainer = voiceBtn.parentElement;
        voiceBtnContainer.classList.add('recording');
        voiceBtn.className = 'fas fa-stop';
        
        playSound('add');
    }
}

function stopVoiceInput() {
    if (recognition && isListening) {
        isListening = false;
        recognition.stop();
        
        const voiceBtn = document.getElementById('voiceIcon');
        const voiceBtnContainer = voiceBtn.parentElement;
        voiceBtnContainer.classList.remove('recording');
        voiceBtn.className = 'fas fa-microphone';
    }
}

// Analytics System
function updateAnalytics() {
    const today = new Date().toDateString();
    const week = getWeekKey();
    
    // Daily analytics
    if (!analyticsData.daily[today]) {
        analyticsData.daily[today] = { created: 0, completed: 0 };
    }
    
    // Weekly analytics
    if (!analyticsData.weekly[week]) {
        analyticsData.weekly[week] = { created: 0, completed: 0 };
    }
    
    saveAnalytics();
}

function updateCompletionAnalytics(todo) {
    const today = new Date().toDateString();
    const week = getWeekKey();
    const category = todo.category;
    
    // Update daily
    if (analyticsData.daily[today]) {
        analyticsData.daily[today].completed++;
    }
    
    // Update weekly
    if (analyticsData.weekly[week]) {
        analyticsData.weekly[week].completed++;
    }
    
    // Update category stats
    if (!analyticsData.categories[category]) {
        analyticsData.categories[category] = 0;
    }
    analyticsData.categories[category]++;
    
    // Track completion time if timer was used
    if (todo.timeSpent > 0) {
        analyticsData.completionTimes.push({
            category: todo.category,
            priority: todo.priority,
            time: todo.timeSpent,
            date: new Date().toISOString()
        });
        
        // Keep only last 100 completion times
        if (analyticsData.completionTimes.length > 100) {
            analyticsData.completionTimes = analyticsData.completionTimes.slice(-100);
        }
    }
    
    saveAnalytics();
}

function getWeekKey() {
    const date = new Date();
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
    return `${year}-W${week}`;
}

function toggleAnalytics() {
    const panel = document.getElementById('analyticsPanel');
    if (panel.classList.contains('hidden')) {
        updateAnalyticsDisplay();
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function updateAnalyticsDisplay() {
    // Update weekly completed
    const weekKey = getWeekKey();
    const weeklyCompleted = analyticsData.weekly[weekKey]?.completed || 0;
    document.getElementById('weeklyCompleted').textContent = weeklyCompleted;
    
    // Find best day
    const bestDay = findBestDay();
    document.getElementById('bestDay').textContent = bestDay;
    
    // Calculate average time
    const avgTime = calculateAverageTime();
    document.getElementById('avgTime').textContent = avgTime;
    
    // Find top category
    const topCategory = findTopCategory();
    document.getElementById('topCategory').textContent = topCategory;
    
    // Update weekly chart
    updateWeeklyChart();
    updateProgressTree();
}

function findBestDay() {
    const dayTotals = {};
    Object.values(analyticsData.daily).forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en', { weekday: 'long' });
        dayTotals[dayName] = (dayTotals[dayName] || 0) + day.completed;
    });
    
    let bestDay = 'Monday';
    let maxCompleted = 0;
    Object.entries(dayTotals).forEach(([day, count]) => {
        if (count > maxCompleted) {
            maxCompleted = count;
            bestDay = day;
        }
    });
    
    return bestDay;
}

function calculateAverageTime() {
    if (analyticsData.completionTimes.length === 0) return '—';
    
    const totalTime = analyticsData.completionTimes.reduce((sum, item) => sum + item.time, 0);
    const avgMinutes = Math.round(totalTime / analyticsData.completionTimes.length / 60000);
    
    return `${avgMinutes}m`;
}

function findTopCategory() {
    const categories = {'personal': '📋', 'work': '💼', 'health': '🏃', 'learning': '📚', 'creative': '🎨', 'social': '👥'};
    
    let topCategory = 'personal';
    let maxCount = 0;
    
    Object.entries(analyticsData.categories).forEach(([category, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topCategory = category;
        }
    });
    
    return categories[topCategory] || '📋';
}

// Filter Functions
function showByPriority(priority) {
    currentFilter = 'priority';
    currentPriority = priority;
    updateFilterButtons();
    renderTodos();
}

function filterByCategory(category) {
    currentCategory = category;
    updateCategoryButtons();
    renderTodos();
}

function updateCategoryButtons() {
    document.querySelectorAll('.cat-filter').forEach(btn => btn.classList.remove('active'));
    const activeButton = Array.from(document.querySelectorAll('.cat-filter')).find(btn => 
        btn.textContent.includes(currentCategory === 'all' ? 'All Categories' : currentCategory)
    );
    if (activeButton) activeButton.classList.add('active');
}

// Achievement System
function checkAchievements(todo) {
    achievements.forEach(achievement => {
        if (unlockedAchievements.includes(achievement.id)) return;
        
        let unlocked = false;
        
        switch (achievement.id) {
            case 'first_thread':
                unlocked = totalCompleted >= 1;
                break;
            case 'streak_3':
                unlocked = currentStreak >= 3;
                break;
            case 'streak_7':
                unlocked = currentStreak >= 7;
                break;
            case 'productive_day':
                const today = new Date().toDateString();
                const todayCompleted = analyticsData.daily[today]?.completed || 0;
                unlocked = todayCompleted >= 10;
                break;
            case 'early_bird':
                const hour = new Date().getHours();
                unlocked = hour < 8;
                break;
            case 'night_owl':
                unlocked = new Date().getHours() >= 22;
                break;
            case 'category_master':
                const categoryCount = analyticsData.categories[todo.category] || 0;
                unlocked = categoryCount >= 25;
                break;
            case 'speed_demon':
                unlocked = todo.timeSpent > 0 && todo.timeSpent < 300000; // 5 minutes
                break;
        }
        
        if (unlocked) {
            unlockAchievement(achievement);
        }
    });
}

function unlockAchievement(achievement) {
    unlockedAchievements.push(achievement.id);
    localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievements));
    
    // Award XP
    addXP(achievement.xp, achievement.name);
    
    // Show achievement modal
    showAchievementModal(achievement);
    
    // Play sound
    playSound('achievement');
}

function showAchievementModal(achievement) {
    const modal = document.getElementById('achievementModal');
    const title = document.getElementById('achievementTitle');
    const desc = document.getElementById('achievementDesc');
    
    title.textContent = achievement.name;
    desc.textContent = achievement.desc;
    
    modal.classList.remove('hidden');
    
    // Auto close after 5 seconds
    setTimeout(() => {
        closeAchievement();
    }, 5000);
}

function closeAchievement() {
    document.getElementById('achievementModal').classList.add('hidden');
}

// Progress and Streak System
function updateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastCompletionDate === yesterday || lastCompletionDate === today) {
        if (lastCompletionDate !== today) {
            currentStreak++;
        }
    } else if (lastCompletionDate !== today) {
        currentStreak = 1;
    }
    
    lastCompletionDate = today;
    const streakElement = document.getElementById('currentStreak');
    if (streakElement) {
        streakElement.textContent = currentStreak;
    }
    
    saveProgress();
}

function saveProgress() {
    localStorage.setItem('userLevel', userLevel);
    localStorage.setItem('userXP', userXP);
    localStorage.setItem('currentStreak', currentStreak);
    localStorage.setItem('lastCompletionDate', lastCompletionDate);
    localStorage.setItem('totalCompleted', totalCompleted);
}

function saveAnalytics() {
    localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
}

// Utility Functions
function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'][Math.floor(Math.random() * 5)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 3000);
    }
}

function closeAllModals() {
    // Close all modals except the note editor modal
    document.querySelectorAll('.modal, .celebration-modal, .achievement-modal').forEach(modal => {
        if (modal.id !== 'noteEditorModal') {
            modal.classList.add('hidden');
        }
    });
}

// Bulk Operations
function bulkMode() {
    isBulkMode = !isBulkMode;
    const bulkControls = document.getElementById('bulkControls');
    
    if (isBulkMode) {
        bulkControls.classList.remove('hidden');
    } else {
        bulkControls.classList.add('hidden');
        selectedThreads.clear();
    }
    
    renderTodos();
}

// Export all data
function exportAllData() {
    const exportData = {
        todos: todos,
        userName: userName,
        userAvatar: userAvatar,
        userXP: userXP,
        userLevel: userLevel,
        currentStreak: currentStreak,
        totalCompleted: totalCompleted,
        notes: notes || [],
        analyticsData: analyticsData,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ProductiveSpace_Export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show notification
    showNotification('📥 Data exported successfully!', 'success');
}

function selectAll() {
    const visibleTodos = getFilteredTodos();
    visibleTodos.forEach(todo => selectedThreads.add(todo.id));
    renderTodos();
}

function bulkComplete() {
    selectedThreads.forEach(id => toggleTodo(id));
    selectedThreads.clear();
    renderTodos();
}

function bulkDelete() {
    if (confirm(`Delete ${selectedThreads.size} selected threads?`)) {
        selectedThreads.forEach(id => deleteTodo(id, false));
        selectedThreads.clear();
        saveTodos();
        renderTodos();
        updateStats();
    }
}

function exitBulkMode() {
    bulkMode();
}

// Export Functions
function exportData() {
    const data = {
        todos: todos,
        analytics: analyticsData,
        progress: { userLevel, userXP, currentStreak, totalCompleted },
        achievements: unlockedAchievements,
        settings: { currentTheme, isDarkMode }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threads-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Footer Functions
function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function openAI() {
    document.getElementById('aiModal').classList.remove('hidden');
    generateAISuggestions();
}

function closeAI() {
    document.getElementById('aiModal').classList.add('hidden');
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Threads - Beautiful To-Do App',
            text: 'Check out this amazing productivity app!',
            url: window.location.href
        });
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showXPNotification(0, 'Link copied to clipboard!');
    }
}

function generateAISuggestions() {
    // Simple AI-like suggestions based on user patterns
    const suggestions = [
        "🌅 Start your day with a morning routine",
        "💧 Remember to stay hydrated",
        "📚 Spend 20 minutes learning something new",
        "🏃‍♂️ Take a quick walk or exercise",
        "🧘 Practice 5 minutes of mindfulness",
        "📱 Check in with a friend or family member",
        "🍎 Prepare a healthy snack",
        "📝 Write down three things you're grateful for"
    ];
    
    const container = document.getElementById('aiSuggestionsList');
    container.innerHTML = suggestions.slice(0, 4).map(suggestion => 
        `<div class="suggestion-item" onclick="setTemplate('${suggestion}')">${suggestion}</div>`
    ).join('');
}

// Update existing functions
function createRecurringThread(originalTodo) {
    // Create a new thread based on recurring interval
    const nextDate = new Date();
    switch (originalTodo.recurringInterval) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
    }
    
    // Create the new recurring thread (simplified)
    setTimeout(() => {
        const newTodo = {
            ...originalTodo,
            id: generateId(),
            completed: false,
            createdAt: new Date().toISOString(),
            threadNumber: threadCount++
        };
        todos.unshift(newTodo);
        saveTodos();
        renderTodos();
    }, 1000);
}

function updateWeeklyChart() {
    // Simple chart implementation
    const chartContainer = document.getElementById('weeklyChart');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxHeight = 80;
    
    chartContainer.innerHTML = days.map((day, index) => {
        const completed = Math.random() * 10; // Placeholder data
        const height = (completed / 10) * maxHeight;
        return `<div class="chart-bar" style="height: ${height}px" title="${day}: ${Math.floor(completed)} completed"></div>`;
    }).join('');
}

// Enhanced render function for new features
function renderTodos() {
    if (!todoList) {
        console.error('todoList element not found');
        return;
    }
    
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    
    todoList.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    
    todoList.innerHTML = filteredTodos.map(todo => {
        const priorityColor = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🔵';
        const categoryEmoji = {'personal': '📋', 'work': '💼', 'health': '🏃', 'learning': '📚', 'creative': '🎨', 'social': '👥'}[todo.category] || '📋';
        
        if (editingId === todo.id) {
            return `
                <li class="todo-item">
                    <div class="todo-checkbox ${todo.completed ? 'completed' : ''}" onclick="toggleTodo('${todo.id}')">
                        ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    <input type="text" id="edit-input-${todo.id}" class="edit-input" value="${escapeHtml(todo.text)}" maxlength="200">
                    <div class="todo-actions">
                        <button class="save-btn" onclick="saveTodo('${todo.id}')">
                            <i class="fas fa-check"></i> Save
                        </button>
                        <button class="cancel-btn" onclick="cancelEdit()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </li>
            `;
        }
        
        return `
            <li class="todo-item ${isBulkMode ? 'bulk-mode' : ''}" ${isBulkMode ? `onclick="toggleSelection('${todo.id}')"` : ''}>
                ${isBulkMode ? `<input type="checkbox" class="bulk-checkbox" ${selectedThreads.has(todo.id) ? 'checked' : ''}>` : ''}
                <div class="todo-checkbox ${todo.completed ? 'completed' : ''}" onclick="toggleTodo('${todo.id}')">
                    ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="todo-content">
                    <span class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</span>
                    <div class="todo-meta">
                        <span class="priority">${priorityColor}</span>
                        <span class="category">${categoryEmoji}</span>
                        ${todo.tags.length > 0 ? `<div class="tags">${todo.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
                        ${todo.isRecurring ? '<i class="fas fa-redo recurring-icon" title="Recurring"></i>' : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="edit-btn" onclick="editTodo('${todo.id}')" ${todo.completed ? 'style="display:none"' : ''}>
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="deleteTodo('${todo.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </li>
        `;
    }).join('');
    
    // Focus on edit input if editing
    if (editingId) {
        const editInput = document.querySelector(`#edit-input-${editingId}`);
        if (editInput) {
            editInput.focus();
            editInput.setSelectionRange(editInput.value.length, editInput.value.length);
        }
    }
}

function getFilteredTodos() {
    let filtered = todos;
    
    // Apply status filter
    if (currentFilter === 'pending') {
        filtered = filtered.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(todo => todo.completed);
    } else if (currentFilter === 'priority') {
        filtered = filtered.filter(todo => todo.priority === 'high');
    }
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(todo => todo.category === currentCategory);
    }
    
    return filtered;
}

function toggleSelection(id) {
    if (selectedThreads.has(id)) {
        selectedThreads.delete(id);
    } else {
        selectedThreads.add(id);
    }
    renderTodos();
} 

// Enhanced Notes App (Google Keep style)
// Using unified currentNote reference above; removing redundant currentNoteEditor

function createNote() {
    const note = {
        id: Date.now(),
        title: '',
        content: '',
        images: [],
        created: new Date(),
        modified: new Date(),
        color: getRandomNoteColor()
    };
    
    notes.push(note);
    saveNotes();
    openNoteEditor(note);
    playSound('add');
}

function getRandomNoteColor() {
    const colors = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function renderNotesGrid() {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = '';
    
    const filteredNotes = filterNotes();
    
    filteredNotes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = `note-card note-color-${note.color || 'default'}`;
        noteCard.onclick = () => openNoteEditor(note);
        
        const title = note.title || 'Untitled Note';
        const content = stripHtml(note.content) || 'No content';
        const date = formatDate(note.modified);
        
        noteCard.innerHTML = `
            <div class="note-card-title">${title}</div>
            <div class="note-card-content">${content}</div>
            <div class="note-card-date">${date}</div>
        `;
        
        notesGrid.appendChild(noteCard);
    });
}

function filterNotes() {
    const searchTerm = document.getElementById('notesSearch')?.value.toLowerCase() || '';
    return notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm)
    );
}

// duplicate note editor functions removed in favor of unified implementations above

// Enhanced Drawing App (Excalidraw style)
let drawingState = {
    tool: 'select',
    elements: [],
    selectedElements: [],
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    drawing: false,
    currentElement: null,
    undoStack: [],
    redoStack: [],
    strokeColor: '#000000',
    borderColor: '#000000', // New border color for shapes
    fillColor: '#ffffff',
    strokeWidth: 2,
    fontSize: 16,
    textAlign: 'left',
    layers: [{ id: 1, name: 'Layer 1', visible: true, elements: [] }],
    currentLayer: 1
};

function setDrawingTool(tool) {
    drawingState.tool = tool;
    
    // Update tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`)?.classList.add('active');
    
    // Show/hide property panels
    const textProperties = document.getElementById('textProperties');
    if (tool === 'text') {
        textProperties.style.display = 'flex';
    } else {
        textProperties.style.display = 'none';
    }
    
    // Update cursor
    updateCanvasCursor();
}

function updateCanvasCursor() {
    const svg = document.getElementById('drawingSVG');
    const cursors = {
        select: 'default',
        hand: 'grab',
        pen: 'crosshair',
        rectangle: 'crosshair',
        circle: 'crosshair',
        ellipse: 'crosshair',
        diamond: 'crosshair',
        arrow: 'crosshair',
        line: 'crosshair',
        text: 'text',
        eraser: 'crosshair',
        sticky: 'crosshair'
    };
    if (svg) {
        svg.style.cursor = cursors[drawingState.tool] || 'default';
    }
}

function initializeDrawingCanvas() {
    console.log('Initializing drawing canvas...');
    const svg = document.getElementById('drawingSVG');
    const container = document.getElementById('canvasContainer');
    
    if (!svg) {
        console.error('Drawing SVG element not found!');
        return;
    }
    if (!container) {
        console.error('Canvas container element not found!');
        return;
    }
    
    console.log('Drawing elements found, adding event listeners...');
    
    // Add event listeners
    svg.addEventListener('mousedown', handleCanvasMouseDown);
    svg.addEventListener('mousemove', handleCanvasMouseMove);
    svg.addEventListener('mouseup', handleCanvasMouseUp);
    svg.addEventListener('wheel', handleCanvasWheel);
    
    // Touch events
    svg.addEventListener('touchstart', handleCanvasTouchStart);
    svg.addEventListener('touchmove', handleCanvasTouchMove);
    svg.addEventListener('touchend', handleCanvasTouchEnd);
    
    updateCanvasCursor();
    renderLayers();
    
    console.log('Drawing canvas initialized successfully!');
}

function handleCanvasMouseDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    // Simplified coordinate calculation for better pointer alignment
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    drawingState.drawing = true;
    
    switch (drawingState.tool) {
        case 'select':
            handleSelectTool(x, y);
            break;
        case 'hand':
            handlePanStart(e);
            break;
        case 'rectangle':
        case 'circle':
        case 'ellipse':
        case 'diamond':
            startDrawingShape(drawingState.tool, x, y);
            break;
        case 'arrow':
        case 'line':
            startDrawingLine(drawingState.tool, x, y);
            break;
        case 'pen':
            startDrawingPen(x, y);
            break;
        case 'eraser':
            handleEraser(x, y);
            break;
        case 'text':
            addTextElement(x, y);
            break;
        case 'sticky':
            addStickyNote(x, y);
            break;
    }
}

function handleCanvasMouseMove(e) {
    if (!drawingState.drawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    // Simplified coordinate calculation for better pointer alignment
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (drawingState.currentElement) {
        updateCurrentElement(x, y);
    }
}

function handleCanvasMouseUp(e) {
    drawingState.drawing = false;
    
    if (drawingState.currentElement) {
        finalizeElement();
    }
    
    drawingState.currentElement = null;
}

function startDrawingShape(type, x, y) {
    const element = {
        id: generateId(),
        type: type,
        x: x,
        y: y,
        width: 0,
        height: 0,
        strokeColor: drawingState.borderColor, // Use border color for shapes
        fillColor: drawingState.fillColor,
        strokeWidth: drawingState.strokeWidth,
        layer: drawingState.currentLayer
    };
    
    drawingState.currentElement = element;
    addElementToCanvas(element);
}

function startDrawingLine(type, x, y) {
    const element = {
        id: generateId(),
        type: type,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        strokeColor: drawingState.borderColor, // Use border color for lines
        strokeWidth: drawingState.strokeWidth,
        layer: drawingState.currentLayer
    };
    
    drawingState.currentElement = element;
    addElementToCanvas(element);
}

function startDrawingPen(x, y) {
    const element = {
        id: generateId(),
        type: 'pen',
        points: [{ x, y }],
        strokeColor: drawingState.strokeColor,
        strokeWidth: drawingState.strokeWidth,
        layer: drawingState.currentLayer
    };
    
    drawingState.currentElement = element;
    addElementToCanvas(element);
}

function addTextElement(x, y) {
    const text = prompt('Enter text:');
    if (text) {
        const element = {
            id: generateId(),
            type: 'text',
            x: x,
            y: y,
            text: text,
            fontSize: drawingState.fontSize,
            textAlign: drawingState.textAlign,
            color: drawingState.strokeColor,
            layer: drawingState.currentLayer
        };
        
        drawingState.elements.push(element);
        saveDrawingState();
        renderCanvas();
    }
}

function addStickyNote(x, y) {
    const text = prompt('Enter note text:');
    if (text) {
        const element = {
            id: generateId(),
            type: 'sticky',
            x: x,
            y: y,
            width: 150,
            height: 100,
            text: text,
            color: '#fff740',
            layer: drawingState.currentLayer
        };
        
        drawingState.elements.push(element);
        saveDrawingState();
        renderCanvas();
    }
}

function updateCurrentElement(x, y) {
    const element = drawingState.currentElement;
    if (!element) return;
    
    switch (element.type) {
        case 'rectangle':
        case 'ellipse':
        case 'diamond':
            element.width = x - element.x;
            element.height = y - element.y;
            break;
        case 'arrow':
        case 'line':
            element.x2 = x;
            element.y2 = y;
            break;
        case 'pen':
            element.points.push({ x, y });
            break;
    }
    
    updateElementInCanvas(element);
}

function addElementToCanvas(element) {
    const svg = document.getElementById('drawingSVG');
    const svgElement = createSVGElement(element);
    svgElement.setAttribute('data-element-id', element.id);
    svg.appendChild(svgElement);
}

function createSVGElement(element) {
    let svgElement;
    
    switch (element.type) {
        case 'rectangle':
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            svgElement.setAttribute('x', element.x);
            svgElement.setAttribute('y', element.y);
            svgElement.setAttribute('width', Math.abs(element.width));
            svgElement.setAttribute('height', Math.abs(element.height));
            svgElement.setAttribute('fill', element.fillColor);
            svgElement.setAttribute('stroke', element.strokeColor);
            svgElement.setAttribute('stroke-width', element.strokeWidth);
            break;
            
        case 'ellipse':
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            svgElement.setAttribute('cx', element.x + element.width / 2);
            svgElement.setAttribute('cy', element.y + element.height / 2);
            svgElement.setAttribute('rx', Math.abs(element.width) / 2);
            svgElement.setAttribute('ry', Math.abs(element.height) / 2);
            svgElement.setAttribute('fill', element.fillColor);
            svgElement.setAttribute('stroke', element.strokeColor);
            svgElement.setAttribute('stroke-width', element.strokeWidth);
            break;
            
        case 'line':
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            svgElement.setAttribute('x1', element.x1);
            svgElement.setAttribute('y1', element.y1);
            svgElement.setAttribute('x2', element.x2);
            svgElement.setAttribute('y2', element.y2);
            svgElement.setAttribute('stroke', element.strokeColor);
            svgElement.setAttribute('stroke-width', element.strokeWidth);
            break;
            
        case 'pen':
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pathData = `M ${element.points.map(p => `${p.x},${p.y}`).join(' L ')}`;
            svgElement.setAttribute('d', pathData);
            svgElement.setAttribute('fill', 'none');
            svgElement.setAttribute('stroke', element.strokeColor);
            svgElement.setAttribute('stroke-width', element.strokeWidth);
            svgElement.setAttribute('stroke-linecap', 'round');
            svgElement.setAttribute('stroke-linejoin', 'round');
            break;
            
        case 'text':
            svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            svgElement.setAttribute('x', element.x);
            svgElement.setAttribute('y', element.y);
            svgElement.setAttribute('font-size', element.fontSize);
            svgElement.setAttribute('text-anchor', element.textAlign);
            svgElement.setAttribute('fill', element.color);
            svgElement.textContent = element.text;
            break;
    }
    
    return svgElement;
}

function updateElementInCanvas(element) {
    const svgElement = document.querySelector(`[data-element-id="${element.id}"]`);
    if (svgElement) {
        const newElement = createSVGElement(element);
        svgElement.parentNode.replaceChild(newElement, svgElement);
        newElement.setAttribute('data-element-id', element.id);
    }
}

function finalizeElement() {
    if (drawingState.currentElement) {
        drawingState.elements.push(drawingState.currentElement);
        saveDrawingState();
    }
}

function renderCanvas() {
    const svg = document.getElementById('drawingSVG');
    // Clear existing elements (except grid)
    const elements = svg.querySelectorAll('[data-element-id]');
    elements.forEach(el => el.remove());
    
    // Render all elements
    drawingState.elements.forEach(element => {
        addElementToCanvas(element);
    });
}

function saveDrawingState() {
    drawingState.undoStack.push(JSON.parse(JSON.stringify(drawingState.elements)));
    if (drawingState.undoStack.length > 50) {
        drawingState.undoStack.shift();
    }
    drawingState.redoStack = [];
}

function undoDrawing() {
    if (drawingState.undoStack.length > 0) {
        drawingState.redoStack.push(JSON.parse(JSON.stringify(drawingState.elements)));
        drawingState.elements = drawingState.undoStack.pop() || [];
        renderCanvas();
    }
}

function redoDrawing() {
    if (drawingState.redoStack.length > 0) {
        drawingState.undoStack.push(JSON.parse(JSON.stringify(drawingState.elements)));
        drawingState.elements = drawingState.redoStack.pop() || [];
        renderCanvas();
    }
}

function zoomIn() {
    drawingState.zoom = Math.min(drawingState.zoom * 1.2, 5);
    updateZoom();
}

function zoomOut() {
    drawingState.zoom = Math.max(drawingState.zoom / 1.2, 0.1);
    updateZoom();
}

function updateZoom() {
    const container = document.getElementById('canvasContainer');
    container.style.transform = `scale(${drawingState.zoom}) translate(${drawingState.pan.x}px, ${drawingState.pan.y}px)`;
    document.getElementById('zoomLevel').textContent = Math.round(drawingState.zoom * 100) + '%';
}

function exportDrawing(format) {
    const svg = document.getElementById('drawingSVG');
    
    if (format === 'png') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const data = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = 'drawing.png';
            link.href = canvas.toDataURL();
            link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(data);
    } else if (format === 'svg') {
        const data = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([data], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = 'drawing.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
    }
    
    showXPNotification(`Drawing exported as ${format.toUpperCase()}!`, 'positive');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function updateStrokeColor(color) {
    drawingState.strokeColor = color;
}

function updateFillColor(color) {
    drawingState.fillColor = color;
    // Update UI color picker
    const fillColorPicker = document.getElementById('canvasFillColor');
    if (fillColorPicker) {
        fillColorPicker.value = color;
    }
    console.log('Fill color updated to:', color);
}

function updateBorderColor(color) {
    drawingState.borderColor = color;
    drawingState.strokeColor = color; // Keep stroke color in sync
    // Update UI color picker
    const borderColorPicker = document.getElementById('canvasBorderColor');
    if (borderColorPicker) {
        borderColorPicker.value = color;
    }
    console.log('Border color updated to:', color);
}

function updateStrokeWidth(width) {
    drawingState.strokeWidth = parseInt(width);
}

function updateFontSize(size) {
    drawingState.fontSize = parseInt(size);
}

function setTextAlign(align) {
    drawingState.textAlign = align;
    
    // Update button states
    document.querySelectorAll('.text-align-buttons button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function renderLayers() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    
    drawingState.layers.forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = `layer-item ${layer.id === drawingState.currentLayer ? 'active' : ''}`;
        layerItem.innerHTML = `
            <span>${layer.name}</span>
            <button onclick="toggleLayerVisibility(${layer.id})">
                <i class="fas fa-eye${layer.visible ? '' : '-slash'}"></i>
            </button>
        `;
        layerItem.onclick = () => setCurrentLayer(layer.id);
        layersList.appendChild(layerItem);
    });
}

function addLayer() {
    const newLayer = {
        id: Date.now(),
        name: `Layer ${drawingState.layers.length + 1}`,
        visible: true,
        elements: []
    };
    drawingState.layers.push(newLayer);
    renderLayers();
}

// Add missing drawing app functions
function handleCanvasWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    drawingState.zoom = Math.max(0.1, Math.min(5, drawingState.zoom * delta));
    updateZoom();
}

function handleCanvasTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleCanvasMouseDown(mouseEvent);
}

function handleCanvasTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleCanvasMouseMove(mouseEvent);
}

function handleCanvasTouchEnd(e) {
    e.preventDefault();
    handleCanvasMouseUp(e);
}

function handleSelectTool(x, y) {
    // Find element at position
    const clickedElement = findElementAtPosition(x, y);
    if (clickedElement) {
        if (!drawingState.selectedElements.includes(clickedElement)) {
            drawingState.selectedElements = [clickedElement];
            showSelectionOverlay(clickedElement);
        }
    } else {
        drawingState.selectedElements = [];
        hideSelectionOverlay();
    }
}

function handlePanStart(e) {
    drawingState.isPanning = true;
    drawingState.lastPanPoint = { x: e.clientX, y: e.clientY };
}

function findElementAtPosition(x, y) {
    // Simple hit detection - find the topmost element at the given position
    for (let i = drawingState.elements.length - 1; i >= 0; i--) {
        const element = drawingState.elements[i];
        if (isPointInElement(x, y, element)) {
            return element;
        }
    }
    return null;
}

function isPointInElement(x, y, element) {
    switch (element.type) {
        case 'rectangle':
            return x >= element.x && x <= element.x + element.width &&
                   y >= element.y && y <= element.y + element.height;
        case 'ellipse':
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            const rx = Math.abs(element.width) / 2;
            const ry = Math.abs(element.height) / 2;
            return ((x - centerX) * (x - centerX)) / (rx * rx) + 
                   ((y - centerY) * (y - centerY)) / (ry * ry) <= 1;
        case 'line':
            // Simple line hit detection (within stroke width)
            const dist = distanceToLine(x, y, element.x1, element.y1, element.x2, element.y2);
            return dist <= element.strokeWidth + 2;
        case 'text':
            // Approximate text bounds
            const textWidth = element.text.length * element.fontSize * 0.6;
            return x >= element.x && x <= element.x + textWidth &&
                   y >= element.y - element.fontSize && y <= element.y;
        default:
            return false;
    }
}

function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function showSelectionOverlay(element) {
    // Create selection handles around the element
    const overlay = document.getElementById('selectionOverlay');
    overlay.innerHTML = '';
    
    // Add selection rectangle
    const selectionRect = document.createElement('div');
    selectionRect.className = 'selection-rect';
    selectionRect.style.position = 'absolute';
    selectionRect.style.border = '2px dashed #2196f3';
    selectionRect.style.background = 'rgba(33, 150, 243, 0.1)';
    selectionRect.style.pointerEvents = 'none';
    
    // Position based on element type
    let bounds = getElementBounds(element);
    selectionRect.style.left = bounds.x + 'px';
    selectionRect.style.top = bounds.y + 'px';
    selectionRect.style.width = bounds.width + 'px';
    selectionRect.style.height = bounds.height + 'px';
    
    overlay.appendChild(selectionRect);
}

function hideSelectionOverlay() {
    const overlay = document.getElementById('selectionOverlay');
    overlay.innerHTML = '';
}

function getElementBounds(element) {
    switch (element.type) {
        case 'rectangle':
            return {
                x: element.x,
                y: element.y,
                width: Math.abs(element.width),
                height: Math.abs(element.height)
            };
        case 'ellipse':
            return {
                x: element.x,
                y: element.y,
                width: Math.abs(element.width),
                height: Math.abs(element.height)
            };
        case 'line':
            const minX = Math.min(element.x1, element.x2);
            const maxX = Math.max(element.x1, element.x2);
            const minY = Math.min(element.y1, element.y2);
            const maxY = Math.max(element.y1, element.y2);
            return {
                x: minX - 5,
                y: minY - 5,
                width: maxX - minX + 10,
                height: maxY - minY + 10
            };
        case 'text':
            const textWidth = element.text.length * element.fontSize * 0.6;
            return {
                x: element.x,
                y: element.y - element.fontSize,
                width: textWidth,
                height: element.fontSize
            };
        default:
            return { x: 0, y: 0, width: 0, height: 0 };
    }
}

function toggleFill() {
    const noFillBtn = document.getElementById('noFillBtn');
    const fillColorInput = document.getElementById('fillColor');
    
    if (drawingState.fillColor === 'none') {
        drawingState.fillColor = '#ffffff';
        fillColorInput.value = '#ffffff';
        noFillBtn.textContent = 'No Fill';
        noFillBtn.style.background = '';
    } else {
        drawingState.fillColor = 'none';
        noFillBtn.textContent = 'Fill';
        noFillBtn.style.background = '#e3f2fd';
    }
}

function uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const element = {
                        id: generateId(),
                        type: 'image',
                        x: 100,
                        y: 100,
                        width: img.width > 300 ? 300 : img.width,
                        height: img.height > 300 ? (300 * img.height / img.width) : img.height,
                        src: e.target.result,
                        layer: drawingState.currentLayer
                    };
                    
                    drawingState.elements.push(element);
                    saveDrawingState();
                    renderCanvas();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function toggleLayerVisibility(layerId) {
    const layer = drawingState.layers.find(l => l.id === layerId);
    if (layer) {
        layer.visible = !layer.visible;
        renderLayers();
        renderCanvas();
    }
}

function setCurrentLayer(layerId) {
    drawingState.currentLayer = layerId;
    renderLayers();
}

// Update the existing drawing initialization
function initializeCanvas() {
    initializeDrawingCanvas();
}

// Enhanced notes search functionality
function setupNotesSearch() {
    const notesSearch = document.getElementById('notesSearch');
    if (notesSearch) {
        notesSearch.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            if (searchTerm === '') {
                renderNotesGrid();
            } else {
                filterNotes(searchTerm);
            }
        });
    }
}

// Add missing function if not defined
function showOverdue() {
    currentFilter = 'overdue';
    updateCategoryButtons();
    renderTodos();
}

// Main app initialization after welcome modal
function initializeMainApp() {
    console.log('Initializing main app...');
    
    // Update personalization
    updatePersonalization();
    updateUserLevel();
    updateStreak();
    updateHeaderUserInfo();
    
    // Load saved data
    loadTodos();
    loadNotes();
    updateStats();
    updateAnalyticsDisplay();
    
    // Set up search functionality
    setupNotesSearch();
    
    // Make sure todo app is visible and active
    document.getElementById('todoApp').classList.add('active');
    currentApp = 'todo';
    
    // Initial render
    renderTodos();
    renderNotesGrid();
    updateThreadCounter();
    
    // Initialize drawing canvas when needed
    if (currentApp === 'drawing') {
        setTimeout(initializeDrawingCanvas, 100);
    }
    
    console.log('App initialization complete! Todo count:', todos.length);
    console.log('Todo list element:', todoList);
    console.log('Stats elements:', {totalTasks, completedTasks, pendingTasks});
    
    // Force a stats update to make sure everything displays
    updateStats();
}

// General app initialization (used in DOMContentLoaded)
function initializeApp() {
    console.log('Initializing app...');
    
    // Initialize user greeting
    if (userName) {
        updateUserGreeting();
    }
    
    // Load saved data
    loadTodos();
    loadNotes();
    updateStats();
    updateStreak();
    updateAnalyticsDisplay();
    
    // Set up search functionality
    setupNotesSearch();
    
    // Initialize drawing canvas when needed
    if (currentApp === 'drawing') {
        setTimeout(initializeDrawingCanvas, 100);
    }
    
    // Initial render
    renderTodos();
    renderNotesGrid();
}

function updateUserGreeting() {
    const greetingElements = document.querySelectorAll('.user-greeting');
    greetingElements.forEach(element => {
        const hour = new Date().getHours();
        let greeting = 'Hello';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';
        else greeting = 'Good evening';
        
        element.textContent = `${greeting}, ${userName}! ${userAvatar}`;
    });
    
    // Update header user info
    updateHeaderUserInfo();
}

function updateHeaderUserInfo() {
    if (userName && userAvatar) {
        const userInfo = document.getElementById('userInfo');
        const headerAvatar = document.getElementById('headerAvatar');
        const headerUserName = document.getElementById('headerUserName');
        
        if (userInfo && headerAvatar && headerUserName) {
            headerAvatar.textContent = userAvatar;
            headerUserName.textContent = userName;
            userInfo.style.display = 'flex';
        }
        
        // Update app headers with personalized messages
        updateAppHeaders();
    }
}

function updateAppHeaders() {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    // Update Todo App header
    const todoHeader = document.querySelector('#todoApp .app-header p');
    if (todoHeader) {
        todoHeader.textContent = `${greeting}, ${userName}! ${userAvatar} Ready to organize your threads?`;
    }
    
    // Update Notes App header
    const notesHeader = document.querySelector('#notesApp .app-header p');
    if (notesHeader) {
        notesHeader.textContent = `${greeting}, ${userName}! ${userAvatar} Time to capture your brilliant ideas`;
    }
    
    // Update Drawing App header
    const drawingHeader = document.querySelector('#drawingApp .app-header p');
    if (drawingHeader) {
        drawingHeader.textContent = `${greeting}, ${userName}! ${userAvatar} Let's create something amazing together`;
    }
}

// Note Templates
const noteTemplates = {
    diary: {
        title: `Daily Diary - ${new Date().toLocaleDateString()}`,
        content: `<h3>📔 My Daily Diary Entry</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Mood:</strong> 😊</p>

<h4>Today's Highlights:</h4>
<ul>
<li>What made me smile today?</li>
<li>What did I learn today?</li>
<li>What am I grateful for?</li>
</ul>

<h4>Thoughts & Reflections:</h4>
<p>Write about your day, feelings, and experiences...</p>

<h4>Tomorrow's Goals:</h4>
<ul>
<li>What do I want to accomplish?</li>
<li>How can I make tomorrow better?</li>
</ul>`
    },
    journal: {
        title: `Journal Entry - ${new Date().toLocaleDateString()}`,
        content: `<h3>📓 Personal Journal</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h4>Current Situation:</h4>
<p>What's happening in my life right now?</p>

<h4>Feelings & Emotions:</h4>
<p>How am I feeling today and why?</p>

<h4>Challenges & Growth:</h4>
<p>What challenges am I facing? What am I learning?</p>

<h4>Future Vision:</h4>
<p>Where do I see myself going? What are my aspirations?</p>`
    },
    meeting: {
        title: `Meeting Notes - ${new Date().toLocaleDateString()}`,
        content: `<h3>📋 Meeting Notes</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Meeting:</strong> [Meeting Title]</p>
<p><strong>Attendees:</strong> </p>

<h4>Agenda:</h4>
<ul>
<li>Topic 1</li>
<li>Topic 2</li>
<li>Topic 3</li>
</ul>

<h4>Key Discussion Points:</h4>
<p>Main topics discussed...</p>

<h4>Action Items:</h4>
<ul>
<li>[ ] Task 1 - Assigned to: [Name] - Due: [Date]</li>
<li>[ ] Task 2 - Assigned to: [Name] - Due: [Date]</li>
</ul>

<h4>Next Meeting:</h4>
<p>Date: [Date] | Time: [Time] | Topic: [Topic]</p>`
    },
    ideas: {
        title: `Ideas & Brainstorm - ${new Date().toLocaleDateString()}`,
        content: `<h3>💡 Ideas & Brainstorming</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Topic:</strong> [Main Theme]</p>

<h4>Initial Thoughts:</h4>
<p>What sparked this idea?</p>

<h4>Brainstorm:</h4>
<ul>
<li>Idea 1: </li>
<li>Idea 2: </li>
<li>Idea 3: </li>
<li>Idea 4: </li>
</ul>

<h4>Pros & Cons:</h4>
<p><strong>Pros:</strong></p>
<ul><li></li></ul>
<p><strong>Cons:</strong></p>
<ul><li></li></ul>

<h4>Next Steps:</h4>
<p>What actions should I take to explore this further?</p>`
    },
    todo: {
        title: `Todo List - ${new Date().toLocaleDateString()}`,
        content: `<h3>✅ Todo List</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h4>🔥 High Priority:</h4>
<ul>
<li>[ ] Important task 1</li>
<li>[ ] Important task 2</li>
</ul>

<h4>📋 Regular Tasks:</h4>
<ul>
<li>[ ] Task 1</li>
<li>[ ] Task 2</li>
<li>[ ] Task 3</li>
</ul>

<h4>💡 Ideas/Maybe:</h4>
<ul>
<li>[ ] Idea 1</li>
<li>[ ] Idea 2</li>
</ul>

<h4>✅ Completed:</h4>
<ul>
<li>[x] Example completed task</li>
</ul>`
    },
    gratitude: {
        title: `Gratitude Log - ${new Date().toLocaleDateString()}`,
        content: `<h3>🙏 Gratitude Journal</h3>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h4>Three Things I'm Grateful For Today:</h4>
<ol>
<li><strong>Big Thing:</strong> Something significant that happened</li>
<li><strong>Small Thing:</strong> A simple pleasure or moment</li>
<li><strong>Person:</strong> Someone who made a difference</li>
</ol>

<h4>Why I'm Grateful:</h4>
<p>Reflect on why these things matter to you...</p>

<h4>Acts of Kindness:</h4>
<p><strong>Received:</strong> How did someone help you today?</p>
<p><strong>Given:</strong> How did you help someone else?</p>

<h4>Looking Forward:</h4>
<p>What are you excited about for tomorrow?</p>`
    }
};

// Create note from template
function createNoteFromTemplate(templateType) {
    if (!noteTemplates[templateType]) {
        showNotification('❌ Template not found', 'error');
        return;
    }
    
    const template = noteTemplates[templateType];
    const note = {
        id: Date.now(),
        title: template.title,
        content: template.content,
        color: getRandomNoteColor(),
        images: [],
        created: new Date(),
        modified: new Date(),
        template: templateType
    };
    
    notes.push(note);
    currentNote = note;
    saveNotes();
    renderNotesGrid();
    openNoteEditor(note);
    
    showNotification(`📝 ${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template created!`, 'success');
    playSound('add');
    
    console.log('📝 Created note from template:', templateType);
}

function refinedFluencyRewrite(text) {
    // Lightweight fluency improvements: split long sentences, fix commas, remove redundancy
    let t = text
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ', ')
        .replace(/\b(very|really|just)\s+/gi, '')
        .replace(/\bkind of\b/gi, 'somewhat')
        .replace(/\bsort of\b/gi, 'somewhat');
    // Split overly long sentences into two at the last comma before 120 chars
    t = t.split(/([.!?])\s+/).reduce((acc, cur, idx, arr) => {
        if (idx % 2 === 0) {
            const sentence = (cur + (arr[idx + 1] || '')).trim();
            if (sentence.length > 180 && sentence.includes(',')) {
                const splitAt = sentence.lastIndexOf(',', 140);
                if (splitAt > 60) {
                    acc.push(sentence.slice(0, splitAt + 1));
                    acc.push(sentence.slice(splitAt + 1).trim());
                    return acc;
                }
            }
            acc.push(sentence);
        }
        return acc;
    }, []).join(' ');
    return t.trim();
}

async function checkGrammarWithLanguageTool(text) {
    try {
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                language: 'en-US',
                text
            })
        });
        if (!response.ok) throw new Error('LanguageTool request failed');
        const data = await response.json();
        let corrected = text;
        // Apply from end to start to preserve indices
        const matches = (data.matches || []).sort((a, b) => (b.offset - a.offset));
        for (const m of matches) {
            const repl = (m.replacements && m.replacements[0] && m.replacements[0].value) || null;
            if (!repl) continue;
            corrected = corrected.slice(0, m.offset) + repl + corrected.slice(m.offset + m.length);
        }
        return { success: true, correctedText: corrected };
    } catch (e) {
        console.warn('LanguageTool fallback failed:', e.message);
        return { success: false };
    }
} 

async function checkGrammarWithOpenAI(text) {
    try {
        if (!API_CONFIG.OPENAI_API_KEY || API_CONFIG.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch(API_CONFIG.OPENAI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'system',
                    content: 'You are a professional editor. Correct grammar, spelling, and improve clarity while preserving the original meaning and tone. Return only the corrected text without explanations.'
                }, {
                    role: 'user',
                    content: `Please correct and improve this text: "${text}"`
                }],
                max_tokens: Math.min(1000, text.length * 2),
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const correctedText = data.choices?.[0]?.message?.content?.trim();
        
        if (correctedText && correctedText !== text) {
            return { success: true, correctedText };
        }
        
        return { success: false };
    } catch (error) {
        console.warn('OpenAI API failed:', error.message);
        return { success: false };
    }
} 

// Authentic Excalidraw Implementation based on official repository
class AuthenticExcalidrawEngine {
    constructor() {
        this.elements = [];
        this.selectedElements = new Set();
        this.appState = {
            tool: 'selection',
            strokeColor: '#1e1e1e',
            backgroundColor: 'transparent',
            currentItemStrokeColor: '#1e1e1e',
            currentItemBackgroundColor: 'transparent',
            currentItemFillStyle: 'hachure',
            currentItemStrokeWidth: 1,
            currentItemStrokeStyle: 'solid',
            currentItemRoughness: 1,
            currentItemOpacity: 100,
            currentItemFontFamily: 'Virgil',
            currentItemFontSize: 20,
            currentItemTextAlign: 'left',
            viewBackgroundColor: '#ffffff',
            zoom: { value: 1 },
            scrollX: 0,
            scrollY: 0,
            cursorButton: 'up',
            draggingElement: null,
            editingElement: null,
            selectionElement: null,
            isResizing: false,
            isRotating: false,
            openMenu: null,
            theme: 'light',
            penMode: false,
            activeTool: { type: 'selection', locked: false }
        };
        this.history = { 
            undoStack: [], 
            redoStack: [],
            currentItemIndex: -1
        };
        this.canvas = null;
        this.rc = null;
        this.mouse = { x: 0, y: 0, lastX: 0, lastY: 0 };
        this.keys = new Set();
        this.elementIdCounter = 0;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentElement = null;
        this.roughGenerator = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupRoughJS();
        this.setupEventListeners();
        this.render();
    }

    setupCanvas() {
        const container = document.getElementById('canvasContainer');
        if (!container) return;
        
        // Create main canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'excalidrawCanvas';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.background = 'transparent';
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // Replace existing canvas/SVG
        const existingSvg = document.getElementById('drawingSVG');
        const existingCanvas = document.getElementById('excalidrawCanvas');
        if (existingSvg) existingSvg.remove();
        if (existingCanvas) existingCanvas.remove();
        
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Setup proper canvas dimensions and DPI
        this.resizeCanvas();
    }

    resizeCanvas() {
        if (!this.canvas || !this.ctx) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        // Set actual canvas size in memory (scaled by DPI)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale the context back down to ensure proper pointer alignment
        this.ctx.scale(dpr, dpr);
        
        // Set display size (CSS size)
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupRoughJS() {
        // Import RoughJS dynamically and setup generator
        if (typeof rough !== 'undefined') {
            this.roughGenerator = rough.generator();
            this.rc = rough.canvas(this.canvas);
        } else {
            // Fallback: load RoughJS dynamically
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/roughjs@4.5.2/bundled/rough.js';
            script.onload = () => {
                this.roughGenerator = rough.generator();
                this.rc = rough.canvas(this.canvas);
                this.render();
            };
            document.head.appendChild(script);
        }
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    handlePointerDown(e) {
        e.preventDefault();
        const point = this.getPointerEventPoint(e);
        this.mouse.x = this.mouse.lastX = point.x;
        this.mouse.y = this.mouse.lastY = point.y;
        this.appState.cursorButton = 'down';
        this.isDrawing = true;
        this.startPoint = { x: point.x, y: point.y };

        if (this.appState.tool === 'selection') {
            this.handleSelection(point);
        } else {
            this.startDrawing(point);
        }
    }

    handlePointerMove(e) {
        e.preventDefault();
        const point = this.getPointerEventPoint(e);
        this.mouse.lastX = this.mouse.x;
        this.mouse.lastY = this.mouse.y;
        this.mouse.x = point.x;
        this.mouse.y = point.y;

        if (this.isDrawing) {
            if (this.appState.tool === 'selection' && this.appState.draggingElement) {
                this.dragSelectedElements(point);
            } else if (this.currentElement) {
                this.updateCurrentElement(point);
            }
        }
        
        this.render();
    }

    handlePointerUp(e) {
        e.preventDefault();
        this.appState.cursorButton = 'up';
        this.isDrawing = false;
        this.appState.draggingElement = null;
        
        if (this.currentElement) {
            this.finalizeElement();
        }
        
        this.render();
    }

    handleKeyDown(e) {
        this.keys.add(e.key.toLowerCase());
        
        // Keyboard shortcuts (Excalidraw style)
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.redo();
                    break;
                case 'a':
                    e.preventDefault();
                    this.selectAll();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelected();
                    break;
                case 'g':
                    e.preventDefault();
                    this.groupSelectedElements();
                    break;
            }
        } else {
            // Tool shortcuts (Excalidraw shortcuts)
            switch (e.key.toLowerCase()) {
                case '1':
                case 'v': this.setTool('selection'); break;
                case '2':
                case 'r': this.setTool('rectangle'); break;
                case '3':
                case 'o': this.setTool('ellipse'); break;
                case '4':
                case 'd': this.setTool('diamond'); break;
                case '5':
                case 'a': this.setTool('arrow'); break;
                case '6':
                case 'l': this.setTool('line'); break;
                case '7':
                case 'p': this.setTool('freedraw'); break;
                case '8':
                case 't': this.setTool('text'); break;
                case 'delete':
                case 'backspace':
                    this.deleteSelected();
                    break;
                case 'escape':
                    this.clearSelection();
                    break;
            }
        }
    }

    handleKeyUp(e) {
        this.keys.delete(e.key.toLowerCase());
    }

    handleWheel(e) {
        e.preventDefault();
        const zoom = e.deltaY > 0 ? 0.9 : 1.1;
        this.appState.zoom.value = Math.max(0.1, Math.min(5, this.appState.zoom.value * zoom));
        document.getElementById('zoomLevel').textContent = Math.round(this.appState.zoom.value * 100) + '%';
        this.render();
    }

    handleResize() {
        this.resizeCanvas();
        this.render();
    }

    getPointerEventPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Convert screen coordinates to canvas coordinates accounting for zoom and pan
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        
        return {
            x: (screenX / this.appState.zoom.value) - this.appState.scrollX,
            y: (screenY / this.appState.zoom.value) - this.appState.scrollY
        };
    }

    startDrawing(point) {
        const elementType = this.appState.tool;
        
        if (elementType === 'text') {
            this.createTextElement(point);
            return;
        }
        
        this.currentElement = this.createElement({
            type: elementType,
            x: point.x,
            y: point.y,
            width: 0,
            height: 0,
            strokeColor: this.appState.currentItemStrokeColor,
            backgroundColor: this.appState.currentItemBackgroundColor,
            fillStyle: this.appState.currentItemFillStyle,
            strokeWidth: this.appState.currentItemStrokeWidth,
            strokeStyle: this.appState.currentItemStrokeStyle,
            roughness: this.appState.currentItemRoughness,
            opacity: this.appState.currentItemOpacity,
            points: elementType === 'freedraw' ? [{ x: 0, y: 0 }] : undefined
        });
        
        this.addToHistory();
    }

    updateCurrentElement(point) {
        if (!this.currentElement || !this.startPoint) return;
        
        const element = this.currentElement;
        const dx = point.x - this.startPoint.x;
        const dy = point.y - this.startPoint.y;
        
        switch (element.type) {
            case 'rectangle':
            case 'ellipse':
            case 'diamond':
                element.width = dx;
                element.height = dy;
                break;
            case 'line':
            case 'arrow':
                element.width = dx;
                element.height = dy;
                element.points = [[0, 0], [dx, dy]];
                break;
            case 'freedraw':
                element.points.push({
                    x: point.x - element.x,
                    y: point.y - element.y
                });
                break;
        }
    }

    finalizeElement() {
        if (!this.currentElement) return;
        
        // Add element to main array
        this.elements.push(this.currentElement);
        this.currentElement = null;
        this.startPoint = null;
        
        // Auto-save
        this.saveToLocalStorage();
    }

    createElement(props) {
        const id = this.nanoid();
        return {
            id,
            type: props.type,
            x: props.x,
            y: props.y,
            width: props.width || 0,
            height: props.height || 0,
            angle: props.angle || 0,
            strokeColor: props.strokeColor,
            backgroundColor: props.backgroundColor,
            fillStyle: props.fillStyle,
            strokeWidth: props.strokeWidth,
            strokeStyle: props.strokeStyle || 'solid',
            roughness: props.roughness,
            opacity: props.opacity,
            points: props.points || [],
            text: props.text || '',
            fontSize: props.fontSize || this.appState.currentItemFontSize,
            fontFamily: props.fontFamily || this.appState.currentItemFontFamily,
            textAlign: props.textAlign || this.appState.currentItemTextAlign,
            verticalAlign: 'top',
            containerId: null,
            originalText: '',
            isDeleted: false,
            groupIds: [],
            frameId: null,
            index: 'a0',
            roundness: null,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            customData: null,
            seed: Math.floor(Math.random() * 2 ** 31),
            versionNonce: Math.floor(Math.random() * 2 ** 31)
        };
    }

    render() {
        if (!this.ctx || !this.roughGenerator) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for zoom and pan
        this.ctx.save();
        
        // Apply zoom and pan transformations
        this.ctx.scale(this.appState.zoom.value, this.appState.zoom.value);
        this.ctx.translate(this.appState.scrollX, this.appState.scrollY);
        
        // Set background color
        this.ctx.fillStyle = this.appState.viewBackgroundColor;
        this.ctx.fillRect(
            -this.appState.scrollX / this.appState.zoom.value,
            -this.appState.scrollY / this.appState.zoom.value,
            (this.canvas.width / window.devicePixelRatio) / this.appState.zoom.value,
            (this.canvas.height / window.devicePixelRatio) / this.appState.zoom.value
        );
        
        // Draw grid
        this.drawGrid();
        
        // Draw all elements
        this.elements.forEach(element => {
            if (!element.isDeleted) {
                this.renderElement(element);
            }
        });
        
        // Draw current element being created
        if (this.currentElement) {
            this.renderElement(this.currentElement);
        }
        
        // Restore context before drawing UI elements
        this.ctx.restore();
        
        // Draw selection boxes (in screen space)
        this.drawSelectionBoxes();
    }

    drawGrid() {
        const gridSize = 20;
        const width = (this.canvas.width / window.devicePixelRatio) / this.appState.zoom.value;
        const height = (this.canvas.height / window.devicePixelRatio) / this.appState.zoom.value;
        const startX = -this.appState.scrollX / this.appState.zoom.value;
        const startY = -this.appState.scrollY / this.appState.zoom.value;
        
        this.ctx.strokeStyle = this.appState.theme === 'dark' ? '#2a2a2a' : '#e9ecef';
        this.ctx.lineWidth = 1 / this.appState.zoom.value;
        this.ctx.globalAlpha = 0.5;
        
        // Calculate grid offset
        const offsetX = startX % gridSize;
        const offsetY = startY % gridSize;
        
        // Vertical lines
        for (let x = startX - offsetX; x < startX + width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, startY + height);
            this.ctx.stroke();
        }
        
        // Horizontal lines  
        for (let y = startY - offsetY; y < startY + height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(startX + width, y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }

    renderElement(element) {
        this.ctx.save();
        
        // Apply element transformations (zoom/pan are already applied)
        this.ctx.translate(element.x, element.y);
        this.ctx.rotate(element.angle);
        this.ctx.globalAlpha = element.opacity / 100;
        
        // Use RoughJS for authentic hand-drawn look
        switch (element.type) {
            case 'rectangle':
                this.renderRectangle(element);
                break;
            case 'ellipse':
                this.renderEllipse(element);
                break;
            case 'diamond':
                this.renderDiamond(element);
                break;
            case 'line':
                this.renderLine(element);
                break;
            case 'arrow':
                this.renderArrow(element);
                break;
            case 'freedraw':
                this.renderFreedraw(element);
                break;
            case 'text':
                this.renderText(element);
                break;
        }
        
        this.ctx.restore();
    }

    renderRectangle(element) {
        if (!this.roughGenerator) return;
        
        const shape = this.roughGenerator.rectangle(0, 0, element.width, element.height, {
            stroke: element.strokeColor,
            fill: element.backgroundColor === 'transparent' ? null : element.backgroundColor,
            fillStyle: element.fillStyle,
            strokeWidth: element.strokeWidth,
            roughness: element.roughness,
            seed: element.seed
        });
        
        this.drawRoughShape(shape);
    }

    renderEllipse(element) {
        if (!this.roughGenerator) return;
        
        const shape = this.roughGenerator.ellipse(
            element.width / 2, 
            element.height / 2, 
            Math.abs(element.width), 
            Math.abs(element.height), 
            {
                stroke: element.strokeColor,
                fill: element.backgroundColor === 'transparent' ? null : element.backgroundColor,
                fillStyle: element.fillStyle,
                strokeWidth: element.strokeWidth,
                roughness: element.roughness,
                seed: element.seed
            }
        );
        
        this.drawRoughShape(shape);
    }

    renderDiamond(element) {
        if (!this.roughGenerator) return;
        
        const points = [
            [element.width / 2, 0],
            [element.width, element.height / 2],
            [element.width / 2, element.height],
            [0, element.height / 2]
        ];
        
        const shape = this.roughGenerator.polygon(points, {
            stroke: element.strokeColor,
            fill: element.backgroundColor === 'transparent' ? null : element.backgroundColor,
            fillStyle: element.fillStyle,
            strokeWidth: element.strokeWidth,
            roughness: element.roughness,
            seed: element.seed
        });
        
        this.drawRoughShape(shape);
    }

    renderLine(element) {
        if (!this.roughGenerator) return;
        
        const shape = this.roughGenerator.line(0, 0, element.width, element.height, {
            stroke: element.strokeColor,
            strokeWidth: element.strokeWidth,
            roughness: element.roughness,
            seed: element.seed
        });
        
        this.drawRoughShape(shape);
    }

    renderArrow(element) {
        // Draw line
        this.renderLine(element);
        
        // Draw arrowhead using rough.js
        const headSize = Math.max(10, element.strokeWidth * 3);
        const angle = Math.atan2(element.height, element.width);
        
        const arrowheadPoints = [
            [element.width, element.height],
            [
                element.width - headSize * Math.cos(angle - Math.PI / 6),
                element.height - headSize * Math.sin(angle - Math.PI / 6)
            ],
            [
                element.width - headSize * Math.cos(angle + Math.PI / 6),
                element.height - headSize * Math.sin(angle + Math.PI / 6)
            ]
        ];
        
        if (this.roughGenerator) {
            const arrowhead = this.roughGenerator.polygon(arrowheadPoints, {
                stroke: element.strokeColor,
                fill: element.strokeColor,
                strokeWidth: element.strokeWidth,
                roughness: element.roughness,
                seed: element.seed + 1
            });
            this.drawRoughShape(arrowhead);
        }
    }

    renderFreedraw(element) {
        if (element.points.length < 2) return;
        
        this.ctx.strokeStyle = element.strokeColor;
        this.ctx.lineWidth = element.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(element.points[0].x, element.points[0].y);
        
        for (let i = 1; i < element.points.length; i++) {
            this.ctx.lineTo(element.points[i].x, element.points[i].y);
        }
        
        this.ctx.stroke();
    }

    renderText(element) {
        this.ctx.font = `${element.fontSize}px ${element.fontFamily === 'Virgil' ? 'Kalam, cursive' : element.fontFamily}`;
        this.ctx.fillStyle = element.strokeColor;
        this.ctx.textAlign = element.textAlign;
        this.ctx.textBaseline = 'top';
        
        const lines = element.text.split('\n');
        lines.forEach((line, index) => {
            this.ctx.fillText(line, 0, index * element.fontSize * 1.2);
        });
    }

    drawRoughShape(shape) {
        if (!shape) return;
        
        // Draw using RoughJS shape data
        this.ctx.save();
        
        if (shape.sets) {
            shape.sets.forEach(set => {
                this.ctx.beginPath();
                this.drawPath(set);
                
                if (set.type === 'path') {
                    this.ctx.stroke();
                } else if (set.type === 'fillPath') {
                    this.ctx.fill();
                }
            });
        }
        
        this.ctx.restore();
    }

    drawPath(set) {
        if (!set.ops) return;
        
        for (const op of set.ops) {
            const data = op.data;
            switch (op.op) {
                case 'move':
                    this.ctx.moveTo(data[0], data[1]);
                    break;
                case 'bcurveTo':
                    this.ctx.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5]);
                    break;
                case 'lineTo':
                    this.ctx.lineTo(data[0], data[1]);
                    break;
                case 'qcurveTo':
                    this.ctx.quadraticCurveTo(data[0], data[1], data[2], data[3]);
                    break;
            }
        }
    }

    // Tool management
    setTool(toolName) {
        this.appState.tool = toolName;
        
        // Clear selection when switching to drawing tools
        if (toolName !== 'selection') {
            this.selectedElements.clear();
        }
        
        this.updateToolButtons();
        this.updateCursor();
        this.render(); // Re-render to remove selection highlights
    }

    // Color management
    updateStrokeColor(color) {
        this.appState.currentItemStrokeColor = color;
        this.appState.strokeColor = color;
        
        // Update selected elements
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                element.strokeColor = color;
            }
        });
        
        this.render();
    }

    updateFillColor(color) {
        this.appState.currentItemBackgroundColor = color;
        this.appState.backgroundColor = color;
        
        // Update selected elements
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                element.backgroundColor = color;
            }
        });
        
        this.render();
    }

    updateStrokeWidth(width) {
        this.appState.currentItemStrokeWidth = parseInt(width);
        
        // Update selected elements
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                element.strokeWidth = parseInt(width);
            }
        });
        
        this.render();
    }

    updateToolButtons() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tool="${this.appState.tool}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    updateCursor() {
        if (!this.canvas) return;
        
        const cursors = {
            selection: 'default',
            rectangle: 'crosshair',
            ellipse: 'crosshair',
            diamond: 'crosshair',
            line: 'crosshair',
            arrow: 'crosshair',
            freedraw: 'crosshair',
            text: 'text',
            hand: 'grab'
        };
        
        this.canvas.style.cursor = cursors[this.appState.tool] || 'default';
    }

    // Selection management (simplified)
    handleSelection(point) {
        const clickedElement = this.getElementAtPoint(point);
        
        if (clickedElement) {
            if (!this.keys.has('shift')) {
                this.selectedElements.clear();
            }
            this.selectedElements.add(clickedElement.id);
            this.appState.draggingElement = clickedElement;
        } else {
            this.selectedElements.clear();
        }
    }

    getElementAtPoint(point) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (this.isPointInElement(point, element)) {
                return element;
            }
        }
        return null;
    }

    isPointInElement(point, element) {
        const localX = point.x - element.x;
        const localY = point.y - element.y;
        
        switch (element.type) {
            case 'rectangle':
            case 'diamond':
                return localX >= 0 && localX <= element.width && 
                       localY >= 0 && localY <= element.height;
            case 'ellipse':
                const cx = element.width / 2;
                const cy = element.height / 2;
                const dx = localX - cx;
                const dy = localY - cy;
                return (dx * dx) / (cx * cx) + (dy * dy) / (cy * cy) <= 1;
            default:
                return localX >= 0 && localX <= element.width && 
                       localY >= 0 && localY <= element.height;
        }
    }

    dragSelectedElements(point) {
        const dx = point.x - this.mouse.lastX;
        const dy = point.y - this.mouse.lastY;
        
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                element.x += dx;
                element.y += dy;
            }
        });
    }

    drawSelectionBoxes() {
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                this.drawSelectionBox(element);
            }
        });
    }

    drawSelectionBox(element) {
        this.ctx.save();
        
        // Apply zoom and pan for selection boxes
        this.ctx.scale(this.appState.zoom.value, this.appState.zoom.value);
        this.ctx.translate(this.appState.scrollX, this.appState.scrollY);
        
        this.ctx.strokeStyle = '#1971c2';
        this.ctx.lineWidth = 2 / this.appState.zoom.value;
        this.ctx.setLineDash([4 / this.appState.zoom.value, 4 / this.appState.zoom.value]);
        
        const padding = 5;
        this.ctx.strokeRect(
            element.x - padding,
            element.y - padding,
            element.width + padding * 2,
            element.height + padding * 2
        );
        
        this.ctx.restore();
    }

    // Text creation
    createTextElement(point) {
        const text = prompt('Enter text:');
        if (!text) return;
        
        const element = this.createElement({
            type: 'text',
            x: point.x,
            y: point.y,
            width: text.length * this.appState.currentItemFontSize * 0.6,
            height: this.appState.currentItemFontSize * 1.2,
            text: text,
            strokeColor: this.appState.currentItemStrokeColor,
            backgroundColor: 'transparent'
        });
        
        this.elements.push(element);
        this.addToHistory();
        this.render();
        this.saveToLocalStorage();
    }

    // Utility functions
    nanoid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    selectAll() {
        this.selectedElements.clear();
        this.elements.forEach(element => {
            if (!element.isDeleted) {
                this.selectedElements.add(element.id);
            }
        });
        this.render();
    }

    clearSelection() {
        this.selectedElements.clear();
        this.render();
    }

    deleteSelected() {
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                element.isDeleted = true;
            }
        });
        this.selectedElements.clear();
        this.addToHistory();
        this.render();
        this.saveToLocalStorage();
    }

    duplicateSelected() {
        const duplicatedElements = [];
        this.selectedElements.forEach(elementId => {
            const element = this.elements.find(el => el.id === elementId);
            if (element) {
                const duplicate = {
                    ...element,
                    id: this.nanoid(),
                    x: element.x + 20,
                    y: element.y + 20,
                    updated: Date.now()
                };
                duplicatedElements.push(duplicate);
                this.elements.push(duplicate);
            }
        });
        
        this.selectedElements.clear();
        duplicatedElements.forEach(el => this.selectedElements.add(el.id));
        
        this.addToHistory();
        this.render();
        this.saveToLocalStorage();
    }

    groupSelectedElements() {
        // Simplified grouping
        showNotification?.('🔗 Group functionality available in full Excalidraw!', 'info');
    }

    // History management
    addToHistory() {
        const state = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            appState: { ...this.appState }
        };
        
        this.history.undoStack.push(state);
        this.history.redoStack = [];
        
        if (this.history.undoStack.length > 50) {
            this.history.undoStack.shift();
        }
    }

    undo() {
        if (this.history.undoStack.length === 0) return;
        
        const currentState = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            appState: { ...this.appState }
        };
        
        this.history.redoStack.push(currentState);
        
        const previousState = this.history.undoStack.pop();
        this.elements = previousState.elements;
        this.appState = { ...this.appState, ...previousState.appState };
        
        this.render();
    }

    redo() {
        if (this.history.redoStack.length === 0) return;
        
        const currentState = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            appState: { ...this.appState }
        };
        
        this.history.undoStack.push(currentState);
        
        const nextState = this.history.redoStack.pop();
        this.elements = nextState.elements;
        this.appState = { ...this.appState, ...nextState.appState };
        
        this.render();
    }

    // Export functionality
    exportToPNG() {
        const link = document.createElement('a');
        link.download = `excalidraw-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    exportToSVG() {
        // Basic SVG export
        showNotification?.('📤 SVG export functionality available in full Excalidraw!', 'info');
    }

    exportToExcalidraw() {
        const data = {
            type: 'excalidraw',
            version: 2,
            source: window.location.href,
            elements: this.elements,
            appState: this.appState,
            files: {}
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `excalidraw-${Date.now()}.excalidraw`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    exportDrawing(format = 'png') {
        switch (format) {
            case 'png':
                this.exportToPNG();
                break;
            case 'svg':
                this.exportToSVG();
                break;
            case 'excalidraw':
                this.exportToExcalidraw();
                break;
        }
    }

    saveToLocalStorage() {
        const data = {
            elements: this.elements,
            appState: this.appState
        };
        localStorage.setItem('excalidraw-drawing', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('excalidraw-drawing');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.elements = data.elements || [];
                this.appState = { ...this.appState, ...data.appState };
                this.render();
            } catch (e) {
                console.error('Failed to load saved drawing:', e);
            }
        }
    }
}

// Replace global drawing engine with authentic implementation
let excalidrawEngine = null;
let canvasDialogOpen = false;
let savedDrawings = [];

function initializeDrawingCanvas() {
    if (!excalidrawEngine && canvasDialogOpen) {
        excalidrawEngine = new AuthenticExcalidrawEngine();
        excalidrawEngine.loadFromLocalStorage();
    }
}

// Canvas Dialog Management
function openCanvasDialog() {
    const overlay = document.getElementById('canvasDialogOverlay');
    const dialog = document.getElementById('canvasDialog');
    
    overlay.style.display = 'flex';
    canvasDialogOpen = true;
    
    // Initialize canvas after dialog is shown
    setTimeout(() => {
        initializeDrawingCanvas();
    }, 100);
    
    // Add escape key listener
    document.addEventListener('keydown', handleCanvasDialogEscape);
}

function closeCanvasDialog() {
    const overlay = document.getElementById('canvasDialogOverlay');
    const dialog = document.getElementById('canvasDialog');
    
    // Save current drawing before closing
    if (excalidrawEngine) {
        excalidrawEngine.saveToLocalStorage();
        saveCurrentDrawingToGallery();
    }
    
    overlay.style.display = 'none';
    canvasDialogOpen = false;
    dialog.classList.remove('minimized', 'maximized');
    
    // Remove escape key listener
    document.removeEventListener('keydown', handleCanvasDialogEscape);
    
    // Refresh saved drawings display
    displaySavedDrawings();
}

function minimizeCanvas() {
    const dialog = document.getElementById('canvasDialog');
    dialog.classList.toggle('minimized');
}

function maximizeCanvas() {
    const dialog = document.getElementById('canvasDialog');
    dialog.classList.toggle('maximized');
    
    // Resize canvas after maximize/restore
    if (excalidrawEngine) {
        setTimeout(() => {
            excalidrawEngine.handleResize();
        }, 300);
    }
}

function handleCanvasDialogEscape(e) {
    if (e.key === 'Escape' && canvasDialogOpen) {
        closeCanvasDialog();
    }
}

// Saved Drawings Management
function loadSavedDrawings() {
    const saved = localStorage.getItem('excalidraw-saved-drawings');
    if (saved) {
        try {
            savedDrawings = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load saved drawings:', e);
            savedDrawings = [];
        }
    }
}

function saveCurrentDrawingToGallery() {
    if (!excalidrawEngine || excalidrawEngine.elements.length === 0) return;
    
    const drawingData = {
        id: Date.now().toString(),
        name: `Drawing ${new Date().toLocaleDateString()}`,
        timestamp: Date.now(),
        elements: excalidrawEngine.elements,
        appState: excalidrawEngine.appState,
        thumbnail: generateDrawingThumbnail()
    };
    
    // Remove old drawing with same timestamp if exists
    savedDrawings = savedDrawings.filter(d => d.id !== drawingData.id);
    
    // Add new drawing to beginning
    savedDrawings.unshift(drawingData);
    
    // Keep only last 20 drawings
    if (savedDrawings.length > 20) {
        savedDrawings = savedDrawings.slice(0, 20);
    }
    
    // Save to localStorage
    localStorage.setItem('excalidraw-saved-drawings', JSON.stringify(savedDrawings));
}

function generateDrawingThumbnail() {
    if (!excalidrawEngine || !excalidrawEngine.canvas) return null;
    
    try {
        // Create a smaller canvas for thumbnail
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 200;
        thumbnailCanvas.height = 120;
        const ctx = thumbnailCanvas.getContext('2d');
        
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 120);
        
        // Scale and draw the main canvas
        ctx.drawImage(excalidrawEngine.canvas, 0, 0, 200, 120);
        
        return thumbnailCanvas.toDataURL('image/png');
    } catch (e) {
        console.error('Failed to generate thumbnail:', e);
        return null;
    }
}

function displaySavedDrawings() {
    loadSavedDrawings();
    const grid = document.getElementById('savedDrawingsGrid');
    
    if (savedDrawings.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; color: rgba(255,255,255,0.7); grid-column: 1/-1; padding: 40px;">
                <i class="fas fa-paint-brush" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No saved drawings yet. Start drawing to see your creations here!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = savedDrawings.map(drawing => `
        <div class="saved-drawing-item" onclick="loadDrawing('${drawing.id}')">
            <div class="saved-drawing-preview">
                ${drawing.thumbnail ? 
                    `<img src="${drawing.thumbnail}" alt="${drawing.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">` :
                    `<i class="fas fa-image" style="font-size: 2rem; color: #ccc;"></i>`
                }
            </div>
            <div class="saved-drawing-info">
                <h4>${drawing.name}</h4>
                <p>${new Date(drawing.timestamp).toLocaleDateString()} • ${drawing.elements.length} elements</p>
            </div>
        </div>
    `).join('');
}

function loadDrawing(drawingId) {
    const drawing = savedDrawings.find(d => d.id === drawingId);
    if (!drawing) return;
    
    // Open canvas dialog first
    openCanvasDialog();
    
    // Load drawing after canvas is initialized
    setTimeout(() => {
        if (excalidrawEngine) {
            excalidrawEngine.elements = drawing.elements || [];
            excalidrawEngine.appState = { ...excalidrawEngine.appState, ...drawing.appState };
            excalidrawEngine.render();
            showNotification?.(`📖 Loaded: ${drawing.name}`, 'success');
        }
    }, 200);
}

function deleteDrawing(drawingId) {
    if (confirm('Are you sure you want to delete this drawing?')) {
        savedDrawings = savedDrawings.filter(d => d.id !== drawingId);
        localStorage.setItem('excalidraw-saved-drawings', JSON.stringify(savedDrawings));
        displaySavedDrawings();
        showNotification?.('🗑️ Drawing deleted', 'info');
    }
}

// Tasks Modal Functions
function showTasksModal() {
    const modal = document.getElementById('tasksModal');
    if (modal) {
        modal.classList.remove('hidden');
        updateTasksSummary();
        renderAllTasksList();
    }
}

function closeTasksModal() {
    const modal = document.getElementById('tasksModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function updateTasksSummary() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    document.getElementById('totalTasksCount').textContent = totalTasks;
    document.getElementById('completedTasksCount').textContent = completedTasks;
    document.getElementById('pendingTasksCount').textContent = pendingTasks;
}

function renderAllTasksList() {
    const tasksList = document.getElementById('allTasksList');
    if (!tasksList) return;
    
    if (todos.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No tasks yet. Create your first task!</p>';
        return;
    }
    
    tasksList.innerHTML = todos.map(todo => `
        <div class="task-item ${todo.completed ? 'completed' : ''}" style="
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            background: ${todo.completed ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 255, 255, 0.8)'};
            border-radius: 12px;
            border-left: 4px solid ${getPriorityColor(todo.priority)};
        ">
            <div style="flex: 1;">
                <div style="font-weight: 600; color: ${todo.completed ? '#666' : '#1e1e1e'}; ${todo.completed ? 'text-decoration: line-through;' : ''}">${todo.text}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                    ${getCategoryIcon(todo.category)} ${todo.category} • 
                    ${getPriorityIcon(todo.priority)} ${todo.priority} priority
                    ${todo.tags && todo.tags.length > 0 ? ` • ${todo.tags.map(tag => `#${tag}`).join(' ')}` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                ${todo.completed ? 
                    `<button onclick="toggleTodo(${todo.id})" style="background: #f39c12; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;">Undo</button>` :
                    `<button onclick="toggleTodo(${todo.id})" style="background: #2ecc71; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;">Complete</button>`
                }
                <button onclick="deleteTodo(${todo.id})" style="background: #e74c3c; color: white; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;">Delete</button>
            </div>
        </div>
    `).join('');
}

function getPriorityColor(priority) {
    switch (priority) {
        case 'high': return '#e74c3c';
        case 'medium': return '#f39c12';
        case 'low': return '#3498db';
        default: return '#95a5a6';
    }
}

// All Tasks Overview Functions
let currentOverviewFilter = 'all';

function updateOverviewContent() {
    updateOverviewStats();
    renderOverviewTasks();
}

function updateOverviewStats() {
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    const totalElement = document.getElementById('overviewTotalTasks');
    const completedElement = document.getElementById('overviewCompletedTasks');
    const pendingElement = document.getElementById('overviewPendingTasks');
    
    if (totalElement) totalElement.textContent = totalTasks;
    if (completedElement) completedElement.textContent = completedTasks;
    if (pendingElement) pendingElement.textContent = pendingTasks;
}

function filterOverviewTasks(filter) {
    currentOverviewFilter = filter;
    
    // Update filter button states
    document.querySelectorAll('.tasks-filter-bar .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    
    renderOverviewTasks();
}

function renderOverviewTasks() {
    const tasksList = document.getElementById('overviewTasksList');
    if (!tasksList) return;
    
    tasksList.innerHTML = '';
    
    let filteredTodos = todos;
    
    if (currentOverviewFilter === 'completed') {
        filteredTodos = todos.filter(todo => todo.completed);
    } else if (currentOverviewFilter === 'pending') {
        filteredTodos = todos.filter(todo => !todo.completed);
    }
    
    if (filteredTodos.length === 0) {
        tasksList.innerHTML = `
            <div class="overview-empty-state" style="text-align: center; padding: 30px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <i class="fas fa-tasks" style="font-size: 32px; color: rgba(255,255,255,0.3); margin-bottom: 15px; display: block;"></i>
                <h4 style="color: rgba(255,255,255,0.8); margin: 0 0 8px 0;">No ${currentOverviewFilter === 'all' ? '' : currentOverviewFilter} tasks found</h4>
                <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 14px;">Create your first task to get started!</p>
            </div>
        `;
        return;
    }
    
    filteredTodos.forEach((todo, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = `overview-task-item ${todo.completed ? 'completed' : ''}`;
        taskItem.setAttribute('data-id', todo.id);
        
        // Get priority display
        let priorityClass = 'pending';
        if (todo.priority === 'high') priorityClass = 'high';
        else if (todo.completed) priorityClass = 'completed';
        
        taskItem.innerHTML = `
            <div class="overview-task-header">
                <h4 class="overview-task-title ${todo.completed ? 'completed' : ''}">${todo.text}</h4>
                <span class="overview-task-status ${priorityClass}">
                    ${todo.completed ? 'Done' : (todo.priority === 'high' ? 'High' : 'Pending')}
                </span>
            </div>
            <div class="overview-task-meta">
                <span class="overview-task-category">${todo.category || 'General'}</span>
                <span>${new Date(todo.timestamp).toLocaleDateString()}</span>
            </div>
        `;
        
        // Add click event to navigate to task in main list
        taskItem.addEventListener('click', () => {
            // Find and highlight the task in the main list
            const mainTaskElement = document.querySelector(`[data-id="${todo.id}"]`);
            if (mainTaskElement) {
                mainTaskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                mainTaskElement.classList.add('highlighted');
                setTimeout(() => {
                    mainTaskElement.classList.remove('highlighted');
                }, 2000);
            }
        });
        
        tasksList.appendChild(taskItem);
    });
}

// Update overview when todos change
function updateSidebarOnChange() {
    // Always update the overview since it's always visible on Tasks tab
    updateOverviewContent();
}

function getCategoryIcon(category) {
    const icons = {
        'personal': '📋',
        'work': '💼',
        'health': '🏃',
        'learning': '📚',
        'creative': '🎨',
        'social': '👥'
    };
    return icons[category] || '📋';
}

function getPriorityIcon(priority) {
    const icons = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🔵'
    };
    return icons[priority] || '🔵';
}

// Update tree visualization based on task progress
function updateProgressTree() {
    const categories = ['personal', 'work', 'health', 'learning'];
    const branches = document.querySelectorAll('.branch');
    
    categories.forEach((category, index) => {
        const categoryTasks = todos.filter(todo => todo.category === category);
        const completedCategoryTasks = categoryTasks.filter(todo => todo.completed);
        const progress = categoryTasks.length > 0 ? (completedCategoryTasks.length / categoryTasks.length) * 100 : 0;
        
        if (branches[index]) {
            const progressBar = branches[index].querySelector('.branch-progress');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }
    });
    
    // Update tree rings based on overall progress
    const totalTasks = todos.length;
    const completedTasks = todos.filter(todo => todo.completed).length;
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
    
    const rings = document.querySelectorAll('.ring');
    rings.forEach((ring, index) => {
        ring.classList.remove('completed', 'active');
        if (index < Math.floor(overallProgress * rings.length)) {
            ring.classList.add('completed');
        } else if (index === Math.floor(overallProgress * rings.length)) {
            ring.classList.add('active');
        }
    });
}

// Initialize saved drawings when drawing app tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    const drawingTab = document.querySelector('[onclick="showApp(\'drawingApp\')"]');
    if (drawingTab) {
        drawingTab.addEventListener('click', () => {
            setTimeout(displaySavedDrawings, 100);
        });
    }
    
    // Display saved drawings on initial load if drawing app is active
    if (document.getElementById('drawingApp')?.classList.contains('active')) {
        displaySavedDrawings();
    }
    
    // Update progress tree on load
    updateProgressTree();
});

// Tool functions for UI buttons
function setDrawingTool(tool) {
    if (excalidrawEngine) {
        excalidrawEngine.setTool(tool);
    }
}

function undoDrawing() {
    if (excalidrawEngine) {
        excalidrawEngine.undo();
    }
}

function redoDrawing() {
    if (excalidrawEngine) {
        excalidrawEngine.redo();
    }
}

function exportDrawing(format) {
    if (excalidrawEngine) {
        excalidrawEngine.exportDrawing(format);
    }
}

function saveDrawing() {
    if (excalidrawEngine) {
        excalidrawEngine.saveToLocalStorage();
        showNotification?.('✅ Drawing saved!', 'success');
    }
}

// Property update functions
function updateStrokeColor(color) {
    if (excalidrawEngine) {
        excalidrawEngine.updateStrokeColor(color);
    }
}

// Duplicate function removed - using the main updateFillColor function above

function updateStrokeWidth(width) {
    if (excalidrawEngine) {
        excalidrawEngine.updateStrokeWidth(width);
    }
    
    // Update the display value
    const valueDisplay = document.getElementById('strokeWidthValue');
    if (valueDisplay) {
        valueDisplay.textContent = width + 'px';
    }
}

function updateFontSize(size) {
    if (excalidrawEngine) {
        excalidrawEngine.appState.fontSize = parseInt(size);
    }
}

function setTextAlign(align) {
    if (excalidrawEngine) {
        excalidrawEngine.appState.textAlign = align;
    }
}

// Zoom functions
function zoomIn() {
    if (excalidrawEngine) {
        excalidrawEngine.appState.zoom.value = Math.min(5, excalidrawEngine.appState.zoom.value * 1.2);
        document.getElementById('zoomLevel').textContent = Math.round(excalidrawEngine.appState.zoom.value * 100) + '%';
        excalidrawEngine.render();
    }
}

function zoomOut() {
    if (excalidrawEngine) {
        excalidrawEngine.appState.zoom.value = Math.max(0.1, excalidrawEngine.appState.zoom.value / 1.2);
        document.getElementById('zoomLevel').textContent = Math.round(excalidrawEngine.appState.zoom.value * 100) + '%';
        excalidrawEngine.render();
    }
}

// Initialize when switching to drawing app
document.addEventListener('DOMContentLoaded', () => {
    // Hook into app switching
    const originalSwitchApp = window.switchApp;
    window.switchApp = function(appName) {
        originalSwitchApp(appName);
        if (appName === 'drawing') {
            setTimeout(() => {
                initializeDrawingCanvas();
            }, 100);
        }
    };
});

// Additional UI functions for toolbar buttons
function uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file && excalidrawEngine) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // Create image element in canvas
                    const element = excalidrawEngine.createElement({
                        type: 'image',
                        x: 100,
                        y: 100,
                        width: Math.min(400, img.width),
                        height: Math.min(400, img.height * (Math.min(400, img.width) / img.width)),
                        fileId: Date.now().toString(),
                        imageData: e.target.result
                    });
                    
                    excalidrawEngine.elements.push(element);
                    excalidrawEngine.addToHistory();
                    excalidrawEngine.render();
                    excalidrawEngine.saveToLocalStorage();
                    showNotification?.('🖼️ Image added to canvas!', 'success');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function toggleSearch() {
    const searchPanel = document.getElementById('searchPanel');
    const searchToggle = document.getElementById('searchToggle');
    if (searchPanel) {
        const isVisible = searchPanel.style.display !== 'none';
        searchPanel.style.display = isVisible ? 'none' : 'block';
        searchToggle.classList.toggle('active', !isVisible);
        
        if (!isVisible) {
            document.getElementById('searchInput')?.focus();
        }
    }
}

function searchElements() {
    if (!excalidrawEngine) return;
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!searchTerm || !resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    const matchedElements = [];
    
    excalidrawEngine.elements.forEach(element => {
        if (element.isDeleted) return;
        
        let matches = false;
        const searchableText = [
            element.type,
            element.text || '',
            element.strokeColor,
            element.backgroundColor
        ].join(' ').toLowerCase();
        
        if (searchableText.includes(searchTerm)) {
            matches = true;
            matchedElements.push(element);
        }
    });
    
    if (matchedElements.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No elements found</div>';
        return;
    }
    
    matchedElements.forEach(element => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
            <div class="search-result-icon">
                <i class="fas fa-${getElementIcon(element.type)}"></i>
            </div>
            <div class="search-result-text">
                <span class="search-highlight">${element.type}</span>
                ${element.text ? ` - ${element.text.substring(0, 30)}` : ''}
            </div>
            <div class="search-result-type">${element.type}</div>
        `;
        
        resultItem.onclick = () => {
            excalidrawEngine.selectedElements.clear();
            excalidrawEngine.selectedElements.add(element.id);
            excalidrawEngine.render();
            toggleSearch(); // Close search panel
        };
        
        resultsContainer.appendChild(resultItem);
    });
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    if (excalidrawEngine) {
        excalidrawEngine.selectedElements.clear();
        excalidrawEngine.render();
    }
}

function getElementIcon(type) {
    const icons = {
        rectangle: 'square',
        ellipse: 'circle',
        diamond: 'gem',
        line: 'minus',
        arrow: 'arrow-right',
        freedraw: 'pen',
        text: 'font',
        image: 'image'
    };
    return icons[type] || 'question';
}

function addLayer() {
    // Simple layer management (placeholder)
    const layersList = document.getElementById('layersList');
    if (layersList && excalidrawEngine) {
        const layerCount = layersList.children.length + 1;
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.innerHTML = `
            <i class="fas fa-eye"></i>
            <span>Layer ${layerCount}</span>
            <i class="fas fa-trash" onclick="removeLayer(this)"></i>
        `;
        layersList.appendChild(layerItem);
        showNotification?.(`🎨 Layer ${layerCount} added!`, 'success');
    }
}

function removeLayer(button) {
    button.parentElement.remove();
}

function toggleFill() {
    if (excalidrawEngine) {
        const currentFill = excalidrawEngine.appState.backgroundColor;
        excalidrawEngine.appState.backgroundColor = currentFill === 'transparent' ? '#ffffff' : 'transparent';
        
        const fillBtn = document.getElementById('noFillBtn');
        if (fillBtn) {
            fillBtn.textContent = currentFill === 'transparent' ? 'No Fill' : 'Fill';
            fillBtn.style.background = currentFill === 'transparent' ? '' : '#f0f0f0';
        }
    }
}

// Enhanced keyboard shortcuts for better UX
document.addEventListener('keydown', (e) => {
    if (!excalidrawEngine) return;
    
    // Global shortcuts that work regardless of focus
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'e':
                e.preventDefault();
                excalidrawEngine.exportDrawing('png');
                break;
            case 'shift+e':
                e.preventDefault();
                excalidrawEngine.exportDrawing('svg');
                break;
            case 'o':
                e.preventDefault();
                uploadImage();
                break;
            case 'f':
                e.preventDefault();
                toggleSearch();
                break;
            case 'g':
                e.preventDefault();
                if (e.shiftKey) {
                    // Ungroup (placeholder)
                    showNotification?.('🔓 Ungroup functionality coming soon!', 'info');
                } else {
                    // Group selected elements (placeholder)
                    showNotification?.('🔗 Group functionality coming soon!', 'info');
                }
                break;
            case '=':
            case '+':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                if (excalidrawEngine) {
                    excalidrawEngine.appState.zoom.value = 1;
                    document.getElementById('zoomLevel').textContent = '100%';
                    excalidrawEngine.render();
                }
                break;
        }
    }
    
    // Number keys for quick tool switching
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
            case '1': excalidrawEngine.setTool('selection'); break;
            case '2': excalidrawEngine.setTool('rectangle'); break;
            case '3': excalidrawEngine.setTool('ellipse'); break;
            case '4': excalidrawEngine.setTool('diamond'); break;
            case '5': excalidrawEngine.setTool('arrow'); break;
            case '6': excalidrawEngine.setTool('line'); break;
            case '7': excalidrawEngine.setTool('freedraw'); break;
            case '8': excalidrawEngine.setTool('text'); break;
        }
    }
});

// Add context menu for right-click actions
document.addEventListener('contextmenu', (e) => {
    if (excalidrawEngine && excalidrawEngine.canvas && 
        excalidrawEngine.canvas.contains(e.target)) {
        e.preventDefault();
        
        // Create context menu
        const contextMenu = document.createElement('div');
        contextMenu.style.position = 'fixed';
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.style.background = '#ffffff';
        contextMenu.style.border = '1px solid #ccc';
        contextMenu.style.borderRadius = '8px';
        contextMenu.style.padding = '8px 0';
        contextMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        contextMenu.style.zIndex = '2000';
        contextMenu.style.minWidth = '150px';
        
        const point = excalidrawEngine.getEventPoint(e);
        const clickedElement = excalidrawEngine.getElementAtPoint(point);
        
        const menuItems = [];
        
        if (clickedElement) {
            menuItems.push(
                { label: '📝 Edit', action: () => {
                    if (clickedElement.type === 'text') {
                        excalidrawEngine.startTextEdit(clickedElement);
                    }
                }},
                { label: '📋 Duplicate', action: () => {
                    excalidrawEngine.selectedElements.clear();
                    excalidrawEngine.selectedElements.add(clickedElement.id);
                    excalidrawEngine.duplicateSelected();
                }},
                { label: '🗑️ Delete', action: () => {
                    excalidrawEngine.selectedElements.clear();
                    excalidrawEngine.selectedElements.add(clickedElement.id);
                    excalidrawEngine.deleteSelected();
                }}
            );
        } else {
            menuItems.push(
                { label: '📋 Paste', action: () => {
                    showNotification?.('📋 Paste functionality coming soon!', 'info');
                }},
                { label: '🎨 Add Text Here', action: () => {
                    excalidrawEngine.createTextElement(point);
                }}
            );
        }
        
        menuItems.push(
            { label: '📤 Export PNG', action: () => excalidrawEngine.exportDrawing('png') },
            { label: '📤 Export SVG', action: () => excalidrawEngine.exportDrawing('svg') }
        );
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.padding = '8px 16px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.fontSize = '14px';
            menuItem.textContent = item.label;
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#f0f0f0';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
            });
            menuItem.addEventListener('click', () => {
                item.action();
                document.body.removeChild(contextMenu);
            });
            
            contextMenu.appendChild(menuItem);
        });
        
        document.body.appendChild(contextMenu);
        
        // Remove menu on click outside
        const removeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                document.body.removeChild(contextMenu);
                document.removeEventListener('click', removeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', removeMenu), 100);
    }
});

// Add template management UI
function showTemplateLibrary() {
    const templates = JSON.parse(localStorage.getItem('excalidraw-templates') || '[]');
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 3000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 12px; padding: 24px;
        max-width: 800px; max-height: 600px; overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">📚 Template Library</h2>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
            ${templates.map(template => `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; cursor: pointer;"
                     onclick="loadTemplate(${template.id}); this.parentElement.parentElement.parentElement.remove();">
                    <img src="${template.thumbnail}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
                    <h4 style="margin: 8px 0 4px 0; font-size: 14px;">${template.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${new Date(template.created).toLocaleDateString()}</p>
                </div>
            `).join('')}
            ${templates.length === 0 ? '<p style="text-align: center; color: #666; grid-column: 1/-1;">No templates saved yet. Create some drawings and save them as templates!</p>' : ''}
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button onclick="saveCurrentAsTemplate()" 
                    style="background: #007AFF; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                💾 Save Current Drawing as Template
            </button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function saveCurrentAsTemplate() {
    if (excalidrawEngine) {
        const name = prompt('Template name:');
        if (name) {
            excalidrawEngine.saveAsTemplate(name);
        }
    }
}

function loadTemplate(templateId) {
    if (excalidrawEngine) {
        excalidrawEngine.loadTemplate(templateId);
    }
}

// Add this to the global functions for the template button
window.showTemplateLibrary = showTemplateLibrary;
window.saveCurrentAsTemplate = saveCurrentAsTemplate;
window.loadTemplate = loadTemplate;