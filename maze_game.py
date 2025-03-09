import pygame

#Note: Will try to comment as much as possible so everyone can follow along with the code

#Initializing the pygame
pygame.init()
pygame.font.init()

#Constants - basic layout of our game 
WIDTH, HEIGHT = 500, 500 # Game window size 
ROWS, COLS = 10, 10 # Grid size for the maze 
TILE_SIZE = WIDTH // COLS
WHITE = (255, 255, 255) # Background colour
BLACK = (0, 0, 0) # Wall colour
BLUE = (0, 0, 255) # Player colour
RED = (255, 0, 0) # End point colour

#Creating Game Window 
screen = pygame.display.set_mode((WIDTH, HEIGHT)) # Setting the size of the game window 
pygame.display.set_caption("Maze Game - 0.1") # Window title 

# 1 = wall, 0 = open path 
maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

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

#player start position 
player_x, player_y = 1, 1 # This could possibly be randomised

# End goal position (bottom-right open space)
goal_x, goal_y = 8, 8

# Game loop 
running = True
clock = pygame.time.Clock()

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