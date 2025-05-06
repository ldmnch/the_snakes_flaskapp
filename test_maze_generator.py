# test_maze_generator.py
#21 tests in total

import pytest
from maze_generator import DisjointSet, Maze

# --- DisjointSet Tests ---

def test_disjoint_set_union_and_find():
    """Unit testing of the initialization, union and merge, 1 test total"""
    ds = DisjointSet(3 * 3) #Medium Size test, 3x3 grid

    #Check for the root
    assert ds.find(0) == 0 

    #Merges the disjoint set if true
    assert ds.union(0, 1) is True 

    #Confirms that the numbers belong to the set
    assert ds.find(0) == ds.find(1) 

    #Confirms that the numbers belong to the set, prevents redundancy
    assert ds.union(0, 1) is False 

#Defines the dimension 
@pytest.mark.parametrize("dimension", [5, 7, 10, 15, 20, 100])
def test_maze_generation_properties(dimension):
    """Grid size coverage test for other dimensions, 6 tests total."""
    maze = Maze(dimension)
    maze.generate()
    grid = maze.to_list()

    #Check if grid dimensions are correct
    assert len(grid) == 2 * dimension + 1
    assert all(len(row) == 2 * dimension + 1 for row in grid)

    # Count passages (0s); should be more than cells (d*d)
    flat = [cell for row in grid for cell in row]
    assert flat.count(0) > dimension * dimension  # All cells + some walls removed

# --- Maze Tests ---

#Defines the dimension and the passage to be tested for in each grid
@pytest.mark.parametrize("passages, y, x", [
    (3, 1, 1),
    (5, 3, 3),
    (7, 5, 5),
    (10, 7, 7),
    (15, 9, 9),
    (20, 15, 15),
    (100, 99, 99)
])            
def test_initialize_grid(passages, y, x):
    """Test to verify if the passage initialization works correctly, 7 tests total."""
    maze = Maze(passages)
    assert maze.grid[y, x] == 0

#Defines the dimension of the walls to be tested for each grid
@pytest.mark.parametrize("walls", [3, 5, 7, 10, 15, 20, 100])
def test_get_walls_count(walls):
    """Test that all wall positions are initialized as 1, 7 tests total."""
    
    maze = Maze(walls)
    
    for y in range(maze.grid_size): #for each loop in row y
        for x in range(maze.grid_size): #if y in 2, means row is even
            if y % 2 == 0 or x % 2 == 0: #if x in 2 means column is even
                assert maze.grid[y, x] == 1  #tests the assertion when value is 1, confirming it is a wall

# --- Helper to run tests if script is executed directly ---
if __name__ == "__main__":
     pytest.main() # Runs all tests in this file