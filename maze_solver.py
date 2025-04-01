from collections import deque

def find_path_bfs(maze_data, start, goal):
    """
    Finds the shortest path in a maze using BFS.

    Args:
        maze_data (list): The 2D list representing the maze (0=path, 1=wall).
        start (tuple): The starting coordinates (x, y).
        goal (tuple): The goal coordinates (x, y).

    Returns:
        list: A list of (x, y) tuples representing the path (excluding start),
              or None if no path is found.
    """
    queue = deque([(start, [start])]) # Store (position, path_so_far)
    visited = {start}                 # Keep track of visited (x, y) tuples

    while queue:
        (x, y), path = queue.popleft()

        if (x, y) == goal:
            return path[1:]  # Return path *excluding* the start node

        # Check neighbors (Right, Left, Down, Up)
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy

            # Check bounds and walls
            if 0 <= ny < len(maze_data) and 0 <= nx < len(maze_data[0]) and \
               maze_data[ny][nx] == 0 and (nx, ny) not in visited:

                visited.add((nx, ny))
                new_path = path + [(nx, ny)]
                queue.append(((nx, ny), new_path))

    return None # No path found