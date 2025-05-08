// --- Global Variables & Configuration ---
const APP_NAME = 'MazeGame';
const DEBUG_MODE = true; // Set to false in production to reduce console noise
const MAX_LEADERBOARD_ENTRIES_DISPLAY = 10; // How many scores to show per category

// --- Streamlined Logger ---
const logger = {
    _log: function(level, ...args) {
        if (!DEBUG_MODE && level !== 'error' && level !== 'warn') {
            return;
        }
        const prefix = `[${APP_NAME}]`;
        switch(level) {
            case 'log': console.log(prefix, ...args); break;
            case 'info': console.info(prefix, ...args); break;
            case 'warn': console.warn(prefix, ...args); break;
            case 'error': console.error(prefix, ...args); break;
            case 'debug': if (DEBUG_MODE) console.debug(prefix, ...args); break;
            default: console.log(prefix, `(${level})`, ...args);
        }
    },
    log: function(...args) { this._log('log', ...args); },
    info: function(...args) { this._log('info', ...args); },
    warn: function(...args) { this._log('warn', ...args); },
    error: function(...args) { this._log('error', ...args); },
    debug: function(...args) { this._log('debug', ...args); }
};

// --- Existing Global Variables ---
let trophyImg; let backgroundMusic; let musicStarted = false; let isMuted = false;
let startTime = null; let timerInterval = null; let elapsedSeconds = 0; let gameWon = false;
let tileSize = 10; let maze = []; let player = { x: 1, y: 1 }; let goal = { x: 1, y: 1 };
let solutionPath = []; let playerTrailHistory = [];
const MAX_TRAIL_LENGTH = 16;
const TRAIL_MAX_ALPHA = 0.6; const TRAIL_MIN_ALPHA = 0.05;
let currentMazeDimension = 5; let allLeaderboardScores = []; // Will store ALL scores fetched
let unlockedAchievements = new Set();
let achievementState = { mazeCompletions: 0 };
let playerColor = "red";
let playerTrailColorRGB = "255, 0, 0";
let popupOverlayEl, popupContentEl, popupTimeEl, popupRankOverallEl, popupRankSizeEl, popupPromptInfoEl, closePopupBtnEl;
let popupDismissTimer = null;
let snakeColorSelectEl;
let lastCompletedRunInfo = null;


// --- UPDATED Achievement Definitions ---
const ACHIEVEMENTS_DEFINITIONS = {
    'first_steps': { name: 'First Steps', description: 'Complete your first maze.', check: (e, s) => s.mazeCompletions >= 1 },
    'medium_well_done': { name: 'Medium Well Done', description: 'Complete a Medium (5x5) maze.', check: (e, s) => e.dimension === 5 },
    'maze_master': { name: 'Maze Master', description: 'Complete a 7x7 or larger maze.', check: (e, s) => e.dimension >= 7 },
    'speed_demon': { name: 'Speed Demon', description: 'Complete a 5x5 maze in under 15 seconds.', check: (e, s) => e.dimension === 5 && e.time < 15 },
    'persistent_explorer': { name: 'Persistent Explorer', description: 'Complete 10 mazes.', check: (e, s) => s.mazeCompletions >= 10 },
    'quick_learner': { name: 'Quick Learner', description: 'Complete a Small (3x3) maze in under 5 seconds.', check: (e, s) => e.dimension === 3 && e.time < 5 },
    'labyrinth_conqueror': { name: 'Labyrinth Conqueror', description: 'Complete an Extra Large (10x10) maze.', check: (e, s) => e.dimension === 10 },
    'legendary_mapper': { name: 'Legendary Mapper', description: 'Complete the HUGE (100x100) maze!', check: (e, s) => e.dimension === 100 },
};

// --- DOM Element References ---
let canvas, ctx, newMazeBtn, solveMazeBtn, mazeSizeSelect, statusMessage,
    titleH2, instructionsP, timerDisplay, leaderboardList, leaderboardContainer, muteBtn, leaderboardFilterSelect,
    achievementsContainer, achievementsList, toastContainer;

// --- Utility & Core Functions ---
function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; };
function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
function setupAudio() { try { backgroundMusic = new Audio("static/background_music.m4a"); backgroundMusic.loop = true; backgroundMusic.volume = 0.3; logger.info("BG music object created."); } catch (e) { logger.error("Audio object creation error:", e); } }
function toggleMute() { if (!backgroundMusic) return; isMuted = !isMuted; backgroundMusic.muted = isMuted; if (muteBtn) muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute"; logger.info("Muted status:", isMuted); }
function tryStartMusic() { if (backgroundMusic && (!musicStarted || backgroundMusic.paused)) { logger.info("Attempting music play..."); backgroundMusic.play().then(() => { logger.info("BG music playing."); musicStarted = true; backgroundMusic.muted = isMuted; }).catch(error => { logger.warn("BG music play failed (often due to browser policy until user interaction):", error.message); if (!musicStarted) musicStarted = false; }); } else if (backgroundMusic && !backgroundMusic.paused) { backgroundMusic.muted = isMuted; } }
function playSound(soundFile, volume = 1.0) { try { const sound = new Audio(soundFile); sound.volume = volume; sound.play().catch(error => logger.error(`Sound play error ${soundFile}:`, error)); logger.debug(`Playing sound: ${soundFile}`); } catch(e) { logger.error(`Sound creation/play fail ${soundFile}:`, e); } }
function formatTime(totalSeconds) { if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) return "00:00.000"; const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`; }
function updateTimerDisplay() { if (startTime === null || gameWon || !timerDisplay) return; elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000); timerDisplay.textContent = formatTime(elapsedSeconds).split('.')[0]; }
function startTimer() { if (startTime === null && !gameWon) { logger.info("Starting timer..."); startTime = Date.now(); elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; if (timerInterval) clearInterval(timerInterval); updateTimerDisplay(); timerInterval = setInterval(updateTimerDisplay, 50); } }
function stopTimer() { if (timerInterval !== null) { logger.info("Stopping timer."); clearInterval(timerInterval); timerInterval = null; if (startTime) { elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000); logger.info(`Final time: ${elapsedSeconds}s`); if (timerDisplay) timerDisplay.textContent = formatTime(elapsedSeconds).split('.')[0]; } } else if (startTime === null) { elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; } }
function resetTimer() { logger.info("Resetting timer."); stopTimer(); startTime = null; elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; }
function preloadTrophyImage(){ trophyImg = new Image(); trophyImg.src = "static/winnertrophy.png"; trophyImg.onload = () => logger.info("Trophy image loaded!"); trophyImg.onerror = () => logger.error("Trophy image loading error."); }
function findStartPosition() { for (let y=0; y<maze.length; y++) for (let x=0; x<maze[y].length; x++) if (maze[y][x]===0) return {x,y}; logger.error("No start position found in maze!"); return {x:1,y:1}; }
function findGoalPosition() { if (!maze || !maze.length) return {x:1,y:1}; for(let y=maze.length-1; y>=0; y--) for(let x=maze[y].length-1; x>=0; x--) if(maze[y][x]===0) return {x,y}; logger.error("No goal position found in maze!"); return {x:Math.max(1,maze[0].length-2),y:Math.max(1,maze.length-2)}; }
function convertCssColorToRgbString(cssColor) { try { if (cssColor.startsWith('rgb')) { const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (match) return `${match[1]}, ${match[2]}, ${match[3]}`; } if (cssColor.startsWith('#')) { let hex = cssColor.slice(1); if (hex.length === 3) { hex = hex.split('').map(char => char + char).join(''); } if (hex.length === 6) { const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16); return `${r}, ${g}, ${b}`; } } const tempDiv = document.createElement('div'); tempDiv.style.color = cssColor; tempDiv.style.display = 'none'; document.body.appendChild(tempDiv); const computedColor = getComputedStyle(tempDiv).color; document.body.removeChild(tempDiv); const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (rgbMatch) { return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`; } } catch (e) { logger.error("Could not convert color:", cssColor, e); } logger.warn("Failed to convert CSS color to RGB, defaulting to red's RGB"); return "255, 0, 0"; }


// --- Leaderboard Functions ---
function displayLeaderboard(scoresToDisplay, currentFilter) {
    if (!leaderboardList) { logger.error("Leaderboard list element missing for display!"); return; }
    logger.debug(`Displaying ${scoresToDisplay.length} scores for filter: ${currentFilter}`);
    leaderboardList.innerHTML = ''; 

    if (!scoresToDisplay || scoresToDisplay.length === 0) {
        leaderboardList.innerHTML = `<li class="message">No scores yet for this ${currentFilter === 'all' ? 'leaderboard' : 'size'}!</li>`;
        return;
    }

    scoresToDisplay.forEach(score => {
        const li = document.createElement('li');
        const name = score?.name ? escapeHtml(String(score.name)) : 'Unknown';
        const time = (score?.time !== undefined) ? formatTime(Number(score.time)) : '--:--';
        const dimension = score?.dimension ?? '?';
        if (currentFilter === 'all') {
            li.textContent = `${name} - ${time} (${dimension}x${dimension})`;
        } else {
            li.textContent = `${name} - ${time}`;
        }
        leaderboardList.appendChild(li);
    });
}

function filterAndDisplayLeaderboard() {
    if (!leaderboardFilterSelect || !allLeaderboardScores) {
        logger.error("Cannot filter leaderboard: filter select or allLeaderboardScores data missing.");
        return;
    }
    const selectedDim = leaderboardFilterSelect.value;
    logger.info(`Filtering leaderboard for dimension: ${selectedDim}`);

    let filteredScores = [];
    if (selectedDim === 'all') {
        // For 'all', sort all scores by time.
        filteredScores = [...allLeaderboardScores].sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    } else {
        // For a specific dimension, filter then sort.
        filteredScores = allLeaderboardScores
            .filter(score => score.dimension == selectedDim)
            .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    }

    // Take only the top N (defined by MAX_LEADERBOARD_ENTRIES_DISPLAY) for display
    const scoresForDisplay = filteredScores.slice(0, MAX_LEADERBOARD_ENTRIES_DISPLAY);

    displayLeaderboard(scoresForDisplay, selectedDim);
}

async function fetchLeaderboard() {
    logger.info("Fetching full leaderboard...");
    if (!leaderboardList) { logger.error("Leaderboard list element not found during fetch."); return; }
    leaderboardList.innerHTML = '<li class="message">Loading...</li>';
    try {
        const response = await fetch('/api/get_leaderboard'); // Fetches ALL scores now
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* no json error body */ }
            throw new Error(errorMsg);
        }
        const scores = await response.json();
        if (!Array.isArray(scores)) {
            logger.error("Leaderboard data received is not an array:", scores);
            throw new Error("Invalid data format from server.");
        }
        allLeaderboardScores = scores; // Store all scores locally
        logger.info(`Stored ${allLeaderboardScores.length} total scores locally from leaderboard.`);
        filterAndDisplayLeaderboard(); // This will now filter the full list and take top N
    } catch (error) {
        logger.error("Error fetching or processing leaderboard:", error);
        allLeaderboardScores = [];
        if (leaderboardList) leaderboardList.innerHTML = '<li class="message">Error loading scores.</li>';
    }
}

// --- submitScore Function ---
async function submitScore(name, timeInSeconds, dimension) {
    const trimmedName = name ? name.trim() : '';
    logger.info(`Submitting score: Name='${trimmedName}', Time=${timeInSeconds.toFixed(3)}s, Dimension=${dimension}`);
    if (!trimmedName) {
        logger.warn("Submit called with empty name - score not saved.");
        return { rankData: null, error: "Empty name provided."};
    }
    if (typeof timeInSeconds !== 'number' || timeInSeconds < 0 || !isFinite(timeInSeconds)) {
        logger.error("Invalid time for submission:", timeInSeconds);
        return { rankData: null, error: "Invalid time."};
    }
    if (typeof dimension !== 'number' || dimension <= 0) {
        logger.error("Invalid dimension for submission:", dimension);
        return { rankData: null, error: "Invalid dimension."};
    }
    try {
        const scoreData = { name: trimmedName, time: timeInSeconds, dimension: dimension };
        const response = await fetch('/api/add_score', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(scoreData) });
        logger.info(`Add score API response status: ${response.status}`);
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { logger.warn("No JSON error body from server on failed score submission."); }
            throw new Error(errorMsg);
        }
        logger.info("Score submitted successfully to API.");
        if (statusMessage) statusMessage.textContent = "Score saved!";
        await fetchLeaderboard(); // Refresh allLeaderboardScores with the newly added score
        const rankData = calculateUserRank(trimmedName, timeInSeconds, dimension); 
        logger.info("Rank data after submission:", rankData);
        return { rankData: rankData, error: null };
    } catch (error) {
        logger.error("Error submitting score via API:", error);
        if (statusMessage) statusMessage.textContent = "Error saving score.";
        return { rankData: null, error: error.message };
    }
}

// --- calculateUserRank Function ---
function calculateUserRank(username, time, dimension) {
    logger.info(`Calculating rank for ${username}, ${time.toFixed(3)}s, ${dimension}x${dimension}`);
    let ranks = { overall: null, size: null };
    if (!allLeaderboardScores || allLeaderboardScores.length === 0) { // Uses the full list
        logger.warn("Cannot calculate rank - leaderboard empty or not loaded");
        return ranks;
    }
    const overallScores = [...allLeaderboardScores].sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    const sizeSpecificScores = allLeaderboardScores.filter(score => score.dimension === dimension).sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));

    let overallIdx = -1;
    for(let i=0; i < overallScores.length; i++) {
        if(overallScores[i].name === username && overallScores[i].dimension === dimension && Math.abs(overallScores[i].time - time) < 0.0001) {
            overallIdx = i;
            break;
        }
    }
    if (overallIdx !== -1) { ranks.overall = overallIdx + 1; }
    else { logger.warn("Submitted score not found in overall leaderboard for ranking (name/dim/time mismatch?)."); }

    let sizeIdx = -1;
    for(let i=0; i < sizeSpecificScores.length; i++) {
         if(sizeSpecificScores[i].name === username && Math.abs(sizeSpecificScores[i].time - time) < 0.0001) {
            sizeIdx = i;
            break;
        }
    }
    if (sizeIdx !== -1) { ranks.size = sizeIdx + 1; }
    else { logger.warn("Submitted score not found in size-specific leaderboard for ranking (name/time mismatch?)."); }

    logger.info("Rank calculation complete:", ranks);
    return ranks;
}

// --- Pop-up Functions ---
function showPopup(time, rankData, dimension, requiresNamePrompt = false) {
    logger.info(`Showing popup. Time: ${time}, RankData: ${JSON.stringify(rankData)}, Dimension: ${dimension}, RequiresPrompt: ${requiresNamePrompt}`);
    if (!popupOverlayEl || !popupTimeEl || !popupRankOverallEl || !popupRankSizeEl || !popupPromptInfoEl) {
        logger.error("Popup elements not found for showPopup!");
        return;
    }
    if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }

    popupTimeEl.textContent = `Your Time: ${formatTime(time)}`;
    popupRankOverallEl.textContent = rankData?.overall ? `Overall Rank: ${rankData.overall}` : "Overall Rank: N/A";
    popupRankSizeEl.textContent = rankData?.size ? `Rank for ${dimension}x${dimension}: ${rankData.size}` : `Rank for ${dimension}x${dimension}: N/A`;

    if (requiresNamePrompt) {
        logger.info("Popup: Will require name prompt after close.");
        popupPromptInfoEl.textContent = "Enter name when this closes to save score!";
        popupPromptInfoEl.style.display = 'block';
    } else {
        logger.info("Popup: No name prompt required after close.");
        popupPromptInfoEl.style.display = 'none';
    }

    popupOverlayEl.style.display = 'block';
    requestAnimationFrame(() => {
       popupOverlayEl.classList.add('visible');
    });
    popupDismissTimer = setTimeout(hidePopup, 7000);
}

function hidePopup() {
    logger.info("Attempting to hide popup.");
    if (!popupOverlayEl || !popupOverlayEl.classList.contains('visible')) {
        logger.debug("Popup not visible or not found, no action to hide.");
        return;
    }
    if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }

    popupOverlayEl.classList.remove('visible');

    const onTransitionEnd = (event) => {
        if (event.target === popupOverlayEl && event.propertyName === 'opacity') {
            logger.debug("Popup overlay fade-out transition ended.");
            popupOverlayEl.style.display = 'none';
            popupOverlayEl.removeEventListener('transitionend', onTransitionEnd);
            handlePostWinActions();
        }
    };
    popupOverlayEl.addEventListener('transitionend', onTransitionEnd);

    setTimeout(() => {
         if (popupOverlayEl && popupOverlayEl.style.display !== 'none' && !popupOverlayEl.classList.contains('visible')) {
            logger.warn("TransitionEnd fallback triggered for hidePopup.");
            popupOverlayEl.style.display = 'none';
            if (popupOverlayEl.removeEventListener) popupOverlayEl.removeEventListener('transitionend', onTransitionEnd);
            handlePostWinActions();
         }
    }, 350); 
}

// --- Function to handle post-win actions (like prompting for name) ---
function handlePostWinActions() {
    logger.info("Popup closed or timed out. Handling post-win actions.");

    if (lastCompletedRunInfo && lastCompletedRunInfo.name === null) {
         const { time, dimension } = lastCompletedRunInfo;
         logger.info(`Post-win: Valid run info found (Time: ${time.toFixed(3)}, Dim: ${dimension}), name is null. Prompting for name.`);
         const timeFmt = formatTime(time);
         const pName = prompt(`Finished in ${timeFmt}!\nEnter name for leaderboard:`, "");
         const trimmedName = pName ? pName.trim() : null;

         if (trimmedName) {
              logger.info(`Name entered: '${trimmedName}'. Saving to session and submitting score.`);
              sessionStorage.setItem('mazeUsername', trimmedName);
              lastCompletedRunInfo.name = trimmedName;

              submitScore(trimmedName, time, dimension).then(({ rankData, error }) => {
                  if (!error) {
                     logger.info(`Score submitted successfully after prompt for '${trimmedName}'. Rank data:`, rankData);
                     if (statusMessage) statusMessage.textContent = `Score saved as ${trimmedName}! Rank: ${rankData && rankData.size ? rankData.size : 'N/A'} (size), ${rankData && rankData.overall ? rankData.overall : 'N/A'} (overall)`;
                  } else {
                      logger.error(`Error submitting score after prompt for '${trimmedName}': ${error}`);
                      if (statusMessage) statusMessage.textContent = "Error saving score after prompt.";
                  }
              });
         } else {
              logger.info("Prompt cancelled or empty name entered. Score not saved.");
              if (statusMessage) statusMessage.textContent = "Score not saved (no name provided).";
         }
    } else if (lastCompletedRunInfo && lastCompletedRunInfo.name !== null) {
        logger.info("Post-win: Score was already submitted with a known name or handled. No further action needed for this run.");
    } else {
        logger.info("Post-win: No pending score submission or lastCompletedRunInfo is missing/irrelevant.");
    }
    lastCompletedRunInfo = null;
    logger.debug("Cleared lastCompletedRunInfo.");
}

// --- Achievement Functions ---
function checkAchievementsOnCompletion(completionData) { logger.info("Checking achievements for completion:", completionData); achievementState.mazeCompletions++; logger.info("Updated achievement state:", achievementState); const newlyUnlocked = []; for (const [id, definition] of Object.entries(ACHIEVEMENTS_DEFINITIONS)) { if (!unlockedAchievements.has(id)) { try { if (definition.check(completionData, achievementState)) { logger.info(`Achievement criteria met: ${id} - ${definition.name}`); unlockedAchievements.add(id); newlyUnlocked.push(id); } } catch (e) { logger.error(`Error checking achievement ${id}:`, e); } } } logger.info("Newly unlocked achievements:", newlyUnlocked); return newlyUnlocked; }
function displayAchievements() { if (!achievementsList) { logger.error("Achievements list element missing!"); return; } logger.debug("Displaying achievements list."); achievementsList.innerHTML = ''; if (Object.keys(ACHIEVEMENTS_DEFINITIONS).length === 0) { achievementsList.innerHTML = '<li class="message">No achievements defined.</li>'; return; } for (const [id, definition] of Object.entries(ACHIEVEMENTS_DEFINITIONS)) { const li = document.createElement('li'); li.classList.add('achievement-item'); const isUnlocked = unlockedAchievements.has(id); if (isUnlocked) { li.classList.add('unlocked'); li.innerHTML = `<strong>✅ ${escapeHtml(definition.name)}</strong><span>${escapeHtml(definition.description)}</span>`; } else { li.classList.add('locked'); li.innerHTML = `<strong>${escapeHtml(definition.name)}</strong><span>${escapeHtml(definition.description)}</span>`; } achievementsList.appendChild(li); } }
function displayAchievementNotification(newlyUnlockedIds) { if (!toastContainer) return; newlyUnlockedIds.forEach((id, index) => { const definition = ACHIEVEMENTS_DEFINITIONS[id]; if (!definition) return; const toast = document.createElement('div'); toast.className = 'toast-notification'; toast.textContent = `🏆 Achievement Unlocked: ${definition.name}!`; toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); }, 100 + index * 300); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove(), { once: true }); }, 4000 + index * 300); }); }

// --- Maze Drawing and Game Logic ---
function drawMaze() {
    requestAnimationFrame(() => {
        if (!maze || maze.length === 0 || !ctx) { return; }
        const rows = maze.length; const cols = maze[0].length;
        const mazeDisplayArea = document.querySelector('.grid-maze-display');
        const canvasContainer = document.getElementById('canvas-container');
        if (!mazeDisplayArea || !canvasContainer ) { logger.error("Layout elements (mazeDisplayArea or canvasContainer) not found for drawing"); return; }
        const displayAreaWidth = mazeDisplayArea.clientWidth;
        const displayAreaHeight = mazeDisplayArea.clientHeight;
        const canvasContainerStyle = getComputedStyle(canvasContainer);
        const canvasContainerPaddingLeft = parseFloat(canvasContainerStyle.paddingLeft) || 0;
        const canvasContainerPaddingRight = parseFloat(canvasContainerStyle.paddingRight) || 0;
        const canvasContainerPaddingTop = parseFloat(canvasContainerStyle.paddingTop) || 0;
        const canvasContainerPaddingBottom = parseFloat(canvasContainerStyle.paddingBottom) || 0;
        const availableWidth = displayAreaWidth - canvasContainerPaddingLeft - canvasContainerPaddingRight;
        const availableHeight = displayAreaHeight - canvasContainerPaddingTop - canvasContainerPaddingBottom;
        if (availableWidth <= 0 || availableHeight <= 0) { logger.warn(`Available drawing space zero/negative. W:${availableWidth}, H:${availableHeight}`); if (canvas) { canvas.width = 50; canvas.height = 50;} return; }
        const maxSideLength = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight)));
        if (cols <= 0 || rows <= 0) { logger.error("Maze dimensions invalid for drawing (cols/rows <= 0)"); if(canvas) { canvas.width = 0; canvas.height = 0;} return; }
        tileSize = Math.max(1, Math.floor(maxSideLength / Math.max(cols, rows)));
        if (tileSize <= 0) tileSize = 1;
        const finalCanvasWidth = tileSize * cols;
        const finalCanvasHeight = tileSize * rows;
        if (canvas.width !== finalCanvasWidth || canvas.height !== finalCanvasHeight) { logger.debug(`Applying new canvas size: ${finalCanvasWidth}x${finalCanvasHeight} (was ${canvas.width}x${canvas.height}) for tile size ${tileSize}`); canvas.width = finalCanvasWidth; canvas.height = finalCanvasHeight; }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < rows; row++) { for (let col = 0; col < cols; col++) { const drawX = col * tileSize; const drawY = row * tileSize; if (maze[row]?.[col] === 1) ctx.fillStyle = "black"; else if (row === goal.y && col === goal.x) ctx.fillStyle = "green"; else ctx.fillStyle = "white"; if (tileSize > 0) ctx.fillRect(drawX, drawY, tileSize, tileSize); } }
        if (solutionPath?.length > 0 && tileSize > 0) { ctx.fillStyle = "rgba(50, 205, 50, 0.55)"; solutionPath.forEach(([path_col, path_row]) => { if (!((path_row === player.y && path_col === player.x) || (path_row === goal.y && path_col === goal.x))) ctx.fillRect(path_col * tileSize, path_row * tileSize, tileSize, tileSize); }); }
        if (tileSize > 0 && playerTrailHistory.length > 0) { const trailLength = playerTrailHistory.length; for (let i = 0; i < trailLength; i++) { const pos = playerTrailHistory[i]; const ageRatio = (MAX_TRAIL_LENGTH > 1) ? Math.min(i / (MAX_TRAIL_LENGTH -1), 1) : 1; let alpha = TRAIL_MAX_ALPHA - (TRAIL_MAX_ALPHA - TRAIL_MIN_ALPHA) * ageRatio; alpha = Math.max(TRAIL_MIN_ALPHA, Math.min(TRAIL_MAX_ALPHA, alpha)); ctx.fillStyle = `rgba(${playerTrailColorRGB}, ${alpha})`; ctx.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize); } }
        if (tileSize > 0) { ctx.fillStyle = playerColor; ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize); }
        if (gameWon && statusMessage?.textContent.includes("🎉")) { if (trophyImg?.complete && tileSize > 0) ctx.drawImage(trophyImg, goal.x * tileSize, goal.y * tileSize, tileSize, tileSize); }
    });
}

// --- loadMaze ---
async function loadMaze(dimension) {
    if (popupOverlayEl && popupOverlayEl.classList.contains('visible')) {
        logger.info("New maze load requested while popup visible. Hiding popup first.");
        hidePopup(); 
    }
    dimension=parseInt(dimension); if(isNaN(dimension)){logger.error("Invalid dimension passed to loadMaze, defaulting to 5."); dimension=5;}
    logger.info(`Loading maze: ${dimension}x${dimension}`);
    if(statusMessage)statusMessage.textContent="Loading Maze...";
    if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    maze = [];
    currentMazeDimension=dimension; gameWon=false; resetTimer(); solutionPath=[]; playerTrailHistory=[]; if(instructionsP)instructionsP.style.display="block";
    tryStartMusic();
    try{
        const response=await fetch(`/api/generate_maze/${currentMazeDimension}`);
        if(!response.ok)throw new Error(`Network error fetching maze: ${response.status}`);
        const data=await response.json();
        if(!Array.isArray(data)||data.length===0||!Array.isArray(data[0]))throw new Error("Invalid maze data received from server");
        maze=data;
        player=findStartPosition();
        goal=findGoalPosition();
        logger.info(`Maze loaded. Start: (${player.x},${player.y}), Goal: (${goal.x},${goal.y})`);
        if(statusMessage)statusMessage.textContent="";
        requestAnimationFrame(() => { drawMaze(); logger.debug("New maze drawn via rAF in loadMaze callback."); });
    } catch(error){
        logger.error("Load maze error:",error);
        if(statusMessage)statusMessage.textContent=`Error loading maze: ${error.message}`;
        maze=[];
        if(ctx)ctx.clearRect(0,0,canvas?.width??0,canvas?.height??0);
    }
}

// --- movePlayer ---
function movePlayer(dx, dy) {
    if (gameWon) return;
    let nX = player.x + dx, nY = player.y + dy;
    if (nY>=0 && nY<maze.length && nX>=0 && nX<maze[0].length && maze[nY][nX]===0) {
        playerTrailHistory.unshift({ x: player.x, y: player.y });
        if (playerTrailHistory.length > MAX_TRAIL_LENGTH) playerTrailHistory.pop();
        startTimer();
        player.x = nX; player.y = nY;
        drawMaze();

        if (player.x === goal.x && player.y === goal.y) {
            logger.info("Goal reached!");
            gameWon = true;
            stopTimer(); 
            const finalTime = elapsedSeconds;
            const finalDimension = currentMazeDimension;

            lastCompletedRunInfo = { time: finalTime, dimension: finalDimension, name: null };
            logger.info("Stored lastCompletedRunInfo for win:", JSON.stringify(lastCompletedRunInfo));

            if (statusMessage) statusMessage.textContent = "🎉 You reached the exit! Well done! 🎉";
            if (instructionsP) instructionsP.style.display = 'none';
            const completionData = { dimension: finalDimension, time: finalTime };
            const newlyUnlockedIds = checkAchievementsOnCompletion(completionData);
            if (newlyUnlockedIds.length > 0) { displayAchievementNotification(newlyUnlockedIds); displayAchievements(); }
            if (backgroundMusic && !backgroundMusic.paused) backgroundMusic.pause();
            playSound("static/snake_sound.m4a");

            const savedUsername = sessionStorage.getItem('mazeUsername');

            if (savedUsername) {
                logger.info(`Username found in session: '${savedUsername}'. Submitting score directly.`);
                lastCompletedRunInfo.name = savedUsername; 
                submitScore(savedUsername, finalTime, finalDimension)
                    .then(({ rankData, error }) => {
                        if (error) {
                            logger.error(`Error submitting score for ${savedUsername}: ${error}`);
                        } else {
                            logger.info(`Score submitted for ${savedUsername}. Rank data:`, rankData);
                        }
                        showPopup(finalTime, rankData, finalDimension, false);
                    });
            } else {
                logger.info("No username in session. Showing popup, will prompt for name after popup closes.");
                showPopup(finalTime, null, finalDimension, true); 
            }
        }
    }
}
async function solveMaze() { if(!maze||maze.length===0||gameWon)return; if(statusMessage)statusMessage.textContent="Solving..."; tryStartMusic(); solutionPath=[]; drawMaze(); try{ const response=await fetch('/api/solve_maze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({maze:maze,start:player,goal:goal})}); if(!response.ok){const errData=await response.json().catch(()=>null);const errMsg=errData?.error||`Server error ${response.status}`; throw new Error(errMsg);} const result=await response.json(); if(result.path?.length>0){ solutionPath=result.path; if(statusMessage)statusMessage.textContent="✅ Solution Path Shown!"; } else { if(statusMessage)statusMessage.textContent="❌ No solution found by solver."; solutionPath=[]; } } catch(error){logger.error("Solve Maze API Error:",error); if(statusMessage)statusMessage.textContent=`Error solving: ${error.message}`; solutionPath=[];} finally{drawMaze();} }

// --- Initialization and Event Listeners ---
function initializeGame() {
    logger.info("Initializing game UI and logic...");
    canvas = document.getElementById("gameCanvas"); 
    if (canvas) {
      ctx = canvas.getContext("2d");
    } else {
      logger.error("CRITICAL: gameCanvas element not found!");
      if (document.body) document.body.innerHTML = "<p style='color:red; font-size:2em; text-align:center;'>Error: Game canvas not found. Cannot initialize game.</p>";
      return;
    }

    newMazeBtn = document.getElementById("generate-maze-btn"); 
    solveMazeBtn = document.getElementById("solve-maze-btn"); 
    mazeSizeSelect = document.getElementById("mazeSizeSelect"); 
    statusMessage = document.getElementById("statusMessage");
    titleH2 = document.querySelector('.grid-header h2');
    instructionsP = document.getElementById("instructions"); 
    timerDisplay = document.getElementById("timerDisplay"); 
    leaderboardList = document.getElementById("leaderboardList"); 
    leaderboardContainer = document.getElementById("leaderboardContainer"); 
    muteBtn = document.getElementById('mute-btn'); 
    leaderboardFilterSelect = document.getElementById('leaderboardFilterSelect');
    achievementsContainer = document.getElementById('achievementsContainer'); 
    achievementsList = document.getElementById('achievementsList'); 
    toastContainer = document.getElementById('toast-container');
    popupOverlayEl = document.getElementById('winPopupOverlay');
    popupContentEl = popupOverlayEl?.querySelector('.popup-content');
    popupTimeEl = document.getElementById('popupTime');
    popupRankOverallEl = document.getElementById('popupRankOverall');
    popupRankSizeEl = document.getElementById('popupRankSize');
    popupPromptInfoEl = document.getElementById('popupPromptInfo');
    closePopupBtnEl = document.getElementById('closePopupBtn');
    snakeColorSelectEl = document.getElementById('snakeColorSelect');

    const criticalElements = { newMazeBtn, solveMazeBtn, mazeSizeSelect, statusMessage, leaderboardList, leaderboardFilterSelect, achievementsList, toastContainer, popupOverlayEl, popupContentEl, popupTimeEl, popupRankOverallEl, popupRankSizeEl, popupPromptInfoEl, closePopupBtnEl, snakeColorSelectEl, timerDisplay, instructionsP };
    for (const [elName, el] of Object.entries(criticalElements)) {
        if (!el) {
            logger.error(`Initialization failed: Critical DOM element '${elName}' is missing!`);
            if (statusMessage) statusMessage.textContent = "Page Initialization Error! Some UI elements are missing.";
        }
    }
    
    preloadTrophyImage(); 
    setupAudio();
    playerColor = snakeColorSelectEl ? snakeColorSelectEl.value : "red";
    playerTrailColorRGB = convertCssColorToRgbString(playerColor);
    currentMazeDimension = parseInt(mazeSizeSelect ? mazeSizeSelect.value : '5');
    
    loadMaze(currentMazeDimension); 
    fetchLeaderboard();
    displayAchievements();

    if (newMazeBtn) newMazeBtn.addEventListener("click", () => {
        logger.info("Generate New Maze button clicked.");
        loadMaze(parseInt(mazeSizeSelect.value));
    });
    if (solveMazeBtn) solveMazeBtn.addEventListener("click", () => {
        logger.info("Solve Maze button clicked.");
        solveMaze();
    });
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (leaderboardFilterSelect) leaderboardFilterSelect.addEventListener('change', filterAndDisplayLeaderboard);
    
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener('resize', debouncedDrawMaze);

    if (closePopupBtnEl) closePopupBtnEl.addEventListener('click', () => {
        logger.info("Popup close button clicked.");
        hidePopup();
    });
    if (popupOverlayEl) popupOverlayEl.addEventListener('click', (event) => {
        if (event.target === popupOverlayEl) {
            logger.info("Popup overlay clicked (outside content).");
            hidePopup();
        }
    });
    if (snakeColorSelectEl) snakeColorSelectEl.addEventListener('change', (event) => {
        playerColor = event.target.value;
        playerTrailColorRGB = convertCssColorToRgbString(playerColor);
        logger.info(`Player color changed to: ${playerColor} (Trail RGB: ${playerTrailColorRGB})`);
        if (!gameWon && maze && maze.length > 0) { drawMaze(); }
    });

    logger.info("Game initialized successfully.");
}
const debouncedDrawMaze = debounce(() => { logger.debug("Debounced resize: Triggering drawMaze."); if (maze?.length > 0) { drawMaze(); } }, 200);
function handleKeyDown(event) { if (startTime === null && !gameWon) tryStartMusic(); if (gameWon) { if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','e','E'].includes(event.key)) event.preventDefault(); return; } const moves = {"ArrowUp":[0,-1],"w":[0,-1],"W":[0,-1],"ArrowDown":[0,1],"s":[0,1],"S":[0,1],"ArrowLeft":[-1,0],"a":[-1,0],"A":[-1,0],"ArrowRight":[1,0],"d":[1,0],"D":[1,0]}; if (moves[event.key]) { event.preventDefault(); movePlayer(...moves[event.key]); } if (event.key === 'e' || event.key === 'E') { event.preventDefault(); solveMaze(); } }

document.addEventListener('DOMContentLoaded', initializeGame);