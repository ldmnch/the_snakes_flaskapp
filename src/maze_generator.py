import numpy as np
import random

class DisjointSet:
    """A data structure that keeps track of disjoint subsets."""
    def __init__(self, count):
        self.parent = list(range(count))
        self.rank = [0] * count
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x == root_y:
            return False
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
        self.dimension = dimension
        self.grid_size = 2 * dimension + 1
        self.grid = np.ones((self.grid_size, self.grid_size), dtype=int)
        self._initialize_grid()
    
    def _initialize_grid(self):
        """Mark the cell centers as passages (0)."""
        for y in range(self.dimension):
            for x in range(self.dimension):
                self.grid[2*y + 1, 2*x + 1] = 0
    
    def _get_walls(self):
        """Create a list of walls between cells."""
        walls = []
        for y in range(self.dimension):
            for x in range(self.dimension - 1):
                walls.append((y, x, y, x + 1))  # horizontal
        for y in range(self.dimension - 1):
            for x in range(self.dimension):
                walls.append((y, x, y + 1, x))  # vertical
        random.shuffle(walls)
        return walls
    
    def generate(self):
        """Generate the maze using Kruskal's algorithm."""
        ds = DisjointSet(self.dimension * self.dimension)
        walls = self._get_walls()
        
        for y1, x1, y2, x2 in walls:
            cell1 = y1 * self.dimension + x1
            cell2 = y2 * self.dimension + x2
            if ds.find(cell1) != ds.find(cell2):
                wall_y = y1 + y2 + 1
                wall_x = x1 + x2 + 1
                self.grid[wall_y, wall_x] = 0
                ds.union(cell1, cell2)
    
    def to_list(self):
        """Convert the maze grid to a list of lists."""
        return self.grid.tolist()
