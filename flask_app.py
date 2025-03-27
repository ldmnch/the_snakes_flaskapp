from flask import Flask, render_template, jsonify
from maze_generator import get_maze_as_list

app = Flask(__name__)

# Homepage Route
@app.route("/")
@app.route("/home")
def home():
    return render_template("index.html")

# Maze/Game Route
@app.route("/maze")
def maze():
    return render_template("game.html")

# API Route for Maze Generation
@app.route("/api/generate_maze/<int:dimension>")
def generate_maze_api(dimension):
    # Limit dimension to a reasonable range (between 3 and 10)
    dimension = max(3, min(dimension, 10))
    maze_data = get_maze_as_list(dimension)
    return jsonify(maze_data)

if __name__ == "__main__":
    app.run(debug=True)
