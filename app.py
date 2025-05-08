from flask import Flask, render_template, jsonify, request
from werkzeug.exceptions import BadRequest
import json
import os
from datetime import datetime, timezone
import sys
import logging

from src.maze_generator import Maze # Core maze generation logic
from src.maze_solver import MazeSolver   # Core maze solving logic

# --- Application Setup ---
app = Flask(__name__)

# --- Configuration ---
app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', '0').lower() in ['true', '1', 't']

# Leaderboard configuration - uses a 'data' subdirectory
data_dir = os.path.join(app.root_path, 'data')
app.config['LEADERBOARD_FILE'] = os.path.join(data_dir, 'leaderboard.json')
app.config['MAX_LEADERBOARD_ENTRIES'] = 10

# --- Logging Setup ---
log_level = logging.DEBUG if app.config['DEBUG'] else logging.INFO
logging.basicConfig(
    stream=sys.stdout,
    level=log_level,
    format='%(asctime)s %(levelname)-8s %(name)-12s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)
if app.config['DEBUG']:
    logger.info("Flask application running in DEBUG mode.")

# --- Ensure data directory exists ---
if not os.path.exists(data_dir):
    try:
        os.makedirs(data_dir)
        logger.info(f"Created data directory: {data_dir}")
    except OSError as e:
        logger.error(f"Could not create data directory {data_dir}: {e}. Leaderboard functionality may fail.")
        # Depending on requirements, this could be a fatal error for the app.

# --- Constants ---
VALID_DIMENSIONS = {3, 5, 7, 10, 15, 20, 100}

# --- Permission Check (for Leaderboard Directory) ---
def check_leaderboard_permissions() -> bool:
    leaderboard_dir = os.path.dirname(app.config['LEADERBOARD_FILE'])
    has_perm = os.access(leaderboard_dir, os.W_OK)
    if not has_perm:
        logger.error(f"Write permission denied for leaderboard directory: {leaderboard_dir}.")
    else:
        logger.info(f"Write permission OK for leaderboard directory: {leaderboard_dir}.")
    return has_perm
HAS_WRITE_PERMISSION_FOR_LEADERBOARD = check_leaderboard_permissions()

# --- Leaderboard Helpers ---
def load_leaderboard() -> list:
    leaderboard_file = app.config['LEADERBOARD_FILE']
    if not os.path.exists(leaderboard_file):
        return []
    try:
        with open(leaderboard_file, 'r') as f:
            content = f.read()
            if not content.strip(): return []
            scores = json.loads(content)
            return scores if isinstance(scores, list) else []
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Error loading leaderboard from '{leaderboard_file}': {e}")
        return []

def save_leaderboard(scores: list) -> bool:
    if not HAS_WRITE_PERMISSION_FOR_LEADERBOARD:
        logger.error("Cannot save leaderboard: Write permission denied for directory.")
        return False

    leaderboard_file = app.config['LEADERBOARD_FILE']
    max_entries = app.config['MAX_LEADERBOARD_ENTRIES']
    temp_file = leaderboard_file + '.tmp'

    try:
        scores.sort(key=lambda item: item.get('time', float('inf')))
        trimmed_scores = scores[:max_entries]
        with open(temp_file, 'w') as f:
            json.dump(trimmed_scores, f, indent=4)
        os.replace(temp_file, leaderboard_file) # Atomic write
        logger.info(f"Leaderboard saved successfully to {leaderboard_file}")
        return True
    except (OSError, Exception) as e: # Catch OSError for file operations and other unexpected errors
        logger.exception(f"Error saving leaderboard to '{leaderboard_file}'", exc_info=True)
        if os.path.exists(temp_file):
            try: os.remove(temp_file)
            except OSError as remove_err: logger.error(f"Error removing temp file '{temp_file}': {remove_err}")
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
def generate_maze_api(dimension: int):
    logger.info(f"Request to generate maze with dimension: {dimension}")
    effective_dimension = dimension
    if dimension not in VALID_DIMENSIONS:
         effective_dimension = 5 # Default for invalid (but parsable int) dimension
         logger.warning(f"Dimension {dimension} invalid, defaulting to {effective_dimension}.")

    try:
        maze_obj = Maze(dimension=effective_dimension)
        maze_obj.generate()
        logger.info(f"Maze generated successfully ({effective_dimension}x{effective_dimension})")
        return jsonify(maze_obj.to_list())
    except Exception as e:
        logger.exception(f"Error generating maze (dim: {effective_dimension})", exc_info=True)
        return jsonify({"error": "Failed to generate maze"}), 500

@app.route("/api/solve_maze", methods=['POST'])
def solve_maze_api():
    logger.info("Request to solve maze.")
    data = None
    try:
        data = request.get_json()
        if data is None: # Handles empty or 'null' JSON payload
            return jsonify({"error": "Missing or empty JSON data"}), 400

        required_keys = ('maze', 'start', 'goal')
        if not all(k in data for k in required_keys):
            return jsonify({"error": f"Missing one or more required keys: {', '.join(required_keys)}"}), 400
        
        if not isinstance(data.get('maze'), list) or \
           not isinstance(data.get('start'), dict) or \
           not isinstance(data.get('goal'), dict):
            return jsonify({"error": "Invalid data types for maze, start, or goal"}), 400

        start_tuple = (int(data['start']['x']), int(data['start']['y']))
        goal_tuple  = (int(data['goal']['x']), int(data['goal']['y']))
        
        solver = MazeSolver(data['maze'])
        path = solver.solve(start_tuple, goal_tuple)
        logger.info(f"Solver finished. Path found: {'Yes' if path else 'No'}")
        return jsonify({"path": path})

    except BadRequest as e: # Malformed JSON or bad request type
        logger.warning(f"Bad request for solve_maze: {e.description}")
        return jsonify({"error": getattr(e, 'description', "Malformed JSON or bad request")}), 400
    except (ValueError, TypeError, KeyError, IndexError) as e: # Invalid data content/structure
         logger.warning(f"Input Data Error for Solver: {e} (Data: {str(data)[:200]})")
         return jsonify({"error": "Invalid input data format for solver"}), 400
    except Exception as e:
        logger.exception(f"Unexpected Solver Error (Data: {str(data)[:200]})", exc_info=True)
        return jsonify({"error": "Failed to solve maze due to an internal error"}), 500

@app.route('/api/add_score', methods=['POST'])
def add_score_api():
    logger.info("Request to add score.")
    data = None
    try:
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Missing or empty JSON data"}), 400
            
        required_keys = ('name', 'time', 'dimension')
        if not all(k in data for k in required_keys):
            return jsonify({"error": f"Missing one or more required keys: {', '.join(required_keys)}"}), 400

        name = str(data['name']).strip()[:30]
        time = float(data['time'])
        dimension = int(data['dimension'])

        if not name: return jsonify({"error": "Name cannot be empty"}), 400
        if time < 0: return jsonify({"error": "Invalid time value"}), 400
        if dimension not in VALID_DIMENSIONS:
             return jsonify({"error": f"Invalid dimension value: {dimension}"}), 400
        logger.info(f"Processing score: Name='{name}', Time={time}, Dimension={dimension}")

    except BadRequest as e:
        logger.warning(f"Bad request for add_score: {e.description}")
        return jsonify({"error": getattr(e, 'description', "Malformed JSON or bad request")}), 400
    except (ValueError, TypeError) as e:
        logger.warning(f"Invalid data types in add_score request: {e} (Data: {str(data)[:200]})")
        return jsonify({"error": "Invalid data types for name, time, or dimension"}), 400
    except Exception as e:
        logger.exception(f"Unexpected error processing add_score data (Data: {str(data)[:200]})", exc_info=True)
        return jsonify({"error": "Internal server error processing request"}), 500

    scores = load_leaderboard()
    scores.append({
        "name": name, "time": time, "dimension": dimension,
        "timestamp": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    })

    if save_leaderboard(scores):
        return jsonify({"success": True, "message": "Score added"}), 201
    else:
        # Specific error already logged by save_leaderboard
        return jsonify({"error": "Failed to save leaderboard"}), 500

@app.route('/api/get_leaderboard', methods=['GET'])
def get_leaderboard_api():
    logger.info("Request to get leaderboard.")
    scores = load_leaderboard()
    return jsonify(scores)

if __name__ == "__main__":
    logger.info("Starting Flask application via direct execution (app.py)...")
    if not HAS_WRITE_PERMISSION_FOR_LEADERBOARD: # Check specific permission
        logger.warning("Leaderboard saving may fail due to directory permissions.")
    # For production, use a WSGI server (e.g., Gunicorn).
    # Debug mode is controlled by app.config['DEBUG'] set from FLASK_DEBUG env var.
    app.run(host='0.0.0.0', port=5000)