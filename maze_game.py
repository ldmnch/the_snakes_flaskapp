# Import Libraries
import pygame
import numpy as np 


# Note: Will try to comment as much as possible so everyone can follow along with the code

# Initializing pygame
pygame.init()
pygame.font.init()


# Generate random seed for reproducibility
np.random.seed(123)

# Constants - basic layout of our game 

WIDTH, HEIGHT = 500, 500 # Game window size 
ROWS, COLS = 10, 10 # Grid size for the maze 
TILE_SIZE = WIDTH // COLS
WHITE = (255, 255, 255) # Background colour
BLACK = (0, 0, 0) # Wall colour
BLUE = (0, 0, 255) # Player colour
RED = (255, 0, 0) # End point colour

#Creating Game Window 

screen = pygame.display.set_mode((WIDTH, HEIGHT)) # Setting the size of the game window 
pygame.display.set_caption("Maze Game - 0.1") # Window title - First version


# Some comments on the code below:
# This is currently a hard coded version of the maze to make sure the code to move in the maze works. 
# We have separately written code to generate a random walk from a starting point within the maze until it hits a wall. 
# This code is not yet integrated with the maze and only presents the solution path but not the remaining maze which needs to be added.

# Hard coded maze:
maze = [ # 1 = wall, 0 = open path 
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

# Function to generate a random number for the maze solution path
def random_number_generator():

    return np.random.randint(3)

# Function to generate a random path through a maze of a fixed size 64 x 64
def generate_maze():

    # Initialise empty list which stores the solution path
    path_coords = []

    # Hard coded starting location for the path which can be randomised
    start_maze_x, start_maze_y = (43, 42) 

    # Append the initial coordinates to the solution path
    path_coords.append((start_maze_x, start_maze_y))

    # The remaining code will generate a random number at a time, check if it has been visited before and if this is not the case add it to the solution path
    # The function returns a list of tuples which are the coordinates of the solution path
    # The path is terminated once the path hits an outer all in the maze
    running = True
    
    while running:
        
        # Generate a random number betwwen 0 and 3
        random_number = random_number_generator()
        
        print(f"Random Number: {random_number}")

        # If the number is 0 move to the left
        if random_number == 0:
            # Check if the coordinates have been visited before, if so - skip
            if (start_maze_x - 1, start_maze_y) not in path_coords:
                start_maze_x -= 1
            else:
                continue
       # If the number is 1 move to the right
        elif random_number == 1:
            # Check if the coordinates have been visited before, if so - skip
            if (start_maze_x + 1, start_maze_y) not in path_coords:
                start_maze_x += 1
            else:
                continue
        # If the number is 2 move up
        elif random_number == 2:
            #up 2
            # Check if the coordinates have been visited before, if so - skip
            if (start_maze_x, start_maze_y + 1) not in path_coords:
                start_maze_y += 1
            else:
                continue
        # If the number is 3 move down
        elif random_number == 3:
            #down 3
            # Check if the coordinates have been visited before, if so - skip
            if (start_maze_x, start_maze_y - 1) not in path_coords:
                start_maze_y -= 1
            else:
                continue        

        # Append the new coordinates to the solution path
        print(f"Current Coordinates: {start_maze_x, start_maze_y}")
        path_coords.append((start_maze_x, start_maze_y))

        # Stop the generation once the solution path hits a wall/finds a way out
        if start_maze_x == 0 or start_maze_x == 64:
            break
        if start_maze_y == 0 or start_maze_y == 64:
            break

    # Return the final solution path
    return path_coords

# Function to fill the game with the maze
def draw_maze():
    
    screen.fill(WHITE) #white background 

    for row in range(ROWS):
        for col in range(COLS):
            if maze[row][col] == 1:
                pygame.draw.rect(screen, BLACK, (col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE))
    
    # If row and col are 1, then its a wall, so a black rectangle will be drawn

# Function to draw the player in the maze
def draw_player(player_x, player_y):
    pygame.draw.rect(screen, BLUE, (player_x * TILE_SIZE, player_y * TILE_SIZE, TILE_SIZE, TILE_SIZE))
    
# Function to draw the goal
def draw_goal(goal_x, goal_y):
    pygame.draw.rect(screen, RED, (goal_x * TILE_SIZE, goal_y * TILE_SIZE, TILE_SIZE, TILE_SIZE))

def main():

    #player start position 
    player_x, player_y = 1, 1 # This could possibly be randomised

    # End goal position (bottom-right open space)
    goal_x, goal_y = 8, 8

    # Game loop 
    clock = pygame.time.Clock()

    running = True

    while running: #starts the game loop, will continously draw the maze, handle input, and update the display 
        #handle events (key presses and quit)
        for event in pygame.event.get(): #checks for events (e.g. key presses, closing window)
            if event.type == pygame.QUIT: #if window is closed, the game loop is exited 
                running = False
            
            #handle player movement 
            if event.type == pygame.KEYDOWN: #checks if a key was pressed 
                # Store old position before moving
                old_x, old_y = player_x, player_y
                
                # Arrow keys
                if event.key == pygame.K_LEFT or event.key == pygame.K_a:
                    player_x -= 1
                elif event.key == pygame.K_RIGHT or event.key == pygame.K_d:
                    player_x += 1
                elif event.key == pygame.K_UP or event.key == pygame.K_w:
                    player_y -= 1
                elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                    player_y += 1
                
                # Check if new position is out of bounds
                if not (0 <= player_x < COLS and 0 <= player_y < ROWS):
                    player_x, player_y = old_x, old_y
                # Check if new position is a wall
                elif maze[player_y][player_x] == 1:
                    # If it's a wall, revert to old position
                    player_x, player_y = old_x, old_y

        #draw the maze 
        draw_maze()

        #Draw the Goal
        draw_goal(goal_x, goal_y)
        
        #Draw the Player 
        #will draw a blue rectangle for the player
        draw_player(player_x, player_y)
        
        # Check if player reached the goal
        if player_x == goal_x and player_y == goal_y:
            font = pygame.font.SysFont(None, 48)
            win_text = font.render("You Win!", True, (0, 100, 0))
            screen.blit(win_text, (WIDTH // 2 - 80, HEIGHT // 2 - 24))

        #update the display
        #updates the game screen after drawing the maze and player
        pygame.display.update()
        clock.tick(60)  # Limit to 60 frames per second

    #quit the game 
    pygame.quit()

# Main code to run the game
if __name__ == "__main__":
    main()

# code to generate a sample path
#print(generate_maze())


import pygame
from collections import deque

# Maze layout (1 = wall, 0 = open path)
maze = [ 
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

def solve_maze(maze):
    """
    Solves the maze using BFS and returns the shortest path as a list of coordinates.
    """
    start = (1, 1)  # Player start position
    goal = (8, 8)   # Goal position

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

def main():
    """
    Runs the game loop. The player can press 'E' to show the solution path in the same window.
    """
    pygame.init()
    screen = pygame.display.set_mode((500, 500))
    pygame.display.set_caption("Maze Game")

    # Colors
    WHITE = (255, 255, 255)
    BLACK = (0, 0, 0)
    GREEN = (0, 255, 0)  # Solution path color
    BLUE = (0, 0, 255)  # Player color
    RED = (255, 0, 0)  # Goal color

    # Game settings
    ROWS, COLS = 10, 10
    TILE_SIZE = 500 // COLS
    clock = pygame.time.Clock()

    # Initial player position
    player_x, player_y = 1, 1
    goal_x, goal_y = 8, 8
    show_solution = False  # Solution path is hidden initially

    # Solve the maze **before the loop starts** so it's ready when needed
    solution_path = solve_maze(maze)

    running = True
    while running:
        screen.fill(WHITE)  # Clear the screen

        # Draw the maze
        for row in range(ROWS):
            for col in range(COLS):
                if maze[row][col] == 1:
                    pygame.draw.rect(screen, BLACK, (col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE))

        # Draw solution path (only if 'E' is pressed)
        if show_solution and solution_path:
            for (x, y) in solution_path:
                pygame.draw.rect(screen, GREEN, (x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE))

        # Draw the player
        pygame.draw.rect(screen, BLUE, (player_x * TILE_SIZE, player_y * TILE_SIZE, TILE_SIZE, TILE_SIZE))

        # Draw the goal
        pygame.draw.rect(screen, RED, (goal_x * TILE_SIZE, goal_y * TILE_SIZE, TILE_SIZE, TILE_SIZE))

        pygame.display.update()  # Update the display
        clock.tick(60)  # Limit FPS

        # Event handling (key presses, quit)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            if event.type == pygame.KEYDOWN:
                # Player movement controls (WASD or arrow keys)
                if event.key == pygame.K_LEFT or event.key == pygame.K_a:
                    if maze[player_y][player_x - 1] == 0:
                        player_x -= 1
                elif event.key == pygame.K_RIGHT or event.key == pygame.K_d:
                    if maze[player_y][player_x + 1] == 0:
                        player_x += 1
                elif event.key == pygame.K_UP or event.key == pygame.K_w:
                    if maze[player_y - 1][player_x] == 0:
                        player_y -= 1
                elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                    if maze[player_y + 1][player_x] == 0:
                        player_y += 1

                # Reveal the solution path when pressing 'E' (in the same window)
                if event.key == pygame.K_e:
                    show_solution = True  # Activate solution display

    pygame.quit()  # Close the game window

# Run the game
if __name__ == "__main__":
    main()
