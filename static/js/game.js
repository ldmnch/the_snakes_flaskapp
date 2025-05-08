// --- Global Variables & Configuration ---
const APP_NAME = 'MazeGame';
const DEBUG_MODE = true; 
const MAX_LEADERBOARD_ENTRIES_DISPLAY = 10;

// --- Streamlined Logger ---
const logger = {
    _log: function(level, ...args) {
        if (!DEBUG_MODE && level !== 'error' && level !== 'warn') { return; }
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

// --- Global Variables ---
let trophyImg; let backgroundMusic; let musicStarted = false; let isMuted = false;
let startTime = null; let timerInterval = null; let elapsedSeconds = 0; let gameWon = false;
let tileSize = 10; let maze = []; let player = { x: 1, y: 1 }; let goal = { x: 1, y: 1 };
let solutionPath = []; let playerTrailHistory = [];
const MAX_TRAIL_LENGTH = 16;
const TRAIL_MAX_ALPHA = 0.6; const TRAIL_MIN_ALPHA = 0.05;
let currentMazeDimension = 5; let allLeaderboardScores = [];
let unlockedAchievements = new Set();
let achievementState = { mazeCompletions: 0 };
let playerColor = "red";
let playerTrailColorRGB = "255, 0, 0";
let popupOverlayEl, popupContentEl, popupTimeEl, popupRankOverallEl, popupRankSizeEl, popupPromptInfoEl, closePopupBtnEl;
let popupDismissTimer = null;
let snakeColorSelectEl;
let lastCompletedRunInfo = null;

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

let canvas, ctx, newMazeBtn, solveMazeBtn, mazeSizeSelect, statusMessage,
    titleH2, instructionsP, timerDisplay, leaderboardList, leaderboardContainer, muteBtn, leaderboardFilterSelect,
    achievementsContainer, achievementsList, toastContainer;

function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args); }; clearTimeout(timeout); timeout = setTimeout(later, wait); }; };
function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
function setupAudio() { try { backgroundMusic = new Audio("static/background_music.m4a"); backgroundMusic.loop = true; backgroundMusic.volume = 0.3; logger.info("BG music object created."); } catch (e) { logger.error("Audio object creation error:", e); } }
function toggleMute() { if (!backgroundMusic) return; isMuted = !isMuted; backgroundMusic.muted = isMuted; if (muteBtn) muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute"; logger.info("Muted status:", isMuted); }
function tryStartMusic() { if (backgroundMusic && (!musicStarted || backgroundMusic.paused)) { logger.info("Attempting music play..."); backgroundMusic.play().then(() => { logger.info("BG music playing."); musicStarted = true; backgroundMusic.muted = isMuted; }).catch(error => { logger.warn("BG music play failed:", error.message); if (!musicStarted) musicStarted = false; }); } else if (backgroundMusic && !backgroundMusic.paused) { backgroundMusic.muted = isMuted; } }
function playSound(soundFile, volume = 1.0) { try { const sound = new Audio(soundFile); sound.volume = volume; sound.play().catch(error => logger.error(`Sound play error ${soundFile}:`, error)); logger.debug(`Playing sound: ${soundFile}`); } catch(e) { logger.error(`Sound creation/play fail ${soundFile}:`, e); } }
function formatTime(totalSeconds) { if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) return "00:00.000"; const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`; }
function updateTimerDisplay() { if (startTime === null || gameWon || !timerDisplay) return; elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000); timerDisplay.textContent = formatTime(elapsedSeconds).split('.')[0]; }
function startTimer() { if (startTime === null && !gameWon) { logger.info("Starting timer..."); startTime = Date.now(); elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; if (timerInterval) clearInterval(timerInterval); updateTimerDisplay(); timerInterval = setInterval(updateTimerDisplay, 50); } }
function stopTimer() { if (timerInterval !== null) { logger.info("Stopping timer."); clearInterval(timerInterval); timerInterval = null; if (startTime) { elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000); logger.info(`Final time: ${elapsedSeconds}s`); if (timerDisplay) timerDisplay.textContent = formatTime(elapsedSeconds).split('.')[0]; } } else if (startTime === null) { elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; } }
function resetTimer() { logger.info("Resetting timer."); stopTimer(); startTime = null; elapsedSeconds = 0; if (timerDisplay) timerDisplay.textContent = formatTime(0).split('.')[0]; }
function preloadTrophyImage(){ trophyImg = new Image(); trophyImg.src = "static/winnertrophy.png"; trophyImg.onload = () => logger.info("Trophy image loaded!"); trophyImg.onerror = () => logger.error("Trophy image loading error."); }
function findStartPosition() { for (let y=0; y<maze.length; y++) for (let x=0; x<maze[y].length; x++) if (maze[y][x]===0) return {x,y}; logger.error("No start position found!"); return {x:1,y:1}; }
function findGoalPosition() { if (!maze || !maze.length) return {x:1,y:1}; for(let y=maze.length-1; y>=0; y--) for(let x=maze[y].length-1; x>=0; x--) if(maze[y][x]===0) return {x,y}; logger.error("No goal position found!"); return {x:Math.max(1,maze[0].length-2),y:Math.max(1,maze.length-2)}; }
function convertCssColorToRgbString(cssColor) { try { if (cssColor.startsWith('rgb')) { const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (match) return `${match[1]}, ${match[2]}, ${match[3]}`; } if (cssColor.startsWith('#')) { let hex = cssColor.slice(1); if (hex.length === 3) { hex = hex.split('').map(char => char + char).join(''); } if (hex.length === 6) { const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16); return `${r}, ${g}, ${b}`; } } const tempDiv = document.createElement('div'); tempDiv.style.color = cssColor; tempDiv.style.display = 'none'; document.body.appendChild(tempDiv); const computedColor = getComputedStyle(tempDiv).color; document.body.removeChild(tempDiv); const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (rgbMatch) { return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`; } } catch (e) { logger.error("Could not convert color:", cssColor, e); } logger.warn("Failed to convert CSS color to RGB, defaulting to red's RGB"); return "255, 0, 0"; }

// --- Leaderboard Functions (MODIFIED) ---
function displayLeaderboard(scoresToDisplay, currentFilter) {
    if (!leaderboardList) { logger.error("Leaderboard list element missing for display!"); return; }
    logger.debug(`Displaying ${scoresToDisplay.length} scores for filter: ${currentFilter}`);
    leaderboardList.innerHTML = ''; 

    if (!scoresToDisplay || scoresToDisplay.length === 0) {
        leaderboardList.innerHTML = `<li class="message">No scores yet for this ${currentFilter === 'all' ? 'leaderboard' : 'size'}!</li>`;
        return;
    }

    scoresToDisplay.forEach((score, index) => { // Added index for rank
        const li = document.createElement('li');
        // Enhanced formatting with spans for potential styling
        const rank = `${index + 1}.`.padEnd(4); // Add rank number (1., 2., etc.) with padding
        const name = escapeHtml(String(score.name || 'Unknown')).padEnd(15); // Pad name for alignment
        const time = formatTime(Number(score.time || 0));
        const dimensionStr = `(${score.dimension || '?'}x${score.dimension || '?'})`;
        
        // Using textContent and carefully constructing the string to preserve spacing
        // Or, use innerHTML with spans if you want more CSS control over each part
        li.innerHTML = `
            <span class="lb-rank">${rank}</span>
            <span class="lb-name">${name}</span>
            <span class="lb-time">${time}</span>
            ${currentFilter === 'all' ? `<span class="lb-dim">${dimensionStr}</span>` : ''}
        `;
        // Add a class for potential flexbox styling of leaderboard items
        li.classList.add('leaderboard-entry');
        leaderboardList.appendChild(li);
    });
}

function filterAndDisplayLeaderboard() {
    if (!leaderboardFilterSelect || !allLeaderboardScores) {
        logger.error("Cannot filter leaderboard: elements or data missing.");
        return;
    }
    const selectedDim = leaderboardFilterSelect.value;
    logger.info(`Filtering leaderboard for dimension: ${selectedDim}`);

    let filteredScores = [];
    if (selectedDim === 'all') {
        filteredScores = [...allLeaderboardScores].sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    } else {
        filteredScores = allLeaderboardScores
            .filter(score => score.dimension == selectedDim)
            .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    }

    const scoresForDisplay = filteredScores.slice(0, MAX_LEADERBOARD_ENTRIES_DISPLAY);
    displayLeaderboard(scoresForDisplay, selectedDim);
}

async function fetchLeaderboard() {
    logger.info("Fetching full leaderboard...");
    if (!leaderboardList) { logger.error("Leaderboard list element not found."); return; }
    leaderboardList.innerHTML = '<li class="message">Loading...</li>';
    try {
        const response = await fetch('/api/get_leaderboard');
        if (!response.ok) {
            let errorMsg = `HTTP error! Status: ${response.status}`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { /*ignore*/ }
            throw new Error(errorMsg);
        }
        const scores = await response.json();
        if (!Array.isArray(scores)) {
            logger.error("Leaderboard data not an array:", scores);
            throw new Error("Invalid data format.");
        }
        allLeaderboardScores = scores;
        logger.info(`Stored ${allLeaderboardScores.length} total scores locally.`);
        filterAndDisplayLeaderboard();
    } catch (error) {
        logger.error("Error fetching/processing leaderboard:", error);
        allLeaderboardScores = [];
        if (leaderboardList) leaderboardList.innerHTML = '<li class="message">Error loading scores.</li>';
    }
}

// --- submitScore Function ---
async function submitScore(name, timeInSeconds, dimension) {
    const trimmedName = name ? name.trim() : '';
    logger.info(`Submitting score: Name='${trimmedName}', Time=${timeInSeconds.toFixed(3)}s, Dimension=${dimension}`);
    if (!trimmedName) { logger.warn("Submit: empty name."); return { rankData: null, error: "Empty name."}; }
    if (typeof timeInSeconds !== 'number' || timeInSeconds < 0 || !isFinite(timeInSeconds)) { logger.error("Submit: Invalid time.", timeInSeconds); return { rankData: null, error: "Invalid time."}; }
    if (typeof dimension !== 'number' || dimension <= 0) { logger.error("Submit: Invalid dimension.", dimension); return { rankData: null, error: "Invalid dimension."}; }
    try {
        const scoreData = { name: trimmedName, time: timeInSeconds, dimension: dimension };
        const response = await fetch('/api/add_score', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(scoreData) });
        logger.info(`Add score API status: ${response.status}`);
        if (!response.ok) {
            let errorMsg = `Error ${response.status}`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { logger.warn("No JSON error body from server."); }
            throw new Error(errorMsg);
        }
        logger.info("Score submitted successfully.");
        if (statusMessage) statusMessage.textContent = "Score saved!";
        await fetchLeaderboard(); 
        const rankData = calculateUserRank(trimmedName, timeInSeconds, dimension); 
        logger.info("Rank data after submission:", rankData);
        return { rankData: rankData, error: null };
    } catch (error) {
        logger.error("Error submitting score API:", error);
        if (statusMessage) statusMessage.textContent = "Error saving score.";
        return { rankData: null, error: error.message };
    }
}

// --- calculateUserRank Function ---
function calculateUserRank(username, time, dimension) {
    logger.info(`Calculating rank for ${username}, ${time.toFixed(3)}s, ${dimension}x${dimension}`);
    let ranks = { overall: null, size: null };
    if (!allLeaderboardScores || allLeaderboardScores.length === 0) { logger.warn("Rank calc: leaderboard empty."); return ranks; }
    const overallScores = [...allLeaderboardScores].sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    const sizeSpecificScores = allLeaderboardScores.filter(score => score.dimension === dimension).sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
    let overallIdx = overallScores.findIndex(s => s.name === username && s.dimension === dimension && Math.abs(s.time - time) < 0.0001);
    if (overallIdx !== -1) { ranks.overall = overallIdx + 1; } else { logger.warn("Rank calc: score not found overall."); }
    let sizeIdx = sizeSpecificScores.findIndex(s => s.name === username && Math.abs(s.time - time) < 0.0001);
    if (sizeIdx !== -1) { ranks.size = sizeIdx + 1; } else { logger.warn("Rank calc: score not found for size."); }
    logger.info("Rank calculation complete:", ranks);
    return ranks;
}

// --- Pop-up Functions ---
function showPopup(time, rankData, dimension, requiresNamePrompt = false) {
    logger.info(`Showing popup. Time: ${time}, RankData: ${JSON.stringify(rankData)}, Dim: ${dimension}, Prompt: ${requiresNamePrompt}`);
    if (!popupOverlayEl || !popupTimeEl || !popupRankOverallEl || !popupRankSizeEl || !popupPromptInfoEl) { logger.error("Popup elements missing!"); return; }
    if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }
    popupTimeEl.textContent = `Your Time: ${formatTime(time)}`;
    popupRankOverallEl.textContent = rankData?.overall ? `Overall Rank: ${rankData.overall}` : "Overall Rank: N/A";
    popupRankSizeEl.textContent = rankData?.size ? `Rank for ${dimension}x${dimension}: ${rankData.size}` : `Rank for ${dimension}x${dimension}: N/A`;
    popupPromptInfoEl.style.display = requiresNamePrompt ? (popupPromptInfoEl.textContent = "Enter name when this closes to save score!", 'block') : 'none';
    popupOverlayEl.style.display = 'block';
    requestAnimationFrame(() => { popupOverlayEl.classList.add('visible'); });
    popupDismissTimer = setTimeout(hidePopup, 7000);
}

function hidePopup() {
    logger.info("Attempting to hide popup.");
    if (!popupOverlayEl || !popupOverlayEl.classList.contains('visible')) { logger.debug("Popup not visible."); return; }
    if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }
    popupOverlayEl.classList.remove('visible');
    const onTransitionEnd = (event) => {
        if (event.target === popupOverlayEl && event.propertyName === 'opacity') {
            logger.debug("Popup fade-out ended.");
            popupOverlayEl.style.display = 'none';
            popupOverlayEl.removeEventListener('transitionend', onTransitionEnd);
            handlePostWinActions();
        }
    };
    popupOverlayEl.addEventListener('transitionend', onTransitionEnd);
    setTimeout(() => {
         if (popupOverlayEl && popupOverlayEl.style.display !== 'none' && !popupOverlayEl.classList.contains('visible')) {
            logger.warn("TransitionEnd fallback for hidePopup.");
            popupOverlayEl.style.display = 'none';
            if (popupOverlayEl.removeEventListener) popupOverlayEl.removeEventListener('transitionend', onTransitionEnd);
            handlePostWinActions();
         }
    }, 350); 
}

function handlePostWinActions() {
    logger.info("Handling post-win actions.");
    if (lastCompletedRunInfo && lastCompletedRunInfo.name === null) {
         const { time, dimension } = lastCompletedRunInfo;
         logger.info(`Post-win: Prompting for name. Time: ${time.toFixed(3)}, Dim: ${dimension}`);
         const pName = prompt(`Finished in ${formatTime(time)}!\nEnter name for leaderboard:`, "");
         const trimmedName = pName ? pName.trim() : null;
         if (trimmedName) {
              logger.info(`Name entered: '${trimmedName}'. Submitting.`);
              sessionStorage.setItem('mazeUsername', trimmedName);
              lastCompletedRunInfo.name = trimmedName;
              submitScore(trimmedName, time, dimension).then(({ rankData, error }) => {
                  if (!error) {
                     logger.info(`Score submitted post-prompt: '${trimmedName}'. Rank:`, rankData);
                     if (statusMessage) statusMessage.textContent = `Score saved as ${trimmedName}! Rank: ${rankData?.size || 'N/A'} (size), ${rankData?.overall || 'N/A'} (overall)`;
                  } else {
                      logger.error(`Error submitting post-prompt score for '${trimmedName}': ${error}`);
                      if (statusMessage) statusMessage.textContent = "Error saving score post-prompt.";
                  }
              });
         } else {
              logger.info("Prompt cancelled/empty name. Score not saved.");
              if (statusMessage) statusMessage.textContent = "Score not saved (no name).";
         }
    } else if (lastCompletedRunInfo && lastCompletedRunInfo.name !== null) {
        logger.info("Post-win: Score already handled.");
    } else {
        logger.info("Post-win: No pending score submission.");
    }
    lastCompletedRunInfo = null;
    logger.debug("Cleared lastCompletedRunInfo.");
}

// --- Achievement Functions ---
function checkAchievementsOnCompletion(completionData) { logger.info("Checking achievements:", completionData); achievementState.mazeCompletions++; logger.info("Updated state:", achievementState); const newlyUnlocked = []; for (const [id, definition] of Object.entries(ACHIEVEMENTS_DEFINITIONS)) { if (!unlockedAchievements.has(id)) { try { if (definition.check(completionData, achievementState)) { logger.info(`Unlocked: ${id} - ${definition.name}`); unlockedAchievements.add(id); newlyUnlocked.push(id); } } catch (e) { logger.error(`Error check achievement ${id}:`, e); } } } logger.info("Newly unlocked IDs:", newlyUnlocked); return newlyUnlocked; }
function displayAchievements() { if (!achievementsList) { logger.error("Achievements list missing!"); return; } logger.debug("Displaying achievements."); achievementsList.innerHTML = ''; if (Object.keys(ACHIEVEMENTS_DEFINITIONS).length === 0) { achievementsList.innerHTML = '<li class="message">No achievements.</li>'; return; } Object.entries(ACHIEVEMENTS_DEFINITIONS).forEach(([id, definition]) => { const li = document.createElement('li'); li.classList.add('achievement-item', unlockedAchievements.has(id) ? 'unlocked' : 'locked'); li.innerHTML = `<strong>${unlockedAchievements.has(id) ? '✅ ' : ''}${escapeHtml(definition.name)}</strong><span>${escapeHtml(definition.description)}</span>`; achievementsList.appendChild(li); }); }
function displayAchievementNotification(newlyUnlockedIds) { if (!toastContainer) return; newlyUnlockedIds.forEach((id, index) => { const definition = ACHIEVEMENTS_DEFINITIONS[id]; if (!definition) return; const toast = document.createElement('div'); toast.className = 'toast-notification'; toast.textContent = `🏆 Achievement Unlocked: ${definition.name}!`; toastContainer.appendChild(toast); setTimeout(() => { toast.classList.add('show'); }, 100 + index * 300); setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove(), { once: true }); }, 4000 + index * 300); }); }

// --- Maze Drawing and Game Logic ---
function drawMaze() {
    requestAnimationFrame(() => {
        if (!maze || maze.length === 0 || !ctx) { return; }
        const rows = maze.length; const cols = maze[0].length;
        const mazeDisplayArea = document.querySelector('.grid-maze-display');
        const canvasContainer = document.getElementById('canvas-container');
        if (!mazeDisplayArea || !canvasContainer ) { logger.error("Layout elements missing for drawing"); return; }
        const displayAreaWidth = mazeDisplayArea.clientWidth; const displayAreaHeight = mazeDisplayArea.clientHeight;
        const ccs = getComputedStyle(canvasContainer);
        const availableWidth = displayAreaWidth - (parseFloat(ccs.paddingLeft)||0) - (parseFloat(ccs.paddingRight)||0);
        const availableHeight = displayAreaHeight - (parseFloat(ccs.paddingTop)||0) - (parseFloat(ccs.paddingBottom)||0);
        if (availableWidth <= 0 || availableHeight <= 0) { logger.warn(`No drawing space. W:${availableWidth}, H:${availableHeight}`); if(canvas){canvas.width=50;canvas.height=50;} return; }
        const maxSide = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight)));
        if (cols <= 0 || rows <= 0) { logger.error("Invalid maze dims for drawing"); if(canvas){canvas.width=0;canvas.height=0;} return; }
        tileSize = Math.max(1, Math.floor(maxSide / Math.max(cols, rows)));
        if (tileSize <= 0) tileSize = 1;
        const finalCanvasWidth = tileSize * cols; const finalCanvasHeight = tileSize * rows;
        if (canvas.width !== finalCanvasWidth || canvas.height !== finalCanvasHeight) { logger.debug(`Canvas resize: ${finalCanvasWidth}x${finalCanvasHeight}`); canvas.width = finalCanvasWidth; canvas.height = finalCanvasHeight; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { const dX = c * tileSize; const dY = r * tileSize; if (maze[r]?.[c] === 1) ctx.fillStyle = "black"; else if (r === goal.y && c === goal.x) ctx.fillStyle = "green"; else ctx.fillStyle = "white"; if (tileSize > 0) ctx.fillRect(dX, dY, tileSize, tileSize); } }
        if (solutionPath?.length > 0 && tileSize > 0) { ctx.fillStyle = "rgba(50,205,50,0.55)"; solutionPath.forEach(([pC,pR])=>{if(!((pR===player.y&&pC===player.x)||(pR===goal.y&&pC===goal.x)))ctx.fillRect(pC*tileSize,pR*tileSize,tileSize,tileSize);});}
        if (tileSize > 0 && playerTrailHistory.length > 0) { playerTrailHistory.forEach((pos,i)=>{const ageR=(MAX_TRAIL_LENGTH>1)?Math.min(i/(MAX_TRAIL_LENGTH-1),1):1;let alpha=TRAIL_MAX_ALPHA-(TRAIL_MAX_ALPHA-TRAIL_MIN_ALPHA)*ageR;alpha=Math.max(TRAIL_MIN_ALPHA,Math.min(TRAIL_MAX_ALPHA,alpha));ctx.fillStyle=`rgba(${playerTrailColorRGB},${alpha})`;ctx.fillRect(pos.x*tileSize,pos.y*tileSize,tileSize,tileSize);});}
        if (tileSize > 0) { ctx.fillStyle = playerColor; ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize); }
        if (gameWon && statusMessage?.textContent.includes("🎉") && trophyImg?.complete && tileSize > 0) { ctx.drawImage(trophyImg, goal.x*tileSize, goal.y*tileSize, tileSize, tileSize); }
    });
}

async function loadMaze(dimension) {
    if (popupOverlayEl?.classList.contains('visible')) { logger.info("New maze while popup. Hiding."); hidePopup(); }
    dimension=parseInt(dimension); if(isNaN(dimension)){logger.error("Invalid dim to loadMaze, default 5."); dimension=5;}
    logger.info(`Loading maze: ${dimension}x${dimension}`);
    if(statusMessage)statusMessage.textContent="Loading Maze...";
    if(ctx) ctx.clearRect(0,0,canvas.width,canvas.height);
    maze=[]; currentMazeDimension=dimension; gameWon=false; resetTimer(); solutionPath=[]; playerTrailHistory=[]; if(instructionsP)instructionsP.style.display="block";
    tryStartMusic();
    try{
        const response=await fetch(`/api/generate_maze/${currentMazeDimension}`);
        if(!response.ok)throw new Error(`Net error maze gen: ${response.status}`);
        const data=await response.json();
        if(!Array.isArray(data)||data.length===0||!Array.isArray(data[0]))throw new Error("Invalid maze data from server");
        maze=data; player=findStartPosition(); goal=findGoalPosition();
        logger.info(`Maze loaded. S:(${player.x},${player.y}), G:(${goal.x},${goal.y})`);
        if(statusMessage)statusMessage.textContent="";
        requestAnimationFrame(()=>{drawMaze(); logger.debug("New maze drawn in loadMaze.");});
    } catch(error){
        logger.error("Load maze error:",error);
        if(statusMessage)statusMessage.textContent=`Error loading: ${error.message}`;
        maze=[]; if(ctx)ctx.clearRect(0,0,canvas?.width??0,canvas?.height??0);
    }
}

function movePlayer(dx, dy) {
    if (gameWon) return;
    let nX=player.x+dx, nY=player.y+dy;
    if (nY>=0 && nY<maze.length && nX>=0 && nX<maze[0].length && maze[nY][nX]===0) {
        playerTrailHistory.unshift({x:player.x,y:player.y});
        if (playerTrailHistory.length>MAX_TRAIL_LENGTH)playerTrailHistory.pop();
        startTimer(); player.x=nX; player.y=nY; drawMaze();
        if (player.x===goal.x && player.y===goal.y) {
            logger.info("Goal reached!"); gameWon=true; stopTimer(); 
            const finalTime=elapsedSeconds; const finalDimension=currentMazeDimension;
            lastCompletedRunInfo={time:finalTime,dimension:finalDimension,name:null};
            logger.info("Stored lastRunInfo for win:", JSON.stringify(lastCompletedRunInfo));
            if(statusMessage)statusMessage.textContent="🎉 You reached the exit! Well done! 🎉";
            if(instructionsP)instructionsP.style.display='none';
            const newlyUnlockedIds=checkAchievementsOnCompletion({dimension:finalDimension,time:finalTime});
            if(newlyUnlockedIds.length>0){displayAchievementNotification(newlyUnlockedIds);displayAchievements();}
            if(backgroundMusic&&!backgroundMusic.paused)backgroundMusic.pause();
            playSound("static/snake_sound.m4a");
            const savedUsername=sessionStorage.getItem('mazeUsername');
            if(savedUsername){
                logger.info(`User '${savedUsername}' found. Submitting.`);
                lastCompletedRunInfo.name=savedUsername; 
                submitScore(savedUsername,finalTime,finalDimension).then(({rankData,error})=>{
                    if(error){logger.error(`Error submit for ${savedUsername}: ${error}`);}
                    else{logger.info(`Score for ${savedUsername}. Rank:`,rankData);}
                    showPopup(finalTime,rankData,finalDimension,false);
                });
            } else {
                logger.info("No user in session. Show popup, then prompt.");
                showPopup(finalTime,null,finalDimension,true); 
            }
        }
    }
}
async function solveMaze() { if(!maze||maze.length===0||gameWon)return; if(statusMessage)statusMessage.textContent="Solving..."; tryStartMusic(); solutionPath=[]; drawMaze(); try{ const response=await fetch('/api/solve_maze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({maze:maze,start:player,goal:goal})}); if(!response.ok){const errData=await response.json().catch(()=>null);const errMsg=errData?.error||`Server error ${response.status}`; throw new Error(errMsg);} const result=await response.json(); if(result.path?.length>0){ solutionPath=result.path; if(statusMessage)statusMessage.textContent="✅ Solution Path Shown!"; } else { if(statusMessage)statusMessage.textContent="❌ No solution found by solver."; solutionPath=[]; } } catch(error){logger.error("Solve API Error:",error); if(statusMessage)statusMessage.textContent=`Error solving: ${error.message}`; solutionPath=[];} finally{drawMaze();} }

function initializeGame() {
    logger.info("Initializing game...");
    canvas = document.getElementById("gameCanvas"); 
    if (canvas) { ctx = canvas.getContext("2d"); } 
    else { logger.error("CRITICAL: gameCanvas missing!"); if (document.body) document.body.innerHTML = "<p style='color:red; font-size:2em;'>Error: Game canvas missing.</p>"; return; }
    newMazeBtn=document.getElementById("generate-maze-btn"); solveMazeBtn=document.getElementById("solve-maze-btn"); mazeSizeSelect=document.getElementById("mazeSizeSelect"); statusMessage=document.getElementById("statusMessage"); instructionsP=document.getElementById("instructions"); timerDisplay=document.getElementById("timerDisplay"); leaderboardList=document.getElementById("leaderboardList"); muteBtn=document.getElementById('mute-btn'); leaderboardFilterSelect=document.getElementById('leaderboardFilterSelect'); achievementsList=document.getElementById('achievementsList'); toastContainer=document.getElementById('toast-container'); popupOverlayEl=document.getElementById('winPopupOverlay'); popupContentEl=popupOverlayEl?.querySelector('.popup-content'); popupTimeEl=document.getElementById('popupTime'); popupRankOverallEl=document.getElementById('popupRankOverall'); popupRankSizeEl=document.getElementById('popupRankSize'); popupPromptInfoEl=document.getElementById('popupPromptInfo'); closePopupBtnEl=document.getElementById('closePopupBtn'); snakeColorSelectEl=document.getElementById('snakeColorSelect');
    const criticalElements={newMazeBtn,solveMazeBtn,mazeSizeSelect,statusMessage,leaderboardList,leaderboardFilterSelect,achievementsList,toastContainer,popupOverlayEl,popupContentEl,popupTimeEl,popupRankOverallEl,popupRankSizeEl,popupPromptInfoEl,closePopupBtnEl,snakeColorSelectEl,timerDisplay,instructionsP};
    Object.entries(criticalElements).forEach(([name,el])=>{if(!el)logger.error(`Init fail: DOM element '${name}' missing!`);});
    preloadTrophyImage(); setupAudio();
    playerColor = snakeColorSelectEl?.value || "red";
    playerTrailColorRGB = convertCssColorToRgbString(playerColor);
    currentMazeDimension = parseInt(mazeSizeSelect?.value || '5');
    loadMaze(currentMazeDimension); fetchLeaderboard(); displayAchievements();
    newMazeBtn?.addEventListener("click",()=>{logger.info("New Maze btn.");loadMaze(parseInt(mazeSizeSelect.value));});
    solveMazeBtn?.addEventListener("click",()=>{logger.info("Solve Maze btn.");solveMaze();});
    muteBtn?.addEventListener('click',toggleMute);
    leaderboardFilterSelect?.addEventListener('change',filterAndDisplayLeaderboard);
    document.addEventListener("keydown",handleKeyDown); window.addEventListener('resize',debouncedDrawMaze);
    closePopupBtnEl?.addEventListener('click',()=>{logger.info("Popup close btn.");hidePopup();});
    popupOverlayEl?.addEventListener('click',(e)=>{if(e.target===popupOverlayEl){logger.info("Popup overlay click.");hidePopup();}});
    snakeColorSelectEl?.addEventListener('change',(e)=>{playerColor=e.target.value;playerTrailColorRGB=convertCssColorToRgbString(playerColor);logger.info(`Color: ${playerColor}`);if(!gameWon&&maze?.length>0)drawMaze();});
    logger.info("Game initialized.");
}
const debouncedDrawMaze = debounce(() => { logger.debug("Debounced resize."); if (maze?.length > 0) { drawMaze(); } }, 200);
function handleKeyDown(event) { if (startTime === null && !gameWon) tryStartMusic(); if (gameWon) { if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','e','E'].includes(event.key)) event.preventDefault(); return; } const moves = {"ArrowUp":[0,-1],"w":[0,-1],"W":[0,-1],"ArrowDown":[0,1],"s":[0,1],"S":[0,1],"ArrowLeft":[-1,0],"a":[-1,0],"A":[-1,0],"ArrowRight":[1,0],"d":[1,0],"D":[1,0]}; if (moves[event.key]) { event.preventDefault(); movePlayer(...moves[event.key]); } if (event.key === 'e' || event.key === 'E') { event.preventDefault(); solveMaze(); } }

document.addEventListener('DOMContentLoaded', initializeGame);