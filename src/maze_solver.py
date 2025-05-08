# src/maze_solver.py

from collections import deque
from typing import List, Optional, Set, Tuple

class MazeSolver:
    """
    Solves a maze represented by a 2D grid using Breadth-First Search (BFS).
    Finds the shortest path in terms of number of steps from a start to a goal coordinate.
    Grid representation: 0=Passage, 1=Wall. Coordinates are (x, y).
    """

    def __init__(self, maze_data: List[List[int]]):
        """
        Initializes the MazeSolver with the maze structure.

        Args:
            maze_data: A list of lists representing the maze grid.
        """
        if not maze_data or not isinstance(maze_data, list):
            raise ValueError("Invalid maze data provided.")

        self.maze_data: List[List[int]] = maze_data
        self.rows: int = len(maze_data)
        self.cols: int = len(maze_data[0]) if self.rows > 0 else 0

        if self.rows > 0 and not all(len(row) == self.cols for row in maze_data):
             raise ValueError("Maze rows have inconsistent lengths.")

    def solve(
        self, start: Tuple[int, int], goal: Tuple[int, int]
    ) -> Optional[List[Tuple[int, int]]]:
        """
        Public method to find the shortest path from start to goal.

        Args:
            start: The starting coordinates (x, y).
            goal: The goal coordinates (x, y).

        Returns:
            A list of (x, y) tuples representing the path (excluding start),
            or None if no path exists or start/goal are invalid.
        """
        # Initial validation of start/goal points
        start_x, start_y = start
        goal_x, goal_y = goal

        if not self._is_within_bounds(start_x, start_y) or \
           not self._is_within_bounds(goal_x, goal_y):
            # Start or goal is outside the defined grid
            return None
        if self.maze_data[start_y][start_x] == 1 or self.maze_data[goal_y][goal_x] == 1:
            # Start or goal is on a wall
             return None

        return self._find_path_bfs(start, goal)

    def _is_within_bounds(self, x: int, y: int) -> bool:
        """Checks if the given coordinates are within the maze grid dimensions."""
        return 0 <= y < self.rows and 0 <= x < self.cols

    def _is_valid_passage(self, x: int, y: int) -> bool:
        """Checks if the given coordinates are within bounds and represent a passage (0)."""
        return self._is_within_bounds(x, y) and self.maze_data[y][x] == 0

    def _find_path_bfs(
        self, start: Tuple[int, int], goal: Tuple[int, int]
    ) -> Optional[List[Tuple[int, int]]]:
        """
        Performs Breadth-First Search to find the shortest path.

        Returns:
            The path as a list of coordinates, or None if no path is found.
        """
        # Queue stores tuples: ( (current_x, current_y), [path_list_to_current] )
        queue: deque[Tuple[Tuple[int, int], List[Tuple[int, int]]]] = deque(
            [(start, [start])]
        )
        visited: Set[Tuple[int, int]] = {start}

        # Define potential moves relative to current position (dx, dy)
        possible_moves: List[Tuple[int, int]] = [(1, 0), (-1, 0), (0, 1), (0, -1)] # R, L, D, U

        while queue:
            (current_x, current_y), path = queue.popleft()

            # Goal check
            if (current_x, current_y) == goal:
                return path[1:]  # Return path excluding the starting node

            # Explore neighbors
            for dx, dy in possible_moves:
                next_x, next_y = current_x + dx, current_y + dy
                next_pos = (next_x, next_y)

                # Check if the neighbor is a valid passage and hasn't been visited
                if self._is_valid_passage(next_x, next_y) and next_pos not in visited:
                    visited.add(next_pos)
                    # Create the new path by appending the valid neighbor
                    new_path: List[Tuple[int, int]] = path + [next_pos]
                    queue.append((next_pos, new_path))

        return None  # Goal was not reachable