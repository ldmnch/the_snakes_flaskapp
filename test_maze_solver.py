# test_maze_solver.py

import pytest
from maze_solver import find_path_bfs

# --- Correctness Tests ---

def test_find_path_simple():
    """Tests finding a simple, direct path."""
    maze = [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1], # Start (1,1)
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1], # Goal (3,3)
        [1, 1, 1, 1, 1]
    ]
    start = (1, 1)
    goal = (3, 3)
    # Expected path goes down, then right
    expected_path = [(1, 2), (1, 3), (2, 3), (3, 3)]
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path == expected_path

def test_no_path_found():
    """Tests a maze where the goal is unreachable."""
    maze = [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1], # Start (1,1)
        [1, 1, 1, 1, 1], # Wall blocking
        [1, 0, 1, 0, 1], # Goal (1,3) - unreachable
        [1, 1, 1, 1, 1]
    ]
    start = (1, 1)
    goal = (1, 3)
    expected_path = None
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path == expected_path

def test_start_equals_goal():
    """Tests the case where the start and goal are the same."""
    maze = [
        [1, 1, 1],
        [1, 0, 1], # Start/Goal (1,1)
        [1, 1, 1]
    ]
    start = (1, 1)
    goal = (1, 1)
    # Path excludes start, so should be empty list
    expected_path = []
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path == expected_path

def test_path_requires_backtracking():
    """Tests a maze with dead ends requiring backtracking."""
    maze = [
        #  0 1 2 3 4 5 6   <- X indices
        [1, 1, 1, 1, 1, 1, 1], # 0 Y index
        [1, 0, 0, 0, 1, 0, 1], # 1 Start(1,1) ; Dead end at (5,1)
        [1, 1, 1, 0, 1, 0, 1], # 2
        [1, 0, 0, 0, 0, 0, 1], # 3 Path goes through here
        [1, 0, 1, 1, 1, 1, 1], # 4 Wall forces path down/left
        [1, 0, 0, 0, 0, 0, 1], # 5 Goal(5,5)
        [1, 1, 1, 1, 1, 1, 1]  # 6
    ]
    start = (1, 1)
    goal = (5, 5)
    # Correct shortest path, manually traced:
    expected_path = [
        (2, 1), (3, 1), (3, 2), (3, 3), (2, 3), (1, 3),
        (1, 4), (1, 5), (2, 5), (3, 5), (4, 5), (5, 5)
    ]
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path == expected_path

def test_path_boundaries():
    """Tests path finding when start or goal are near/at boundaries."""
    maze = [
        [0, 0, 1, 1, 1], # Start (0,0)
        [1, 0, 0, 0, 1],
        [1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0], # Goal (4,3)
        [1, 1, 1, 1, 1]
    ]
    start = (0, 0)
    goal = (4, 3)
    # Path: (0,0)->(1,0)->(1,1)->(2,1)->(3,1)->(3,2)->(3,3)->(4,3) is one possibility
    # Let BFS find it, just check it finds *a* valid path of correct length
    expected_min_len = 7 # Manually count shortest path steps (8 nodes total - 1 start)
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path is not None
    assert len(actual_path) == expected_min_len
    # Optionally, check the last step is the goal
    assert actual_path[-1] == goal

def test_large_maze_path():
    """Tests finding a path in a conceptually larger maze structure."""
    # This is a 5x5 internal maze (11x11 grid)
    maze = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], # Start (1,1)
        [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1], # Wall near end
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], # Goal (9,9)
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
    start = (1, 1)
    goal = (9, 9)
    actual_path = find_path_bfs(maze, start, goal)
    assert actual_path is not None
    # Verify the path is valid (connects start to goal through 0s)
    assert len(actual_path) > 0 # Path must have steps
    assert actual_path[-1] == goal # Must end at the goal

    # Basic path validity check (ensure sequence is connected and on path cells)
    last_pos = start
    visited_in_path = {start}
    for step in actual_path:
        assert maze[step[1]][step[0]] == 0, f"Step {step} is not a valid path cell (0)"
        # Check step is adjacent to the previous position
        dx = abs(step[0] - last_pos[0])
        dy = abs(step[1] - last_pos[1])
        assert (dx == 1 and dy == 0) or (dx == 0 and dy == 1), f"Step {step} is not adjacent to {last_pos}"
        # Check for duplicates in path (BFS shouldn't produce cycles)
        assert step not in visited_in_path, f"Step {step} visited multiple times in path"
        visited_in_path.add(step)
        last_pos = step

# --- Helper to run tests if script is executed directly ---
if __name__ == "__main__":
     pytest.main() # Runs all tests in this file