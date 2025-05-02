from flask import Flask, render_template, jsonify, request
from src.maze_generator import Maze
from src.maze_solver import MazeSolver

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

    maze = Maze(dimension=dimension)
    maze.generate()
    maze_list = maze.to_list()

    return jsonify(maze_list) 

# API Route for Maze Solving
@app.route("/api/solve_maze", methods=['POST'])
def solve_maze_api():
    data = request.get_json()
    if not all(k in data for k in ('maze', 'start', 'goal')):
        return jsonify({"error": "Missing maze, start, or goal data"}), 400

    try:
        # Convert JS {x, y} to Python (x, y)
        start_tuple = (data['start']['x'], data['start']['y'])
        goal_tuple = (data['goal']['x'], data['goal']['y'])

        maze_solver = MazeSolver(data['maze'])

        path = maze_solver.solve(start_tuple, goal_tuple)
        return jsonify({"path": path}) # path will be list or None

    except Exception as e:
        print(f"Solver Error: {e}") # Log error server-side
        return jsonify({"error": "Failed to solve maze"}), 500

if __name__ == "__main__":
    app.run(debug=True)
