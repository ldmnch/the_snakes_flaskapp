import pytest
import json
from app import app

@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

# --- API: Maze Generation ---

def test_api_generate_maze_valid(client):
    response = client.get('/api/generate_maze/5')
    assert response.status_code == 200
    maze = response.get_json()
    assert isinstance(maze, list)
    expected_size = 2 * 5 + 1 #Adjust based on how Maze works (actual grid incudes walls)
    assert len(maze) == expected_size
    assert all(len(row) == expected_size for row in maze)

def test_api_generate_maze_invalid_dimension(client):
    response = client.get('/api/generate_maze/-3')
    assert response.status_code == 404  # route won't match negative int

# --- API: Maze Solving ---

def test_api_solve_maze_valid(client):
    maze = [
        [0, 0, 0],
        [1, 1, 0],
        [0, 0, 0]
    ]
    payload = {
        "maze": maze,
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
    assert "error" in response.get_json()

def test_api_solve_maze_invalid_json(client):
    response = client.post('/api/solve_maze', data="not-a-json", content_type='application/json')
    assert response.status_code in (400, 500)

def test_api_solve_maze_out_of_bounds(client):
    maze = [[0, 0], [0, 0]]
    payload = {
        "maze": maze,
        "start": {"x": 0, "y": 0},
        "goal": {"x": 5, "y": 5}
    }
    response = client.post('/api/solve_maze', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == 200
    data = response.get_json()
    assert data["path"] is None 

