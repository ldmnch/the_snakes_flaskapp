from flask import Flask, render_template, jsonify
from maze_generator import get_maze_as_list  # Importing maze generator logic

app = Flask(__name__)

# --- Landing Page ---
@app.route("/")
@app.route("/home")
def default_home():
    return render_template("index.html")  # Loads the landing page (with logo & Start button)

# --- Main Maze Game Page ---
@app.route("/game")
@app.route("/start")
def maze():
    return render_template("game.html")  # Loads the actual game page with maze and JS logic

# --- API Route to Serve Maze Data as JSON ---
@app.route("/api/maze")
def get_maze():
    maze_data = get_maze_as_list(11)  # Generates a fixed 11x11 maze
    return jsonify(maze_data)         # Returns maze as JSON to JavaScript frontend

# --- Run the Flask App ---
if __name__ == "__main__":
    app.run(debug=True)
