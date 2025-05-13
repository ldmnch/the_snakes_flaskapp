# app.py

# --- Standard Library Imports ---
import json
import logging
import os
import sys
from datetime import datetime, timezone

# --- Third-party Library Imports ---
from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import BadRequest

# --- Application-specific Imports ---
from src.maze_generator import Maze
from src.maze_solver import MazeSolver

# ==============================================================================
# Application Setup & Configuration
# ==============================================================================

# Initialize Flask App
app = Flask(__name__)

# --- Core Configuration ---
# Debug Mode: Controlled by FLASK_DEBUG environment variable (1=True, 0/unset=False)
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "0").lower() in ["true", "1", "t"]

# Leaderboard File Configuration
# Uses a 'data' subdirectory within the application's root path.
data_dir = os.path.join(app.root_path, "data")
app.config["LEADERBOARD_FILE"] = os.path.join(data_dir, "leaderboard.json")
# Config for how many leaderboard entries to show per category in the frontend.
app.config["MAX_LEADERBOARD_ENTRIES_DISPLAY"] = 10

# --- Logging Configuration ---
log_level = logging.DEBUG if app.config["DEBUG"] else logging.INFO
# Basic configuration logs to standard output.
logging.basicConfig(
    stream=sys.stdout,
    level=log_level,
    format="%(asctime)s %(levelname)-8s %(name)-12s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
# Get a logger specific to this application module.
logger = logging.getLogger(__name__)
if app.config["DEBUG"]:
    logger.info("Flask application running in DEBUG mode.")

# --- Ensure Data Directory ---
# Create the data directory at startup if it doesn't exist.
if not os.path.exists(data_dir):
    try:
        os.makedirs(data_dir)
        logger.info(f"Created data directory: {data_dir}")
    except OSError as e:
        logger.error(
            f"Could not create data directory {data_dir}: {e}. "
            "Leaderboard functionality may fail."
        )

# --- Global Constants ---
VALID_DIMENSIONS = {3, 5, 7, 10, 15, 20, 100}  # Allowed maze dimensions


# --- Permission Check ---
def check_leaderboard_permissions() -> bool:
    """Checks if the application has write permissions for the leaderboard directory."""
    leaderboard_dir = os.path.dirname(app.config["LEADERBOARD_FILE"])
    has_perm = os.access(leaderboard_dir, os.W_OK)
    if not has_perm:
        logger.error(f"Write permission denied for leaderboard directory: {leaderboard_dir}.")
    else:
        logger.info(f"Write permission OK for leaderboard directory: {leaderboard_dir}.")
    return has_perm


# Check permissions at startup for an early warning. Runtime checks handle actual operations.
HAS_WRITE_PERMISSION_FOR_LEADERBOARD = check_leaderboard_permissions()


# ==============================================================================
# Leaderboard Helper Functions
# ==============================================================================


def load_leaderboard() -> list:
    """Loads all scores from the leaderboard JSON file."""
    leaderboard_file = app.config["LEADERBOARD_FILE"]
    if not os.path.exists(leaderboard_file):
        return []  # Return empty list if file doesn't exist

    try:
        with open(leaderboard_file, "r") as f:
            content = f.read()
            # Handle empty file case
            if not content.strip():
                return []
            scores = json.loads(content)
            # Ensure loaded data is a list
            return scores if isinstance(scores, list) else []
    except (json.JSONDecodeError, OSError) as e:
        # Log errors during file reading or JSON parsing
        logger.error(f"Error loading leaderboard from '{leaderboard_file}': {e}")
        return []  # Return empty list on error


def save_leaderboard(scores: list) -> bool:
    """Saves the complete list of scores to the leaderboard JSON file atomically."""
    if not HAS_WRITE_PERMISSION_FOR_LEADERBOARD:
        logger.error("Cannot save leaderboard: Write permission denied for directory.")
        return False

    leaderboard_file = app.config["LEADERBOARD_FILE"]
    temp_file = leaderboard_file + ".tmp"  # Temporary file for atomic write

    try:
        # Sort all scores by time for consistent file ordering
        scores.sort(key=lambda item: item.get("time", float("inf")))

        # Write the complete list of scores to the temporary file
        with open(temp_file, "w") as f:
            json.dump(scores, f, indent=4)

        # Atomically replace the old leaderboard with the new one
        os.replace(temp_file, leaderboard_file)
        logger.info(
            f"Leaderboard with {len(scores)} scores saved successfully to {leaderboard_file}"
        )
        return True
    except (OSError, Exception) as e:
        # Catch file operation errors or any other unexpected issues
        logger.exception(f"Error saving leaderboard to '{leaderboard_file}'", exc_info=True)
        # Attempt to clean up the temporary file if it still exists after an error
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError as remove_err:
                logger.error(f"Error removing temp file '{temp_file}': {remove_err}")
        return False


# ==============================================================================
# Flask Routes
# ==============================================================================


# --- HTML Page Routes ---
@app.route("/")
@app.route("/home")
def home():
    """Serves the landing page."""
    return render_template("index.html")


@app.route("/maze")
def maze():
    """Serves the main game page."""
    return render_template("game.html")


# --- API Routes ---
@app.route("/api/generate_maze/<int:dimension>")
def generate_maze_api(dimension: int):
    """Generates a new maze of the specified dimension."""
    logger.info(f"Request to generate maze with dimension: {dimension}")
    effective_dimension = dimension
    # Default to a standard size if the requested dimension is not in the allowed set
    if dimension not in VALID_DIMENSIONS:
        effective_dimension = 5
        logger.warning(
            f"Dimension {dimension} invalid, defaulting to {effective_dimension}."
        )

    try:
        maze_obj = Maze(dimension=effective_dimension)
        maze_obj.generate()
        logger.info(f"Maze generated successfully ({effective_dimension}x{effective_dimension})")
        # Return the maze grid as a JSON list
        return jsonify(maze_obj.to_list())
    except Exception:
        # Log unexpected errors during maze generation
        logger.exception(
            f"Error generating maze (dim: {effective_dimension})", exc_info=True
        )
        return jsonify({"error": "Failed to generate maze"}), 500


@app.route("/api/solve_maze", methods=["POST"])
def solve_maze_api():
    """Solves the provided maze from start to goal using BFS."""
    logger.info("Request to solve maze.")
    data = None
    try:
        # Parse JSON data from the request body
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Missing or empty JSON data"}), 400

        # Validate required keys
        required_keys = ("maze", "start", "goal")
        if not all(k in data for k in required_keys):
            missing_keys = ", ".join(k for k in required_keys if k not in data)
            return jsonify({"error": f"Missing required key(s): {missing_keys}"}), 400

        # Validate data types
        if (
            not isinstance(data.get("maze"), list)
            or not isinstance(data.get("start"), dict)
            or not isinstance(data.get("goal"), dict)
        ):
            return jsonify({"error": "Invalid data types for maze, start, or goal"}), 400

        # Extract and validate start/goal coordinates
        start_x = data["start"].get("x")
        start_y = data["start"].get("y")
        goal_x = data["goal"].get("x")
        goal_y = data["goal"].get("y")

        if None in (start_x, start_y, goal_x, goal_y):
             return jsonify({"error": "Missing 'x' or 'y' in start/goal coordinates"}), 400

        start_tuple = (int(start_x), int(start_y))
        goal_tuple = (int(goal_x), int(goal_y))

        # Solve the maze
        solver = MazeSolver(data["maze"])
        path = solver.solve(start_tuple, goal_tuple)
        logger.info(f"Solver finished. Path found: {'Yes' if path else 'No'}")
        return jsonify({"path": path})

    except BadRequest as e:
        # Handle malformed JSON or other request issues detected by Flask/Werkzeug
        logger.warning(f"Bad request for solve_maze: {e.description}")
        return jsonify({"error": getattr(e, "description", "Malformed JSON or bad request")}), 400
    except (ValueError, TypeError, KeyError, IndexError) as e:
        # Handle errors related to invalid data content/structure after JSON parsing
        logger.warning(f"Input Data Error for Solver: {e} (Data: {str(data)[:200]})")
        return jsonify({"error": "Invalid input data format for solver"}), 400
    except Exception:
        # Catch-all for unexpected errors during solving
        logger.exception(f"Unexpected Solver Error (Data: {str(data)[:200]})", exc_info=True)
        return jsonify({"error": "Failed to solve maze due to an internal error"}), 500


@app.route("/api/add_score", methods=["POST"])
def add_score_api():
    """Adds a new score to the leaderboard."""
    logger.info("Request to add score.")
    data = None
    try:
        # Parse and validate incoming JSON data
        data = request.get_json()
        if data is None:
            return jsonify({"error": "Missing or empty JSON data"}), 400

        required_keys = ("name", "time", "dimension")
        if not all(k in data for k in required_keys):
            missing_keys = ", ".join(k for k in required_keys if k not in data)
            return jsonify({"error": f"Missing required key(s): {missing_keys}"}), 400

        # Extract and validate score details
        name = str(data["name"]).strip()[:30]  # Limit name length
        time = float(data["time"])
        dimension = int(data["dimension"])

        # Business logic validation
        if not name:
            return jsonify({"error": "Name cannot be empty"}), 400
        if time < 0:
            return jsonify({"error": "Invalid time value"}), 400
        if dimension not in VALID_DIMENSIONS:
            return jsonify({"error": f"Invalid dimension value: {dimension}"}), 400
        logger.info(f"Processing score: Name='{name}', Time={time}, Dimension={dimension}")

    except BadRequest as e:
        # Handle malformed JSON / bad request
        logger.warning(f"Bad request for add_score: {e.description}")
        return jsonify({"error": getattr(e, "description", "Malformed JSON or bad request")}), 400
    except (ValueError, TypeError) as e:
        # Handle invalid data types after JSON parsing
        logger.warning(f"Invalid data types in add_score request: {e} (Data: {str(data)[:200]})")
        return jsonify({"error": "Invalid data types for name, time, or dimension"}), 400
    except Exception:
        # Catch-all for other unexpected validation errors
        logger.exception(
            f"Unexpected error processing add_score data (Data: {str(data)[:200]})",
            exc_info=True,
        )
        return jsonify({"error": "Internal server error processing request"}), 500

    # Load existing scores, append new score, and save
    scores = load_leaderboard()
    scores.append(
        {
            "name": name,
            "time": time,
            "dimension": dimension,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
    )

    if save_leaderboard(scores):
        return jsonify({"success": True, "message": "Score added"}), 201  # 201 Created
    else:
        # Error should have been logged by save_leaderboard
        return jsonify({"error": "Failed to save leaderboard"}), 500


@app.route("/api/get_leaderboard", methods=["GET"])
def get_leaderboard_api():
    """Retrieves the complete leaderboard."""
    logger.info("Request to get leaderboard.")
    scores = load_leaderboard()  # Returns the full list
    return jsonify(scores)


# ==============================================================================
# Main Execution Block
# ==============================================================================

if __name__ == "__main__":
    # This block runs only when the script is executed directly (e.g., python app.py)
    # It's primarily for local development.
    logger.info("Starting Flask application via direct execution (app.py)...")
    if not HAS_WRITE_PERMISSION_FOR_LEADERBOARD:
        logger.warning("Leaderboard saving may fail due to directory permissions.")

    # Run the Flask development server.
    # Host '0.0.0.0' makes it accessible on the network.
    # Debug mode is controlled by app.config['DEBUG'] set from FLASK_DEBUG env var.
    # For production, use a proper WSGI server like Gunicorn or uWSGI.
    app.run(host="0.0.0.0", port=5000)