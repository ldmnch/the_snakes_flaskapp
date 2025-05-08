/**
 * Frontend logic for the Maze Game.
 * Handles game state, canvas drawing, user input, API interactions,
 * leaderboard display, achievements, and UI updates.
 */

// =============================================================================
// Constants & Configuration
// =============================================================================
const APP_NAME = "MazeGame";
const DEBUG_MODE = true; // Toggle console log verbosity
const MAX_LEADERBOARD_ENTRIES_DISPLAY = 10; // Max entries per leaderboard category shown
const MAX_TRAIL_LENGTH = 16; // Max length of the player's trail
const TRAIL_MAX_ALPHA = 0.6; // Starting opacity for the trail
const TRAIL_MIN_ALPHA = 0.05; // Ending opacity for the trail

// =============================================================================
// Logger Utility
// =============================================================================
const logger = {
  _log: function (level, ...args) {
    // Only show non-error/warn logs if DEBUG_MODE is true
    if (!DEBUG_MODE && level !== "error" && level !== "warn") {
      return;
    }
    const prefix = `[${APP_NAME}]`;
    switch (level) {
      case "log":
        console.log(prefix, ...args);
        break;
      case "info":
        console.info(prefix, ...args);
        break;
      case "warn":
        console.warn(prefix, ...args);
        break;
      case "error":
        console.error(prefix, ...args);
        break;
      case "debug":
        if (DEBUG_MODE) console.debug(prefix, ...args);
        break;
      default:
        console.log(prefix, `(${level})`, ...args);
    }
  },
  log: function (...args) {
    this._log("log", ...args);
  },
  info: function (...args) {
    this._log("info", ...args);
  },
  warn: function (...args) {
    this._log("warn", ...args);
  },
  error: function (...args) {
    this._log("error", ...args);
  },
  debug: function (...args) {
    this._log("debug", ...args);
  },
};

// =============================================================================
// Game State Variables
// =============================================================================
let trophyImg; // Preloaded image for winning
let backgroundMusic; // Audio element for background music
let musicStarted = false;
let isMuted = false;
let startTime = null; // Timestamp when the timer starts
let timerInterval = null; // Interval ID for the timer update
let elapsedSeconds = 0; // Time elapsed in the current game
let gameWon = false; // Flag indicating if the current game is won
let tileSize = 10; // Size of each maze tile in pixels
let maze = []; // 2D array representing the current maze structure
let player = { x: 1, y: 1 }; // Player's current position (x, y)
let goal = { x: 1, y: 1 }; // Goal position (x, y)
let solutionPath = []; // Array of [x, y] tuples for the solved path
let playerTrailHistory = []; // Array of {x, y} objects for the player trail effect
let currentMazeDimension = 5; // Currently selected maze dimension
let allLeaderboardScores = []; // Stores all scores fetched from the server
let unlockedAchievements = new Set(); // Set of unlocked achievement IDs
let achievementState = { mazeCompletions: 0 }; // Tracks stats for achievements
let playerColor = "red"; // Current color of the player square
let playerTrailColorRGB = "255, 0, 0"; // RGB components of the player color for trail alpha
let popupDismissTimer = null; // Timeout ID for auto-closing the win popup
let lastCompletedRunInfo = null; // Stores info ({time, dimension, name}) about the last win

// =============================================================================
// DOM Element References (assigned in initializeGame)
// =============================================================================
let canvas,
  ctx,
  newMazeBtn,
  solveMazeBtn,
  mazeSizeSelect,
  statusMessage,
  instructionsP,
  timerDisplay,
  leaderboardList,
  muteBtn,
  leaderboardFilterSelect,
  achievementsList,
  toastContainer,
  popupOverlayEl,
  popupContentEl,
  popupTimeEl,
  popupRankOverallEl,
  popupRankSizeEl,
  popupPromptInfoEl,
  closePopupBtnEl,
  snakeColorSelectEl;

// =============================================================================
// Achievement Definitions
// =============================================================================
const ACHIEVEMENTS_DEFINITIONS = {
  first_steps: {
    name: "First Steps",
    description: "Complete your first maze.",
    check: (e, s) => s.mazeCompletions >= 1,
  },
  medium_well_done: {
    name: "Medium Well Done",
    description: "Complete a Medium (5x5) maze.",
    check: (e, s) => e.dimension === 5,
  },
  maze_master: {
    name: "Maze Master",
    description: "Complete a 7x7 or larger maze.",
    check: (e, s) => e.dimension >= 7,
  },
  speed_demon: {
    name: "Speed Demon",
    description: "Complete a 5x5 maze in under 15 seconds.",
    check: (e, s) => e.dimension === 5 && e.time < 15,
  },
  persistent_explorer: {
    name: "Persistent Explorer",
    description: "Complete 10 mazes.",
    check: (e, s) => s.mazeCompletions >= 10,
  },
  quick_learner: {
    name: "Quick Learner",
    description: "Complete a Small (3x3) maze in under 5 seconds.",
    check: (e, s) => e.dimension === 3 && e.time < 5,
  },
  labyrinth_conqueror: {
    name: "Labyrinth Conqueror",
    description: "Complete an Extra Large (10x10) maze.",
    check: (e, s) => e.dimension === 10,
  },
  legendary_mapper: {
    name: "Legendary Mapper",
    description: "Complete the HUGE (100x100) maze!",
    check: (e, s) => e.dimension === 100,
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func The function to debounce.
 * @param {number} wait The debounce duration in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Escapes basic HTML characters in a string to prevent XSS.
 * @param {string} unsafe The potentially unsafe string.
 * @returns {string} The escaped string.
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

/**
 * Formats a total number of seconds into MM:SS.sss format.
 * @param {number} totalSeconds The total seconds.
 * @returns {string} The formatted time string.
 */
function formatTime(totalSeconds) {
  if (isNaN(totalSeconds) || !isFinite(totalSeconds) || totalSeconds < 0) {
    return "00:00.000";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(3).padStart(6, "0")}`;
}

/**
 * Converts a CSS color string (name, #hex, rgb) to an "R, G, B" string.
 * Uses computed style as a fallback. Defaults to red if conversion fails.
 * @param {string} cssColor The CSS color string.
 * @returns {string} The color in "R, G, B" format.
 */
function convertCssColorToRgbString(cssColor) {
  try {
    // Handle rgb/rgba explicitly first
    if (cssColor.startsWith("rgb")) {
      const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) return `${match[1]}, ${match[2]}, ${match[3]}`;
    }
    // Handle hex (#xxx or #xxxxxx)
    if (cssColor.startsWith("#")) {
      let hex = cssColor.slice(1);
      if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
      }
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
      }
    }
    // Fallback: Use browser's computed style for color names etc.
    const tempDiv = document.createElement("div");
    tempDiv.style.color = cssColor;
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);
    const computedColor = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`;
    }
  } catch (e) {
    logger.error("Could not convert color:", cssColor, e);
  }
  logger.warn(
    "Failed to convert CSS color to RGB, defaulting to red's RGB (255, 0, 0)"
  );
  return "255, 0, 0"; // Default fallback for safety
}

// =============================================================================
// Audio Functions
// =============================================================================

/** Initializes the background music Audio object */
function setupAudio() {
  try {
    backgroundMusic = new Audio("static/background_music.m4a"); // Path relative to HTML
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3; // Start at lower volume
    logger.info("BG music object created.");
  } catch (e) {
    logger.error("Audio object creation error:", e);
  }
}

/** Toggles mute state for background music and updates button text */
function toggleMute() {
  if (!backgroundMusic) return;
  isMuted = !isMuted;
  backgroundMusic.muted = isMuted;
  if (muteBtn) muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute";
  logger.info("Muted status:", isMuted);
}

/** Attempts to play background music if not already playing (respects mute state) */
function tryStartMusic() {
  if (backgroundMusic && (!musicStarted || backgroundMusic.paused)) {
    logger.info("Attempting music play...");
    backgroundMusic
      .play()
      .then(() => {
        logger.info("BG music playing.");
        musicStarted = true;
        backgroundMusic.muted = isMuted; // Apply current mute state
      })
      .catch((error) => {
        // Common issue: Browser blocks autoplay until user interacts with the page.
        logger.warn("BG music play failed:", error.message);
        if (!musicStarted) musicStarted = false;
      });
  } else if (backgroundMusic && !backgroundMusic.paused) {
    // If already playing, ensure mute state is correct
    backgroundMusic.muted = isMuted;
  }
}

/** Plays a short sound effect */
function playSound(soundFile, volume = 1.0) {
  try {
    const sound = new Audio(soundFile); // Path relative to HTML
    sound.volume = volume;
    sound
      .play()
      .catch((error) => logger.error(`Sound play error ${soundFile}:`, error));
    logger.debug(`Playing sound: ${soundFile}`);
  } catch (e) {
    logger.error(`Sound creation/play fail ${soundFile}:`, e);
  }
}

// =============================================================================
// Timer Functions
// =============================================================================

/** Updates the timer display element with the current elapsed time (MM:SS) */
function updateTimerDisplay() {
  if (startTime === null || gameWon || !timerDisplay) return;
  elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
  timerDisplay.textContent = formatTime(elapsedSeconds).split(".")[0]; // Show only MM:SS
}

/** Starts the game timer if it's not already running and game isn't won */
function startTimer() {
  if (startTime === null && !gameWon) {
    logger.info("Starting timer...");
    startTime = Date.now();
    elapsedSeconds = 0;
    if (timerDisplay) timerDisplay.textContent = formatTime(0).split(".")[0];
    if (timerInterval) clearInterval(timerInterval); // Clear previous interval if any
    updateTimerDisplay(); // Show 00:00 immediately
    timerInterval = setInterval(updateTimerDisplay, 50); // Update frequently
  }
}

/** Stops the game timer and updates the display with the final time */
function stopTimer() {
  if (timerInterval !== null) {
    logger.info("Stopping timer.");
    clearInterval(timerInterval);
    timerInterval = null;
    if (startTime) {
      elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
      logger.info(`Final time: ${elapsedSeconds}s`);
      if (timerDisplay) timerDisplay.textContent = formatTime(elapsedSeconds).split(".")[0];
    }
  } else if (startTime === null) {
    // If timer was stopped before it ever started, reset display
    elapsedSeconds = 0;
    if (timerDisplay) timerDisplay.textContent = formatTime(0).split(".")[0];
  }
}

/** Resets the timer state and display to zero */
function resetTimer() {
  logger.info("Resetting timer.");
  stopTimer();
  startTime = null;
  elapsedSeconds = 0;
  if (timerDisplay) timerDisplay.textContent = formatTime(0).split(".")[0];
}

// =============================================================================
// Image & Maze Utility Functions
// =============================================================================

/** Preloads the winner trophy image */
function preloadTrophyImage() {
  trophyImg = new Image();
  trophyImg.src = "static/winnertrophy.png"; // Path relative to HTML
  trophyImg.onload = () => logger.info("Trophy image loaded!");
  trophyImg.onerror = () => logger.error("Trophy image loading error.");
}

/** Finds the first passage (0) cell, typically top-left, as the start */
function findStartPosition() {
  if (!maze || maze.length === 0) return { x: 1, y: 1 }; // Fallback
  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < (maze[y]?.length || 0); x++) {
      if (maze[y][x] === 0) return { x, y };
    }
  }
  logger.error("No start position (passage=0) found in maze data!");
  return { x: 1, y: 1 }; // Fallback if no passage found
}

/** Finds the last passage (0) cell, typically bottom-right, as the goal */
function findGoalPosition() {
  if (!maze || maze.length === 0 || maze[0].length === 0) return { x: 1, y: 1 }; // Fallback
  for (let y = maze.length - 1; y >= 0; y--) {
    for (let x = (maze[y]?.length || 0) - 1; x >= 0; x--) {
      if (maze[y][x] === 0) return { x, y };
    }
  }
  logger.error("No goal position (passage=0) found in maze data!");
  // Fallback: guess bottom-right passage coordinate
  return { x: Math.max(1, maze[0].length - 2), y: Math.max(1, maze.length - 2) };
}

// =============================================================================
// Leaderboard Functions
// =============================================================================

/**
 * Updates the leaderboard list in the DOM with formatted entries.
 * @param {Array} scoresToDisplay The top N scores for the current filter.
 * @param {string} currentFilter The current filter value ('all' or dimension).
 */
function displayLeaderboard(scoresToDisplay, currentFilter) {
  if (!leaderboardList) {
    logger.error("Leaderboard list element missing for display!");
    return;
  }
  logger.debug(`Displaying ${scoresToDisplay.length} scores for filter: ${currentFilter}`);
  leaderboardList.innerHTML = ""; // Clear previous entries

  if (!scoresToDisplay || scoresToDisplay.length === 0) {
    const message = `<li class="message">No scores yet for this ${
      currentFilter === "all" ? "leaderboard" : "size"
    }!</li>`;
    leaderboardList.innerHTML = message;
    return;
  }

  // Create and append list items for each score
  scoresToDisplay.forEach((score, index) => {
    const li = document.createElement("li");
    const rank = `${index + 1}.`.padEnd(4); // Rank number (1., 2., ...)
    const name = escapeHtml(String(score.name || "Unknown")).padEnd(15); // Name (padded)
    const time = formatTime(Number(score.time || 0)); // Formatted time
    const dimensionStr = `(${score.dimension || "?"}x${score.dimension || "?"})`; // Dimension string

    // Use spans for easier CSS targeting and structure
    li.innerHTML = `
            <span class="lb-rank">${rank}</span>
            <span class="lb-name">${name}</span>
            <span class="lb-time">${time}</span>
            ${currentFilter === "all" ? `<span class="lb-dim">${dimensionStr}</span>` : ""}
        `;
    li.classList.add("leaderboard-entry");
    leaderboardList.appendChild(li);
  });
}

/** Filters the full local leaderboard based on dropdown and displays top N */
function filterAndDisplayLeaderboard() {
  if (!leaderboardFilterSelect || !allLeaderboardScores) {
    logger.error("Cannot filter leaderboard: elements or data missing.");
    return;
  }
  const selectedDim = leaderboardFilterSelect.value;
  logger.info(`Filtering leaderboard for dimension: ${selectedDim}`);

  let filteredScores = [];
  // Filter and sort based on selection
  if (selectedDim === "all") {
    filteredScores = [...allLeaderboardScores].sort(
      (a, b) => (a.time ?? Infinity) - (b.time ?? Infinity)
    );
  } else {
    filteredScores = allLeaderboardScores
      .filter((score) => score.dimension == selectedDim) // Use == for string comparison to number if needed
      .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  }

  // Slice to get only the top N entries for display
  const scoresForDisplay = filteredScores.slice(0, MAX_LEADERBOARD_ENTRIES_DISPLAY);
  displayLeaderboard(scoresForDisplay, selectedDim);
}

/** Fetches the complete leaderboard from the API and updates the display */
async function fetchLeaderboard() {
  logger.info("Fetching full leaderboard...");
  if (!leaderboardList) {
    logger.error("Leaderboard list element not found during fetch.");
    return;
  }
  leaderboardList.innerHTML = '<li class="message">Loading...</li>'; // Show loading message
  try {
    const response = await fetch("/api/get_leaderboard"); // API returns all scores
    if (!response.ok) {
      let errorMsg = `HTTP error! Status: ${response.status}`;
      try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* ignore if no json body */ }
      throw new Error(errorMsg);
    }
    const scores = await response.json();
    if (!Array.isArray(scores)) {
      logger.error("Leaderboard data received is not an array:", scores);
      throw new Error("Invalid data format from server.");
    }
    allLeaderboardScores = scores; // Store the full list locally
    logger.info(`Stored ${allLeaderboardScores.length} total scores locally.`);
    filterAndDisplayLeaderboard(); // Filter and display the top N
  } catch (error) {
    logger.error("Error fetching/processing leaderboard:", error);
    allLeaderboardScores = []; // Reset local scores on error
    if (leaderboardList) leaderboardList.innerHTML = '<li class="message">Error loading scores.</li>';
  }
}

// =============================================================================
// Score Submission & Ranking Functions
// =============================================================================

/**
 * Submits a completed game score to the backend API.
 * @param {string} name Player name.
 * @param {number} timeInSeconds Time taken in seconds.
 * @param {number} dimension Maze dimension.
 * @returns {Promise<{rankData: object|null, error: string|null}>} Rank data or error info.
 */
async function submitScore(name, timeInSeconds, dimension) {
  const trimmedName = name ? name.trim() : "";
  logger.info(`Submitting score: Name='${trimmedName}', Time=${timeInSeconds.toFixed(3)}s, Dim=${dimension}`);

  // Client-side validation
  if (!trimmedName) {
    logger.warn("Submit: empty name.");
    return { rankData: null, error: "Empty name." };
  }
  if (typeof timeInSeconds !== "number" || timeInSeconds < 0 || !isFinite(timeInSeconds)) {
    logger.error("Submit: Invalid time.", timeInSeconds);
    return { rankData: null, error: "Invalid time." };
  }
  // Ensure dimension is valid (should be, but good practice)
  if (typeof dimension !== "number" || dimension <= 0) {
    logger.error("Submit: Invalid dimension.", dimension);
    return { rankData: null, error: "Invalid dimension." };
  }

  try {
    const scoreData = { name: trimmedName, time: timeInSeconds, dimension: dimension };
    // Send score to the backend
    const response = await fetch("/api/add_score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(scoreData),
    });
    logger.info(`Add score API status: ${response.status}`);
    if (!response.ok) {
      // Try to parse error from backend response
      let errorMsg = `Error ${response.status}`;
      try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { logger.warn("No JSON error body from server on failed score submission."); }
      throw new Error(errorMsg);
    }
    logger.info("Score submitted successfully to backend.");
    if (statusMessage) statusMessage.textContent = "Score saved!";

    // Refresh local leaderboard data *after* successful submission
    await fetchLeaderboard();
    // Calculate rank based on the newly refreshed full leaderboard
    const rankData = calculateUserRank(trimmedName, timeInSeconds, dimension);
    logger.info("Rank data after submission:", rankData);
    return { rankData: rankData, error: null }; // Return calculated rank data
  } catch (error) {
    logger.error("Error submitting score via API:", error);
    if (statusMessage) statusMessage.textContent = "Error saving score.";
    return { rankData: null, error: error.message }; // Return error info
  }
}

/**
 * Calculates the user's rank based on the locally stored full leaderboard data.
 * @param {string} username The player's name.
 * @param {number} time The player's time for this run.
 * @param {number} dimension The dimension for this run.
 * @returns {{overall: number|null, size: number|null}} Object containing overall and size-specific ranks.
 */
function calculateUserRank(username, time, dimension) {
  logger.info(`Calculating rank for ${username}, ${time.toFixed(3)}s, ${dimension}x${dimension}`);
  const ranks = { overall: null, size: null };

  if (!allLeaderboardScores || allLeaderboardScores.length === 0) {
    logger.warn("Rank calc: leaderboard data unavailable.");
    return ranks;
  }

  // Calculate overall rank
  const overallScores = [...allLeaderboardScores].sort(
    (a, b) => (a.time ?? Infinity) - (b.time ?? Infinity)
  );
  // Find the index of the submitted score in the sorted list
  const overallIdx = overallScores.findIndex(
    (s) =>
      s.name === username &&
      s.dimension === dimension &&
      Math.abs(s.time - time) < 0.0001 // Use tolerance for float comparison
  );
  if (overallIdx !== -1) {
    ranks.overall = overallIdx + 1; // Rank is 1-based
  } else {
    logger.warn("Rank calc: score not found in overall sorted list (possible timing mismatch?).");
  }

  // Calculate rank specific to the maze size
  const sizeSpecificScores = allLeaderboardScores
    .filter((score) => score.dimension === dimension)
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  const sizeIdx = sizeSpecificScores.findIndex(
    (s) => s.name === username && Math.abs(s.time - time) < 0.0001
  );
  if (sizeIdx !== -1) {
    ranks.size = sizeIdx + 1; // Rank is 1-based
  } else {
    logger.warn("Rank calc: score not found in size-specific list.");
  }

  logger.info("Rank calculation complete:", ranks);
  return ranks;
}

// =============================================================================
// UI Functions (Popups, Achievements, Toasts)
// =============================================================================

/**
 * Shows the win popup notification with time and rank info.
 * @param {number} time The time taken for the completed maze.
 * @param {object|null} rankData Object containing rank info, or null.
 * @param {number} dimension The dimension of the completed maze.
 * @param {boolean} requiresNamePrompt If true, indicates name prompt is needed later.
 */
function showPopup(time, rankData, dimension, requiresNamePrompt = false) {
  logger.info(`Showing popup. Time: ${time}, RankData: ${JSON.stringify(rankData)}, Dim: ${dimension}, Prompt: ${requiresNamePrompt}`);
  // Ensure all necessary popup elements exist
  if (!popupOverlayEl || !popupTimeEl || !popupRankOverallEl || !popupRankSizeEl || !popupPromptInfoEl) {
    logger.error("Cannot show popup: One or more popup DOM elements missing!");
    return;
  }

  // Clear any previous auto-dismiss timer
  if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }

  // Populate popup content
  popupTimeEl.textContent = `Your Time: ${formatTime(time)}`;
  popupRankOverallEl.textContent = rankData?.overall ? `Overall Rank: ${rankData.overall}` : "Overall Rank: N/A";
  popupRankSizeEl.textContent = rankData?.size ? `Rank for ${dimension}x${dimension}: ${rankData.size}` : `Rank for ${dimension}x${dimension}: N/A`;

  // Show/hide the prompt info text
  if (requiresNamePrompt) {
    popupPromptInfoEl.textContent = "Enter name when this closes to save score!";
    popupPromptInfoEl.style.display = "block";
  } else {
    popupPromptInfoEl.style.display = "none";
  }

  // Make overlay visible and trigger animation
  popupOverlayEl.style.display = "block";
  requestAnimationFrame(() => {
    popupOverlayEl.classList.add("visible");
  });

  // Set timer to automatically close the popup
  popupDismissTimer = setTimeout(hidePopup, 7000);
}

/** Hides the win popup notification and triggers post-win actions */
function hidePopup() {
  logger.info("Attempting to hide popup.");
  if (!popupOverlayEl || !popupOverlayEl.classList.contains("visible")) {
    logger.debug("Popup not visible or already hidden.");
    return;
  }
  // Clear auto-dismiss timer if manually closed
  if (popupDismissTimer) { clearTimeout(popupDismissTimer); popupDismissTimer = null; }

  popupOverlayEl.classList.remove("visible"); // Start CSS transition for fade out

  // Use transitionend event for cleanup *after* animation completes
  const onTransitionEnd = (event) => {
    if (event.target === popupOverlayEl && event.propertyName === "opacity") {
      logger.debug("Popup fade-out transition ended.");
      popupOverlayEl.style.display = "none"; // Set display none after transition
      popupOverlayEl.removeEventListener("transitionend", onTransitionEnd); // Clean up listener
      handlePostWinActions(); // Perform actions after popup is fully hidden
    }
  };
  popupOverlayEl.addEventListener("transitionend", onTransitionEnd);

  // Fallback safety timer in case transitionend doesn't fire
  setTimeout(() => {
    if (popupOverlayEl && popupOverlayEl.style.display !== "none" && !popupOverlayEl.classList.contains("visible")) {
      logger.warn("TransitionEnd fallback triggered for hidePopup.");
      popupOverlayEl.style.display = "none";
      if (popupOverlayEl.removeEventListener) popupOverlayEl.removeEventListener("transitionend", onTransitionEnd); // Ensure listener cleanup
      handlePostWinActions();
    }
  }, 350); // Should be slightly longer than the CSS transition duration
}

/** Handles actions after the win popup closes, specifically prompting for name if needed */
function handlePostWinActions() {
  logger.info("Handling post-win actions.");
  // Check if there's stored run info and if name is null (meaning prompt was deferred)
  if (lastCompletedRunInfo && lastCompletedRunInfo.name === null) {
    const { time, dimension } = lastCompletedRunInfo;
    logger.info(`Post-win: Prompting for name. Time: ${time.toFixed(3)}, Dim: ${dimension}`);
    const pName = prompt(`Finished in ${formatTime(time)}!\nEnter name for leaderboard:`, "");
    const trimmedName = pName ? pName.trim() : null;

    if (trimmedName) {
      logger.info(`Name entered: '${trimmedName}'. Saving to session and submitting.`);
      sessionStorage.setItem("mazeUsername", trimmedName); // Save name for subsequent runs
      lastCompletedRunInfo.name = trimmedName; // Update the stored info for this run
      // Submit the score now that we have the name
      submitScore(trimmedName, time, dimension).then(({ rankData, error }) => {
        if (!error) {
          logger.info(`Score submitted post-prompt: '${trimmedName}'. Rank:`, rankData);
          // Update status message with final confirmation and rank
          if (statusMessage) statusMessage.textContent = `Score saved as ${trimmedName}! Rank: ${rankData?.size || "N/A"} (size), ${rankData?.overall || "N/A"} (overall)`;
        } else {
          logger.error(`Error submitting post-prompt score for '${trimmedName}': ${error}`);
          if (statusMessage) statusMessage.textContent = "Error saving score post-prompt.";
        }
      });
    } else {
      // User cancelled prompt or entered empty name
      logger.info("Prompt cancelled/empty name. Score not saved.");
      if (statusMessage) statusMessage.textContent = "Score not saved (no name provided).";
    }
  } else if (lastCompletedRunInfo && lastCompletedRunInfo.name !== null) {
    logger.info("Post-win: Score was already submitted or handled previously.");
  } else {
    logger.info("Post-win: No pending score submission to handle.");
  }
  // Clear the temporary run info state
  lastCompletedRunInfo = null;
  logger.debug("Cleared lastCompletedRunInfo state.");
}

/** Checks achievements against definitions and updates unlocked set */
function checkAchievementsOnCompletion(completionData) {
  logger.info("Checking achievements for completion:", completionData);
  achievementState.mazeCompletions++; // Increment global completion count
  logger.info("Updated achievement state:", achievementState);
  const newlyUnlocked = [];
  // Iterate through all defined achievements
  for (const [id, definition] of Object.entries(ACHIEVEMENTS_DEFINITIONS)) {
    // Only check achievements that aren't already unlocked
    if (!unlockedAchievements.has(id)) {
      try {
        // Check if the criteria defined in the achievement definition are met
        if (definition.check(completionData, achievementState)) {
          logger.info(`Unlocked: ${id} - ${definition.name}`);
          unlockedAchievements.add(id); // Add to the set of unlocked achievements
          newlyUnlocked.push(id); // Add to list for notification
        }
      } catch (e) {
        logger.error(`Error checking achievement ${id}:`, e);
      }
    }
  }
  logger.info("Newly unlocked achievement IDs this run:", newlyUnlocked);
  return newlyUnlocked;
}

/** Updates the achievements list display in the DOM */
function displayAchievements() {
  if (!achievementsList) { logger.error("Achievements list element missing!"); return; }
  logger.debug("Displaying achievements list.");
  achievementsList.innerHTML = ""; // Clear previous list
  if (Object.keys(ACHIEVEMENTS_DEFINITIONS).length === 0) {
    achievementsList.innerHTML = '<li class="message">No achievements defined.</li>';
    return;
  }
  // Create list items for each achievement, marking locked/unlocked status
  Object.entries(ACHIEVEMENTS_DEFINITIONS).forEach(([id, definition]) => {
    const li = document.createElement("li");
    const isUnlocked = unlockedAchievements.has(id);
    li.classList.add("achievement-item", isUnlocked ? "unlocked" : "locked");
    // Add checkmark emoji if unlocked
    li.innerHTML = `<strong>${isUnlocked ? "✅ " : ""}${escapeHtml(definition.name)}</strong><span>${escapeHtml(definition.description)}</span>`;
    achievementsList.appendChild(li);
  });
}

/** Shows toast notifications for newly unlocked achievements */
function displayAchievementNotification(newlyUnlockedIds) {
  if (!toastContainer) { logger.warn("Toast container not found, cannot display notifications."); return; }
  newlyUnlockedIds.forEach((id, index) => {
    const definition = ACHIEVEMENTS_DEFINITIONS[id];
    if (!definition) return; // Skip if definition missing

    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.textContent = `🏆 Achievement Unlocked: ${definition.name}!`;
    toastContainer.appendChild(toast);

    // Delay appearance slightly for staggered effect if multiple unlock
    setTimeout(() => {
      toast.classList.add("show");
    }, 100 + index * 300);

    // Set timeout to hide and remove the toast
    setTimeout(() => {
      toast.classList.remove("show");
      // Remove from DOM only after the fade-out transition completes
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 4000 + index * 300); // Adjust duration as needed
  });
}

// =============================================================================
// Maze Drawing & Game Logic
// =============================================================================

/** Main drawing function, called via requestAnimationFrame */
function drawMaze() {
  requestAnimationFrame(() => {
    // Essential checks before drawing
    if (!maze || maze.length === 0 || !ctx) {
      return;
    }
    const rows = maze.length;
    const cols = maze[0].length;

    // --- Calculate Responsive Tile Size ---
    const mazeDisplayArea = document.querySelector(".grid-maze-display");
    const canvasContainer = document.getElementById("canvas-container");
    if (!mazeDisplayArea || !canvasContainer) { logger.error("Layout elements missing for drawing"); return; }

    const displayAreaWidth = mazeDisplayArea.clientWidth;
    const displayAreaHeight = mazeDisplayArea.clientHeight;
    const ccs = getComputedStyle(canvasContainer); // Canvas container computed style
    // Available space inside container padding
    const availableWidth = displayAreaWidth - (parseFloat(ccs.paddingLeft) || 0) - (parseFloat(ccs.paddingRight) || 0);
    const availableHeight = displayAreaHeight - (parseFloat(ccs.paddingTop) || 0) - (parseFloat(ccs.paddingBottom) || 0);

    // Check for valid drawing space
    if (availableWidth <= 0 || availableHeight <= 0) { logger.warn(`No drawing space available. W:${availableWidth}, H:${availableHeight}`); if (canvas) { canvas.width = 50; canvas.height = 50; } return; } // Avoid zero/negative size
    // Determine max tile size based on space and maze dimensions
    const maxSide = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight)));
    if (cols <= 0 || rows <= 0) { logger.error("Invalid maze dimensions for drawing"); if (canvas) { canvas.width = 0; canvas.height = 0; } return; }
    tileSize = Math.max(1, Math.floor(maxSide / Math.max(cols, rows))); // Ensure at least 1px tile size

    // --- Set Canvas Dimensions ---
    const finalCanvasWidth = tileSize * cols;
    const finalCanvasHeight = tileSize * rows;
    // Only resize if necessary to prevent flicker/redraws
    if (canvas.width !== finalCanvasWidth || canvas.height !== finalCanvasHeight) {
      logger.debug(`Canvas resize: ${finalCanvasWidth}x${finalCanvasHeight} (Tile: ${tileSize}px)`);
      canvas.width = finalCanvasWidth;
      canvas.height = finalCanvasHeight;
    }

    // --- Clear Canvas ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Draw Maze Grid ---
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const drawX = c * tileSize;
        const drawY = r * tileSize;
        if (maze[r]?.[c] === 1) ctx.fillStyle = "black"; // Wall
        else if (r === goal.y && c === goal.x) ctx.fillStyle = "green"; // Goal
        else ctx.fillStyle = "white"; // Passage
        if (tileSize > 0) ctx.fillRect(drawX, drawY, tileSize, tileSize);
      }
    }

    // --- Draw Solution Path (Optional) ---
    if (solutionPath?.length > 0 && tileSize > 0) {
      ctx.fillStyle = "rgba(50, 205, 50, 0.55)"; // Semi-transparent green
      solutionPath.forEach(([pC, pR]) => { // path coords C, R (x, y)
        // Avoid drawing solution over current player or goal square
        if (!((pR === player.y && pC === player.x) || (pR === goal.y && pC === goal.x))) {
          ctx.fillRect(pC * tileSize, pR * tileSize, tileSize, tileSize);
        }
      });
    }

    // --- Draw Player Trail ---
    if (tileSize > 0 && playerTrailHistory.length > 0) {
      playerTrailHistory.forEach((pos, i) => {
        // Calculate fading alpha based on trail position (age)
        const ageRatio = MAX_TRAIL_LENGTH > 1 ? Math.min(i / (MAX_TRAIL_LENGTH - 1), 1) : 1;
        let alpha = TRAIL_MAX_ALPHA - (TRAIL_MAX_ALPHA - TRAIL_MIN_ALPHA) * ageRatio;
        alpha = Math.max(TRAIL_MIN_ALPHA, Math.min(TRAIL_MAX_ALPHA, alpha)); // Clamp alpha
        ctx.fillStyle = `rgba(${playerTrailColorRGB}, ${alpha})`; // Use cached RGB color string
        ctx.fillRect(pos.x * tileSize, pos.y * tileSize, tileSize, tileSize);
      });
    }

    // --- Draw Player ---
    if (tileSize > 0) {
      ctx.fillStyle = playerColor;
      ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
    }

    // --- Draw Win Trophy ---
    // Ensure image is loaded (complete & has dimensions) before drawing
    if (gameWon && statusMessage?.textContent.includes("🎉") && trophyImg?.complete && trophyImg.naturalWidth > 0 && tileSize > 0) {
      ctx.drawImage(trophyImg, goal.x * tileSize, goal.y * tileSize, tileSize, tileSize);
    }
  });
}

/** Fetches and loads a new maze from the API, resetting game state */
async function loadMaze(dimension) {
  // If win popup is visible, hide it first
  if (popupOverlayEl?.classList.contains("visible")) {
    logger.info("New maze load requested while popup is visible. Hiding popup.");
    hidePopup();
  }

  dimension = parseInt(dimension); // Ensure dimension is an integer
  if (isNaN(dimension)) {
    logger.error("Invalid dimension passed to loadMaze, defaulting to 5.");
    dimension = 5;
  }

  logger.info(`Loading maze: ${dimension}x${dimension}`);
  if (statusMessage) statusMessage.textContent = "Loading Maze...";
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous maze

  // Reset game state variables
  maze = [];
  currentMazeDimension = dimension;
  gameWon = false;
  resetTimer();
  solutionPath = [];
  playerTrailHistory = [];
  if (instructionsP) instructionsP.style.display = "block"; // Re-show instructions

  tryStartMusic(); // Attempt to start music if interaction occurred

  try {
    // Fetch maze data from the backend API
    const response = await fetch(`/api/generate_maze/${currentMazeDimension}`);
    if (!response.ok) throw new Error(`Network error generating maze: ${response.status}`);
    const data = await response.json();
    // Basic validation of received data
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
      throw new Error("Invalid maze data received from server");
    }
    maze = data;
    player = findStartPosition(); // Determine start/goal from the new maze
    goal = findGoalPosition();
    logger.info(`Maze loaded. Start:(${player.x},${player.y}), Goal:(${goal.x},${goal.y})`);
    if (statusMessage) statusMessage.textContent = ""; // Clear "Loading..."

    // Trigger initial draw of the new maze
    requestAnimationFrame(() => { drawMaze(); logger.debug("New maze drawn in loadMaze callback."); });
  } catch (error) {
    logger.error("Load maze error:", error);
    if (statusMessage) statusMessage.textContent = `Error loading maze: ${error.message}`;
    maze = []; // Ensure maze is empty on error
    if (ctx) ctx.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0); // Clear canvas
  }
}

/**
 * Handles player movement based on dx, dy changes.
 * Updates player position, trail, checks for win condition.
 * @param {number} dx Change in x-coordinate (-1, 0, or 1).
 * @param {number} dy Change in y-coordinate (-1, 0, or 1).
 */
function movePlayer(dx, dy) {
  if (gameWon) return; // Ignore moves if game already won

  const nextX = player.x + dx;
  const nextY = player.y + dy;

  // Check if the next position is a valid passage within the maze bounds
  if (
    nextY >= 0 && nextY < maze.length &&
    nextX >= 0 && nextX < (maze[0]?.length || 0) &&
    maze[nextY][nextX] === 0
  ) {
    // Update trail: Add previous position to front, remove oldest if too long
    playerTrailHistory.unshift({ x: player.x, y: player.y });
    if (playerTrailHistory.length > MAX_TRAIL_LENGTH) playerTrailHistory.pop();

    startTimer(); // Ensure timer starts on the first valid move
    player.x = nextX; // Update player position
    player.y = nextY;
    drawMaze(); // Redraw the game state

    // --- Check for Win Condition ---
    if (player.x === goal.x && player.y === goal.y) {
      logger.info("Goal reached!");
      gameWon = true;
      stopTimer(); // Stop timer and capture final time
      const finalTime = elapsedSeconds;
      const finalDimension = currentMazeDimension;

      // Store info about this run temporarily for potential submission
      lastCompletedRunInfo = { time: finalTime, dimension: finalDimension, name: null };
      logger.info("Stored last run info for win:", JSON.stringify(lastCompletedRunInfo));

      // Update UI: win message, hide instructions
      if (statusMessage) statusMessage.textContent = "🎉 You reached the exit! Well done! 🎉";
      if (instructionsP) instructionsP.style.display = "none";

      // Check for achievements and display notifications/update list
      const newlyUnlockedIds = checkAchievementsOnCompletion({ dimension: finalDimension, time: finalTime });
      if (newlyUnlockedIds.length > 0) {
        displayAchievementNotification(newlyUnlockedIds);
        displayAchievements();
      }

      // Audio feedback for winning
      if (backgroundMusic && !backgroundMusic.paused) backgroundMusic.pause();
      playSound("static/snake_sound.m4a"); // Path relative to HTML

      // Handle score submission logic (direct or deferred via popup)
      const savedUsername = sessionStorage.getItem("mazeUsername");
      if (savedUsername) {
        logger.info(`Username '${savedUsername}' found in session storage. Submitting score directly.`);
        lastCompletedRunInfo.name = savedUsername; // Set name before submitting
        submitScore(savedUsername, finalTime, finalDimension).then(
          ({ rankData, error }) => {
            if (error) logger.error(`Error submitting score for ${savedUsername}: ${error}`);
            else logger.info(`Score submitted for ${savedUsername}. Rank data:`, rankData);
            showPopup(finalTime, rankData, finalDimension, false); // Show popup (no prompt needed)
          }
        );
      } else {
        logger.info("No username in session storage. Showing popup; will prompt for name after close.");
        showPopup(finalTime, null, finalDimension, true); // Show popup (prompt needed later)
      }
    }
  }
}

/** Fetches and displays the maze solution path from the API */
async function solveMaze() {
  if (!maze || maze.length === 0 || gameWon) return; // Can't solve if no maze or game won
  if (statusMessage) statusMessage.textContent = "Solving...";
  tryStartMusic(); // Ensure audio context is active
  solutionPath = []; // Clear any previous solution
  drawMaze(); // Redraw without old path

  try {
    const response = await fetch("/api/solve_maze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maze: maze, start: player, goal: goal }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => null); // Try parsing error body
      const errMsg = errData?.error || `Server error ${response.status}`;
      throw new Error(errMsg);
    }
    const result = await response.json();
    if (result.path?.length > 0) {
      solutionPath = result.path;
      if (statusMessage) statusMessage.textContent = "✅ Solution Path Shown!";
    } else {
      if (statusMessage) statusMessage.textContent = "❌ No solution found by solver.";
      solutionPath = [];
    }
  } catch (error) {
    logger.error("Solve Maze API Error:", error);
    if (statusMessage) statusMessage.textContent = `Error solving: ${error.message}`;
    solutionPath = [];
  } finally {
    // Redraw maze, showing the solution if found, or clearing it if not
    drawMaze();
  }
}

// =============================================================================
// Initialization and Event Listeners
// =============================================================================

/** Main initialization function called after DOM is loaded */
function initializeGame() {
  logger.info("Initializing game...");

  // --- Get DOM Element References ---
  canvas = document.getElementById("gameCanvas");
  if (canvas && typeof canvas.getContext === 'function') {
    ctx = canvas.getContext("2d");
  } else {
    logger.error("CRITICAL: Could not find gameCanvas element or get 2D context!");
    if (document.body) document.body.innerHTML = "<p style='color:red; font-size:2em; text-align:center;'>Error: Game canvas is missing or not supported. Cannot initialize.</p>";
    return; // Stop initialization if canvas is unusable
  }
  // Assign other elements
  newMazeBtn = document.getElementById("generate-maze-btn");
  solveMazeBtn = document.getElementById("solve-maze-btn");
  mazeSizeSelect = document.getElementById("mazeSizeSelect");
  statusMessage = document.getElementById("statusMessage");
  instructionsP = document.getElementById("instructions");
  timerDisplay = document.getElementById("timerDisplay");
  leaderboardList = document.getElementById("leaderboardList");
  muteBtn = document.getElementById("mute-btn");
  leaderboardFilterSelect = document.getElementById("leaderboardFilterSelect");
  achievementsList = document.getElementById("achievementsList");
  toastContainer = document.getElementById("toast-container");
  popupOverlayEl = document.getElementById("winPopupOverlay");
  popupContentEl = popupOverlayEl?.querySelector(".popup-content"); // Use optional chaining
  popupTimeEl = document.getElementById("popupTime");
  popupRankOverallEl = document.getElementById("popupRankOverall");
  popupRankSizeEl = document.getElementById("popupRankSize");
  popupPromptInfoEl = document.getElementById("popupPromptInfo");
  closePopupBtnEl = document.getElementById("closePopupBtn");
  snakeColorSelectEl = document.getElementById("snakeColorSelect");

  // --- Check for Critical Element Existence ---
  const criticalElements = { newMazeBtn, solveMazeBtn, mazeSizeSelect, statusMessage, leaderboardList, leaderboardFilterSelect, achievementsList, toastContainer, popupOverlayEl, popupContentEl, popupTimeEl, popupRankOverallEl, popupRankSizeEl, popupPromptInfoEl, closePopupBtnEl, snakeColorSelectEl, timerDisplay, instructionsP };
  let initializationOk = true;
  Object.entries(criticalElements).forEach(([name, el]) => {
    if (!el) {
      logger.error(`Init fail: Required DOM element '${name}' is missing!`);
      initializationOk = false;
    }
  });
  if (!initializationOk && statusMessage) {
      statusMessage.textContent = "Page Initialization Error! Some UI elements are missing.";
      // Consider disabling controls here if elements are crucial
  }

  // --- Initial Setup ---
  preloadTrophyImage();
  setupAudio();
  // Set initial player color and dimension from selects, with defaults
  playerColor = snakeColorSelectEl?.value || "red";
  playerTrailColorRGB = convertCssColorToRgbString(playerColor);
  currentMazeDimension = parseInt(mazeSizeSelect?.value || "5");

  // --- Load Initial Data & Display ---
  loadMaze(currentMazeDimension); // Load initial maze
  fetchLeaderboard(); // Fetch initial leaderboard data
  displayAchievements(); // Display initial achievement status

  // --- Attach Event Listeners (using optional chaining for safety) ---
  newMazeBtn?.addEventListener("click", () => {
    logger.info("Generate New Maze button clicked.");
    // Get current dimension from select when clicked
    loadMaze(parseInt(mazeSizeSelect?.value || "5"));
  });

  solveMazeBtn?.addEventListener("click", () => {
    logger.info("Solve Maze button clicked.");
    solveMaze();
  });

  muteBtn?.addEventListener("click", toggleMute);

  leaderboardFilterSelect?.addEventListener("change", filterAndDisplayLeaderboard);

  snakeColorSelectEl?.addEventListener("change", (event) => {
    playerColor = event.target.value;
    playerTrailColorRGB = convertCssColorToRgbString(playerColor);
    logger.info(`Player color changed to: ${playerColor}`);
    // Redraw immediately only if game is active
    if (!gameWon && maze?.length > 0) {
      drawMaze();
    }
  });

  closePopupBtnEl?.addEventListener("click", () => {
    logger.info("Popup close button clicked.");
    hidePopup();
  });

  popupOverlayEl?.addEventListener("click", (event) => {
    // Close only if clicking directly on the overlay background
    if (event.target === popupOverlayEl) {
      logger.info("Popup overlay clicked (outside content).");
      hidePopup();
    }
  });

  // --- Global Event Listeners ---
  document.addEventListener("keydown", handleKeyDown); // Keyboard input
  window.addEventListener("resize", debouncedDrawMaze); // Responsive redraw

  logger.info("Game initialized successfully.");
}

/** Debounced function for handling window resize events */
const debouncedDrawMaze = debounce(() => {
  logger.debug("Debounced resize event - redrawing maze.");
  if (maze?.length > 0) {
    drawMaze(); // Redraw with potentially new dimensions/tile size
  }
}, 200); // Debounce timeout

/** Handles keyboard input for player movement and solving */
function handleKeyDown(event) {
  // Try starting music on first relevant keypress if not started
  if (startTime === null && !gameWon) tryStartMusic();

  // Ignore input if game is already won
  if (gameWon) {
    // Prevent default browser action for game keys even after winning
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "e", "E",].includes(event.key)) {
        event.preventDefault();
    }
    return;
  }

  // Define movement mappings (WASD and Arrow Keys)
  const moves = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  };

  // Handle movement keys
  if (moves[event.key]) {
    event.preventDefault(); // Prevent page scrolling with arrow keys
    movePlayer(...moves[event.key]);
  }

  // Handle solve key (E)
  if (event.key === "e" || event.key === "E") {
    event.preventDefault();
    solveMaze();
  }
}

// --- Start Initialization ---
// Wait for the DOM to be fully loaded before running initialization logic
document.addEventListener("DOMContentLoaded", initializeGame);