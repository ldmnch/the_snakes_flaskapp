import numpy as np
import random

class DisjointSet:
    """A data structure that keeps track of a set of elements partitioned into disjoint subsets."""
    def __init__(self, count):
        # Each element starts as its own parent
        self.parent = list(range(count))
        # Rank is used for union by rank optimization
        self.rank = [0] * count
    
    def find(self, x):
        """Find the representative (root) of the set containing x."""
        # Path compression: make the tree flatter for future queries
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        """Merge the sets containing x and y."""
        # Find the roots
        root_x = self.find(x)
        root_y = self.find(y)
        
        # Already in the same set
        if root_x == root_y:
            return False
        
        # Union by rank: attach smaller rank tree under root of higher rank tree
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            # Same rank, so make one the root and increment its rank
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        
        return True


def generate_maze(dimension):
    """
    Generate a maze of size dimension x dimension using Kruskal's algorithm.
    
    Args:
        dimension (int): The size of the maze (number of cells in each direction)
        
    Returns:
        numpy.ndarray: A 2D grid representing the maze where 1 is a wall and 0 is a passage
    """
    # Create a grid with all walls
    # For a maze with dimension x dimension cells, we need a (2*dimension+1) x (2*dimension+1) grid
    grid = np.ones((2*dimension+1, 2*dimension+1), dtype=int)
    
    # Mark all cells as passages (0)
    for y in range(dimension):
        for x in range(dimension):
            grid[2*y+1, 2*x+1] = 0
    
    # Create a list of all walls
    walls = []
    
    # Add horizontal walls (walls between cells in the same row)
    for y in range(dimension):
        for x in range(dimension-1):
            # Wall between (y, x) and (y, x+1)
            walls.append((y, x, y, x+1))
    
    # Add vertical walls (walls between cells in the same column)
    for y in range(dimension-1):
        for x in range(dimension):
            # Wall between (y, x) and (y+1, x)
            walls.append((y, x, y+1, x))
    
    # Shuffle the walls
    random.shuffle(walls)
    
    # Create a disjoint-set with one set per cell
    ds = DisjointSet(dimension * dimension)
    
    # Process each wall
    for y1, x1, y2, x2 in walls:
        # Convert 2D coordinates to 1D indices
        cell1 = y1 * dimension + x1
        cell2 = y2 * dimension + x2
        
        # If the cells are not already connected
        if ds.find(cell1) != ds.find(cell2):
            # Remove the wall (make it a passage)
            wall_y = y1 + y2 + 1
            wall_x = x1 + x2 + 1
            grid[wall_y, wall_x] = 0
            
            # Connect the sets
            ds.union(cell1, cell2)
    
    return grid

def get_maze_as_list(dimension=5):
    """
    Generates a maze and returns it as a list of lists compatible with the game.
    
    Args:
        dimension (int): The size parameter for the maze generator
        
    Returns:
        list: A 2D list representing the maze where 1 is a wall and 0 is a passage
    """
    # Generate the maze using the algorithm
    numpy_maze = generate_maze(dimension)
    
    # Convert NumPy array to a list of lists
    maze_list = numpy_maze.tolist()
    
    return maze_list