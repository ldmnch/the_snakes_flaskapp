from collections import deque
from typing import List, Tuple, Optional, Set # For type hinting

class MazeSolver:
    """
    A class to solve a maze using BFS (Breadth-First Search).
    """

    def __init__(self, maze_data: List[List[int]]):
        """
        Initializes the MazeSolver with the maze data.

        Args:
            maze_data (List[List[int]]): The 2D list representing the maze (0=path, 1=wall).
        """
        self.maze_data: List[List[int]] = maze_data
        self.rows: int = len(maze_data)
        self.cols: int = len(maze_data[0]) if self.rows > 0 else 0

    def solve(self, start: Tuple[int, int], goal: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """
        Solves the maze from start to goal using BFS.

        Args:
            start (Tuple[int, int]): The starting coordinates (x, y).
            goal (Tuple[int, int]): The goal coordinates (x, y).

        Returns:
            Optional[List[Tuple[int, int]]]: A list of (x, y) tuples representing the path 
                                             (excluding start), or None if no path is found.
        """
        return self.find_path_bfs(start, goal)
    
    def _is_valid_move(self, x: int, y: int) -> bool:
        """
        Checks if the given coordinates are within maze bounds and not a wall.
        """
        return 0 <= y < self.rows and \
               0 <= x < self.cols and \
               self.maze_data[y][x] == 0 # 0 represents a path

    def find_path_bfs(self, start: Tuple[int, int], goal: Tuple[int, int]) -> Optional[List[Tuple[int, int]]]:
        """
        Finds the shortest path in a maze using BFS.

        Args:
            start (Tuple[int, int]): The starting coordinates (x, y).
            goal (Tuple[int, int]): The goal coordinates (x, y).

        Returns:
            Optional[List[Tuple[int, int]]]: A list of (x, y) tuples representing the path 
                                             (excluding start), or None if no path is found.
        """
        # The queue will store tuples of (current_position, path_taken_to_reach_current_position)
        # Path is stored as a list of (x,y) tuples.
        queue: deque[Tuple[Tuple[int, int], List[Tuple[int, int]]]] = deque([(start, [start])])
        visited: Set[Tuple[int, int]] = {start} # Keep track of visited (x,y) positions

        # Define possible moves (Right, Left, Down, Up) corresponding to (dx, dy)
        # Note: In maze_data[y][x], y is row index, x is column index.
        # So, a move (dx, dy) means (x+dx, y+dy).
        possible_moves: List[Tuple[int, int]] = [(1, 0), (-1, 0), (0, 1), (0, -1)]

        while queue:
            (current_x, current_y), path = queue.popleft()

            if (current_x, current_y) == goal:
                # Path found, return it excluding the start position itself.
                return path[1:] 

            for dx, dy in possible_moves:
                next_x, next_y = current_x + dx, current_y + dy

                if self._is_valid_move(next_x, next_y) and (next_x, next_y) not in visited:
                    visited.add((next_x, next_y))
                    new_path: List[Tuple[int, int]] = path + [(next_x, next_y)]
                    queue.append(((next_x, next_y), new_path))

        return None  # No path found