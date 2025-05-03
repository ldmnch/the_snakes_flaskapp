import numpy as np
import random

class DisjointSet:
    """A data structure that keeps track of disjoint subsets."""
    
    def __init__(self, count):
        """
        Initializes a DisjointSet with 'count' elements.
        
        Args:
            count (int): The number of elements in the disjoint set.
        """
        self.parent = list(range(count)) 
        self.rank = [0] * count
    
    def find(self, x):
        """
        Finds the representative (root) of the set that contains 'x'.
        
        Args:
            x (int): The element to find the representative of.
        
        Returns:
            int: The root (representative) of the set containing 'x'.
        """
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        """
        Unites the sets containing 'x' and 'y' if they are not already in the same set, using union by rank.
        
        Args:
            x (int): The first element to unite.
            y (int): The second element to unite.
        
        Returns:
            bool: True if the sets were united, False if they were already in the same set.
        """
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x == root_y:
            return False
        
        # Union by rank: attach the smaller tree under the larger tree
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        
        return True


class Maze:
    """Generates and manages a maze using Kruskal's algorithm."""
    
    def __init__(self, dimension):
        """
        Initializes a maze of the given dimension.
        
        Args:
            dimension (int): The dimension of the maze, the maze will have 'dimension' rows and columns of cells.
        """
        self.dimension = dimension
        self.grid_size = 2 * dimension + 1 
        self.grid = np.ones((self.grid_size, self.grid_size), dtype=int)
        self._initialize_grid()
    
    def _initialize_grid(self):
        """
        Marks the center of each cell as a passage (0).
        This method sets the interior cells of the maze to be passages, excluding the outer walls.
        """
        for y in range(self.dimension):
            for x in range(self.dimension):
                self.grid[2*y + 1, 2*x + 1] = 0
    
    def _get_walls(self):
        """
        Creates a list of possible walls between cells, both horizontal and vertical.
        
        Returns:
            list: A list of walls, each represented as a tuple (y1, x1, y2, x2), where
                  (y1, x1) and (y2, x2) are the endpoints of the wall.
        """
        walls = []
        for y in range(self.dimension):
            for x in range(self.dimension - 1):
                walls.append((y, x, y, x + 1))  # Horizontal walls
        for y in range(self.dimension - 1):
            for x in range(self.dimension):
                walls.append((y, x, y + 1, x))  # Vertical walls
        random.shuffle(walls)  # Shuffle walls randomly for Kruskal's algorithm
        return walls
    
    def generate(self):
        """
        Generates the maze using Kruskal's algorithm.
        
        The algorithm iterates through all walls and removes the wall if it connects two different sets,
        ensuring that all cells are connected, creating a perfect maze.
        """
        ds = DisjointSet(self.dimension * self.dimension)  # Disjoint set to track connected components
        walls = self._get_walls()  # Get all possible walls
        
        for y1, x1, y2, x2 in walls:
            cell1 = y1 * self.dimension + x1
            cell2 = y2 * self.dimension + x2
            
            # If the cells are not connected, remove the wall
            if ds.find(cell1) != ds.find(cell2):
                wall_y = y1 + y2 + 1
                wall_x = x1 + x2 + 1
                self.grid[wall_y, wall_x] = 0  # Remove wall (set to passage)
                ds.union(cell1, cell2)  # Unite the sets containing the two cells
    
    def to_list(self):
        """
        Converts the maze grid to a list of lists for easier representation.
        
        Returns:
            list: The maze represented as a list of lists of integers (0 for passages, 1 for walls).
        """
        return self.grid.tolist()
