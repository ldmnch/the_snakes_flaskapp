from flask import Flask, render_template, jsonify
from maze_generator import get_maze_as_list

app = Flask(__name__)

@app.route("/")
@app.route("/home")
def default_home():
    return render_template('base.html')

@app.route("/game")
@app.route("/index")
@app.route("/start")
@app.route("/maze")
def maze():
    return render_template("index.html")

@app.route("/api/generate_maze/<int:dimension>")
def generate_maze_api(dimension):
    # Limit the dimension to a reasonable range
    dimension = max(3, min(dimension, 10))
    maze_data = get_maze_as_list(dimension)
    return jsonify(maze_data)

if __name__ == "__main__":
    app.run(debug=True)