#tests/test_maze_solver.py 

import pytest

from src.maze_solver import MazeSolver


# ==============================================================================
# MazeSolver Correctness Tests
# ==============================================================================


def test_find_path_simple():
    """Tests finding a simple, direct path without obstacles."""
    maze = [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],  # Start (1,1) -> y=1, x=1
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],  # Goal (3,3) -> y=3, x=3
        [1, 1, 1, 1, 1],
    ]
    start = (1, 1)
    goal = (3, 3)
    # Expected path: (1,1) -> (1,2) -> (1,3) -> (2,3) -> (3,3)
    # Returned path excludes start node
    expected_path = [(1, 2), (1, 3), (2, 3), (3, 3)]

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)
    assert actual_path == expected_path


def test_no_path_found():
    """Tests a maze where the goal is blocked by walls and unreachable."""
    maze = [
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],  # Start (1,1)
        [1, 1, 1, 1, 1],  # Wall blocking path
        [1, 0, 1, 0, 1],  # Goal (1,3) is unreachable
        [1, 1, 1, 1, 1],
    ]
    start = (1, 1)
    goal = (1, 3)
    expected_path = None  # Expect None when no path exists

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)
    assert actual_path == expected_path


def test_start_equals_goal():
    """Tests the trivial case where the start and goal coordinates are identical."""
    maze = [
        [1, 1, 1],
        [1, 0, 1],  # Start/Goal (1,1)
        [1, 1, 1],
    ]
    start = (1, 1)
    goal = (1, 1)
    # BFS should find the goal immediately. Path excludes start, so result is empty list.
    expected_path = []

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)
    assert actual_path == expected_path


def test_path_requires_backtracking():
    """Tests a maze with dead ends forcing the BFS algorithm to backtrack."""
    maze = [
        # fmt: off
        #   0  1  2  3  4  5  6   <- X indices
        [1, 1, 1, 1, 1, 1, 1],  # 0 Y index
        [1, 0, 0, 0, 1, 0, 1],  # 1 Start(1,1) ; Dead end at (5,1)
        [1, 1, 1, 0, 1, 0, 1],  # 2
        [1, 0, 0, 0, 0, 0, 1],  # 3 Path must go through here
        [1, 0, 1, 1, 1, 1, 1],  # 4 Wall forces path down/left from (1,3)
        [1, 0, 0, 0, 0, 0, 1],  # 5 Goal(5,5)
        [1, 1, 1, 1, 1, 1, 1],  # 6
        # fmt: on
    ]
    start = (1, 1)
    goal = (5, 5)
    # Manually determined shortest path for verification
    # (1,1)->(2,1)->(3,1)->(3,2)->(3,3)->(2,3)->(1,3)->(1,4)->(1,5)->(2,5)->(3,5)->(4,5)->(5,5)
    expected_path = [
        (2, 1), (3, 1), (3, 2), (3, 3), (2, 3), (1, 3), (1, 4),
        (1, 5), (2, 5), (3, 5), (4, 5), (5, 5),
    ] # fmt: skip

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)
    assert actual_path == expected_path


def test_path_boundaries():
    """Tests path finding when start and/or goal are near maze boundaries."""
    maze = [
        [0, 0, 1, 1, 1],  # Start (0,0) -> y=0, x=0
        [1, 0, 0, 0, 1],
        [1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0],  # Goal (4,3) -> y=3, x=4
        [1, 1, 1, 1, 1],
    ]
    start = (0, 0)
    goal = (4, 3)
    # Manually determined shortest path length
    # (0,0)->(1,0)->(1,1)->(1,2)->(1,3)->(2,3)->(3,3)->(4,3) = 7 steps
    expected_min_len = 7

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)

    # Verify path exists, has correct length, and ends at the goal
    assert actual_path is not None
    assert len(actual_path) == expected_min_len
    assert actual_path[-1] == goal


def test_large_maze_path():
    """Tests finding a path in a larger maze and validates the path steps."""
    # 11x11 grid, representing a 5x5 cell maze
    maze = [
        # fmt: off
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],  # Start (1,1)
        [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],  # Wall near end forcing detour
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],  # Goal (9,9) -> y=9, x=9
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        # fmt: on
    ]
    start = (1, 1)
    goal = (9, 9)

    solver = MazeSolver(maze)
    actual_path = solver.solve(start, goal)

    # --- Basic Path Verification ---
    assert actual_path is not None, "Solver should find a path in this maze."
    assert len(actual_path) > 0, "Path must contain steps."
    assert actual_path[-1] == goal, "Path must end at the goal."

    # --- Detailed Path Step Validation ---
    last_pos = start
    visited_in_path = {start}
    for i, step in enumerate(actual_path):
        step_x, step_y = step

        # Check if step is within bounds and is a passage
        assert 0 <= step_y < len(maze) and 0 <= step_x < len(maze[0]), (
            f"Step {i} {step} is out of bounds."
        )
        assert maze[step_y][step_x] == 0, (
            f"Step {i} {step} is not a valid passage (0)."
        )

        # Check if step is adjacent to the previous position (or start)
        prev_x, prev_y = last_pos
        dx = abs(step_x - prev_x)
        dy = abs(step_y - prev_y)
        assert (dx == 1 and dy == 0) or (dx == 0 and dy == 1), (
            f"Step {i} {step} is not adjacent to previous position {last_pos}."
        )

        # Check for duplicates in the path (BFS guarantees shortest, no cycles)
        assert step not in visited_in_path, (
            f"Step {i} {step} visited multiple times in path."
        )
        visited_in_path.add(step)
        last_pos = step


# --- Test Runner Helper ---
if __name__ == "__main__":
    pytest.main()