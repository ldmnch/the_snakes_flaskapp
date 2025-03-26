# maze_game.py

import random

# Constants
WALL = 1
PATH = 0

def create_empty_maze(width, height):
    """Create a maze filled with walls."""
    return [[WALL for _ in range(width)] for _ in range(height)]

def carve_passages(maze, x, y):
    """Recursive Backtracking to carve a maze."""
    directions = [(0, -2), (0, 2), (-2, 0), (2, 0)]
    random.shuffle(directions)

    for dx, dy in directions:
        nx, ny = x + dx, y + dy
        if 1 <= nx < len(maze[0]) - 1 and 1 <= ny < len(maze) - 1:
            if maze[ny][nx] == WALL:
                maze[ny][nx] = PATH
                maze[y + dy // 2][x + dx // 2] = PATH
                carve_passages(maze, nx, ny)

def generate_maze(width, height):
    """Main function to generate a maze."""
    # Ensure odd dimensions
    if width % 2 == 0:
        width += 1
    if height % 2 == 0:
        height += 1

    maze = create_empty_maze(width, height)

    # Start carving from (1,1)
    maze[1][1] = PATH
    carve_passages(maze, 1, 1)

    return maze

def get_maze_as_list(size=11):
    """Expose this function to Flask as the generator."""
    return generate_maze(size, size)
