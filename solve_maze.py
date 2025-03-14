from collections import deque

def solve_maze(maze, start, goal):
    """
    Solves the maze using BFS and returns the shortest path as a list of coordinates.
    """

    queue = deque([(start, [start])])  # Queue stores (current position, path taken so far)
    visited = set()

    while queue:
        (x, y), path = queue.popleft()

        if (x, y) == goal:
            return path  # Found the shortest path

        visited.add((x, y))  # Mark the cell as visited

        # Possible moves: left, right, up, down
        moves = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        
        for dx, dy in moves:
            nx, ny = x + dx, y + dy  # Calculate new position
            
            # Check if the move is within bounds and is not a wall (1)
            if 0 <= nx < len(maze[0]) and 0 <= ny < len(maze):
                if maze[ny][nx] == 0 and (nx, ny) not in visited:
                    queue.append(((nx, ny), path + [(nx, ny)]))  # Add to queue

    return None  # No path found

# Example usage
if __name__ == "__main__":
    # Example maze (0 = path, 1 = wall)
    example_maze = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
    
    # Find path from (1,1) to (8,8)
    path = solve_maze(example_maze, start=(1, 1), goal=(8, 8))
    
    if path:
        print(f"Path found: {path}")
    else:
        print("No path exists")