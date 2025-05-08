# src/maze_generator.py 

import random
from typing import List, Tuple
import numpy as np

class DisjointSet:
    """
    A data structure implementing the Disjoint Set Union (DSU) or Union-Find algorithm.
    Used to track connectivity of cells during maze generation.
    Optimized with Path Compression and Union by Rank.
    """

    def __init__(self, count: int):
        """Initializes 'count' disjoint sets."""
        if count < 0:
            raise ValueError("Number of elements cannot be negative")
        self.parent: List[int] = list(range(count))
        self.rank: List[int] = [0] * count

    def find(self, x: int) -> int:
        """Finds the representative (root) of the set containing element 'x' with path compression."""
        if self.parent[x] == x:
            return x
        # Path compression: Point node directly to the root
        self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        """
        Unites the sets containing elements 'x' and 'y' using union by rank.
        Returns True if a union was performed, False if 'x' and 'y' were already in the same set.
        """
        root_x: int = self.find(x)
        root_y: int = self.find(y)

        if root_x == root_y:
            return False  # Already connected

        # Union by rank heuristic: Attach shorter tree to taller tree
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            # Same rank: Choose one as parent and increment its rank
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        return True


class Maze:
    """
    Generates a perfect maze using a grid graph and Kruskal's algorithm with Disjoint Set Union.
    A perfect maze has no loops and all cells are reachable from any other cell.
    Grid representation: 1=Wall, 0=Passage.
    """

    def __init__(self, dimension: int):
        """
        Initializes the maze grid structure based on the desired cell dimension.
        The grid size will be (2*dimension + 1) to accommodate walls between cells.

        Args:
            dimension (int): The number of cells along one side of the maze (e.g., 5 for a 5x5 cell maze).
        """
        if dimension <= 0:
            raise ValueError("Maze dimension must be positive.")
        self.dimension: int = dimension
        self.grid_size: int = 2 * dimension + 1
        # Initialize grid with all walls (1)
        self.grid: np.ndarray = np.ones((self.grid_size, self.grid_size), dtype=int)
        self._initialize_passages()

    def _initialize_passages(self) -> None:
        """Marks the internal grid locations corresponding to cell centers as passages (0)."""
        # Cell centers are at odd grid coordinates (e.g., (1,1), (1,3), (3,1))
        for y in range(self.dimension):
            for x in range(self.dimension):
                self.grid[2 * y + 1, 2 * x + 1] = 0

    def _get_walls(self) -> List[Tuple[int, int, int, int]]:
        """
        Generates a list of all potential interior walls between adjacent cells.
        Each wall is represented by the coordinates of the two cells it separates.
        Returns the list of walls shuffled randomly.
        """
        walls: List[Tuple[int, int, int, int]] = []
        # Horizontal walls (separating cells (y, x) and (y, x+1))
        for y in range(self.dimension):
            for x in range(self.dimension - 1):
                walls.append((y, x, y, x + 1))
        # Vertical walls (separating cells (y, x) and (y+1, x))
        for y in range(self.dimension - 1):
            for x in range(self.dimension):
                walls.append((y, x, y + 1, x))

        random.shuffle(walls)  # Crucial for generating random mazes with Kruskal's
        return walls

    def generate(self) -> None:
        """
        Generates the maze structure using Kruskal's algorithm.
        Iterates through shuffled walls, removing a wall (making it a passage)
        if the cells it separates are not already connected, until all cells are connected.
        """
        # Map each cell (y, x) to a unique index for DSU: index = y * dimension + x
        num_cells = self.dimension * self.dimension
        if num_cells == 0:  # Handle edge case of 0 dimension (though prevented by init)
            return
        ds = DisjointSet(num_cells)
        walls = self._get_walls()

        num_edges_added = 0
        # A spanning tree on V vertices needs exactly V-1 edges.
        target_edges = num_cells - 1

        for y1, x1, y2, x2 in walls:
            # Stop early if the maze is fully connected
            if num_edges_added >= target_edges:
                break

            cell1_idx = y1 * self.dimension + x1
            cell2_idx = y2 * self.dimension + x2

            # If uniting the sets is successful (i.e., cells were disconnected)
            if ds.union(cell1_idx, cell2_idx):
                # Convert cell coordinates to grid coordinates of the wall between them
                wall_y = y1 + y2 + 1
                wall_x = x1 + x2 + 1
                self.grid[wall_y, wall_x] = 0  # Mark wall as passage (remove wall)
                num_edges_added += 1

    def to_list(self) -> List[List[int]]:
        """Converts the internal numpy grid to a standard Python list of lists."""
        return self.grid.tolist()