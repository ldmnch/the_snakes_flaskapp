from flask import Flask, render_template, jsonify, request
import json
import os
from datetime import datetime, timezone
import sys

# Assuming src modules are in the correct path relative to flask_app.py
from src.maze_generator import Maze
from src.maze_solver import MazeSolver

app = Flask(__name__)

# --- Constants ---
LEADERBOARD_FILE = 'leaderboard.json'
MAX_LEADERBOARD_ENTRIES = 10
VALID_DIMENSIONS = {3, 5, 7, 10, 15, 20, 100} # Define valid maze sizes if needed

# --- Logging Helpers ---
def log_error(message):
    print(f"ERROR: {message}", file=sys.stderr)
def log_info(message):
    print(f"INFO: {message}", file=sys.stdout)

# --- Permission Check ---
def check_permissions():
    directory = os.path.dirname(os.path.abspath(LEADERBOARD_FILE)) or '.'
    has_perm = os.access(directory, os.W_OK)
    if not has_perm:
        log_error(f"Write permission denied for directory: {directory}.")
    else:
        log_info(f"Write permission OK for directory: {directory}")
    return has_perm
HAS_WRITE_PERMISSION = check_permissions()

# --- Leaderboard Helpers ---
def load_leaderboard():
    log_info(f"Attempting to load leaderboard from: {LEADERBOARD_FILE}")
    if not os.path.exists(LEADERBOARD_FILE):
        log_info("Leaderboard file not found, returning empty list.")
        return []
    try:
        with open(LEADERBOARD_FILE, 'r') as f:
            content = f.read()
            if not content.strip():
                log_info("Leaderboard file is empty, returning empty list.")
                return []
            scores = json.loads(content)
            if not isinstance(scores, list):
                 log_error(f"Leaderboard file content is not a list.")
                 return []
            log_info(f"Successfully loaded {len(scores)} scores.")
            return scores
    except (json.JSONDecodeError, IOError, Exception) as e:
        log_error(f"Error loading leaderboard: {e}")
        return []

def save_leaderboard(scores):
    if not HAS_WRITE_PERMISSION:
        log_error("Cannot save leaderboard due to lack of write permissions.")
        return False
    log_info(f"Attempting to save {len(scores)} scores.")
    try:
        # Sort by time primarily, maybe dimension secondarily? (Optional)
        scores.sort(key=lambda item: item.get('time', float('inf')))
        trimmed_scores = scores[:MAX_LEADERBOARD_ENTRIES]
        log_info(f"Saving top {len(trimmed_scores)} scores after trimming.")

        temp_file = LEADERBOARD_FILE + '.tmp'
        with open(temp_file, 'w') as f:
            json.dump(trimmed_scores, f, indent=4)
        os.replace(temp_file, LEADERBOARD_FILE)
        log_info(f"Leaderboard saved successfully to {LEADERBOARD_FILE}")
        return True
    except (IOError, Exception) as e:
        log_error(f"Error saving leaderboard: {e}")
        if os.path.exists(temp_file):
            try: os.remove(temp_file)
            except OSError as remove_err: log_error(f"Error removing temp file '{temp_file}': {remove_err}")
        return False

# --- Routes ---
@app.route("/")
@app.route("/home")
def home():
    return render_template("index.html")

@app.route("/maze")
def maze():
    return render_template("game.html")

@app.route("/api/generate_maze/<int:dimension>")
def generate_maze_api(dimension):
    log_info(f"Request received to generate maze with dimension: {dimension}")
    # Ensure dimension is valid if using a predefined set
    if dimension not in VALID_DIMENSIONS:
         dimension = 5 # Default to 5 if invalid requested
         log_info(f"Invalid dimension requested, defaulting to {dimension}.")
    # Or use clamping: dimension = max(3, min(dimension, 100))

    try:
        maze = Maze(dimension=dimension)
        maze.generate()
        maze_list = maze.to_list()
        log_info(f"Maze generated successfully ({dimension}x{dimension})")
        return jsonify(maze_list)
    except Exception as e:
        log_error(f"Error generating maze: {e}")
        return jsonify({"error": "Failed to generate maze"}), 500

@app.route("/api/solve_maze", methods=['POST'])
def solve_maze_api():
    # ... (solve maze logic - no changes needed here) ...
    log_info("Request received to solve maze.")
    data = request.get_json()
    if not data or not all(k in data for k in ('maze', 'start', 'goal')):
        log_error("Solve request missing maze, start, or goal data.")
        return jsonify({"error": "Missing maze, start, or goal data"}), 400
    if not isinstance(data.get('maze'), list) or \
       not isinstance(data.get('start'), dict) or \
       not isinstance(data.get('goal'), dict):
        log_error("Solve request has invalid data types for maze, start, or goal.")
        return jsonify({"error": "Invalid data types for maze, start, or goal"}), 400
    try:
        start_tuple = (int(data['start']['x']), int(data['start']['y']))
        goal_tuple  = (int(data['goal']['x']), int(data['goal']['y']))
        maze_data = data['maze']
        log_info(f"Solving maze from {start_tuple} to {goal_tuple}")
        maze_solver = MazeSolver(maze_data)
        path = maze_solver.solve(start_tuple, goal_tuple)
        log_info(f"Solver finished. Path found: {'Yes' if path else 'No'}")
        return jsonify({"path": path})
    except (ValueError, TypeError, KeyError, IndexError) as e:
         log_error(f"Input Data Error for Solver: {e}")
         return jsonify({"error": "Invalid input data format for solver"}), 400
    except Exception as e:
        log_error(f"Solver Error: {e}")
        return jsonify({"error": "Failed to solve maze due to an internal error"}), 500


# --- MODIFY /api/add_score ---
@app.route('/api/add_score', methods=['POST'])
def add_score_api():
    """API endpoint to add a score (with dimension) to the leaderboard."""
    log_info("Request received to add score.")
    data = request.get_json()

    # Add check for 'dimension'
    if not data or 'name' not in data or 'time' not in data or 'dimension' not in data:
        log_error("Add score request missing 'name', 'time', or 'dimension'.")
        return jsonify({"error": "Missing 'name', 'time', or 'dimension' in request"}), 400

    try:
        name = str(data['name']).strip()[:30] # Limit name length
        time = float(data['time'])
        dimension = int(data['dimension']) # Expect dimension as integer

        if not name:
            log_error("Add score request has empty name.")
            return jsonify({"error": "Name cannot be empty"}), 400
        if time < 0:
             log_error(f"Add score request has invalid time: {time}")
             return jsonify({"error": "Invalid time value"}), 400
        # Validate dimension against known sizes
        if dimension not in VALID_DIMENSIONS:
             log_error(f"Add score request has invalid dimension: {dimension}")
             return jsonify({"error": f"Invalid dimension value: {dimension}"}), 400

        log_info(f"Processing score: Name='{name}', Time={time}, Dimension={dimension}")

    except (ValueError, TypeError) as e:
        log_error(f"Invalid data types in add score request: {e}")
        return jsonify({"error": "Invalid data types for name, time, or dimension"}), 400

    scores = load_leaderboard()
    new_score = {
        "name": name,
        "time": time,
        "dimension": dimension, # Include dimension in the saved score
        "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    }
    scores.append(new_score)

    if save_leaderboard(scores):
        log_info("Score added and leaderboard saved.")
        return jsonify({"success": True, "message": "Score added"}), 201
    else:
        log_error("Failed to save leaderboard after adding score.")
        return jsonify({"error": "Failed to save leaderboard"}), 500
# --- END MODIFICATION ---

@app.route('/api/get_leaderboard', methods=['GET'])
def get_leaderboard_api():
    """API endpoint to retrieve the full leaderboard."""
    # No change needed here - still returns all scores
    log_info("Request received to get leaderboard.")
    scores = load_leaderboard()
    log_info(f"Returning {len(scores)} scores from leaderboard.")
    return jsonify(scores)

if __name__ == "__main__":
    log_info("Starting Flask application...")
    if not HAS_WRITE_PERMISSION:
        log_error("Note: Leaderboard saving WILL likely fail due to directory permissions.")
    app.run(debug=True)