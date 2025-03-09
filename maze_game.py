import pygame

#Note: Will try to comment as much as possible so everyone can follow along with the code

#Initializing the pygame
pygame.init()

#Constants - basic layout of our game 
WIDTH, HEIGHT = 500,500 #game window size 
ROWS, COLS = 10,10 #grid size for the maze 
TITLE_SIZE = WIDTH // COLS
WHITE, BLACK, BLUE, RED = (255, 255, 255), (0, 0, 0), (0, 0, 255), (255, 0, 0)
#white = background color, black = walls, blue = player, red = end point

#Creating Game Window 
screen = pygame.display.set_mode((WIDTH, HEIGHT)) #setting the size of the game window 
pygame.display.set_caption("Maze Game") # window title 

# 1 = wall, 0 = open path 
maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], #game wall 
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] #game wall 
]

#player start position 
player_x, player_1 = 1, 1

#game loop 
running = TRUE #keeps game running until the player quits 
while running: #starts the game loop, will continously draw the maze, handle input, and update the display 

#draw the maze 
screen.fill(WHITE) #white background 

for row in range(ROWS):
    for col in range(COLS):
        if maze[row][col] == 1:
            pygame.draw.rect(screen, BLACK, (col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE))

#if row and col are 1, then its a wall, so a black rectangle will be drawn

#Draw the Player 
pygame.draw.rect(screen, BLUE, (player_x * TILE_SIZE, player_y * TILE_SIZE, TILE_SIZE, TILE_SIZE))
#will draw a blue rectangle for the player

#update the display
#updates the game screen after drawing the maze and player
pygame.display.update()

#handle events (key presses and quit)
for event in pygame.event.get(): #checks for events (e.g. key presses, closing window)
    if event.type == py.game.QUIT: #if window is closed, the game loop is exited 
        running = FALSE

#handle player movement 
elif event.type == pygame.KEYDOWN: #checks if a key was pressed 
    new_x, new_y = player_x, player_y #based on key press the player will move in the direction
    if event.key == pygame.K_LEFT:
        new_x -= 1
    elif event.key == pygame.K_RIGHT:
        new_x += 1
    elif event.key == pygame.K_UP:
        new_y -= 1
    elif event.key == pygame.k_DOWN:
        new_y += 1 

#prevent moving through walls 
if maze[new_y][new_x] == 0:
    player_x, player_y = new_x, new_y
#checks if the new position is a valid open path and not a wall 
#if its a wall (1), player stays in place 

#quit the game 
pygame.quit()