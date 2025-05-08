import pytest
import json
from app import app # Assuming app.py is in the project root or discoverable by pytest

@pytest.fixture
def client():
    # app.config['TESTING'] = True # Good practice, but not strictly "necessary" for existing tests to run
    with app.test_client() as client:
        yield client

# --- API: Maze Generation ---

def test_api_generate_maze_valid(client):
    response = client.get('/api/generate_maze/5')
    assert response.status_code == 200
    maze = response.get_json()
    assert isinstance(maze, list)
    # For a 5x5 dimension, grid_size = 2 * 5 + 1 = 11
    expected_size = 11
    assert len(maze) == expected_size
    assert all(len(row) == expected_size for row in maze)

def test_api_generate_maze_negative_dimension_not_found(client):
    # Flask's default <int:dimension> converter rejects negative numbers.
    response = client.get('/api/generate_maze/-3')
    assert response.status_code == 404  # Route won't match negative int

def test_api_generate_maze_positive_dimension_not_in_valid_set_defaults(client):
    # Test with a positive integer that is not in VALID_DIMENSIONS (e.g., 4)
    # app.py logic should default this to dimension 5.
    response = client.get('/api/generate_maze/4') # 4 is a valid int, but not in VALID_DIMENSIONS
    assert response.status_code == 200 # Should default to 5x5 and return 200 OK
    maze = response.get_json()
    assert isinstance(maze, list)
    # Default dimension is 5, so grid_size = 2 * 5 + 1 = 11
    expected_size_default = 11
    assert len(maze) == expected_size_default, "Maze should default to 5x5"
    assert all(len(row) == expected_size_default for row in maze), "All rows in defaulted maze should match size"

def test_api_generate_maze_non_integer_dimension(client):
    # Test with a non-integer string for dimension, which Flask's <int:dimension> converter will reject.
    response = client.get('/api/generate_maze/abc')
    assert response.status_code == 404 # Route itself won't match

# --- API: Maze Solving ---

def test_api_solve_maze_valid(client):
    maze_data = [
        [0, 0, 0],
        [1, 1, 0],
        [0, 0, 0]
    ]
    payload = {
        "maze": maze_data,
        "start": {"x": 0, "y": 0},
        "goal": {"x": 2, "y": 2}
    }
    response = client.post('/api/solve_maze', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == 200
    data = response.get_json()
    assert "path" in data

def test_api_solve_maze_missing_fields(client):
    payload = {"maze": [[0, 0], [0, 0]]}  # Missing start and goal
    response = client.post('/api/solve_maze', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    # CORRECTED ASSERTION: Match the actual error message from app.py
    assert "Missing one or more required keys: maze, start, goal" in data["error"]

def test_api_solve_maze_malformed_json(client):
    response = client.post('/api/solve_maze', data="not-a-json-string {malformed", content_type='application/json')
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    # This assertion checks for the typical default Werkzeug/Flask message for this kind of BadRequest
    # or our fallback message from app.py
    assert "could not understand" in data["error"] or "Malformed JSON" in data["error"]

def test_api_solve_maze_out_of_bounds(client):
    maze_data = [[0, 0], [0, 0]]
    payload = {
        "maze": maze_data,
        "start": {"x": 0, "y": 0},
        "goal": {"x": 5, "y": 5} # Goal is outside the maze
    }
    response = client.post('/api/solve_maze', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == 200 # Solver should handle this gracefully
    data = response.get_json()
    assert "path" in data
    assert data["path"] is None # No path should be found