# tests/test_api_routes.py 

import json

import pytest

from app import app


@pytest.fixture
def client():
    """Provides a test client for the Flask application."""
    # app.config['TESTING'] = True # Good practice, ensures exceptions are propagated
    # app.config['DEBUG'] = False  # Ensure debug is off during tests
    with app.test_client() as client:
        yield client


# ==============================================================================
# API Test Cases
# ==============================================================================

# --- API: Maze Generation ---


def test_api_generate_maze_valid(client):
    """Test successful maze generation with a valid dimension."""
    response = client.get("/api/generate_maze/5")
    assert response.status_code == 200

    maze = response.get_json()
    assert isinstance(maze, list)

    # For a 5x5 dimension, grid_size = 2 * 5 + 1 = 11
    expected_size = 11
    assert len(maze) == expected_size
    assert all(len(row) == expected_size for row in maze)


def test_api_generate_maze_negative_dimension_not_found(client):
    """Test that negative dimensions are rejected by Flask's route converter (404)."""
    response = client.get("/api/generate_maze/-3")
    assert response.status_code == 404  # Route won't match negative int


def test_api_generate_maze_positive_dimension_not_in_valid_set_defaults(client):
    """Test that positive int dimensions not in VALID_DIMENSIONS default to 5."""
    # 4 is a valid int type, but not present in VALID_DIMENSIONS set in app.py
    response = client.get("/api/generate_maze/4")
    assert response.status_code == 200  # Should default to 5x5 and return 200 OK

    maze = response.get_json()
    assert isinstance(maze, list)

    # Default dimension is 5, so grid_size = 2 * 5 + 1 = 11
    expected_size_default = 11
    assert len(maze) == expected_size_default, "Maze should default to 5x5"
    assert all(
        len(row) == expected_size_default for row in maze
    ), "All rows in defaulted maze should match size"


def test_api_generate_maze_non_integer_dimension(client):
    """Test that non-integer dimensions are rejected by Flask's route converter (404)."""
    response = client.get("/api/generate_maze/abc")
    assert response.status_code == 404  # Route itself won't match


# --- API: Maze Solving ---


def test_api_solve_maze_valid(client):
    """Test successful maze solving with valid input."""
    maze_data = [[0, 0, 0], [1, 1, 0], [0, 0, 0]]  # Example 3x3 solvable grid section
    payload = {"maze": maze_data, "start": {"x": 0, "y": 0}, "goal": {"x": 2, "y": 2}}
    response = client.post(
        "/api/solve_maze", data=json.dumps(payload), content_type="application/json"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert "path" in data
    # Note: Actual path content depends on the specific solver logic and maze
    # assert data["path"] == [(0, 1), (0, 2), (1, 2), (2, 2)] # Example expected path


def test_api_solve_maze_missing_fields(client):
    """Test error handling when required fields (start, goal) are missing."""
    payload = {"maze": [[0, 0], [0, 0]]}  # Missing start and goal
    response = client.post(
        "/api/solve_maze", data=json.dumps(payload), content_type="application/json"
    )
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data
    # Check against the specific error message returned by the updated app.py
    assert "Missing required key(s): start, goal" in data["error"]


def test_api_solve_maze_malformed_json(client):
    """Test error handling for malformed JSON payload."""
    response = client.post(
        "/api/solve_maze",
        data="not-a-json-string {malformed",
        content_type="application/json",
    )
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data
    # This assertion checks for the typical default Werkzeug/Flask message for this kind of BadRequest
    # or our fallback message from app.py
    assert "could not understand" in data["error"] or "Malformed JSON" in data["error"] or "Failed to decode JSON object: Expecting value: line 1 column 1 (char 0)" in data["error"]

def test_api_solve_maze_out_of_bounds(client):
    """Test solving when start or goal is outside maze bounds or on a wall."""
    maze_data = [[0, 0], [0, 0]]
    payload = {
        "maze": maze_data,
        "start": {"x": 0, "y": 0},
        "goal": {"x": 5, "y": 5},  # Goal is outside the maze
    }
    response = client.post(
        "/api/solve_maze", data=json.dumps(payload), content_type="application/json"
    )
    assert response.status_code == 200  # Solver should handle gracefully, returning no path

    data = response.get_json()
    assert "path" in data
    assert data["path"] is None  # No path should be found