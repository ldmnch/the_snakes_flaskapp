from collections import deque

class MazeSolver:
    """
    A class to solve a maze using BFS (Breadth-First Search).
    """

    def __init__(self, maze_data):
        """
        Initializes the MazeSolver with the maze data.

        Args:
            maze_data (list): The 2D list representing the maze (0=path, 1=wall).
        """
        self.maze_data = maze_data

    def solve(self, start, goal):
        """
        Solves the maze from start to goal using BFS.

        Args:
            start (tuple): The starting coordinates (x, y).
            goal (tuple): The goal coordinates (x, y).

        Returns:
            list: A list of (x, y) tuples representing the path (excluding start),
                  or None if no path is found.
        """
        return self.find_path_bfs(start, goal)
    
    def find_path_bfs(self, start, goal):
        """
        Finds the shortest path in a maze using BFS.

        Args:
            start (tuple): The starting coordinates (x, y).
            goal (tuple): The goal coordinates (x, y).

        Returns:
            list: A list of (x, y) tuples representing the path (excluding start),
                  or None if no path is found.
        """
        queue = deque([(start, [start])])  # Store (position, path_so_far)
        visited = {start}                  # Keep track of visited positions

        while queue:
            (x, y), path = queue.popleft()

            if (x, y) == goal:
                return path[1:]  # Exclude the start position from the returned path

            # Check neighbors (Right, Left, Down, Up)
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                nx, ny = x + dx, y + dy

                # Check bounds and walls
                if 0 <= ny < len(self.maze_data) and 0 <= nx < len(self.maze_data[0]) and \
                   self.maze_data[ny][nx] == 0 and (nx, ny) not in visited:

                    visited.add((nx, ny))
                    new_path = path + [(nx, ny)]
                    queue.append(((nx, ny), new_path))

        return None  # No path found
